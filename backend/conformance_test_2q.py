"""
QubitVista Phase 2 conformance suite — two-qubit /api/simulate contract.

    python conformance_test_2q.py --engine quantum_engine           # your engine (run from backend/)
    python conformance_test_2q.py                                   # bundled reference engine
    python conformance_test_2q.py --endpoint http://localhost:8000/api/simulate

The two-qubit backend is done when this exits 0.

Golden data is circuits_spec_2q.json: 77 circuits, 272 step snapshots, 8 concepts,
all 16 gates. Every value was produced by Qiskit and independently re-derived with
raw NumPy including the little-endian bit order. If a check fails the backend is
wrong -- do not loosen a tolerance or edit the spec.

WHAT CHANGES FROM PHASE 1 (this suite enforces all of it):
  bloch      object  ->  ARRAY, one entry per qubit, each with an extra `purity`
  step       gains   ->  `control` (null for single-qubit gates)
  step       gains   ->  `entanglement": {"concurrence": float}`
  rotation   MUST be null for CX / CZ / SWAP -- they are not Bloch rotations
  gate op    gains   ->  `control` for two-qubit gates
"""
from __future__ import annotations
import argparse, importlib, json, math, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SPEC_PATH = os.path.join(HERE, "circuits_spec_2q.json")
TWO_QUBIT_GATES = {"CX", "CZ", "SWAP"}
TOL = 1e-6
failures: list[tuple] = []


def fail(cid, what, detail):
    failures.append((cid, what, detail))


def close(a, b, tol=TOL):
    return abs(float(a) - float(b)) <= tol


# ---------------------------------------------------------------- adapters
def adapter_reference():
    sys.path.insert(0, HERE)
    from engine2 import simulate
    return lambda gates, nq: simulate(gates, nq)


def adapter_module(dotted):
    mod = importlib.import_module(dotted)
    fn = getattr(mod, "simulate", None)
    if fn is None:
        raise SystemExit(f"{dotted} has no simulate() function")
    return lambda gates, nq: fn(gates, nq)


def adapter_endpoint(url):
    import urllib.request

    def run(gates, nq):
        body = json.dumps({"num_qubits": nq, "gates": gates}).encode()
        req = urllib.request.Request(url, data=body,
                                     headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read().decode())
    return run


def adapter_endpoint_raw(url):
    import urllib.request, urllib.error

    def run(payload):
        body = json.dumps(payload).encode()
        req = urllib.request.Request(url, data=body,
                                     headers={"Content-Type": "application/json"})
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.status, json.loads(r.read().decode())
        except urllib.error.HTTPError as e:
            return e.code, None
    return run


