"""Static catalogue vs the live API — the two must never disagree.

    python catalogue_drift_test.py
    python catalogue_drift_test.py --base-url http://localhost:8000   # reuse a server

Starts uvicorn, fetches EVERY catalogue route for both catalogues — the gate
palette with its reference cards, the concepts map, the circuit index, and all
181 per-circuit documents — and asserts each response is identical to the
corresponding entry in the committed frontend/src/data/catalogue*.json.

Why this is a test and not a convention
---------------------------------------
The frontend now answers those three routes from static JSON whenever the
backend is unreachable, so a user offline and a user online read different
copies of the same teaching content. Nothing in the build makes them agree: a
spec edit, a new circuit, a reworded explain block, or someone hand-patching the
JSON all leave the copies silently different, and the failure mode is a reader
being taught something the project no longer says. This is the check that turns
that into a red build.

It compares parsed JSON rather than text, so key order and whitespace are
irrelevant — only content counts. If it fails, re-run export_catalogue.py and
commit the result. Never edit the JSON to make this pass.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))

from export_catalogue import FILES  # noqa: E402  (same file list, one source)

MAX_REPORTED = 25
failures: list[tuple[str, str]] = []


def fail(route: str, detail: str) -> None:
    failures.append((route, detail))


# ---------------------------------------------------------------- http

def get(base: str, path: str, params: dict) -> object:
    url = f"{base}{path}?{urllib.parse.urlencode(params)}"
    with urllib.request.urlopen(url, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


def wait_for(base: str, timeout: float = 60.0) -> None:
    """Block until the server answers, or give up loudly."""
    deadline = time.time() + timeout
    last = None
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(f"{base}/api/health", timeout=5) as r:
                if r.status == 200:
                    return
        except Exception as exc:                      # not up yet
            last = exc
            time.sleep(0.3)
    raise SystemExit(f"server never became ready at {base}: {last!r}")


# ---------------------------------------------------------------- diffing

def diff(live, static, path: str = "") -> list[str]:
    """Every content difference between two parsed JSON documents.

    Reports the JSON path rather than dumping both documents — with 181 case
    documents in play, "cases.S01.explain.watch[2]" is the only form of this
    message anyone can act on.
    """
    if type(live) is not type(static) and not (
        isinstance(live, (int, float)) and isinstance(static, (int, float))
    ):
        return [f"{path or '<root>'}: live is {type(live).__name__}, "
                f"static is {type(static).__name__}"]

    if isinstance(static, dict):
        out = []
        for key in sorted(set(live) | set(static)):
            where = f"{path}.{key}" if path else key
            if key not in live:
                out.append(f"{where}: missing from the live API")
            elif key not in static:
                out.append(f"{where}: missing from the static file")
            else:
                out += diff(live[key], static[key], where)
        return out

    if isinstance(static, list):
        if len(live) != len(static):
            return [f"{path}: {len(live)} entries live, {len(static)} static"]
        out = []
        for i, (a, b) in enumerate(zip(live, static)):
            out += diff(a, b, f"{path}[{i}]")
        return out

    if live != static:
        return [f"{path}: live {live!r} != static {static!r}"]
    return []


def compare(route: str, live, static) -> None:
    for d in diff(live, static):
        fail(route, d)


# ---------------------------------------------------------------- checks

def check_catalogue(base: str, qubits: int, doc: dict) -> int:
    """Every catalogue route for one catalogue. Returns routes checked."""
    q = {"qubits": qubits}

    compare(f"/api/gates?qubits={qubits}", get(base, "/api/gates", q), doc["gates"])
    compare(f"/api/concepts?qubits={qubits}", get(base, "/api/concepts", q), doc["concepts"])
    compare(f"/api/circuits?qubits={qubits}", get(base, "/api/circuits", q), doc["circuits"])

    # The index is the list of ids the frontend can ask for, so the static file
    # must carry a document for exactly those and no others — an extra entry is
    # as wrong as a missing one, and would be invisible in a per-id comparison.
    live_ids = [c["id"] for c in get(base, "/api/circuits", q)["circuits"]]
    static_ids = sorted(doc["cases"])
    if sorted(live_ids) != static_ids:
        missing = sorted(set(live_ids) - set(static_ids))
        extra = sorted(set(static_ids) - set(live_ids))
        if missing:
            fail(f"cases[{qubits}q]", f"no static document for: {', '.join(missing)}")
        if extra:
            fail(f"cases[{qubits}q]", f"static documents nothing serves: {', '.join(extra)}")

    for case_id in live_ids:
        compare(f"/api/circuits/{case_id}?qubits={qubits}",
                get(base, f"/api/circuits/{case_id}", q),
                doc["cases"].get(case_id, {}))

    return 3 + len(live_ids)


def main() -> int:
    # The teaching text is full of |0⟩ and em dashes, and a Windows console
    # defaults to cp1252. Without this the report explaining a real difference
    # would itself die on the first character it could not encode.
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--base-url", help="an already-running server; skips starting uvicorn")
    ap.add_argument("--port", type=int, default=8765,
                    help="port for the server this starts (default 8765)")
    args = ap.parse_args()

    docs = {}
    for qubits, path in FILES.items():
        if not path.exists():
            raise SystemExit(f"{path} is missing — run `python export_catalogue.py` first")
        docs[qubits] = json.loads(path.read_text(encoding="utf-8"))

    print("QubitVista catalogue drift — static frontend copy vs the live API")

    server = None
    base = args.base_url.rstrip("/") if args.base_url else f"http://127.0.0.1:{args.port}"
    if not args.base_url:
        server = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "main:app",
             "--host", "127.0.0.1", "--port", str(args.port), "--log-level", "warning"],
            cwd=str(HERE), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
    print(f"target    : {base}{'' if args.base_url else '  (uvicorn started here)'}")

    try:
        wait_for(base)
        checked = 0
        for qubits, doc in docs.items():
            before = len(failures)
            n = check_catalogue(base, qubits, doc)
            checked += n
            print(f"  {qubits}-qubit catalogue         "
                  f"{'PASS' if len(failures) == before else 'FAIL'}"
                  f"   {n} routes vs {FILES[qubits].name}")
    except urllib.error.URLError as exc:
        raise SystemExit(f"could not reach {base}: {exc}")
    finally:
        if server is not None:
            server.terminate()
            try:
                server.wait(timeout=10)
            except subprocess.TimeoutExpired:
                server.kill()

    print()
    if failures:
        print(f"{len(failures)} DIFFERENCES — the static catalogue is out of date\n")
        for route, detail in failures[:MAX_REPORTED]:
            print(f"   x  {route:34s} {detail}")
        if len(failures) > MAX_REPORTED:
            print(f"   ... and {len(failures) - MAX_REPORTED} more")
        print("\nre-run `python export_catalogue.py` and commit the result.")
        return 1

    print(f"all {checked} catalogue routes match the static files")
    return 0


if __name__ == "__main__":
    sys.exit(main())
