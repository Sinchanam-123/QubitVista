"""Quantum simulation engine for QubitVista — one- and two-qubit gates.

Pure and dependency-light: gates in, dicts out. No FastAPI imports, so it can be
tested and driven without the server.

Produces the full PROJECT_GUIDE.md /api/simulate contract — one snapshot per gate, each
carrying statevector amplitudes (with magnitude and phase), all basis-state
probabilities, Bloch coordinates with true length, and the rotation that took the
previous Bloch vector to this one.

Two response shapes, chosen by num_qubits, because Phase 1 is frozen:

    num_qubits == 1   bloch is an OBJECT, no control, no entanglement block
    num_qubits >= 2   bloch is a LIST (one entry per qubit, each with purity),
                      every step carries `control` and `entanglement`

Two shapes on one route is cheaper than migrating Phase 1: the alternative
touches conformance_test.py, tests_phase1.py and four frontend components for
no user-visible gain.

Verified against both golden specs:
    python conformance_test.py    --engine quantum_engine     # 104 circuits, 1 qubit
    python conformance_test_2q.py --engine quantum_engine     #  77 circuits, 2 qubits
"""
from __future__ import annotations

import math
from typing import Any

import numpy as np
from qiskit import QuantumCircuit
from qiskit.quantum_info import (DensityMatrix, Pauli, Statevector, concurrence,
                                 partial_trace)

PI = math.pi
_INV_SQRT2 = 1 / math.sqrt(2)

# --------------------------------------------------------------- gate tables

FIXED_GATES = {"I", "X", "Y", "Z", "H", "S", "SDG", "T", "TDG"}
ROTATION_GATES = {"RX", "RY", "RZ", "P"}
TWO_QUBIT_GATES = {"CX", "CZ", "SWAP"}
SUPPORTED_GATES = sorted(FIXED_GATES | ROTATION_GATES | TWO_QUBIT_GATES)

# CNOT is the name most textbooks use, so users will type it. Resolved to the
# canonical CX before anything else looks at the name.
_ALIASES = {"CNOT": "CX"}

# Still refused, with a clearer message than "unknown gate".
PHASE_3_GATES = {"CCX", "TOFFOLI", "CSWAP", "FREDKIN", "CY", "CH"}

# Friendly name -> QuantumCircuit method. Note: identity is .id(), there is no .i().
_QISKIT_METHOD = {
    "I": "id", "X": "x", "Y": "y", "Z": "z", "H": "h",
    "S": "s", "SDG": "sdg", "T": "t", "TDG": "tdg",
    "RX": "rx", "RY": "ry", "RZ": "rz", "P": "p",
    "CX": "cx", "CZ": "cz", "SWAP": "swap",
}

# Static axis/angle lookup. Every single-qubit gate is, up to global phase, a
# rotation of the Bloch vector. Deriving this from the unitary is possible but
# needlessly fiddly for a fixed gate set — a table is simpler and testable.
# Axes are unit length.
_FIXED_ROTATION: dict[str, tuple[list[float], float]] = {
    "X":   ([1.0, 0.0, 0.0], PI),
    "Y":   ([0.0, 1.0, 0.0], PI),
    "Z":   ([0.0, 0.0, 1.0], PI),
    "S":   ([0.0, 0.0, 1.0], PI / 2),
    "SDG": ([0.0, 0.0, 1.0], -PI / 2),
    "T":   ([0.0, 0.0, 1.0], PI / 4),
    "TDG": ([0.0, 0.0, 1.0], -PI / 4),
    "H":   ([_INV_SQRT2, 0.0, _INV_SQRT2], PI),
    # Identity has no meaningful axis at angle 0. Return a stable dummy rather
    # than null so the frontend never has to branch; the rotation is a no-op.
    "I":   ([0.0, 0.0, 1.0], 0.0),
}

_ROTATION_AXIS: dict[str, list[float]] = {
    "RX": [1.0, 0.0, 0.0],
    "RY": [0.0, 1.0, 0.0],
    "RZ": [0.0, 0.0, 1.0],
    "P":  [0.0, 0.0, 1.0],
}


def _r6(x: Any) -> float:
    """Round to 6 dp. The whole contract is specified at this precision."""
    return round(float(x), 6)


# --------------------------------------------------------------- validation

