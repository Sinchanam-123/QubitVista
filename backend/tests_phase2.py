"""Fast unit tests for the two-qubit contract.

conformance_test_2q.py is the real gate (77 golden circuits, 272 snapshots).
These run in milliseconds and pinpoint a break without diffing the spec.

Everything here is a claim the two-qubit page makes on screen, so a failure
means the UI is now telling a student something false.
"""
from __future__ import annotations
import math

import pytest
from quantum_engine import simulate

PI = math.pi


def g(name, target=0, control=None, params=None):
    op = {"gate": name, "target": target}
    if control is not None:
        op["control"] = control
    if params is not None:
        op["params"] = params
    return op


def final(gates):
    return simulate(gates, 2)["final"]


BELL = [g("H", 0), g("CX", target=1, control=0)]


# ------------------------------------------------------------------ shapes

def test_one_qubit_shape_is_unchanged():
    """Phase 1 is frozen: a dict bloch, no control, no entanglement block."""
    step = simulate([g("H")], 1)["final"]
    assert step["bloch"] == {"x": 1.0, "y": 0.0, "z": 0.0, "length": 1.0}
    assert "control" not in step and "entanglement" not in step


def test_two_qubit_shape_adds_three_things():
    step = final([g("H", 0)])
    assert isinstance(step["bloch"], list) and len(step["bloch"]) == 2
    assert all("purity" in b for b in step["bloch"])
    assert step["control"] is None                      # present, but a 1q gate
    assert step["entanglement"]["concurrence"] == 0.0


def test_step_zero_is_the_untouched_pair():
    steps = simulate(BELL, 2)["steps"]
    assert len(steps) == len(BELL) + 1
    assert steps[0]["probabilities"] == {"00": 1.0, "01": 0.0, "10": 0.0, "11": 0.0}
    for key in ("gate", "target", "control", "rotation"):
        assert steps[0][key] is None


# ------------------------------------------------------------------ endianness

@pytest.mark.parametrize("gates,expected", [
    ([g("X", 0)], "01"),        # q0 is the RIGHT character — not "10"
    ([g("X", 1)], "10"),
    ([g("X", 0), g("X", 1)], "11"),
])
def test_little_endian_bit_order(gates, expected):
    probs = final(gates)["probabilities"]
    assert probs[expected] == pytest.approx(1.0, abs=1e-6)


# ------------------------------------------------------------------ entanglement

def test_bell_pair_empties_both_spheres():
    step = final(BELL)
    assert step["entanglement"]["concurrence"] == pytest.approx(1.0, abs=1e-6)
    assert step["probabilities"] == {"00": 0.5, "01": 0.0, "10": 0.0, "11": 0.5}
    for b in step["bloch"]:
        assert b["length"] == pytest.approx(0.0, abs=1e-6)
        assert b["purity"] == pytest.approx(0.5, abs=1e-6)


@pytest.mark.parametrize("gates", [
    [g("H", 0), g("H", 1), g("S", 0), g("RX", 1, params=[1.1])],
    [g("RY", 0, params=[0.7]), g("T", 1), g("Z", 0)],
])
def test_single_qubit_gates_can_never_entangle(gates):
    """Not a coincidence to be measured — tensor-product gates preserve
    separability, so a non-zero value at any step is a bug by definition."""
    for step in simulate(gates, 2)["steps"]:
        assert step["entanglement"]["concurrence"] == 0.0


@pytest.mark.parametrize("gates", [
    [g("H", 0), g("SWAP", target=1, control=0)],        # SWAP never entangles
    [g("X", 0), g("CX", target=1, control=0)],          # control not in superposition
    [g("CZ", target=1, control=0)],                     # no |11> amplitude to mark
    [g("H", 0), g("CX", 1, 0), g("CX", 1, 0)],          # built, then undone
])
def test_a_two_qubit_gate_is_not_automatically_entangling(gates):
    assert final(gates)["entanglement"]["concurrence"] == 0.0


