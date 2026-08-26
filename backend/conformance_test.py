"""
QubitVista backend conformance suite — PROJECT_GUIDE.md /api/simulate contract.

    python conformance_test.py                                      # reference engine
    python conformance_test.py --engine backend.quantum_engine      # your engine module
    python conformance_test.py --endpoint http://localhost:8000/api/simulate

The backend is done when this exits 0.

Golden data is circuits_spec.json. Counts are read from the spec at runtime
(spec["counts"]) rather than hardcoded here, so they cannot drift. Every value
was produced by Qiskit. If a check fails, the backend is wrong — do not loosen
a tolerance or edit the spec.
"""
from __future__ import annotations
import argparse, importlib, json, math, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SPEC_PATH = os.path.join(HERE, "circuits_spec.json")

TOL = 1e-6          # spec is rounded to 6 dp, so this is the natural tolerance
failures: list[tuple] = []


def fail(case_id, what, detail):
    failures.append((case_id, what, detail))


def close(a, b, tol=TOL):
    return abs(float(a) - float(b)) <= tol


# ---------------------------------------------------------------- adapters
def adapter_reference():
    sys.path.insert(0, HERE)
    from engine_ref import simulate
    return lambda gates, nq, q: simulate(gates, nq, q)


def adapter_module(dotted):
    mod = importlib.import_module(dotted)
    fn = getattr(mod, "simulate", None)
    if fn is None:
        raise SystemExit(f"{dotted} has no simulate() function")

    def run(gates, nq, q):
        try:
            return fn(gates, nq, q)
        except TypeError:
            return fn(gates, nq)
    return run


def adapter_endpoint(url):
    import urllib.request

    def run(gates, nq, q):
        body = json.dumps({"num_qubits": nq, "qubit": q, "gates": gates}).encode()
        req = urllib.request.Request(url, data=body,
                                     headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read().decode())
    return run


def adapter_endpoint_raw(url):
    """Returns (status, body) so error handling can be tested."""
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
def check_structure(cid, res, gates, num_qubits):
    """Invariants that hold for every response, independent of the values."""
    for key in ("num_qubits", "steps", "final"):
        if key not in res:
            return fail(cid, "shape", f"missing top-level key '{key}'")

    steps = res["steps"]
    if len(steps) != len(gates) + 1:
        return fail(cid, "steps length", f"{len(steps)} != len(gates)+1 = {len(gates) + 1}")

    n_basis = 2 ** num_qubits
    for k, st in enumerate(steps):
        missing = [key for key in ("step", "gate", "target", "rotation",
                                   "statevector", "probabilities", "bloch") if key not in st]
        if missing:
            fail(cid, f"step[{k}] shape", f"missing {missing}")
            continue

        if st["step"] != k:
            fail(cid, f"step[{k}]", f"step index is {st['step']}")

        if k == 0:
            if st["gate"] is not None:     fail(cid, "step[0]", "gate must be null")
            if st["target"] is not None:   fail(cid, "step[0]", "target must be null")
            if st["rotation"] is not None: fail(cid, "step[0]", "rotation must be null")
        else:
            if st["gate"] is None:
                fail(cid, f"step[{k}]", "gate must not be null")
            if st["rotation"] is None:
                fail(cid, f"step[{k}]", "rotation must not be null for a single-qubit gate")
            else:
                rot = st["rotation"]
                if "axis" not in rot or "angle" not in rot:
                    fail(cid, f"step[{k}] rotation", "needs 'axis' and 'angle'")
                elif len(rot["axis"]) != 3:
                    fail(cid, f"step[{k}] rotation", "axis must have 3 components")
                elif not close(rot["angle"], 0.0):
                    n = math.sqrt(sum(float(v) ** 2 for v in rot["axis"]))
                    if not close(n, 1.0, 1e-5):
                        fail(cid, f"step[{k}] rotation", f"axis not unit length: {rot['axis']}")

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
            if mag <= 1e-9:
                if not close(amp["phase"], 0.0):
                    fail(cid, f"step[{k}] amp[{j}]", "phase of a zero amplitude must be 0.0")
            else:
                ph = math.atan2(float(amp["im"]), float(amp["re"]))
                d = abs(float(amp["phase"]) - ph)
                if min(d, abs(d - 2 * math.pi)) > 1e-5:
                    fail(cid, f"step[{k}] amp[{j}]", "phase != atan2(im, re)")

        probs = st["probabilities"]
        if len(probs) != n_basis:
            fail(cid, f"step[{k}] probabilities",
                 f"{len(probs)} entries, expected all {n_basis} basis states")
        total = sum(float(v) for v in probs.values())
        if not close(total, 1.0, 1e-5):
            fail(cid, f"step[{k}] unitarity", f"probabilities sum to {total}")

        b = st["bloch"]
        if not all(key in b for key in ("x", "y", "z", "length")):
            fail(cid, f"step[{k}] bloch", "needs x, y, z, length")
        else:
            L = math.sqrt(sum(float(b[c]) ** 2 for c in "xyz"))
            if not close(b["length"], L, 1e-5):
                fail(cid, f"step[{k}] bloch", "length != sqrt(x^2+y^2+z^2)")
            if num_qubits == 1 and not close(b["length"], 1.0, 1e-5):
                fail(cid, f"step[{k}] bloch",
                     f"single qubit must stay pure, length = {b['length']}")

    if res["final"] != steps[-1]:
        fail(cid, "final", "final must equal steps[-1]")


