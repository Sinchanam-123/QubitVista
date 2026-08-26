# PROJECT_GUIDE.md

Engineering guide for QubitVista. Read this before making changes — it records
the API contract, the physics conventions that are easy to get wrong, and the
reasoning behind decisions that look arbitrary from the code alone.

## What this is

QubitVista — a browser-based quantum circuit simulator built for **learning**, not for research-grade computation. The whole point is that a beginner can watch a qubit move: Bloch sphere rotations, statevector amplitudes, and measurement probabilities updating as gates are added.

Final-year major project (2025-26).

## Phase plan — read this first

### Phase 1 (done) — single-qubit gates

Backend first. Frontend after the API is stable and tested.

Two non-negotiable features:

1. **Step-by-step state evolution.** Every gate produces a full state snapshot. Never a final-state-only response.
2. **Bloch sphere data for every gate.** Every snapshot carries Bloch coordinates, not just the last one.

Phase 1 teaches six concepts. Every backend feature should trace back to one of them:

| Concept | Demonstrated by | Backend must expose |
|---|---|---|
| **State evolution** | Any multi-gate circuit, stepped through one gate at a time | Full per-step snapshots + rotation axis/angle per gate |
| **Superposition** | `H` on \|0⟩ → \|+⟩ | Bloch vector moving pole → equator; 50/50 probabilities |
| **Phase** | `Z`, `S`, `T`, `RZ`, `P` | Complex amplitudes with **magnitude + phase angle**; Bloch rotation about Z while probabilities stay flat |
| **Interference** | `H → RZ(θ) → H` | Per-step amplitudes showing cancellation/reinforcement |
| **Measurement** | `RY(θ)` for non-trivial probabilities | All basis-state probabilities, every step; optional shot sampling |
| **Reversibility** | `S, S†` · `T, T†` · `H, H` · `X, X` | Final snapshot identical to `steps[0]` |

**State evolution is Objective 2 in the project report**, and "Absence of Step-by-Step State Evolution" is the headline gap in the problem statement. It is also the delivery mechanism for the other five concepts — they are all observed *through* the step sequence. Treat it as the project's central contribution, not a convenience feature.

Reversibility is a first-class concept, not a footnote under state evolution. It has its own preset, its own case set in the spec, and it's the cleanest single demonstration that quantum evolution is unitary: run a gate and its inverse, land exactly where you started. `SDG`/`TDG` exist in the gate set specifically to make it demonstrable.

Related properties state evolution also teaches:

- **Unitarity** — probabilities always sum to 1, at every step, no matter the circuit.
- **Determinism** — evolution between measurements is fully deterministic. Randomness enters only at measurement.
- **Continuity** — the state traces a continuous rotation path on the sphere; it does not teleport between positions.

**Phase 1 is one qubit**, and it is now **frozen**. `circuits_spec.json`, `tests_phase1.py`, and the single-qubit response shape are a regression suite from here on: `python conformance_test.py --engine quantum_engine` must keep exiting 0 after every change.

### Phase 2 (current) — two-qubit gates and entanglement

`CX`, `CZ`, `SWAP`, per-qubit reduced states via `partial_trace`, correlated measurement outcomes, and **entanglement**. Golden data is `circuits_spec_2q.json`: **77 circuits, 272 snapshots, 8 concepts**.

Entanglement lives here for a hard physical reason, not an arbitrary scoping one: single-qubit gates are tensor-product operations and mathematically **cannot** create entanglement. They preserve separability. A Bell state requires at least one two-qubit gate, so entanglement is impossible to demonstrate until `CX` exists.

For a Bell state each qubit's reduced state is maximally mixed, so its Bloch vector **shrinks to the origin** — the sphere visibly goes empty. That is why `bloch.length` was in the response from day one and why it must never be normalized.

The eight concepts, and the two that are new:

| Concept | Circuits | Note |
|---|---|---|
| superposition · phase · interference · measurement · state_evolution · reversibility | 57 | the Phase 1 six, widened to two wires |
| **entanglement** | 12 | the pair has a state, neither qubit does |
| **separability** | 8 | the counterexample — a two-qubit gate that never entangles |

`separability` is not filler. Without it, "two-qubit gate" gets read as "entangling gate", and `SWAP` quietly disproves that.

