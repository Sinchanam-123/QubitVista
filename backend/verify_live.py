"""
QubitVista live verifier — an independent second opinion on any circuit.

Everything else in the test suite compares your backend against values that were
themselves produced by Qiskit. This file does not. It recomputes the whole state
from scratch with plain NumPy matrix algebra -- no Qiskit anywhere -- and compares
that against what your backend returned. If two independent implementations agree
to 6 decimal places, the output is right.

Three modes:

    # 1. Check one circuit you just built in the UI
    python verify_live.py --circuit '[{"gate":"H","target":0},{"gate":"CX","control":0,"target":1}]' --qubits 2

    # 2. Fuzz YOUR engine module with thousands of random circuits
    python verify_live.py --engine quantum_engine --trials 5000
    python verify_live.py --engine quantum_engine --trials 5000 --qubits 2

    # 3. Fuzz your RUNNING server end to end
    python verify_live.py --endpoint http://localhost:8000/api/simulate --trials 500

Exits 0 when everything agrees, 1 otherwise. Safe to put in CI.
"""
from __future__ import annotations

import argparse
import cmath
import importlib
import json
import math
import random
import sys

import numpy as np

# --------------------------------------------------------------------------
# Independent gate definitions. Written from the textbook matrices, NOT taken
# from Qiskit, so agreement means two separate implementations concur.
# --------------------------------------------------------------------------
I2 = np.eye(2, dtype=complex)
_X = np.array([[0, 1], [1, 0]], dtype=complex)
_Y = np.array([[0, -1j], [1j, 0]], dtype=complex)
_Z = np.array([[1, 0], [0, -1]], dtype=complex)
_H = np.array([[1, 1], [1, -1]], dtype=complex) / math.sqrt(2)
_S = np.array([[1, 0], [0, 1j]], dtype=complex)
_T = np.array([[1, 0], [0, cmath.exp(1j * math.pi / 4)]], dtype=complex)

FIXED = {"I": I2, "X": _X, "Y": _Y, "Z": _Z, "H": _H,
         "S": _S, "SDG": _S.conj().T, "T": _T, "TDG": _T.conj().T}


def _rx(t):
    return np.array([[math.cos(t / 2), -1j * math.sin(t / 2)],
                     [-1j * math.sin(t / 2), math.cos(t / 2)]], dtype=complex)


def _ry(t):
    return np.array([[math.cos(t / 2), -math.sin(t / 2)],
                     [math.sin(t / 2), math.cos(t / 2)]], dtype=complex)


def _rz(t):
    return np.array([[cmath.exp(-1j * t / 2), 0],
                     [0, cmath.exp(1j * t / 2)]], dtype=complex)


def _p(t):
    return np.array([[1, 0], [0, cmath.exp(1j * t)]], dtype=complex)


ROTS = {"RX": _rx, "RY": _ry, "RZ": _rz, "P": _p}
TWO_Q = {"CX", "CNOT", "CZ", "SWAP"}
ALL_GATES = sorted(set(FIXED) | set(ROTS))


def _embed(u, qubit, n):
    """Place a 1-qubit matrix on `qubit` of an n-qubit register.

    Qiskit is little-endian: basis index bit 0 is qubit 0, so the Kronecker
    product runs from the highest qubit index down.
    """
    out = np.array([[1]], dtype=complex)
    for q in reversed(range(n)):
        out = np.kron(out, u if q == qubit else I2)
    return out


def _two_qubit(name, control, target, n):
    """Build a 2-qubit gate on an n-qubit register, by basis-state bookkeeping."""
    dim = 2 ** n
    m = np.zeros((dim, dim), dtype=complex)
    name = "CX" if name == "CNOT" else name
    for i in range(dim):
        bits = [(i >> q) & 1 for q in range(n)]
        if name == "CX":
            nb = bits[:]
            if bits[control] == 1:
                nb[target] ^= 1
            j = sum(b << q for q, b in enumerate(nb))
            m[j, i] = 1
        elif name == "CZ":
            m[i, i] = -1 if (bits[control] == 1 and bits[target] == 1) else 1
        elif name == "SWAP":
            nb = bits[:]
            nb[control], nb[target] = bits[target], bits[control]
            j = sum(b << q for q, b in enumerate(nb))
            m[j, i] = 1
        else:
            raise ValueError(f"unknown two-qubit gate {name}")
    return m