def check_golden(cid, res, exp):
    """Every step must match the stored Qiskit values."""
    got, want = res["steps"], exp["steps"]
    if len(got) != len(want):
        return
    for k, (g, w) in enumerate(zip(got, want)):
        for j, (ga, wa) in enumerate(zip(g["statevector"], w["statevector"])):
            for key in ("re", "im", "magnitude"):
                if not close(ga[key], wa[key]):
                    fail(cid, f"step[{k}] amp[{j}].{key}", f"{ga[key]} != {wa[key]}")
        for basis, wv in w["probabilities"].items():
            gv = g["probabilities"].get(basis)
            if gv is None:
                fail(cid, f"step[{k}] probabilities", f"missing basis '{basis}'")
            elif not close(gv, wv):
                fail(cid, f"step[{k}] P({basis})", f"{gv} != {wv}")
        for c in ("x", "y", "z", "length"):
            if not close(g["bloch"][c], w["bloch"][c]):
                fail(cid, f"step[{k}] bloch.{c}", f"{g['bloch'][c]} != {w['bloch'][c]}")
        if w["rotation"] is not None and g.get("rotation") is not None:
            if not close(g["rotation"]["angle"], w["rotation"]["angle"]):
                fail(cid, f"step[{k}] rotation.angle",
                     f"{g['rotation']['angle']} != {w['rotation']['angle']}")
            for i, (ga2, wa2) in enumerate(zip(g["rotation"]["axis"], w["rotation"]["axis"])):
                if not close(ga2, wa2, 1e-5):
                    fail(cid, f"step[{k}] rotation.axis[{i}]", f"{ga2} != {wa2}")


def check_explain(spec):
    """Every case must carry teaching content the UI can display."""
    valid_concepts = set(spec["concepts"])
    for c in spec["cases"]:
        e = c.get("explain")
        if not e:
            fail(c["id"], "explain", "missing explain block")
            continue
        for key in ("concept", "concept_label", "concept_intro", "summary",
                    "what_happens", "watch", "uses", "try_next"):
            if key not in e:
                fail(c["id"], "explain", f"missing '{key}'")
        if e.get("concept") not in valid_concepts:
            fail(c["id"], "explain", f"unknown concept '{e.get('concept')}'")
        if e.get("concept") != c.get("concept"):
            fail(c["id"], "explain", "explain.concept disagrees with case.concept")
        if not e.get("watch"):
            fail(c["id"], "explain", "watch must not be empty")
        if not e.get("uses"):
            fail(c["id"], "explain", "uses must not be empty")
        if len(e.get("summary", "")) < 10:
            fail(c["id"], "explain", "summary is too short to be useful")