**Two qubits is the cap.** `num_qubits` is validated to 1 or 2 in `schemas.py` and in the engine. Three or more qubits, GHZ states, phase kickback, Bell-basis as its own concept, and algorithms of any kind are out of scope. If a task seems to need them, stop and ask.

## Stack

| Layer | Tool |
|-------|------|
| Simulation | Qiskit (`qiskit.quantum_info`) |
| API | FastAPI |
| Validation | Pydantic **v2** — see note |
| Server | uvicorn |
| 3D (later) | Three.js |
| 2D plots (later) | Plotly |
| Frontend build (later) | Vite |

Python 3.10+. **Do not add dependencies without asking.**

> **Why Pydantic is called out:** it isn't a separate choice — FastAPI depends on it and installs it automatically. The **v2** is the part that matters. Pydantic v1 and v2 have different method names, and v1 syntax is still all over older tutorials and training data. Use `model_dump()` not `.dict()`, `model_validate()` not `.parse_obj()`, `@field_validator` not `@validator`. Without this line, deprecated v1 syntax tends to creep in.

## Layout

```
qubitvista/
├── PROJECT_GUIDE.md
├── README.md
├── backend/
│   ├── main.py                # FastAPI app + routes (thin)
│   ├── quantum_engine.py      # PRODUCTION engine — all Qiskit logic, no FastAPI imports
│   ├── explain.py             # teaching text, 1 qubit
│   ├── explain2.py            # teaching text, 2 qubits
│   ├── schemas.py             # Pydantic v2 request models
│   ├── requirements.txt
│   ├── circuits_spec.json     # DATA — golden: 104 circuits, 359 verified snapshots
│   ├── circuits_spec_2q.json  # DATA — golden:  77 circuits, 272 verified snapshots
│   ├── conformance_test.py    # contract gate, 1 qubit
│   ├── conformance_test_2q.py # contract gate, 2 qubits
│   ├── fuzz2.py               # property-based: 11 invariants on random circuits
│   ├── engine_ref.py          # independent reference implementation, 1 qubit
│   ├── engine2.py             # independent reference implementation, 2 qubits
│   ├── tests_phase1.py        # 40 fast unit tests, 1 qubit
│   └── tests_phase2.py        # 35 fast unit tests, 2 qubits
├── frontend/
│   └── src/
│       ├── pages/             # Home · About · Explore · Simulator · SimulatorTwo · Learn · Exit
│       ├── components/        # palette, Bloch spheres, circuit strips, readouts
│       ├── hooks/             # useSimulation · useSimulation2
│       ├── data/              # DATA — learnContent.js, generated, ~120 KB
│       └── utils/             # api.js · quantumEngine.js · quantumEngine2.js
└── docs/
    ├── QubitVista_Circuit_Plates.html      # DATA — visual catalogue, ~950 KB
    ├── QubitVista_TwoQubit_Catalogue.html  # DATA — visual catalogue, ~660 KB
    └── learn_reference.md                  # DATA — Learn page source, ~98 KB
```

### The Learn page content is generated

`docs/learn_reference.md` is the source of truth for `/learn`: 8 concepts, 16 gates
and the real-world section, written as plain markdown. It is converted into the
block format `Learn.jsx` renders and committed as
`frontend/src/data/learnContent.js` — **35 sections, ~95 k characters**.

Edit the markdown and re-run the converter; do not hand-patch the generated
blocks, they will be overwritten. The converter promotes `### History`,
`### Real-world…` and misconception subsections into the page's tinted callouts,
and leaves tables and code fences as their own block types.

**Hard rule:** no quantum logic in route handlers, no FastAPI imports in `quantum_engine.py`. The engine must be testable and runnable without the server.

### Reference engines, on purpose

`quantum_engine.py` is what the API imports and what ships. `engine_ref.py` and `engine2.py` are deliberately separate implementations that the two conformance suites use as their default target, so the golden specs can be checked without the production code. Keeping independent implementations agreeing on 631 snapshots is the point — **do not merge, delete, or "de-duplicate" them**, and do not import one from another.

### Do not read these into context