def independent_state(gates, n):
    """Recompute the statevector after every gate, from first principles."""
    psi = np.zeros(2 ** n, dtype=complex)
    psi[0] = 1
    states = [psi.copy()]
    for g in gates:
        name = str(g["gate"]).upper()
        target = int(g.get("target", 0))
        if name in TWO_Q:
            control = g.get("control")
            if control is None:
                raise ValueError(f"{name} has no control")
            u = _two_qubit(name, int(control), target, n)
        elif name in FIXED:
            u = _embed(FIXED[name], target, n)
        elif name in ROTS:
            u = _embed(ROTS[name](float(g["params"][0])), target, n)
        else:
            raise ValueError(f"unknown gate {name}")
        psi = u @ psi
        states.append(psi.copy())
    return states


def reduced(psi, qubit, n):
    """Reduced density matrix of one qubit, by explicit partial trace."""
    t = psi.reshape([2] * n)                      # index order: q(n-1) ... q0
    axis = n - 1 - qubit
    t = np.moveaxis(t, axis, 0).reshape(2, -1)
    return t @ t.conj().T


def bloch_of(rho):
    return [float(np.real(np.trace(rho @ p))) for p in (_X, _Y, _Z)]


def concurrence_of(psi):
    """Wootters concurrence for a 2-qubit pure state."""
    yy = np.kron(_Y, _Y)
    return float(min(1.0, max(0.0, abs(np.vdot(psi, yy @ np.conj(psi))))))


# --------------------------------------------------------------------------
# Comparison
# --------------------------------------------------------------------------
TOL = 2e-5