def check_concepts(simulate, spec):
    """The physics claims from PROJECT_GUIDE.md's verification tables."""
    cases = {c["id"]: c for c in spec["cases"]}

    for c in spec["cases"]:
        if c["concept"] != "reversibility":
            continue
        res = simulate(c["gates"], c["num_qubits"], c["qubit"])
        a, b = res["steps"][0], res["final"]
        for j in range(len(a["statevector"])):
            for key in ("re", "im"):
                if not close(a["statevector"][j][key], b["statevector"][j][key]):
                    fail(c["id"], "reversibility", "final state != steps[0]")

    for eq in spec["equivalences"]:
        res = simulate(eq["equivalent_gates"], 1, 0)
        want = cases[eq["id"]]["expect"]["final"]["bloch"]
        for c in ("x", "y", "z"):
            if not close(res["final"]["bloch"][c], want[c]):
                fail(eq["id"], f"composition ({eq['label']})",
                     f"bloch.{c} {res['final']['bloch'][c]} != {want[c]}")

    for c in spec["cases"]:
        gates, theta = c["gates"], None
        if c["concept"] == "interference" and len(gates) == 3 and gates[1]["gate"] == "RZ":
            theta = gates[1]["params"][0]
        elif c["concept"] == "measurement" and len(gates) == 1 and gates[0]["gate"] == "RY":
            theta = gates[0]["params"][0]
        if theta is None:
            continue
        res = simulate(gates, 1, 0)
        want = math.sin(theta / 2) ** 2
        got = float(res["final"]["probabilities"]["1"])
        if not close(got, want, 1e-5):
            fail(c["id"], "sin^2(theta/2)", f"P(1) = {got}, expected {want:.6f}")

    for c in spec["cases"]:
        if c["concept"] != "phase" or len(c["gates"]) != 1:
            continue
        if c["gates"][0]["gate"] not in ("I", "S", "SDG", "T", "TDG", "Z", "RZ", "P"):
            continue
        res = simulate(c["gates"], 1, 0)
        if not close(res["final"]["bloch"]["z"], 1.0, 1e-5):
            fail(c["id"], "phase on pole", "z must stay +1 on |0>")
        if not close(res["final"]["probabilities"]["0"], 1.0, 1e-5):
            fail(c["id"], "phase on pole", "P(0) must stay 1")


def check_errors(endpoint):
    """Bad input must be rejected with HTTP 400, never silently skipped."""
    if not endpoint:
        return 0
    raw = adapter_endpoint_raw(endpoint)
    checked = 0
    for label, payload in [
        ("unknown gate", {"num_qubits": 1, "gates": [{"gate": "ZORP", "target": 0}]}),
        ("missing angle", {"num_qubits": 1, "gates": [{"gate": "RX", "target": 0}]}),
        ("Phase 2 gate", {"num_qubits": 1, "gates": [{"gate": "CX", "target": 0}]}),
    ]:
        status, _ = raw(payload)
        checked += 1
        if status != 400:
            fail("errors", label, f"expected HTTP 400, got {status}")
    return checked


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--engine", help="dotted path to a module exposing simulate()")
    ap.add_argument("--endpoint", help="POST /api/simulate URL")
    args = ap.parse_args()

    spec = json.load(open(SPEC_PATH))
    cases = spec["cases"]

    if args.endpoint:
        simulate, target = adapter_endpoint(args.endpoint), args.endpoint
    elif args.engine:
        simulate, target = adapter_module(args.engine), args.engine
    else:
        simulate, target = adapter_reference(), "reference engine"

    print("QubitVista conformance — PROJECT_GUIDE.md /api/simulate contract")
    print(f"target    : {target}")
    print(f"cases     : {len(cases)}   steps: {sum(len(c['expect']['steps']) for c in cases)}")
    print(f"gate set  : {' '.join(spec['gate_set'])}\n")

    before = len(failures)
    for c in cases:
        try:
            res = simulate(c["gates"], c["num_qubits"], c["qubit"])
        except Exception as exc:
            fail(c["id"], "raised", repr(exc))
            continue
        check_structure(c["id"], res, c["gates"], c["num_qubits"])
        check_golden(c["id"], res, c["expect"])
    bad_cases = len({f[0] for f in failures[before:]})
    print(f"  structure + golden values   {'PASS' if len(failures) == before else 'FAIL'}"
          f"   {len(cases) - bad_cases}/{len(cases)} cases clean")

    before = len(failures)
    check_concepts(simulate, spec)
    print(f"  concept assertions          {'PASS' if len(failures) == before else 'FAIL'}"
          f"   reversibility, composition, sin^2(theta/2), phase-on-pole")

    before = len(failures)
    check_explain(spec)
    print(f"  teaching content            {'PASS' if len(failures) == before else 'FAIL'}"
          f"   concept, summary, what/watch/uses on every case")

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
            print(f"   x  {f[0]:6s} {f[1]:32s} {f[2]}")
        if len(failures) > 60:
            print(f"   ... and {len(failures) - 60} more")
        return 1
    print("all checks passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
