# How to know a circuit is right

Audit of the current build, and the tooling that answers "is this output
correct?" for any circuit a user can build — not just the ones in the catalogue.

## Result of the audit

The **Python backend is sound**. Every check passes:

| Check | Result |
|---|---|
| `conformance_test.py --engine quantum_engine` | 104 circuits, 359 steps — pass |
| `conformance_test_2q.py --engine quantum_engine` | 77 circuits, 272 steps — pass |
| `verify_live.py --engine quantum_engine --trials 2500` (1 qubit) | 0 crashes, 0 disagreements |
| `verify_live.py --engine quantum_engine --trials 2500 --qubits 2` | 0 crashes, 0 disagreements |
| `fuzz2.py 12000` | 0 crashes, 0 invariant violations |
| `explain.py` on 3000 random circuits | 0 failures |
| `explain2.py` on 3000 random circuits | 0 failures |

The `_ZERO_TOL` defect flagged earlier has been fixed in `quantum_engine.py`.

**One bug remains, and it is in the frontend.**

---

## The bug: `localResult` ships a phase on a zero amplitude

`quantumEngine.js` is a second implementation of the physics. `useSimulation`
falls back to it via `localResult()` whenever the API is unreachable, and uses it
for the first paint before the backend reply lands. Nothing tested it until now.

Reproduced on **circuit I08 from your own catalogue** — `H · T · T · T · T · H`:

```
amplitude |0⟩   magnitude 0.000000   phase 1.570796
```

The UI draws a **zero-height bar with a phase dial pointing at 90°**. It looks
like a rendering fault and is not one — the value really is being sent that way.

`localResult2` already guards this. `localResult` does not:

```js
// api.js — localResult2 (two-qubit), correct
phase: r6(a.magnitude) === 0 ? 0 : r6(a.phase),

// api.js — localResult (single-qubit), missing the guard
phase: r6(a.phase),
```

### Fix

In `frontend/src/utils/api.js`, inside `localResult()`:

```js
amplitudes: r.amplitudes.map((a) => {
  // Decide "is this zero" on the ROUNDED magnitude, matching the backend.
  // An amplitude whose raw magnitude is below 5e-7 serialises as 0.000000;
  // leaving its phase intact draws an empty bar with a phase dial on it.
  const magnitude = r6(a.magnitude);
  return {
    re: magnitude === 0 ? 0 : r6(a.re),
    im: magnitude === 0 ? 0 : r6(a.im),
    magnitude,
    phase: magnitude === 0 ? 0 : r6(a.phase),
  };
}),
```

`cross_engine_test.mjs` fails on this today and passes after the change.

---

## Second finding: silent identity fallback

`quantumEngine.js`, in `gateMatrix()`:

```js
return FIXED_MATRICES[op.gate] || FIXED_MATRICES.I;
```

An unrecognised gate name becomes the **identity gate**, silently. The matrix
table is keyed `'Sdg'` / `'Tdg'` while the API and the specs use `'SDG'` / `'TDG'`,
so anything that reaches the engine without passing through `normalizeGate()`
turns into a no-op that still renders a plausible-looking result.

Both simulator pages do call `normalizeGate`, so this is not live today. It is one
missed call away from being live, and it fails invisibly.

Suggested hardening:

```js
export function gateMatrix(op) {
  const key = String(op.gate);
  if (ROTATION_GATES.has(key.toUpperCase())) {
    return rotationMatrix(key.toUpperCase(), op.param ?? Math.PI / 2);
  }
  const m = FIXED_MATRICES[key] ?? FIXED_MATRICES[NORMALIZE[key.toUpperCase()] ?? key.toUpperCase()];
  if (!m) throw new Error(`Unknown gate '${op.gate}'`);
  return m;
}
```

Throwing is right here. `useSimulation` already catches errors and shows the
backend result instead, so a loud failure degrades gracefully — a silent identity
does not.

---

## The tools, and which question each answers