def _normalize(op: dict[str, Any]) -> tuple[str, int, int | None, list[float]]:
    """Pull a gate op apart and reject anything unsupported.

    Raises ValueError, which the API layer turns into HTTP 400. Never skip a
    gate silently — a dropped gate produces a plausible-looking wrong answer,
    which is the worst failure mode there is for a teaching tool. That is also
    why a control on a single-qubit gate is rejected rather than ignored.
    """
    raw = op.get("gate")
    if not raw:
        raise ValueError("Each gate entry needs a 'gate' name.")

    name = str(raw).upper()
    name = _ALIASES.get(name, name)

    if name in PHASE_3_GATES:
        raise ValueError(
            f"Gate '{name}' acts on three or more qubits and is not supported. "
            f"Supported: {', '.join(SUPPORTED_GATES)}"
        )
    if name not in SUPPORTED_GATES:
        raise ValueError(
            f"Unsupported gate '{raw}'. Supported: {', '.join(SUPPORTED_GATES)}"
        )

    target = int(op.get("target", 0) or 0)
    params = [float(p) for p in (op.get("params") or [])]

    if name in ROTATION_GATES and not params:
        raise ValueError(f"Gate '{name}' requires one rotation angle, in radians.")

    control = op.get("control")
    if name in TWO_QUBIT_GATES:
        if control is None:
            raise ValueError(f"Gate '{name}' needs a 'control' qubit as well as a target.")
        control = int(control)
        if control == target:
            raise ValueError(
                f"Gate '{name}' has control and target both on qubit {target}. "
                f"A two-qubit gate needs two different wires."
            )
    elif control is not None:
        raise ValueError(f"Gate '{name}' acts on one qubit and takes no 'control'.")

    return name, target, control, params


def rotation_for(name: str, params: list[float]) -> dict[str, Any] | None:
    """Axis/angle describing this gate's rotation of the Bloch vector.

    Applying Rodrigues' formula with these values to the previous step's Bloch
    vector must reproduce this step's. A sign error here animates the sphere
    backwards and nothing else in the test suite catches it.

    None for CX/CZ/SWAP: an entangling gate is not a rotation of any single
    Bloch sphere, so there is no axis to hand the animator. The frontend must
    null-check this rather than assume an axis is always there.
    """
    if name in TWO_QUBIT_GATES:
        return None
    if name in _FIXED_ROTATION:
        axis, angle = _FIXED_ROTATION[name]
        return {"axis": [_r6(v) for v in axis], "angle": _r6(angle)}
    if name in _ROTATION_AXIS:
        return {"axis": [_r6(v) for v in _ROTATION_AXIS[name]], "angle": _r6(params[0])}
    return None


# --------------------------------------------------------------- extraction

def _amplitudes(sv: Statevector) -> list[dict[str, float]]:
    """Complex amplitudes as {re, im, magnitude, phase}.

    magnitude and phase are included so the frontend can colour by phase without
    recomputing — phase is the only channel in which an S or T gate is visible.

    "Is this zero" is decided on the ROUNDED magnitude, not the raw one. An
    amplitude whose raw magnitude sits between 1e-12 and 5e-7 would otherwise
    serialize as magnitude 0.000000 while still carrying a phase, and the
    frontend would draw an empty bar with a phase dial pointing somewhere —
    indistinguishable from a rendering bug. The `+ 0.0` kills negative zero,
    which serializes as -0.0.
    """
    out = []
    for z in sv.data:
        mag = _r6(abs(z))
        if mag == 0.0:
            # Phase of a zero amplitude is undefined; 0.0 by convention.
            out.append({"re": 0.0, "im": 0.0, "magnitude": 0.0, "phase": 0.0})
        else:
            out.append({
                "re": _r6(z.real) + 0.0,
                "im": _r6(z.imag) + 0.0,
                "magnitude": mag,
                "phase": _r6(math.atan2(z.imag, z.real)) + 0.0,
            })
    return out


def _probabilities(sv: Statevector, num_qubits: int) -> dict[str, float]:
    """Every basis state, including zero-probability ones.

    The frontend needs a stable set of bars; omitting zeros makes them jump.
    """
    return {
        format(i, f"0{num_qubits}b"): _r6(abs(z) ** 2)
        for i, z in enumerate(sv.data)
    }


def _bloch(sv: Statevector, qubit: int, with_purity: bool = False) -> dict[str, float]:
    """Bloch coordinates plus true vector length, for one qubit of the register.

    length is 1.0 for any single-qubit pure state, so at one qubit it doubles as
    a correctness invariant. At two it drops toward 0 under entanglement, and
    that fall *is* the entanglement — never normalize it away.

    purity is only emitted on the two-qubit path, where it is the second,
    independently computed view of the same quantity: purity = (1 + length²)/2.
    Phase 1's golden data has no such field and tests_phase1 compares the bloch
    dict by equality, so adding it there would break a frozen contract.
    """
    dm = DensityMatrix(sv)
    if dm.num_qubits > 1:
        dm = partial_trace(dm, [q for q in range(dm.num_qubits) if q != qubit])

    x, y, z = (float(np.real(dm.expectation_value(Pauli(p)))) for p in ("X", "Y", "Z"))
    out = {
        "x": _r6(x), "y": _r6(y), "z": _r6(z),
        "length": _r6(math.sqrt(x * x + y * y + z * z)),
    }
    if with_purity:
        out["purity"] = _r6(float(np.real(dm.purity())))
    return out