The two spec JSONs (~450 KB and ~485 KB), the two catalogue HTMLs (~950 KB and
~660 KB), `docs/learn_reference.md` (~98 KB) and the `learnContent.js` it
generates (~120 KB) are all data, not source. Reading any of them costs six figures of tokens and teaches you nothing you can't get from this file. Access the specs programmatically:

```python
import json; spec = json.load(open("circuits_spec_2q.json"))
spec["counts"]; spec["gate_set"]; spec["concepts"].keys()
[c["id"] for c in spec["cases"] if c["concept"] == "entanglement"]
```

Or from the shell: `python -c "import json;d=json.load(open('circuits_spec.json'));print(d['counts'])"`. If you need to see one circuit, print that one case — never the file.

## Commands

```bash
# setup (from backend/)
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# run
uvicorn main:app --reload --port 8000

# interactive testing without a frontend
# http://localhost:8000/docs

# frontend
cd frontend && npm install && npm run dev     # http://localhost:5173

# unit tests (named tests_*.py, so pass them explicitly — bare `pytest`
# collects nothing)
pytest tests_phase1.py tests_phase2.py

# correctness gate — the build is done when ALL SIX exit 0 (this is CI)
python conformance_test.py    --engine quantum_engine
python conformance_test_2q.py --engine quantum_engine
python verify_live.py         --engine quantum_engine --trials 3000
python verify_live.py         --engine quantum_engine --trials 3000 --qubits 2
python fuzz2.py 20000
cd ../frontend && node cross_engine_test.mjs        # or: npm run verify

# also useful
python conformance_test.py    --endpoint http://localhost:8000/api/simulate
python conformance_test_2q.py --endpoint http://localhost:8000/api/simulate
python verify_live.py --endpoint http://localhost:8000/api/simulate
python verify_live.py --engine quantum_engine --qubits 2 \
  --circuit '[{"gate":"H","target":0},{"gate":"CX","control":0,"target":1}]'
```

## The golden specs

`circuits_spec.json` (**104 circuits, 359 snapshots**, 1 qubit) and `circuits_spec_2q.json` (**77 circuits, 272 snapshots**, 2 qubits) are the source of truth. Every gate is exercised, every value was produced by Qiskit and independently re-derived with raw NumPy including the little-endian bit order. Both carry the `rotation` axis/angle per step, checked against Rodrigues' rotation formula so the animation data is provably correct and not merely plausible.

Rules:

- **If conformance fails, the backend is wrong.** Do not loosen a tolerance and do not edit a spec to match the code.
- **Never hand-edit expected values.** If a spec genuinely needs to change, regenerate it from Qiskit.
- **Counts live in `spec["counts"]`** and are read at runtime. Don't hardcode 104/359 or 77/272 anywhere — they change when circuits are added.
- Tolerance is `1e-6`, matching the specs' 6 dp rounding.
- **The two catalogues reuse case ids** — there is an `S01` in each. Anything that looks a case up must say which catalogue.

`fuzz2.py` covers what the specs cannot: 11 invariants over tens of thousands of random circuits nobody wrote down. It defaults to the reference engine; pass `--engine quantum_engine` to point it at the one that ships.

### `verify_live.py` — the one that isn't circular

Every other backend test compares against values **Qiskit produced**. If Qiskit were being driven incorrectly — wrong qubit order, wrong convention — they would all agree with the mistake in unison.

`verify_live.py` recomputes the whole state in **plain NumPy with no Qiskit anywhere**: textbook gate matrices, explicit partial trace, Wootters concurrence. Two independent implementations agreeing to 6 dp is evidence; one implementation agreeing with itself is not. It also checks `rotation` *semantically* — applying the reported axis and angle to the previous step's Bloch vector with Rodrigues' formula and confirming it lands on the current one, which is the only thing that catches a sign error.

`--circuit '[...]'` answers "is this one circuit right?" and a failing fuzz trial prints a ready-to-paste command for the case it found.

### `cross_engine_test.mjs` — the browser engines

`quantumEngine.js` and `quantumEngine2.js` are a second implementation of the physics, and until this existed nothing tested them. They are what a user sees when the backend is unreachable, so a drift there shows wrong numbers **with no warning at all**. It replays both golden specs through them comparing *every prefix*, so per-step evolution is covered and not just final states. Plain Node, no dependencies, no build step; it copies the engines to a temp dir to fill in the extensionless imports Vite resolves and Node doesn't, and never touches the source.