# ---------------------------------------------------------------- checks
def check_structure(cid, res, gates, nq):
    """Invariants that must hold for every response, independent of values."""
    for key in ("num_qubits", "steps", "final"):
        if key not in res:
            return fail(cid, "shape", f"missing top-level key '{key}'")

    steps = res["steps"]
    if len(steps) != len(gates) + 1:
        return fail(cid, "steps length", f"{len(steps)} != {len(gates) + 1}")

    n_basis = 2 ** nq
    for k, st in enumerate(steps):
        missing = [key for key in ("step", "gate", "target", "control", "rotation",
                                   "statevector", "probabilities", "bloch",
                                   "entanglement") if key not in st]
        if missing:
            fail(cid, f"step[{k}] shape", f"missing {missing}")
            continue

        if st["step"] != k:
            fail(cid, f"step[{k}]", f"step index is {st['step']}")

        # ---- step 0 is the initial state, before any gate
        if k == 0:
            for key in ("gate", "target", "control", "rotation"):
                if st[key] is not None:
                    fail(cid, "step[0]", f"{key} must be null")
        else:
            g = gates[k - 1]["gate"].upper()
            if st["gate"] is None:
                fail(cid, f"step[{k}]", "gate must not be null")
            elif st["gate"].upper() != g:
                fail(cid, f"step[{k}] gate", f"{st['gate']} != {g}")

            # ---- THE PHASE 2 RULE: entangling gates carry no rotation
            if g in TWO_QUBIT_GATES:
                if st["rotation"] is not None:
                    fail(cid, f"step[{k}] rotation",
                         f"must be null for {g} -- it is not a Bloch rotation")
                if st["control"] is None:
                    fail(cid, f"step[{k}] control", f"{g} must report its control wire")
                elif st["control"] == st["target"]:
                    fail(cid, f"step[{k}]", "control and target must differ")
            else:
                if st["rotation"] is None:
                    fail(cid, f"step[{k}] rotation", f"must not be null for {g}")
                else:
                    rot = st["rotation"]
                    if "axis" not in rot or "angle" not in rot:
                        fail(cid, f"step[{k}] rotation", "needs 'axis' and 'angle'")
                    elif len(rot["axis"]) != 3:
                        fail(cid, f"step[{k}] rotation", "axis must have 3 components")
                    elif not close(rot["angle"], 0.0):
                        n = math.sqrt(sum(float(v) ** 2 for v in rot["axis"]))
                        if not close(n, 1.0, 1e-5):
                            fail(cid, f"step[{k}] rotation", f"axis not unit: {rot['axis']}")

        # ---- statevector
        sv = st["statevector"]
        if len(sv) != n_basis:
            fail(cid, f"step[{k}] statevector", f"{len(sv)} amplitudes, expected {n_basis}")
        for j, amp in enumerate(sv):
            gaps = [key for key in ("re", "im", "magnitude", "phase") if key not in amp]
            if gaps:
                fail(cid, f"step[{k}] amp[{j}]", f"missing {gaps}")
                continue
            mag = math.hypot(float(amp["re"]), float(amp["im"]))
            if not close(amp["magnitude"], mag, 1e-5):
                fail(cid, f"step[{k}] amp[{j}]", "magnitude != |re + i*im|")
            # a zero-magnitude amplitude must carry zero phase, or the UI draws
            # an empty bar with a phase dial pointing somewhere
            if amp["magnitude"] == 0.0 and amp["phase"] != 0.0:
                fail(cid, f"step[{k}] amp[{j}]", "zero magnitude with non-zero phase")
            if not (-math.pi - 1e-6 <= amp["phase"] <= math.pi + 1e-6):
                fail(cid, f"step[{k}] amp[{j}]", f"phase out of range: {amp['phase']}")

        # ---- probabilities
        probs = st["probabilities"]
        if len(probs) != n_basis:
            fail(cid, f"step[{k}] probabilities",
                 f"{len(probs)} entries, expected all {n_basis} basis states")
        for key in probs:
            if len(key) != nq or set(key) - {"0", "1"}:
                fail(cid, f"step[{k}] probabilities", f"bad basis label '{key}'")
        total = sum(float(v) for v in probs.values())
        if not close(total, 1.0, 1e-5):
            fail(cid, f"step[{k}] unitarity", f"probabilities sum to {total}")
        for j, key in enumerate(sorted(probs)):
            if not close(sv[j]["magnitude"] ** 2, probs[key], 1e-5):
                fail(cid, f"step[{k}] |a|^2 != P({key})", "")

        # ---- bloch is a LIST, one per qubit
        bl = st["bloch"]
        if not isinstance(bl, list):
            fail(cid, f"step[{k}] bloch", "must be a list, one entry per qubit")
            continue
        if len(bl) != nq:
            fail(cid, f"step[{k}] bloch", f"{len(bl)} entries, expected {nq}")
        for q, b in enumerate(bl):
            gaps = [key for key in ("x", "y", "z", "length", "purity") if key not in b]
            if gaps:
                fail(cid, f"step[{k}] bloch[{q}]", f"missing {gaps}")
                continue
            L = math.sqrt(sum(float(b[c]) ** 2 for c in "xyz"))
            if not close(b["length"], L, 1e-5):
                fail(cid, f"step[{k}] bloch[{q}]", "length != sqrt(x^2+y^2+z^2)")
            if b["length"] > 1 + 1e-5:
                fail(cid, f"step[{k}] bloch[{q}]", f"length > 1: {b['length']}")
            # purity and length are two views of the same quantity
            want = (1 + b["length"] ** 2) / 2
            if not close(b["purity"], want, 2e-4):
                fail(cid, f"step[{k}] bloch[{q}] purity",
                     f"{b['purity']} != (1+len^2)/2 = {want:.6f}")

        # ---- entanglement
        ent = st["entanglement"]
        if "concurrence" not in ent:
            fail(cid, f"step[{k}] entanglement", "missing 'concurrence'")
        else:
            c = ent["concurrence"]
            if c is None:
                fail(cid, f"step[{k}] concurrence", "must not be null for 2 qubits")
            elif c != c:
                fail(cid, f"step[{k}] concurrence", "NaN")
            elif c < -1e-9 or c > 1 + 1e-5:
                fail(cid, f"step[{k}] concurrence", f"out of range: {c}")

    # ---- Rodrigues consistency: the reported rotation must actually be the one
    # that took the previous Bloch vector to this one. A flipped sign animates
    # the sphere backwards and no value comparison alone would notice.
    for k in range(1, len(steps)):
        prev, cur = steps[k - 1], steps[k]
        rot = cur.get("rotation")
        if not isinstance(rot, dict):
            continue
        # the rotation describes the TARGET qubit's sphere, not always q0
        tq = cur.get("target")
        if not isinstance(tq, int):
            continue
        try:
            axis = [float(v) for v in rot["axis"]]
            ang = float(rot["angle"])
            pv = [float(prev["bloch"][tq][c]) for c in "xyz"]
            want = [float(cur["bloch"][tq][c]) for c in "xyz"]
        except Exception:
            continue
        # only meaningful while the qubit is still pure
        if math.sqrt(sum(v * v for v in pv)) < 0.999:
            continue
        n = math.sqrt(sum(v * v for v in axis))
        if n < 1e-9:
            continue
        ax = [v / n for v in axis]
        c_, s_ = math.cos(ang), math.sin(ang)
        dot = sum(a * b for a, b in zip(ax, pv))
        cross = [ax[1] * pv[2] - ax[2] * pv[1],
                 ax[2] * pv[0] - ax[0] * pv[2],
                 ax[0] * pv[1] - ax[1] * pv[0]]
        got = [pv[i] * c_ + cross[i] * s_ + ax[i] * dot * (1 - c_) for i in range(3)]
        if any(abs(got[i] - want[i]) > 1e-3 for i in range(3)):
            fail(cid, f"step[{k}] rotation is not the rotation that happened",
                 f"Rodrigues gives ({got[0]:+.4f}, {got[1]:+.4f}, {got[2]:+.4f}), "
                 f"bloch says ({want[0]:+.4f}, {want[1]:+.4f}, {want[2]:+.4f})")

    if res["final"] != steps[-1]:
        fail(cid, "final", "final must equal steps[-1]")


