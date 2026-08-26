"""QubitVista backend — FastAPI entry point.

    uvicorn main:app --reload --port 8000
    http://localhost:8000/docs      # try circuits without a frontend

Routes stay thin: all quantum logic lives in quantum_engine, all teaching text
in explain.py / explain2.py, all golden circuits in the two spec files.

There are two catalogues — 104 single-qubit circuits and 77 two-qubit ones —
and their case ids overlap (both have an S01). Every catalogue route therefore
takes a `qubits` query parameter, defaulting to 1 so the Phase 1 frontend keeps
working unchanged.
"""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

import explain as ex
import explain2 as ex2
import quantum_engine as qe
from schemas import SimulateRequest

HERE = Path(__file__).parent
SPEC_PATH = HERE / "circuits_spec.json"
SPEC_2Q_PATH = HERE / "circuits_spec_2q.json"

app = FastAPI(
    title="QubitVista Backend",
    version="2.0.0",
    description="One- and two-qubit gates with step-by-step state evolution.",
)

# Development origins for the Vite / CRA dev servers.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@lru_cache(maxsize=2)
def _spec(qubits: int = 1) -> dict:
    """Golden circuit catalogue. Cached — it's static and read on every request."""
    path = SPEC_PATH if qubits == 1 else SPEC_2Q_PATH
    if not path.exists():
        raise RuntimeError(f"{path.name} not found at {path}")
    with path.open(encoding="utf-8") as fh:
        return json.load(fh)


@lru_cache(maxsize=2)
def _cases_by_id(qubits: int = 1) -> dict[str, dict]:
    return {c["id"]: c for c in _spec(qubits)["cases"]}


# One canonical circuit per two-qubit concept, for the page's one-click demos.
# The single-qubit spec ships its own presets; the two-qubit one does not, so
# they are chosen here — pedagogically rather than minimally, the same rule the
# Phase 1 presets follow. E01/M09 are the same gate sequence under two concepts,
# so measurement gets M08 instead: two independent RY rotations give four
# non-degenerate probabilities, which is a better bar chart to read.
_PRESETS_2Q = {
    "superposition": "S03",     # H q0 · H q1 — the spread doubling with each wire
    "phase": "P09",             # H · H · CZ — one sign flipped, no bar moves
    "interference": "I06",      # H · H · CZ · H · H — the phase folded back out
    "entanglement": "E01",      # H q0 · CX — the Bell pair
    "separability": "N03",      # H q0 · SWAP — a two-qubit gate that never entangles
    "measurement": "M08",       # RY · RY — four outcomes, all different
    "state_evolution": "V06",   # H · CX · SWAP — entangle, then move it
    "reversibility": "R04",     # H · CX · CX · H — built and completely undone
}


@lru_cache(maxsize=2)
def _concept_index(qubits: int) -> dict[str, dict]:
    """preset + case_ids per concept, derived from the spec rather than stored.

    The single-qubit spec carries both already. The two-qubit one carries only
    label and intro, so they are built here — from the spec's own cases, so the
    id sets stay disjoint and complete by construction rather than by a second
    hand-maintained copy that can drift.
    """
    spec = _spec(qubits)
    out: dict[str, dict] = {}
    for name in spec["concepts"]:
        cases = [c for c in spec["cases"] if c["concept"] == name]
        if not cases:
            continue
        chosen = next((c for c in cases if c["id"] == _PRESETS_2Q.get(name)), cases[0])
        out[name] = {
            "preset": {
                "case_id": chosen["id"],
                "label": chosen["label"],
                "num_qubits": chosen["num_qubits"],
                "qubit": chosen.get("qubit", 0),
                "gates": chosen["gates"],
            },
            "case_ids": [c["id"] for c in cases],
        }
    return out


def _qubits(value: int) -> int:
    """Validate the catalogue selector. 1 and 2 are the only catalogues there are."""
    if value not in (1, 2):
        raise HTTPException(status_code=400,
                            detail=f"qubits must be 1 or 2, got {value}.")
    return value


# ------------------------------------------------------------------ basics

@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "phase": 2,
        "catalogue": _spec(1).get("counts", {}),
        "catalogue_2q": _spec(2).get("counts", {}),
    }


@app.get("/api/gates")
def gates(qubits: int = Query(1, description="1 hides the two-qubit gates")):
    """Gate palette for the UI, with rotation metadata so it can show axes.

    `arity` and `needs_control` are what let the palette arm a two-step
    placement — click the control wire, then the target — for CX, CZ and SWAP.
    """
    _qubits(qubits)
    names = [g for g in qe.SUPPORTED_GATES
             if qubits == 2 or g not in qe.TWO_QUBIT_GATES]
    return {
        "gates": names,
        "fixed": sorted(qe.FIXED_GATES),
        "rotation": sorted(qe.ROTATION_GATES),
        "two_qubit": sorted(qe.TWO_QUBIT_GATES) if qubits == 2 else [],
        "detail": [
            {
                "name": g,
                "arity": 2 if g in qe.TWO_QUBIT_GATES else 1,
                "needs_control": g in qe.TWO_QUBIT_GATES,
                "needs_angle": g in qe.ROTATION_GATES,
                "family": "two-qubit" if g in qe.TWO_QUBIT_GATES
                          else "rotation" if g in qe.ROTATION_GATES else "fixed",
                "rotation": qe.rotation_for(g, [0.0]) if g in qe.ROTATION_GATES
                            else qe.rotation_for(g, []),
                # Teaching card for the palette: what this gate is, on its own.
                "info": ex2.gate_info2(g) or ex.gate_info(g),
            }
            for g in names
        ],
    }