## API contract

Do not change these shapes without saying so explicitly — the frontend will be built against them.

```
GET  /api/health                 -> {"status": "ok"}
GET  /api/gates                  -> {"gates": [...]}     # UI gate palette
GET  /api/concepts               -> concept metadata + one preset circuit each
GET  /api/concepts/{name}        -> that concept's full case list
GET  /api/circuits               -> catalogue index (id, concept, label)
GET  /api/circuits/{case_id}     -> one circuit's gates + explain block
POST /api/simulate               -> run any circuit
POST /api/explain                -> teaching content for a hand-built circuit
```

**Every catalogue route takes `?qubits=1` (default) or `?qubits=2`.** The two specs reuse case ids, so that parameter is what disambiguates `S01` the single-qubit `H` circuit from `S01` the two-qubit one. Defaulting to 1 is what let the Phase 1 frontend keep working unchanged.

`/api/gates?qubits=2` adds `CX`, `CZ` and `SWAP`, and every entry reports `arity` and `needs_control` so the palette knows which gates need two wires.

`/api/explain` takes an optional `?concept=` hint. Several catalogue circuits demonstrate more than one thing at once — `H·H·CZ` genuinely is entangled, so inference calls it entanglement, but it is filed under *phase* because the lesson is that a sign flip moves no probability bar. When the caller knows what the circuit is *for*, it says so; an unrecognised hint is ignored rather than an error.

### `POST /api/simulate`

Request:
```json
{
  "num_qubits": 1,
  "qubit": 0,
  "gates": [
    { "gate": "H", "target": 0 },
    { "gate": "RZ", "target": 0, "params": [1.5708] }
  ]
}
```

Response:
```json
{
  "num_qubits": 1,
  "steps": [
    {
      "step": 0,
      "gate": null,
      "target": null,
      "rotation": null,
      "statevector": [
        { "re": 1.0, "im": 0.0, "magnitude": 1.0, "phase": 0.0 },
        { "re": 0.0, "im": 0.0, "magnitude": 0.0, "phase": 0.0 }
      ],
      "probabilities": { "0": 1.0, "1": 0.0 },
      "bloch": { "x": 0.0, "y": 0.0, "z": 1.0, "length": 1.0 }
    }
  ],
  "final": {}
}
```

Four fields exist for specific reasons — don't strip them as redundant:

- **`steps`** serves *state evolution*, and through it every other concept. `steps[0]` is the initial |0⟩ state before any gate; each later entry is the state immediately after that gate.
- **`rotation`** serves *state evolution*. See below.
- **`magnitude` + `phase`** (phase in radians, from `atan2(im, re)`) serve the *phase* concept. `re`/`im` alone force the frontend to recompute, and phase colouring is the main way phase becomes visible. Phase of a zero amplitude is undefined — return `0.0`.
- **`bloch.length`** = `sqrt(x² + y² + z²)`. At one qubit this is a **correctness invariant**: a single-qubit pure state always has length 1.0, so any deviation means a bug. At two it is the visual signature of entanglement (maximally mixed → 0.0). **Never normalize the Bloch vector to unit length** — that would erase the Phase 2 physics and hide Phase 1 bugs.

### Two response shapes, chosen by `num_qubits`

Phase 1's shape is frozen, so the two-qubit response is a second shape on the same route rather than a migration. Migrating would touch `conformance_test.py`, `tests_phase1.py` and four frontend components for no user-visible gain.

| | `num_qubits: 1` | `num_qubits: 2` |
|---|---|---|
| `bloch` | object | **list**, one per qubit, each with an extra `purity` |
| `control` | absent | present on every step, `null` for single-qubit gates |
| `entanglement` | absent | `{"concurrence": float}` |
| `rotation` | never null after step 0 | **null on `CX`/`CZ`/`SWAP`** |

```jsonc
// two qubits
"control": 0,
"bloch": [ { "x": 0.0, "y": 0.0, "z": 0.0, "length": 0.0, "purity": 0.5 },
           { "x": 0.0, "y": 0.0, "z": 0.0, "length": 0.0, "purity": 0.5 } ],
"entanglement": { "concurrence": 1.0 }
```