def _entanglement(sv: Statevector, num_qubits: int) -> dict[str, float | None]:
    """Concurrence, 0 for a separable pair and 1 for a Bell state.

    Defined here only for a pair; anything else reports null rather than a
    number that would mean something different. Qiskit computes concurrence via
    sqrt(1 - purity), and float drift on a near-pure state can push that
    negative and yield NaN — so clamp, and flatten the sub-1e-6 dust to a clean
    zero so "separable" reads as exactly 0 in the UI.
    """
    if num_qubits != 2:
        return {"concurrence": None}
    # errstate, because the sqrt of a slightly-negative float is where the NaN
    # comes from and NumPy warns on every near-pure state — which is most of
    # them. The clamp below is the actual handling; this only stops the noise.
    with np.errstate(invalid="ignore"):
        raw = float(concurrence(sv))
    value = _r6(0.0 if (raw != raw or raw < 0) else raw)
    return {"concurrence": 0.0 if value < 1e-6 else value}


def _snapshot(sv: Statevector, num_qubits: int, qubit: int, step: int,
              gate: str | None = None, target: int | None = None,
              control: int | None = None,
              rotation: dict | None = None) -> dict[str, Any]:
    """One step of the contract. Shape depends on the register size — see the
    module docstring; the single-qubit shape is frozen."""
    snap = {
        "step": step,
        "gate": gate,
        "target": target,
        "rotation": rotation,
        "statevector": _amplitudes(sv),
        "probabilities": _probabilities(sv, num_qubits),
    }
    if num_qubits == 1:
        snap["bloch"] = _bloch(sv, qubit)
        return snap

    # Two-qubit shape: one sphere per wire, plus the fields that only mean
    # something once wires can interact.
    snap["control"] = control
    snap["bloch"] = [_bloch(sv, q, with_purity=True) for q in range(num_qubits)]
    snap["entanglement"] = _entanglement(sv, num_qubits)
    # `control` reads better next to `target`; dict order is what FastAPI
    # serializes, and the UI's step inspector lists the keys as they arrive.
    return {k: snap[k] for k in ("step", "gate", "target", "control", "rotation",
                                 "statevector", "probabilities", "bloch",
                                 "entanglement")}


# --------------------------------------------------------------- public API

def simulate(gates: list[dict[str, Any]], num_qubits: int = 1,
             qubit: int = 0) -> dict[str, Any]:
    """Run the circuit, capturing the full state after every gate.

    steps[0] is the initial |0...0> state before any gate; steps[k] is the state
    after the first k gates. That indexing is what lets the UI scrub through the
    circuit without re-requesting anything, so keep it exact.

    An empty gate list is valid and returns exactly one step — it's what the
    sphere shows on page load.
    """
    if num_qubits < 1:
        raise ValueError("num_qubits must be at least 1.")
    if num_qubits > 2:
        raise ValueError(
            f"num_qubits {num_qubits} is beyond this build — one and two qubits "
            f"are supported."
        )
    if not 0 <= qubit < num_qubits:
        raise ValueError(f"qubit index {qubit} is outside 0..{num_qubits - 1}.")

    # Validate everything up front so a bad gate at position 9 doesn't leave a
    # half-simulated circuit behind.
    ops = [_normalize(op) for op in gates]

    sv = Statevector.from_instruction(QuantumCircuit(num_qubits))
    steps = [_snapshot(sv, num_qubits, qubit, 0)]

    for i, (name, target, control, params) in enumerate(ops, start=1):
        for wire, role in ((target, "targets"), (control, "controls")):
            if wire is not None and not 0 <= wire < num_qubits:
                raise ValueError(
                    f"Gate '{name}' {role} qubit {wire}, outside 0..{num_qubits - 1}."
                )

        # Evolve by one gate at a time so each snapshot reflects exactly one step.
        one = QuantumCircuit(num_qubits)
        method = getattr(one, _QISKIT_METHOD[name])
        if control is not None:
            method(control, target)
        elif params:
            method(params[0], target)
        else:
            method(target)
        sv = sv.evolve(one)

        steps.append(_snapshot(sv, num_qubits, qubit, i, name, target, control,
                               rotation_for(name, params)))

    return {"num_qubits": num_qubits, "steps": steps, "final": steps[-1]}