# ------------------------------------------------------------------ concepts

@app.get("/api/concepts")
def concepts(qubits: int = Query(1, description="Which catalogue: 1 or 2 qubits")):
    """The concepts of one catalogue, each with one runnable preset circuit.

    Six at one qubit, eight at two — entanglement and separability only mean
    something once wires can interact.

    Merged at request time with the analogy and real-world hooks from explain.py.
    Kept out of the spec files on purpose: they are golden data verified against
    Qiskit, and framing text has no business forcing a regeneration.
    """
    _qubits(qubits)
    index = _concept_index(qubits)
    # Spec-supplied preset/case_ids win where they exist; the derived ones only
    # fill the gap in the two-qubit catalogue.
    return {
        name: {**index.get(name, {}), **meta,
               **ex.concept_extras(name), **ex2.concept_extras2(name)}
        for name, meta in _spec(qubits)["concepts"].items()
    }


@app.get("/api/concepts/{name}")
def concept_detail(name: str, qubits: int = Query(1)):
    """One concept plus every circuit that demonstrates it."""
    _qubits(qubits)
    meta = _spec(qubits)["concepts"].get(name)
    if meta is None:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown concept '{name}'. Available: "
                   f"{', '.join(_spec(qubits)['concepts'])}",
        )
    return {
        **meta,
        "circuits": [
            {"id": c["id"], "label": c["label"], "gates": c["gates"],
             "summary": c["explain"]["summary"]}
            for c in _spec(qubits)["cases"] if c["concept"] == name
        ],
    }


# ------------------------------------------------------------------ circuits

@app.get("/api/circuits")
def circuits(concept: str | None = None, qubits: int = Query(1)):
    """Catalogue index. Optionally filtered by concept."""
    _qubits(qubits)
    cases = _spec(qubits)["cases"]
    if concept:
        cases = [c for c in cases if c["concept"] == concept]
    return {
        "count": len(cases),
        "num_qubits": qubits,
        "circuits": [
            {"id": c["id"], "concept": c["concept"], "label": c["label"],
             "summary": c["explain"]["summary"], "gate_count": len(c["gates"])}
            for c in cases
        ],
    }


@app.get("/api/circuits/{case_id}")
def circuit_detail(case_id: str, qubits: int = Query(1)):
    """One circuit: its gates plus the full teaching block.

    The two catalogues reuse ids, so `qubits` is what disambiguates S01 the
    single-qubit H circuit from S01 the two-qubit one.
    """
    _qubits(qubits)
    case = _cases_by_id(qubits).get(case_id.upper())
    if case is None:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown circuit '{case_id}' in the {qubits}-qubit catalogue.")
    return {
        "id": case["id"],
        "concept": case["concept"],
        "label": case["label"],
        "note": case.get("note"),
        "num_qubits": case["num_qubits"],
        "qubit": case["qubit"],
        "gates": case["gates"],
        "explain": case["explain"],
    }


# ------------------------------------------------------------------ simulate

@app.post("/api/simulate")
def simulate(req: SimulateRequest):
    """Run a circuit and return a full state snapshot after every gate."""
    try:
        return qe.simulate(
            gates=[g.model_dump() for g in req.gates],
            num_qubits=req.num_qubits,
            qubit=req.qubit,
        )
    except ValueError as exc:
        # Unsupported gate, missing angle, out-of-range target: the caller's
        # problem to fix, so 400 rather than a 500.
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/explain")
def explain_circuit(req: SimulateRequest, concept: str | None = Query(None)):
    """Teaching content for ANY circuit, not just the catalogue ones.

    The golden spec only carries explain blocks for its 104 circuits, so a circuit
    the user builds by hand had nothing to say about itself. explain.explain()
    already works off the gate list plus the simulated result, so this exposes it:
    a per-gate reference card for every gate placed, plus the concept the whole
    circuit now demonstrates.

    Separate from /api/simulate so that response shape stays exactly as specified.

    Routes to explain2 at two qubits: that generator reads the two-qubit snapshot
    shape (bloch as a list, plus an entanglement block), and it is the only one
    that can say anything about concurrence.

    `concept` is an optional hint for when the caller already knows what the
    circuit is *for*. Several catalogue circuits demonstrate more than one thing
    at once — H·H·CZ is genuinely entangled, so inference calls it entanglement,
    but it is filed under phase because the lesson is that a sign flip moves no
    probability bar. Opening the phase demo and being taught entanglement is a
    worse answer than either. An unrecognised hint is ignored, not an error.
    """
    gates = [g.model_dump() for g in req.gates]
    try:
        result = qe.simulate(gates=gates, num_qubits=req.num_qubits, qubit=req.qubit)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    hint = concept if concept in _spec(req.num_qubits)["concepts"] else None
    if req.num_qubits == 2:
        block = ex2.explain2(
            {"gates": gates, "concept": hint or ex2.infer_concept2(gates, result)}, result)
    else:
        block = ex.explain(
            {"gates": gates, "concept": hint or ex.infer_concept(gates, result)}, result)

    # One card per placed gate, carrying the angle actually used so the text can
    # never quote a different number than the circuit strip shows.
    cards = []
    for i, g in enumerate(gates):
        card = ex2.gate_info2(g["gate"]) or ex.gate_info(g["gate"])
        if card is None:
            continue
        params = g.get("params") or []
        cards.append({**card, "index": i, "step": i + 1,
                      "angle": params[0] if params else None,
                      "target": g.get("target"), "control": g.get("control")})

    return {
        "num_qubits": req.num_qubits,
        "gates": gates,
        "concept": block["concept"],
        "explain": block,
        "gate_cards": cards,
    }