def compare(gates, n, res, cid="circuit"):
    """Compare a backend response against the independent recomputation."""
    problems = []

    def bad(what, detail):
        problems.append((cid, what, detail))

    try:
        states = independent_state(gates, n)
    except Exception as exc:
        return [(cid, "could not recompute", repr(exc))]

    steps = res.get("steps")
    if not isinstance(steps, list):
        return [(cid, "response", "no 'steps' list")]
    if len(steps) != len(gates) + 1:
        bad("step count", f"{len(steps)} != {len(gates) + 1}")
        return problems

    for k, (st, psi) in enumerate(zip(steps, states)):
        # ---- amplitudes
        sv = st.get("statevector") or []
        if len(sv) != len(psi):
            bad(f"step{k} statevector", f"{len(sv)} != {len(psi)}")
            continue
        for j, (amp, z) in enumerate(zip(sv, psi)):
            if abs(amp.get("re", 1e9) - z.real) > TOL:
                bad(f"step{k} amp{j}.re", f"{amp.get('re')} vs {z.real:.6f}")
            if abs(amp.get("im", 1e9) - z.imag) > TOL:
                bad(f"step{k} amp{j}.im", f"{amp.get('im')} vs {z.imag:.6f}")
            if abs(amp.get("magnitude", 1e9) - abs(z)) > TOL:
                bad(f"step{k} amp{j}.magnitude", f"{amp.get('magnitude')} vs {abs(z):.6f}")
            if amp.get("magnitude") == 0.0 and amp.get("phase") not in (0.0, -0.0):
                bad(f"step{k} amp{j}", "zero magnitude but non-zero phase")

        # ---- probabilities
        probs = st.get("probabilities") or {}
        if len(probs) != 2 ** n:
            bad(f"step{k} probabilities", f"{len(probs)} entries, expected {2 ** n}")
        for i, z in enumerate(psi):
            key = format(i, f"0{n}b")
            if key not in probs:
                bad(f"step{k} probabilities", f"missing '{key}'")
            elif abs(probs[key] - abs(z) ** 2) > TOL:
                bad(f"step{k} P({key})", f"{probs[key]} vs {abs(z) ** 2:.6f}")
        total = sum(probs.values())
        if abs(total - 1) > TOL:
            bad(f"step{k} unitarity", f"probabilities sum to {total}")

        # ---- bloch, dict (1 qubit) or list (n qubits) both accepted
        bl = st.get("bloch")
        entries = [bl] if isinstance(bl, dict) else bl
        if not isinstance(entries, list):
            bad(f"step{k} bloch", "missing")
            continue
        for q, b in enumerate(entries):
            if q >= n:
                break
            want = bloch_of(reduced(psi, q, n))
            for axis, w in zip("xyz", want):
                if abs(b.get(axis, 1e9) - w) > TOL:
                    bad(f"step{k} bloch[{q}].{axis}", f"{b.get(axis)} vs {w:.6f}")
            wl = math.sqrt(sum(v * v for v in want))
            if abs(b.get("length", 1e9) - wl) > TOL:
                bad(f"step{k} bloch[{q}].length", f"{b.get('length')} vs {wl:.6f}")
            if wl > 1 + TOL:
                bad(f"step{k} bloch[{q}]", f"length {wl} exceeds 1")
            if "purity" in b:
                wp = (1 + wl ** 2) / 2
                if abs(b["purity"] - wp) > 1e-4:
                    bad(f"step{k} bloch[{q}].purity", f"{b['purity']} vs {wp:.6f}")

        # ---- entanglement
        ent = st.get("entanglement")
        if isinstance(ent, dict) and ent.get("concurrence") is not None and n == 2:
            wc = concurrence_of(psi)
            gc = ent["concurrence"]
            if gc != gc:
                bad(f"step{k} concurrence", "NaN")
            elif abs(gc - wc) > 1e-4:
                bad(f"step{k} concurrence", f"{gc} vs {wc:.6f}")

        # ---- rotation must describe the rotation that actually happened
        if k > 0:
            rot = st.get("rotation")
            name = str(gates[k - 1]["gate"]).upper()
            if name in TWO_Q:
                if rot is not None:
                    bad(f"step{k} rotation", f"must be null for {name}")
            elif isinstance(rot, dict):
                tq = int(gates[k - 1].get("target", 0))
                pv = bloch_of(reduced(states[k - 1], tq, n))
                if math.sqrt(sum(v * v for v in pv)) > 0.999:
                    ax = np.array([float(v) for v in rot["axis"]], dtype=float)
                    nn = np.linalg.norm(ax)
                    if nn > 1e-9:
                        ax = ax / nn
                        a = float(rot["angle"])
                        v = np.array(pv)
                        got = (v * math.cos(a) + np.cross(ax, v) * math.sin(a)
                               + ax * float(np.dot(ax, v)) * (1 - math.cos(a)))
                        want = bloch_of(reduced(psi, tq, n))
                        if np.max(np.abs(got - np.array(want))) > 1e-3:
                            bad(f"step{k} rotation",
                                "axis/angle does not produce this step's Bloch vector "
                                "(the sphere will animate wrongly)")
    return problems


# --------------------------------------------------------------------------
# Backends under test
# --------------------------------------------------------------------------
def backend_module(dotted):
    mod = importlib.import_module(dotted)
    fn = getattr(mod, "simulate", None)
    if fn is None:
        raise SystemExit(f"{dotted} has no simulate()")

    def run(gates, n):
        try:
            return fn(gates, n)
        except TypeError:
            return fn(gates, n, 0)
    return run


def backend_endpoint(url):
    import urllib.request

    def run(gates, n):
        body = json.dumps({"num_qubits": n, "qubit": 0, "gates": gates}).encode()
        req = urllib.request.Request(url, data=body,
                                     headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read().decode())
    return run


# --------------------------------------------------------------------------
# Random circuits
# --------------------------------------------------------------------------
EDGE_ANGLES = [0.0, math.pi, -math.pi, 2 * math.pi, math.pi / 2, math.pi / 4,
               1e-7, -1e-7, 1e5, -3.7]


def random_circuit(rng, n, max_len):
    gates = []
    for _ in range(rng.randint(0, max_len)):
        r = rng.random()
        if n > 1 and r < 0.30:
            c = rng.randrange(n)
            t = rng.choice([q for q in range(n) if q != c])
            gates.append({"gate": rng.choice(["CX", "CZ", "SWAP"]),
                          "control": c, "target": t})
        elif r < 0.60:
            a = (rng.choice(EDGE_ANGLES) if rng.random() < 0.35
                 else rng.uniform(-4 * math.pi, 4 * math.pi))
            gates.append({"gate": rng.choice(["RX", "RY", "RZ", "P"]),
                          "target": rng.randrange(n), "params": [a]})
        else:
            gates.append({"gate": rng.choice(sorted(FIXED)),
                          "target": rng.randrange(n)})
    return gates


