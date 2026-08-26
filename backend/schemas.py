"""Request/response models for the QubitVista API. Pydantic v2."""
from __future__ import annotations

from pydantic import BaseModel, Field


class GateOp(BaseModel):
    gate: str = Field(..., description="Gate name, e.g. H, X, S, SDG, RX, CX")
    target: int = Field(0, ge=0, description="Qubit index the gate acts on")
    control: int | None = Field(
        None, ge=0, description="Control wire. Required for CX, CZ, SWAP; "
                                "rejected on single-qubit gates."
    )
    params: list[float] | None = Field(
        None, max_length=2,
        description="Angle(s) in radians. Required for RX, RY, RZ, P."
    )


class SimulateRequest(BaseModel):
    # Capped at 2: the engine supports two qubits, and the probability panel
    # draws 2**n bars, so a larger cap would be a promise the UI cannot keep.
    num_qubits: int = Field(1, ge=1, le=2, description="1 or 2")
    qubit: int = Field(0, ge=0, description="Which Bloch vector to report (1-qubit shape only)")
    # Capped so a request cannot ask for unbounded work. /api/simulate keeps a
    # full state snapshot per gate, so response size and CPU both scale with
    # this list — 20k gates answers a 0.5 MB request with 6 MB after five
    # seconds. The longest circuit in either golden catalogue is 8 gates and the
    # UI places them one click at a time, so 256 is far more than anything real
    # while keeping the worst case small.
    gates: list[GateOp] = Field(default_factory=list, max_length=256)