| Question | Command |
|---|---|
| Is **this circuit** right? | `python verify_live.py --engine quantum_engine --circuit '[...]'` |
| Is my engine right on **any** circuit? | `python verify_live.py --engine quantum_engine --trials 5000` |
| Is my **server** right end to end? | `python verify_live.py --endpoint http://localhost:8000/api/simulate` |
| Does the **browser** agree with the backend? | `node cross_engine_test.mjs` |
| Did I break a known-good case? | `python conformance_test.py --engine quantum_engine` |
| Do the physical invariants hold? | `python fuzz2.py 30000` |

### Why `verify_live.py` is the one that settles it

Every other test compares against values Qiskit produced. If Qiskit were being
driven incorrectly, they would all agree with the mistake.

`verify_live.py` recomputes the entire state **in plain NumPy with no Qiskit
anywhere** — textbook gate matrices, explicit partial trace, Wootters concurrence
— and compares. Two independent implementations agreeing to six decimal places is
real evidence, not a tautology.

It also checks the rotation field semantically: it applies the reported axis and
angle to the previous step's Bloch vector with Rodrigues' formula and confirms the
result lands on the current one. A sign error there animates the sphere backwards,
and no value comparison alone would notice.

Checking one circuit:

```bash
python verify_live.py --engine quantum_engine --qubits 2 \
  --circuit '[{"gate":"H","target":0},{"gate":"CX","control":0,"target":1}]'
```

```
  probabilities : {'00': 0.5, '01': 0.0, '10': 0.0, '11': 0.5}
  bloch q0      : (+0.000000, +0.000000, +0.000000)  length 0.000000
  bloch q1      : (+0.000000, +0.000000, +0.000000)  length 0.000000
  concurrence   : 1.000000
  steps         : 3

verified — the backend agrees with an independent calculation
```

When a fuzz run finds a disagreement it prints a ready-to-paste `--circuit`
command for the failing case.

### `cross_engine_test.mjs`

Replays every circuit in both golden specs through `quantumEngine.js` and
`quantumEngine2.js` and compares against the Qiskit values — **every prefix**, so
per-step evolution is covered, not only final states. 359 + 272 snapshots.

```bash
cd frontend
node cross_engine_test.mjs
```

No dependencies, no build step. It copies the engines to a temp directory to fill
in the extensionless imports that Vite resolves and plain Node does not; your
source files are never modified.

Current output:

```
  single qubit  FAIL   104 circuits, 359 snapshots compared
  two qubits    PASS    77 circuits, 272 snapshots compared

   x  I08    step6 amp0    zero magnitude but phase 1.570796
```

The two-qubit engine is already correct. After the `localResult` fix both lines
read PASS.

---

## Are the descriptions correct?

Yes, and they are correct **because they are generated from the computed result**
rather than written by hand. Fuzzed over 3000 random circuits each, `explain.py`
and `explain2.py` produced a complete block every time — no crashes, no empty
fields.

Spot-checked for accuracy, not just presence:

| Circuit | Computed | Description says |
|---|---|---|
| `H · CX` | concurrence 1.0, length 0.0 | "Maximally entangled — both Bloch lengths fall to **0.0000**." |
| `H · SWAP` | concurrence 0.0, length 1.0 | "A two-qubit gate that leaves the pair completely separable." |
| `RY(π/4) · CX` | concurrence 0.707107, length 0.707107 | "Partially entangled — concurrence **0.7071**, Bloch length **0.7071**." |

The numbers quoted in the prose come from the same computation that fills the
panels, so the text and the visuals cannot disagree.

---

## Suggested CI

```bash
cd backend
python conformance_test.py    --engine quantum_engine
python conformance_test_2q.py --engine quantum_engine
python verify_live.py         --engine quantum_engine --trials 3000
python verify_live.py         --engine quantum_engine --trials 3000 --qubits 2
python fuzz2.py 20000
cd ../frontend
node cross_engine_test.mjs
```

All six exit 0 on success. The last one fails today until `localResult` is fixed.