def check_golden(cid, res, exp):
    """Compare against the stored Qiskit values.

    Defensive throughout: a malformed response must produce a readable failure,
    never a traceback. check_structure has already reported the shape problem.
    """
    got, want = res.get("steps"), exp["steps"]
    if not isinstance(got, list) or len(got) != len(want):
        return
    for k, (g, w) in enumerate(zip(got, want)):
        if not isinstance(g, dict):
            fail(cid, f"step[{k}]", "not an object")
            continue
        gsv = g.get("statevector")
        if isinstance(gsv, list) and len(gsv) == len(w["statevector"]):
            for j, (ga, wa) in enumerate(zip(gsv, w["statevector"])):
                if not isinstance(ga, dict):
                    fail(cid, f"step[{k}] amp[{j}]", "not an object")
                    continue
                for key in ("re", "im", "magnitude"):
                    if key not in ga:
                        fail(cid, f"step[{k}] amp[{j}]", f"missing '{key}'")
                    elif not close(ga[key], wa[key]):
                        fail(cid, f"step[{k}] amp[{j}].{key}", f"{ga[key]} != {wa[key]}")

        gp = g.get("probabilities")
        if isinstance(gp, dict):
            for basis, wv in w["probabilities"].items():
                gv = gp.get(basis)
                if gv is None:
                    fail(cid, f"step[{k}] probabilities", f"missing basis '{basis}'")
                elif not close(gv, wv):
                    fail(cid, f"step[{k}] P({basis})", f"{gv} != {wv}")

        gb_all = g.get("bloch")
        if not isinstance(gb_all, list):
            fail(cid, f"step[{k}] bloch", f"expected a list, got {type(gb_all).__name__}")
        elif len(gb_all) != len(w["bloch"]):
            fail(cid, f"step[{k}] bloch", f"{len(gb_all)} entries, expected {len(w['bloch'])}")
        else:
            for q, (gb, wb) in enumerate(zip(gb_all, w["bloch"])):
                if not isinstance(gb, dict):
                    fail(cid, f"step[{k}] bloch[{q}]", "not an object")
                    continue
                for c in ("x", "y", "z", "length", "purity"):
                    if c not in gb:
                        fail(cid, f"step[{k}] bloch[{q}]", f"missing '{c}'")
                    elif not close(gb[c], wb[c]):
                        fail(cid, f"step[{k}] bloch[{q}].{c}", f"{gb[c]} != {wb[c]}")

        gr, wr = g.get("rotation"), w["rotation"]
        if wr is None:
            if gr is not None:
                fail(cid, f"step[{k}] rotation", "must be null here")
        elif not isinstance(gr, dict):
            fail(cid, f"step[{k}] rotation", "missing")
        else:
            if not close(gr.get("angle", 1e9), wr["angle"]):
                fail(cid, f"step[{k}] rotation.angle",
                     f"{gr.get('angle')} != {wr['angle']}")
            ga_ax = gr.get("axis")
            if not isinstance(ga_ax, list) or len(ga_ax) != 3:
                fail(cid, f"step[{k}] rotation.axis", "must be 3 numbers")
            else:
                for i, (a, b) in enumerate(zip(ga_ax, wr["axis"])):
                    if not close(a, b, 1e-5):
                        fail(cid, f"step[{k}] rotation.axis[{i}]", f"{a} != {b}")

        ge = g.get("entanglement")
        wc = w["entanglement"]["concurrence"]
        if not isinstance(ge, dict):
            fail(cid, f"step[{k}] entanglement", "missing or not an object")
        else:
            gc = ge.get("concurrence")
            if wc is not None:
                if gc is None:
                    fail(cid, f"step[{k}] concurrence", "missing")
                elif gc != gc:
                    fail(cid, f"step[{k}] concurrence", "NaN")
                elif not close(gc, wc, 1e-5):
                    fail(cid, f"step[{k}] concurrence", f"{gc} != {wc}")


