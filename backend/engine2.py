"""Two-qubit reference engine. Extends the Phase 1 contract:
bloch becomes an ARRAY (one entry per qubit), plus an entanglement block."""
from __future__ import annotations
import math
import numpy as np
from qiskit import QuantumCircuit
from qiskit.quantum_info import (Statevector, DensityMatrix, partial_trace,
                                 Pauli, concurrence)
PI = math.pi; R2 = 1/math.sqrt(2)
FIXED = {"I","X","Y","Z","H","S","SDG","T","TDG"}
ROTS  = {"RX","RY","RZ","P"}
TWOQ  = {"CX","CZ","SWAP"}
SUPPORTED = FIXED | ROTS | TWOQ
QMETHOD = {"I":"id","X":"x","Y":"y","Z":"z","H":"h","S":"s","SDG":"sdg","T":"t",
           "TDG":"tdg","RX":"rx","RY":"ry","RZ":"rz","P":"p",
           "CX":"cx","CZ":"cz","SWAP":"swap"}
FIXED_ROT = {"X":([1.,0.,0.],PI),"Y":([0.,1.,0.],PI),"Z":([0.,0.,1.],PI),
             "S":([0.,0.,1.],PI/2),"SDG":([0.,0.,1.],-PI/2),
             "T":([0.,0.,1.],PI/4),"TDG":([0.,0.,1.],-PI/4),
             "H":([R2,0.,R2],PI),"I":([0.,0.,1.],0.)}
ROT_AXIS = {"RX":[1.,0.,0.],"RY":[0.,1.,0.],"RZ":[0.,0.,1.],"P":[0.,0.,1.]}

def r6(x): return round(float(x),6)

def rotation_for(gate, params):
    g=gate.upper()
    if g in TWOQ: return None          # an entangling gate is not a Bloch rotation
    if g in FIXED_ROT:
        ax,an=FIXED_ROT[g]; return {"axis":[r6(v) for v in ax],"angle":r6(an)}
    if g in ROT_AXIS:
        return {"axis":[r6(v) for v in ROT_AXIS[g]],"angle":r6(float(params[0]))}
    return None

def apply(qc, gate, target, control=None, params=None):
    g=gate.upper(); params=params or []
    if g not in SUPPORTED: raise ValueError(f"Unsupported gate '{gate}'")
    m=QMETHOD[g]
    if g in TWOQ:
        if control is None: raise ValueError(f"{g} needs a control wire")
        if control==target: raise ValueError(f"{g} control and target must differ")
        getattr(qc,m)(control,target)
    elif g in ROTS:
        if not params: raise ValueError(f"{g} requires an angle in radians")
        getattr(qc,m)(float(params[0]),target)
    else:
        getattr(qc,m)(target)

def bloch(sv,q,n):
    dm=DensityMatrix(sv)
    if n>1: dm=partial_trace(dm,[i for i in range(n) if i!=q])
    x,y,z=(float(np.real(dm.expectation_value(Pauli(p)))) for p in ("X","Y","Z"))
    return {"x":r6(x),"y":r6(y),"z":r6(z),
            "length":r6(math.sqrt(x*x+y*y+z*z)),
            "purity":r6(float(np.real(dm.purity())))}

def snapshot(sv,n,step,gate=None,target=None,control=None,rotation=None):
    amps=[]
    for z in sv.data:
        # Decide "is this zero" on the ROUNDED magnitude, not the raw one.
        # Otherwise an amplitude with raw magnitude between 1e-12 and 5e-7
        # serialises as magnitude 0.000000 while still carrying a phase, and the
        # frontend draws a zero-height bar with a phase dial pointing somewhere.
        m = r6(abs(z))
        if m == 0.0:
            amps.append({"re": 0.0, "im": 0.0, "magnitude": 0.0, "phase": 0.0})
        else:
            ph = r6(math.atan2(z.imag, z.real))
            amps.append({"re": r6(z.real) + 0.0, "im": r6(z.imag) + 0.0,
                         "magnitude": m, "phase": ph + 0.0})
    if n == 2:
        raw = float(concurrence(sv))
        c = r6(0.0 if (raw != raw or raw < 0) else raw)   # NaN/negative -> 0
    else:
        c = None
    if c is not None and c<1e-6: c=0.0
    return {"step":step,"gate":gate,"target":target,"control":control,
            "rotation":rotation,"statevector":amps,
            "probabilities":{format(i,f"0{n}b"):r6(abs(z)**2) for i,z in enumerate(sv.data)},
            "bloch":[bloch(sv,q,n) for q in range(n)],
            "entanglement":{"concurrence":c}}

def simulate(gates,num_qubits=2):
    qc=QuantumCircuit(num_qubits)
    sv=Statevector.from_instruction(qc)
    steps=[snapshot(sv,num_qubits,0)]
    for i,g in enumerate(gates,1):
        step=QuantumCircuit(num_qubits)
        apply(step,g["gate"],g.get("target",0),g.get("control"),g.get("params"))
        sv=sv.evolve(step)
        steps.append(snapshot(sv,num_qubits,i,g["gate"].upper(),
                              g.get("target"),g.get("control"),
                              rotation_for(g["gate"],g.get("params"))))
    return {"num_qubits":num_qubits,"steps":steps,"final":steps[-1]}