**`rotation` being null on entangling gates is the rule that breaks the frontend if missed.** The animator applies Rodrigues' formula to `rotation.axis`; on a `CX` there is no axis, because the motion is not a rotation of either sphere. Null-check it — don't invent one.

Two independently computed quantities cross-check each other and are asserted by the suite: `purity = (1 + length²)/2`, and `length = √(1 − concurrence²)` for a pure pair. Neither is derived from the other.

### The `rotation` field

```json
"rotation": { "axis": [0.0, 0.0, 1.0], "angle": 1.5708 }
```

Every single-qubit gate is, up to global phase, a rotation of the Bloch vector by some angle about some axis. Without this, the frontend can only interpolate blindly between start and end positions — which draws a straight line *through the inside of the sphere* and misrepresents the motion. With it, the animation follows the true rotation arc. This is what makes state evolution visually *correct* rather than merely animated.

`null` for `step 0`, and `null` for `CX`/`CZ`/`SWAP`, where the concept doesn't apply.

The gate set is small and fixed, so this is a static per-gate lookup rather than something derived from the unitary matrix — simpler and easier to test:

| Gate | Axis | Angle |
|---|---|---|
| `X` / `RX(θ)` | (1, 0, 0) | π / θ |
| `Y` / `RY(θ)` | (0, 1, 0) | π / θ |
| `Z` / `RZ(θ)` / `P(λ)` | (0, 0, 1) | π / θ / λ |
| `S` / `S†` | (0, 0, 1) | ±π/2 |
| `T` / `T†` | (0, 0, 1) | ±π/4 |
| `H` | (1, 0, 1)/√2 | π |
| `I` | (0, 0, 1) | 0 |

`I` has no meaningful axis at angle 0. Return `(0, 0, 1)` anyway rather than `null` — a stable dummy keeps the frontend from branching, and the rotation is a no-op regardless. Axis vectors are always unit length.

**Correctness check:** applying Rodrigues' formula with a step's `axis` and `angle` to `steps[k-1].bloch` must reproduce `steps[k].bloch`. A sign error here animates the sphere backwards and no other test catches it.

### The `explain` block

Every circuit carries teaching content. This is a graded educational tool, not just a simulator — the text is what turns a Bloch vector into a lesson.

```json
"explain": {
  "concept": "phase",
  "concept_label": "Phase",
  "concept_intro": "The angle of a complex amplitude...",
  "summary": "A relative phase of +45° — visible on the sphere, invisible in the bars.",
  "what_happens": "H puts the qubit on the equator. The phase gate then rotates it...",
  "watch":    ["P(0) and P(1) are both 0.5000 — exactly as before.", "..."],
  "uses":     ["Grover's oracle marks the answer by flipping its phase alone.", "..."],
  "try_next": ["Add a final H to convert this invisible phase into a probability."]
}
```

| Field | Type | Content |
|---|---|---|
| `concept` | string | one of the six concept keys |
| `concept_label` / `concept_intro` | string | display name and one-line framing |
| `summary` | string | one line, shown beside the circuit |
| `what_happens` | string | the physics in plain English |
| `watch` | list, 2–4 | what moves **and what does not** — the teaching payload |
| `uses` | list, 1–3 | where this matters in real quantum computing |
| `try_next` | list, 1–2 | related circuits worth building next |

All eight fields are required and non-empty on every circuit; conformance enforces it.

**Generate this from the gate list plus the actual simulated result**, never from the gate list alone. Any number quoted in the text (`P(0) is 0.5000`, `+45°`) must be read from the simulation that produced the panels beside it. Text derived independently will eventually disagree with the display, and a physics tool that contradicts itself is worse than one that says nothing.

`watch` is the highest-value field. Naming what *doesn't* move is what teaches phase — "the bars are unchanged" is the entire lesson of an `S` gate.

### `GET /api/concepts`

Returns the six concepts with metadata and **one canonical preset circuit each**, for one-click demos:

```json
{
  "phase": {
    "label": "Phase",
    "intro": "The angle of a complex amplitude. Global phase is undetectable...",
    "preset": {
      "case_id": "P13",
      "label": "H,S",
      "num_qubits": 1,
      "qubit": 0,
      "gates": [{"gate":"H","target":0},{"gate":"S","target":0}]
    },
    "case_ids": ["P01","P02","..."]
  }
}
```

Current presets: `state_evolution` → C18 (`H,S,S,H,S`) · `superposition` → S01 (`H`) · `phase` → P13 (`H,S`) · `interference` → I23 (`H,RZ(π/3),H`) · `measurement` → M04 (`RY(π/3)`) · `reversibility` → V24 (`S,SDG`).

Presets are chosen to be *pedagogically* good, not minimal — the interference preset uses a partial angle so the result isn't a degenerate 0 or 1, and the state-evolution preset has five gates so there's something to scrub through.

`case_ids` lists every circuit for that concept; the sets are disjoint and cover all 104. Serve these straight from `circuits_spec.json` — don't maintain a second copy in code.

**Every preset must run clean through `/api/simulate` unmodified.** A test asserts this.

## Two viewing modes — build-time and playback

Step-by-step visualization happens in **two** situations, and both must work:

1. **Build mode — live, while the circuit is being made.** The user drops a gate and the Bloch sphere, statevector, and probability plots update *immediately*. This is what the README promises ("no re-running, no waiting"). Display `steps[last]`, animated in from the previous state using the new gate's `rotation`.
2. **Playback mode — stepping through a finished circuit.** The user scrubs back and forth through the gates they've placed. Display `steps[k]` for the selected `k`.

**Both modes read the same `steps` payload — no second endpoint, no API change.** `steps[k]` *is* the state after the first `k` gates, so "show me the circuit as it was three gates ago" is an array index, not a new request. Preserve this property; it's what keeps the two modes in agreement.

### Rules this implies

- **The backend is stateless.** The frontend owns the circuit and sends the complete gate list on every call. No sessions, no server-side circuit storage, no incremental patching.
- **Re-simulate the whole circuit on every edit.** For single-qubit circuits this is microseconds — cheap enough that caching partial states would be premature optimization *and* a desync risk. Deleting, reordering, or inserting a gate mid-circuit therefore needs no special handling; it's just another full re-simulate.
- **An empty circuit is valid.** `gates: []` must return exactly one step — the initial |0⟩ state. The sphere should show a vector at the north pole on page load, before the user places anything. Easy edge case to miss, and it's the first thing anyone sees. Spec case `E01` covers it.
- **Rapid edits will overlap.** Dragging an `RX(θ)` slider fires many requests and responses can arrive out of order, causing the sphere to jump backwards. Attach an incrementing request id and discard any response older than the newest one received.
- **Debounce parameter sliders (~50–100 ms), not gate drops.** A discrete gate placement should feel instant; a continuous drag should not flood the API.

## Physics conventions — easy to get wrong

- **Angles are radians.** Always.
- **Bloch coordinates** come from Pauli X/Y/Z expectation values.
- **Exact simulation via `Statevector`** — no `qiskit-aer`. Probabilities are analytic.
- **Return all basis states** in `probabilities`, including zero-probability ones. The frontend needs a stable set of bars.
- **Round floats to 6 dp** before serializing.
- **Never hand-write or approximate a quantum result.** If a number is needed, compute it with Qiskit. No hardcoded expected outputs in engine code — that's what the golden spec is for.
- **Qiskit is little-endian** — in a multi-qubit bitstring, qubit 0 is the *rightmost* character. `X` on q0 gives the outcome `01`, not `10`. Get this backwards and every histogram label is mirrored while every number stays plausible, which is exactly the kind of bug nothing catches. The golden values were re-derived in raw NumPy specifically to pin it.
- **A two-qubit gate is not a Bloch rotation.** `rotation` is `null` for `CX`, `CZ` and `SWAP` — there is no single axis that describes what they do to either sphere.
- **A two-qubit gate is not necessarily an entangling gate.** `SWAP` uses two wires and never entangles; `CZ` on `|00⟩` does nothing at all. The `separability` concept exists to make that concrete.
- **`QuantumCircuit` has no `.i()`** — the identity method is `.id()`.

### Gotcha 1 — global phase is invisible