def check_concepts(simulate, spec):
    """The physics claims the catalogue makes."""
    cases = {c["id"]: c for c in spec["cases"]}

    for c in spec["cases"]:
        res = simulate(c["gates"], c["num_qubits"])
        fin = res["final"]
        conc = fin["entanglement"]["concurrence"]

        # separability: the FINAL state must be separable. A circuit may entangle
        # transiently and then undo it (H, CX, CX) -- that is still a separable
        # result and is exactly the point of those cases.
        if c["concept"] == "separability" and not close(conc, 0.0, 1e-6):
            fail(c["id"], "separability", f"final concurrence {conc} != 0")

        # a circuit with NO two-qubit gate can never entangle, at any step
        if not any(g["gate"].upper() in TWO_QUBIT_GATES for g in c["gates"]):
            for k, st in enumerate(res["steps"]):
                if not close(st["entanglement"]["concurrence"], 0.0, 1e-6):
                    fail(c["id"], "single-qubit gates cannot entangle",
                         f"step {k} concurrence {st['entanglement']['concurrence']}")

        # entanglement: final concurrence must be > 0
        if c["concept"] == "entanglement" and conc <= 1e-6:
            fail(c["id"], "entanglement", f"final concurrence is {conc}")

        # concurrence and Bloch length are linked for a 2-qubit PURE state:
        #   length = sqrt(1 - concurrence^2)
        want = math.sqrt(max(0.0, 1 - conc ** 2))
        for q in range(2):
            if not close(fin["bloch"][q]["length"], want, 1e-4):
                fail(c["id"], f"length vs concurrence q{q}",
                     f"{fin['bloch'][q]['length']} != sqrt(1-C^2) = {want:.6f}")

        # reversibility: final state matches step 0
        if c["concept"] == "reversibility" and c["id"] in ("R04", "R06", "R07", "R08"):
            a, b = res["steps"][0], fin
            for j in range(len(a["statevector"])):
                for key in ("re", "im"):
                    if not close(a["statevector"][j][key], b["statevector"][j][key]):
                        fail(c["id"], "reversibility", "final state != steps[0]")

    for eq in spec.get("equivalences", []):
        res = simulate(eq["equivalent_gates"], 2)["final"]
        want = cases[eq["id"]]["expect"]["final"]
        for k, v in want["probabilities"].items():
            if not close(res["probabilities"][k], v):
                fail(eq["id"], f"equivalence ({eq['label']})", f"P({k}) differs")
        for q in range(2):
            for c in ("x", "y", "z", "length"):
                if not close(res["bloch"][q][c], want["bloch"][q][c], 1e-5):
                    fail(eq["id"], f"equivalence ({eq['label']})", f"bloch[{q}].{c} differs")


