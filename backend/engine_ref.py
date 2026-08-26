"""Reference engine producing EXACTLY the PROJECT_GUIDE.md response contract.
No FastAPI imports. Inputs in, dicts out."""
from __future__ import annotations
import math
import numpy as np
from qiskit import QuantumCircuit
from qiskit.quantum_info import Statevector, DensityMatrix, Pauli, partial_trace

PI = math.pi
R2 = 1/math.sqrt(2)

FIXED_GATES   = {"I","X","Y","Z","H","S","SDG","T","TDG"}
ROTATION_GATES= {"RX","RY","RZ","P"}
SUPPORTED     = FIXED_GATES | ROTATION_GATES

# palette name -> QuantumCircuit method. QuantumCircuit has no .i(); it is .id().
QISKIT_METHOD = {"I":"id","X":"x","Y":"y","Z":"z","H":"h","S":"s","SDG":"sdg",
                 "T":"t","TDG":"tdg","RX":"rx","RY":"ry","RZ":"rz","P":"p"}

# static axis/angle lookup (PROJECT_GUIDE.md). Axis is unit length.
FIXED_ROTATION = {
    "X":([1.0,0.0,0.0], PI), "Y":([0.0,1.0,0.0], PI), "Z":([0.0,0.0,1.0], PI),
    "S":([0.0,0.0,1.0], PI/2), "SDG":([0.0,0.0,1.0], -PI/2),
    "T":([0.0,0.0,1.0], PI/4), "TDG":([0.0,0.0,1.0], -PI/4),
    "H":([R2,0.0,R2], PI),
    "I":([0.0,0.0,1.0], 0.0),   # angle 0: axis is arbitrary, kept stable for the frontend
}
ROTATION_AXIS = {"RX":[1.0,0.0,0.0], "RY":[0.0,1.0,0.0],
                 "RZ":[0.0,0.0,1.0], "P":[0.0,0.0,1.0]}

def rotation_for(gate: str, params):
    g = gate.upper()
    if g in FIXED_ROTATION:
        ax, an = FIXED_ROTATION[g]
        return {"axis": [r6(v) for v in ax], "angle": r6(an)}
    if g in ROTATION_AXIS:
        return {"axis": [r6(v) for v in ROTATION_AXIS[g]], "angle": r6(float(params[0]))}
    return None

def r6(x): return round(float(x), 6)

def apply(qc: QuantumCircuit, gate: str, target: int, params):
    g = gate.upper()
    if g not in SUPPORTED:
        raise ValueError(f"Unsupported gate '{gate}'. Supported: {sorted(SUPPORTED)}")
    if g in ROTATION_GATES:
        if not params or len(params) < 1:
            raise ValueError(f"Gate '{g}' requires 1 angle in radians")
        getattr(qc, QISKIT_METHOD[g])(float(params[0]), target)
    else:
        getattr(qc, QISKIT_METHOD[g])(target)

def bloch(sv: Statevector, qubit: int):
    dm = DensityMatrix(sv)
    if dm.num_qubits > 1:
        dm = partial_trace(dm, [q for q in range(dm.num_qubits) if q != qubit])
    x,y,z = (float(np.real(dm.expectation_value(Pauli(p)))) for p in ("X","Y","Z"))
    return {"x": r6(x), "y": r6(y), "z": r6(z),
            "length": r6(math.sqrt(x*x + y*y + z*z))}

def snapshot(sv: Statevector, num_qubits: int, qubit: int, step: int,
             gate=None, target=None, rotation=None):
    amps=[]
    for z in sv.data:
        mag = abs(z)
        amps.append({"re": r6(z.real), "im": r6(z.imag),
                     "magnitude": r6(mag),
                     "phase": r6(math.atan2(z.imag, z.real)) if mag > 1e-12 else 0.0})
    probs = {format(i, f"0{num_qubits}b"): r6(abs(z)**2) for i, z in enumerate(sv.data)}
    return {"step": step, "gate": gate, "target": target, "rotation": rotation,
            "statevector": amps, "probabilities": probs,
            "bloch": bloch(sv, qubit)}

def simulate(gates, num_qubits: int = 1, qubit: int = 0):
    """Full per-step evolution. steps[0] is the initial state before any gate."""
    qc = QuantumCircuit(num_qubits)
    sv = Statevector.from_instruction(qc)
    steps = [snapshot(sv, num_qubits, qubit, 0)]
    for i, g in enumerate(gates, start=1):
        name = g["gate"]; target = g.get("target", 0); params = g.get("params") or []
        step_qc = QuantumCircuit(num_qubits)
        apply(step_qc, name, target, params)
        sv = sv.evolve(step_qc)
        steps.append(snapshot(sv, num_qubits, qubit, i, name.upper(), target,
                              rotation_for(name, params)))
    return {"num_qubits": num_qubits, "steps": steps, "final": steps[-1]}
