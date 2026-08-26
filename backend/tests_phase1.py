"""Fast unit tests mirroring the PROJECT_GUIDE.md verification tables.

conformance_test.py is the real gate (104 golden circuits). These run in
milliseconds and pinpoint a break without diffing 359 snapshots.
"""
from __future__ import annotations
import math
import pytest
from quantum_engine import simulate

PI = math.pi
def b(gates, key): return simulate(gates)["final"]["bloch"][key]
def g(name, **kw):  return {"gate": name, "target": 0, **kw}

@pytest.mark.parametrize("gates,axis,val", [
    ([],                                    "z",  1.0),
    ([g("X")],                              "z", -1.0),
    ([g("H")],                              "x",  1.0),
    ([g("H"), g("H")],                      "z",  1.0),
    ([g("H"), g("S")],                      "y",  1.0),
    ([g("H"), g("Z"), g("H")],              "z", -1.0),
])
def test_core_table(gates, axis, val):
    assert b(gates, axis) == pytest.approx(val, abs=1e-6)

def test_rx_pi_flips():
    r = simulate([g("RX", params=[PI])])
    assert r["final"]["probabilities"]["1"] == pytest.approx(1.0, abs=1e-6)

@pytest.mark.parametrize("pair", [("S","SDG"), ("SDG","S"), ("T","TDG"), ("H","H"), ("X","X")])
def test_reversibility_returns_home(pair):
    r = simulate([g(pair[0]), g(pair[1])])
    first, last = r["steps"][0]["bloch"], r["final"]["bloch"]
    for k in "xyz":
        assert last[k] == pytest.approx(first[k], abs=1e-6)

@pytest.mark.parametrize("seq,equiv", [
    ([g("H"), g("S"), g("S")],                     [g("H"), g("Z")]),
    ([g("H"), g("T"), g("T")],                     [g("H"), g("S")]),
    ([g("H"), g("TDG"), g("TDG")],                 [g("H"), g("SDG")]),
])
def test_composition_identities(seq, equiv):
    a, c = simulate(seq)["final"]["bloch"], simulate(equiv)["final"]["bloch"]
    for k in "xyz":
        assert a[k] == pytest.approx(c[k], abs=1e-6)

@pytest.mark.parametrize("theta", [0.0, PI/6, PI/3, PI/2, 2*PI/3, PI])
def test_interference_sin_squared(theta):
    r = simulate([g("H"), g("RZ", params=[theta]), g("H")])
    assert r["final"]["probabilities"]["1"] == pytest.approx(math.sin(theta/2)**2, abs=1e-6)

@pytest.mark.parametrize("theta", [0.0, PI/6, PI/4, PI/3, PI/2, PI])
def test_measurement_sin_squared(theta):
    r = simulate([g("RY", params=[theta])])
    assert r["final"]["probabilities"]["1"] == pytest.approx(math.sin(theta/2)**2, abs=1e-6)

@pytest.mark.parametrize("gate", [g("S"), g("Z"), g("T"), g("RZ", params=[PI])])
def test_phase_on_a_pole_does_nothing(gate):
    assert b([gate], "z") == pytest.approx(1.0, abs=1e-6)

def test_phase_gate_leaves_probabilities_alone():
    before = simulate([g("H")])["final"]["probabilities"]
    after  = simulate([g("H"), g("S")])["final"]["probabilities"]
    assert before == after

def test_global_phase_rx_pi_differs_from_x():
    """Same sphere, different amplitudes. Correct physics — do not 'fix' it."""
    x  = simulate([g("X")])["final"]
    rx = simulate([g("RX", params=[PI])])["final"]
    for k in "xyz":
        assert x["bloch"][k] == pytest.approx(rx["bloch"][k], abs=1e-6)
    assert x["statevector"][1] != rx["statevector"][1]

def test_unitarity_and_length_every_step():
    r = simulate([g("H"), g("T"), g("S"), g("RX", params=[1.1]), g("H")])
    for st in r["steps"]:
        assert sum(st["probabilities"].values()) == pytest.approx(1.0, abs=1e-6)
        assert st["bloch"]["length"] == pytest.approx(1.0, abs=1e-6)

def test_step_count_and_rotation_nullability():
    gates = [g("H"), g("S"), g("H")]
    r = simulate(gates)
    assert len(r["steps"]) == len(gates) + 1
    assert r["steps"][0]["rotation"] is None
    assert all(s["rotation"] is not None for s in r["steps"][1:])

def test_empty_circuit_is_one_step_at_north_pole():
    r = simulate([])
    assert len(r["steps"]) == 1
    assert r["steps"][0]["bloch"] == {"x": 0.0, "y": 0.0, "z": 1.0, "length": 1.0}

@pytest.mark.parametrize("bad", [
    [g("ZORP")], [g("CX")], [g("RX")], [{"gate": "X", "target": 5}],
])
def test_bad_input_raises(bad):
    with pytest.raises(ValueError):
        simulate(bad)