def check_explain(spec):
    valid = set(spec["concepts"])
    for c in spec["cases"]:
        e = c.get("explain")
        if not e:
            fail(c["id"], "explain", "missing explain block")
            continue
        for key in ("concept", "concept_label", "concept_intro", "summary",
                    "what_happens", "watch", "uses", "try_next"):
            if key not in e:
                fail(c["id"], "explain", f"missing '{key}'")
        if e.get("concept") not in valid:
            fail(c["id"], "explain", f"unknown concept '{e.get('concept')}'")
        if e.get("concept") != c.get("concept"):
            fail(c["id"], "explain", "explain.concept disagrees with case.concept")
        if not e.get("watch") or not e.get("uses"):
            fail(c["id"], "explain", "watch and uses must not be empty")


def check_errors(endpoint):
    if not endpoint:
        return 0
    raw = adapter_endpoint_raw(endpoint)
    checked = 0
    for label, payload in [
        ("unknown gate", {"num_qubits": 2, "gates": [{"gate": "ZORP", "target": 0}]}),
        ("CX same wire", {"num_qubits": 2,
                          "gates": [{"gate": "CX", "control": 0, "target": 0}]}),
        ("CX no control", {"num_qubits": 2, "gates": [{"gate": "CX", "target": 1}]}),
        ("RX no angle", {"num_qubits": 2, "gates": [{"gate": "RX", "target": 0}]}),
        ("wire out of range", {"num_qubits": 2, "gates": [{"gate": "H", "target": 5}]}),
    ]:
        status, _ = raw(payload)
        checked += 1
        if status != 400:
            fail("errors", label, f"expected HTTP 400, got {status}")
    return checked


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--engine")
    ap.add_argument("--endpoint")
    args = ap.parse_args()

    spec = json.load(open(SPEC_PATH))
    cases = spec["cases"]

    if args.endpoint:
        simulate, target = adapter_endpoint(args.endpoint), args.endpoint
    elif args.engine:
        simulate, target = adapter_module(args.engine), args.engine
    else:
        simulate, target = adapter_reference(), "reference engine (engine2.py)"

    print("QubitVista Phase 2 conformance — two-qubit /api/simulate contract")
    print(f"target    : {target}")
    print(f"cases     : {len(cases)}   steps: {sum(len(c['expect']['steps']) for c in cases)}")
    print(f"gate set  : {' '.join(spec['gate_set'])}\n")

    before = len(failures)
    for c in cases:
        try:
            res = simulate(c["gates"], c["num_qubits"])
        except Exception as exc:
            fail(c["id"], "raised", repr(exc))
            continue
        check_structure(c["id"], res, c["gates"], c["num_qubits"])
        check_golden(c["id"], res, c["expect"])
    bad = len({f[0] for f in failures[before:]})
    print(f"  structure + golden values   {'PASS' if len(failures) == before else 'FAIL'}"
          f"   {len(cases) - bad}/{len(cases)} cases clean")

    before = len(failures)
    check_concepts(simulate, spec)
    print(f"  concept assertions          {'PASS' if len(failures) == before else 'FAIL'}"
          f"   separability, entanglement, length vs concurrence, reversibility")

    before = len(failures)
    check_explain(spec)
    print(f"  teaching content            {'PASS' if len(failures) == before else 'FAIL'}"
          f"   explain block on every case")

    before = len(failures)
    n = check_errors(args.endpoint)
    if n:
        print(f"  error handling              {'PASS' if len(failures) == before else 'FAIL'}"
              f"   {n} bad requests must return HTTP 400")
    else:
        print("  error handling              SKIP   (needs --endpoint)")

    print()
    if failures:
        print(f"{len(failures)} FAILURES\n")
        for f in failures[:60]:
            print(f"   x  {f[0]:6s} {f[1]:38s} {f[2]}")
        if len(failures) > 60:
            print(f"   ... and {len(failures) - 60} more")
        return 1
    print("all checks passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