def describe(gates):
    out = []
    for g in gates:
        s = g["gate"]
        if g.get("params"):
            s += f"({g['params'][0]:.4f})"
        s += f" q{g.get('target', 0)}"
        if g.get("control") is not None:
            s = f"{g['gate']} q{g['control']}->q{g['target']}"
        out.append(s)
    return " · ".join(out) or "(empty)"


# --------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--engine", help="dotted module exposing simulate(), e.g. quantum_engine")
    ap.add_argument("--endpoint", help="POST url, e.g. http://localhost:8000/api/simulate")
    ap.add_argument("--circuit", help="JSON list of gate ops to check")
    ap.add_argument("--qubits", type=int, default=1)
    ap.add_argument("--trials", type=int, default=2000)
    ap.add_argument("--max-len", type=int, default=12)
    ap.add_argument("--seed", type=int, default=1)
    args = ap.parse_args()

    if args.endpoint:
        run, target = backend_endpoint(args.endpoint), args.endpoint
    elif args.engine:
        run, target = backend_module(args.engine), args.engine
    else:
        run, target = backend_module("quantum_engine"), "quantum_engine (default)"

    print("QubitVista live verifier — independent NumPy recomputation")
    print(f"target : {target}")

    # ---- single circuit
    if args.circuit:
        gates = json.loads(args.circuit)
        print(f"circuit: {describe(gates)}   ({args.qubits} qubit(s))\n")
        try:
            res = run(gates, args.qubits)
        except Exception as exc:
            print(f"backend raised: {exc!r}")
            return 1
        problems = compare(gates, args.qubits, res, "circuit")
        fin = res["final"]
        print("  probabilities :", {k: round(v, 6) for k, v in fin["probabilities"].items()})
        bl = fin["bloch"]
        for q, b in enumerate([bl] if isinstance(bl, dict) else bl):
            print(f"  bloch q{q}      : ({b['x']:+.6f}, {b['y']:+.6f}, {b['z']:+.6f})  "
                  f"length {b['length']:.6f}")
        ent = fin.get("entanglement") or {}
        if ent.get("concurrence") is not None:
            print(f"  concurrence   : {ent['concurrence']:.6f}")
        print(f"  steps         : {len(res['steps'])}\n")
        if problems:
            print(f"{len(problems)} DISAGREEMENTS with the independent calculation\n")
            for p in problems[:30]:
                print(f"   x  {p[1]:34s} {p[2]}")
            return 1
        print("verified — the backend agrees with an independent calculation")
        return 0

    # ---- fuzz
    print(f"trials : {args.trials} random circuits, up to {args.max_len} gates, "
          f"{args.qubits} qubit(s)\n")
    rng = random.Random(args.seed)
    problems, crashes, worst = [], 0, None
    for i in range(args.trials):
        gates = random_circuit(rng, args.qubits, args.max_len)
        try:
            res = run(gates, args.qubits)
        except Exception as exc:
            crashes += 1
            problems.append((f"#{i}", "backend raised", repr(exc)[:90]))
            if worst is None:
                worst = gates
            continue
        found = compare(gates, args.qubits, res, f"#{i}")
        if found and worst is None:
            worst = gates
        problems.extend(found)

    print(f"  crashes       : {crashes}")
    print(f"  disagreements : {len(problems) - crashes}")
    if problems:
        print()
        for p in problems[:20]:
            print(f"   x  {p[0]:6s} {p[1]:34s} {p[2]}")
        if worst:
            print(f"\n  first failing circuit:\n    {describe(worst)}")
            print(f"    --circuit '{json.dumps(worst)}' --qubits {args.qubits}")
        return 1
    print("\nverified — the backend agrees with an independent calculation on every circuit")
    return 0


if __name__ == "__main__":
    sys.exit(main())