`RX(π)` is **not** exactly `X`; they differ by a global phase factor. The Bloch sphere is identical, the statevector amplitudes are not: `X` on |0⟩ gives amplitude `re=1.0` on |1⟩, while `RX(π)` gives `im=-1.0`. Same for `RZ(π)` vs `Z`, and `P(π)` vs `Z`.

This is correct physics, not a bug — global phase is physically unobservable. But QubitVista shows amplitudes *and* the sphere side by side, so users **will** notice and ask. Don't "fix" it by normalizing the phase away; it's a teaching opportunity most tools can't offer because they hide one view or the other. Spec cases P30 and P32 pin both behaviours.

### Gotcha 2 — phase on a pole does nothing

`RZ` or `S` applied to |0⟩ or |1⟩ changes the statevector but produces **no visible change** on the sphere and **no change** in probabilities. Correct, not a bug. It's also the setup for interference: put the phase between two `H` gates and it becomes measurable.

## Supported gates

**Single-qubit** — fixed: `I X Y Z H S SDG T TDG` · rotations (1 angle, radians): `RX RY RZ P`

`SDG`/`TDG` are the inverses of `S`/`T`, and they carry the entire single-qubit reversibility concept.

**Two-qubit** — `CX CZ SWAP`. Each needs a `control` as well as a `target`, on two different wires. `CNOT` is accepted as an alias for `CX` — it is the name most textbooks use, so users type it — and normalizes to `CX` in the response.

At two qubits, reversibility is carried by the fact that `CX`, `CZ` and `SWAP` are each their own inverse: apply one twice and the state returns exactly.

Unknown gate name → raise `ValueError` in the engine → surface as HTTP 400 with a readable message. Never silently skip a gate. A three-qubit gate name (`CCX`, `CSWAP`, …) should produce a clear "not supported" message rather than a generic error. So should a rotation gate with no angle, a two-qubit gate with no control, a control equal to its target, and a wire outside `0..num_qubits-1`.

**Reject a stray `control` on a single-qubit gate; do not ignore it.** A silently dropped control produces a plausible-looking wrong answer, which is the worst failure mode a teaching tool has.

## Adding a gate — checklist

1. Add to the appropriate map in `quantum_engine.py` (`FIXED_GATES` or `ROTATION_GATES`).
2. Add its axis/angle entry to the rotation lookup.
3. Confirm it appears in `GET /api/gates`.
4. Add teaching text handling in `explain.py`.
5. Regenerate the affected spec cases from Qiskit — never hand-write them.
6. Update the gate list in this file and the README.

## Verification

`python conformance_test.py` is the real gate — it checks all 104 circuits against golden data, plus concept assertions, plus teaching-content completeness. The tables below are the human-readable summary of what it enforces; keep quick unit tests for them too, using `pytest.approx`.

### Core

| Circuit on \|0⟩ | Expected | Spec case |
|---|---|---|
| (no gates) | `bloch z = +1`, `length = 1` | E01 |
| `X` | `bloch z = -1` | P30 |
| `H` | `bloch x = +1` | S01 |
| `H, H` | `bloch z = +1` | S12 |
| `H, S` | `bloch y = +1` | P13 |
| `H, Z, H` | `bloch z = -1` (HZH = X) | V43 |
| `RX(π)` | `probabilities["1"] = 1.0` | P32 |

### Concept checks

| Concept | Circuit | Expected |
|---|---|---|
| State evolution — unitarity | *any* circuit | probabilities sum to `1.0` at **every** step |
| State evolution — continuity | `H, S, S, H, S` | each step's Bloch vector differs from the previous |
| State evolution — rotation | *any* circuit | Rodrigues(`bloch[k-1]`, `rotation[k]`) == `bloch[k]` |
| Reversibility | `S, SDG` · `T, TDG` · `H, H` · `X, X` | final state identical to `steps[0]` |
| Reversibility — composition | `S, S` ≡ `Z` · `T, T` ≡ `S` · `TDG, TDG` ≡ `SDG` | same Bloch vector as the single-gate equivalent |
| Superposition | `H` | `P(0) = P(1) = 0.5`, `length = 1` |
| Phase | `H` then `S` | probabilities **unchanged** at 50/50, but Bloch moves `x=+1 → y=+1` |
| Phase (invisible) | `RZ(π)` on \|0⟩ | `bloch z = +1`, unchanged — phase on a pole does nothing |
| Interference | `H, RZ(θ), H` | `P(1) = sin²(θ/2)` — parametric, several θ |
| Measurement | `RY(θ)` | `P(1) = sin²(θ/2)` |