@pytest.mark.parametrize("theta", [0.0, PI / 6, PI / 4, PI / 3, PI / 2])
def test_length_and_purity_track_concurrence(theta):
    """Three independently computed quantities that must agree:
    length = sqrt(1 - C^2) and purity = (1 + length^2)/2, for a pure pair."""
    step = final([g("RY", 0, params=[theta]), g("CX", target=1, control=0)])
    c = step["entanglement"]["concurrence"]
    want_len = math.sqrt(max(0.0, 1 - c ** 2))
    for b in step["bloch"]:
        assert b["length"] == pytest.approx(want_len, abs=1e-4)
        assert b["purity"] == pytest.approx((1 + b["length"] ** 2) / 2, abs=2e-4)


# ------------------------------------------------------------------ rotation

@pytest.mark.parametrize("gate", ["CX", "CZ", "SWAP"])
def test_two_qubit_gates_report_no_rotation(gate):
    """The rule that breaks the animator if missed: there is no axis."""
    step = simulate([g(gate, target=1, control=0)], 2)["steps"][1]
    assert step["rotation"] is None
    assert step["control"] == 0 and step["target"] == 1


def test_single_qubit_gates_still_report_a_rotation_on_two_wires():
    steps = simulate([g("H", 0), g("CX", 1, 0), g("S", 1)], 2)["steps"]
    assert steps[1]["rotation"]["angle"] == pytest.approx(PI, abs=1e-6)
    assert steps[2]["rotation"] is None
    assert steps[3]["rotation"]["axis"] == [0.0, 0.0, 1.0]


# ------------------------------------------------------------------ phase / reversibility

def test_cz_moves_no_probability_bar():
    before = final([g("H", 0), g("H", 1)])
    after = final([g("H", 0), g("H", 1), g("CZ", target=1, control=0)])
    assert before["probabilities"] == after["probabilities"]
    assert after["statevector"][3]["re"] == pytest.approx(-0.5, abs=1e-6)


@pytest.mark.parametrize("gate", ["CX", "CZ", "SWAP"])
def test_two_qubit_gates_are_their_own_inverse(gate):
    twice = [g("H", 0), g("T", 1), g(gate, target=1, control=0), g(gate, target=1, control=0)]
    steps = simulate(twice, 2)["steps"]
    for a, b in zip(steps[2]["statevector"], steps[-1]["statevector"]):
        assert a["re"] == pytest.approx(b["re"], abs=1e-6)
        assert a["im"] == pytest.approx(b["im"], abs=1e-6)


def test_unitarity_at_every_step():
    gates = [g("H", 0), g("CX", 1, 0), g("RY", 1, params=[0.9]), g("SWAP", 1, 0), g("TDG", 0)]
    for step in simulate(gates, 2)["steps"]:
        assert sum(step["probabilities"].values()) == pytest.approx(1.0, abs=1e-6)
        for b in step["bloch"]:
            assert b["length"] <= 1.0 + 1e-6


# ------------------------------------------------------------------ rejection

@pytest.mark.parametrize("bad", [
    [g("CX", target=0, control=0)],          # both wires the same
    [g("CX", target=1)],                     # two-qubit gate with no control
    [g("H", target=0, control=1)],           # control on a single-qubit gate
    [g("CX", target=5, control=0)],          # wire out of range
    [g("CCX", target=1, control=0)],         # three-qubit gate
    [g("ZORP")],
])
def test_bad_input_raises(bad):
    with pytest.raises(ValueError):
        simulate(bad, 2)


def test_three_qubits_is_refused():
    with pytest.raises(ValueError):
        simulate([g("H")], 3)


def test_cnot_is_accepted_and_normalized_to_cx():
    """The name most textbooks use, so users type it."""
    step = simulate([g("CNOT", target=1, control=0)], 2)["steps"][1]
    assert step["gate"] == "CX"