Two of these are worth surfacing in the UI directly:

- `P(1) = sin²(θ/2)` from `H, RZ(θ), H` — wire θ to a slider and sweeping it shows invisible phase turning into measurable probability. Clearest interference demo available.
- `S, SDG` returning exactly home — the cleanest possible demonstration that quantum evolution is reversible.

### Structural

- `len(steps) == len(gates) + 1` for every request.
- Probabilities sum to `1.0` at every step (unitarity invariant — assert in a shared helper, not per-test).
- `bloch.length ≈ 1.0` at every step of every **single-qubit** circuit. Nothing there can reduce it; if it drops, something is wrong. At two qubits it may legitimately fall, but only ever to `√(1 − concurrence²)`.
- `steps[0].rotation` is `null`; every later step has a non-null `rotation` **except** `CX`/`CZ`/`SWAP`, where it must be `null`.
- A circuit with no two-qubit gate has concurrence `0.0` at **every** step. Single-qubit gates cannot entangle, so a non-zero value there is a bug by definition.
- Every preset from `/api/concepts` runs clean through `/api/simulate`, at both qubit counts.
- `case_ids` within a catalogue are disjoint and cover every case in that spec.

## Style

- Type hints everywhere; `from __future__ import annotations` at the top.
- Short docstrings explaining *why*, not restating the signature.
- Keep the engine dependency-light and pure — inputs in, dicts out.
- Prefer clarity over cleverness. This code gets read by evaluators.

## Out of scope right now

Three or more qubits · GHZ states · phase kickback · Bell basis as its own concept · algorithms of any kind · noise & error modeling · `qiskit-aer` · real hardware backends · circuit export.

Optional stretch, **ask before building:** a `shots` parameter returning sampled counts alongside analytic probabilities, to show sampling noise against the true distribution. `Statevector.sample_counts()` covers this with no new dependency.

## Frontend layout

Two simulator pages behind a chooser. `/explore` is where **Start exploring** lands; `/simulator` is one qubit, `/simulator/two-qubit` is two. The Phase 1 page was not modified to make room for the second — the split exists precisely so it didn't have to be.

| Page | Route |
|---|---|
| Chooser | `/explore` |
| Single qubit | `/simulator` (`?gates=H,S` · `?case=P13`) |
| Two qubits | `/simulator/two-qubit` (`?case=E01`) |

Shared components take an opt-in prop rather than being forked: `GatePalette` takes `groups`, `ProbabilityBars` and `StateVectorPanel` take `nQubits` (default 1). `BlochSphereClassic` is reused untouched — it already draws the vector at its true length, which is the one thing that makes an entangled pair readable.

Rules that carry across both pages:

- Animate *between* consecutive `steps`, using each step's `rotation.axis` and `rotation.angle` to follow the true arc. A naive straight-line interpolation between Bloch vectors cuts through the inside of the sphere and misrepresents the rotation. **Null-check `rotation` first** — on a `CX` there is no arc, and inventing one is worse than cutting straight.
- Give the user a step scrubber — play/pause, next/previous gate, jump to step. Step-by-step control is the point of the tool; auto-playing straight to the final state defeats it.
- Draw the Bloch vector at its true `length` rather than assuming 1.
- Use amplitude `phase` for colour, `magnitude` for bar height, so phase is visible even when probabilities are identical.
- Render `explain.watch` beside the panels it describes. It's the field that says what *didn't* move, which is invisible in the plots by definition.
- Label two-qubit outcomes `q1q0`, and say so on the page. Little-endian is the single most common thing to get wrong here.

### The offline engines

`quantumEngine.js` and `quantumEngine2.js` are exact client-side implementations, used for the instant first paint and as a fallback when the backend is down. They round to 6 dp exactly as the backend serializes, so the handover when the real reply lands is invisible. **They are a mirror, not a second source of truth** — if one disagrees with Qiskit, it is the one that is wrong.
