# QubitVista

**A 3D Quantum Simulation Environment for learning quantum computing the visual way.**

Quantum computing is hard to *feel*. You read about superposition, phase, and interference — and it all stays as equations on a page. QubitVista is an attempt to fix that. It's a browser-based quantum circuit simulator that shows you what's actually happening to your qubit as you build a circuit: Bloch sphere rotations, statevector amplitudes, and measurement probabilities, updating one gate at a time.

It's aimed at students, educators, and anyone curious about quantum computing who doesn't want to fight through a research-grade toolchain just to see a qubit move.

> **Status — Phase 2 (two-qubit).** Both simulators are live. Both backends are verified against a catalogue of golden circuits and their full state snapshots, plus a large body of fuzzed random circuits. Every value was produced by Qiskit and independently cross-checked. Three or more qubits, noise modeling, and hardware backends remain out of scope.

---

## Why we built this

Most existing tools (Qiskit notebooks, the IBM Quantum platform, and so on) are great once you already know what you're doing. But for a beginner they mostly hand back circuit diagrams and probability tables. You can *run* a circuit, but you can't really *see* how the state evolved to get there.

The stuff that trips people up most — how a gate rotates a state on the Bloch sphere, why phase matters when it doesn't change a single probability, what interference actually looks like — is exactly what these tools tend to hide. QubitVista puts that front and centre. Everything is visual, everything is live, and nothing needs installing beyond a browser.

---

## Features

- **Step-by-step state evolution** — The core of the project. Every gate produces a full state snapshot, so you can scrub through a circuit one gate at a time and watch the qubit change. Most simulators only show you the final state; the interesting part is the journey.
- **Real-time visualization** — Add a gate and the Bloch sphere, statevector, and probability charts update immediately. No re-running, no waiting.
- **3D Bloch sphere** — Rotatable, zoomable 3D view rendered with Three.js. The animation follows the gate's true rotation axis, so an H gate visibly sweeps around the (1,0,1)/√2 diagonal rather than sliding through the middle of the sphere.
- **Statevector amplitude analysis** — Amplitudes with magnitude *and* phase, so a phase gate is visible even when it leaves every probability untouched.
- **Probability distributions** — Measurement outcome probabilities plotted with Plotly, all basis states always shown.
- **Two simulators, one for each qubit count** — *Start exploring* opens a chooser. The single-qubit page is where superposition, phase and interference live; the two-qubit page adds `CX`, `CZ` and `SWAP`, a second Bloch sphere, four probability bars, and an entanglement readout.
- **Entanglement you can watch happen** — Build a Bell pair and both Bloch vectors shrink to the origin while the pair's own state stays perfectly defined. That collapse *is* the entanglement: the information has moved out of the individual qubits and into the correlation between them.
- **Built-in circuits with teaching notes** — a single-qubit catalogue across six concepts and a two-qubit one across eight. Each carries a plain-English explanation of what happens, what to watch (including what *doesn't* move), and where it matters in real quantum computing.
- **A full reference section** — `/learn` carries 35 sections: all 8 concepts, all 16 gates with their matrices, axes, history and hardware cost, and the real-world picture. Every section links straight into whichever simulator can run it.
- **Qiskit-powered backend** — Simulation is exact, via `Statevector`. Every number in the catalogue was produced by Qiskit and re-verified independently.
- **Zero setup for the end user** — Runs in the browser. No quantum hardware, no local Python for whoever's just using it.

### The six single-qubit concepts

| Concept | What it shows | Try |
|---|---|---|
| **State evolution** | Every gate is a rotation; evolution between measurements is deterministic | `H, S, S, H, S` |
| **Superposition** | A qubit holding 0 and 1 at once — the vector leaves the pole | `H` |
| **Phase** | Real, physical, and completely invisible in the probability bars | `H, S` |
| **Interference** | Where a hidden phase turns into a measurable probability | `H, RZ(θ), H` |
| **Measurement** | Probabilities as squared amplitudes | `RY(θ)` |
| **Reversibility** | Run a gate and its inverse, land exactly where you started | `S, S†` |

The interference circuit is the one to play with: `H, RZ(θ), H` gives `P(1) = sin²(θ/2)`. Sweep θ and watch a phase you couldn't see become a probability you can.

### Two more concepts at two qubits

| Concept | What it shows | Try |
|---|---|---|
| **Entanglement** | The pair has a state; neither qubit does. Both Bloch vectors empty out | `H q0, CX q0→q1` |
| **Separability** | A two-qubit gate is not automatically an entangling gate | `H q0, SWAP` |

Those two are a matched pair — the second is the counterexample that stops "two-qubit gate" being read as "entangling gate". The other six concepts all reappear at two qubits with a wider version of the same lesson: `CZ` flips the sign of `|11⟩` and moves no probability bar at all.

Entanglement genuinely cannot be demonstrated with one qubit. Single-qubit gates are tensor-product operations and mathematically preserve separability, so a Bell state requires at least one two-qubit gate. That is why it is a separate page and not a setting.

### Supported gates

**Single-qubit** — `I` `X` `Y` `Z` `H` `S` `S†` `T` `T†`, and `RX` `RY` `RZ` `P` with an adjustable angle in radians.

**Two-qubit** — `CX` (alias `CNOT`), `CZ`, `SWAP`. Each needs a `control` as well as a `target`, on two different wires.

---

## Tech stack

| Layer | Tools |
|-------|-------|
| Simulation engine | Qiskit (`qiskit.quantum_info`) |
| Backend / API | FastAPI + Pydantic v2, served by uvicorn |
| 3D graphics | Three.js |
| 2D plots & charts | Plotly |
| Frontend build | Vite |

The backend does the quantum heavy lifting with Qiskit and exposes it through a FastAPI service. It is fully stateless — the frontend owns the circuit and sends the whole gate list on every call, so scrubbing backwards through a circuit is an array index, not another request.

---

## Getting started

### Prerequisites

- Python 3.10+ and pip
- Node.js + npm (frontend only)
- A modern browser

### 1. Clone the repo

```bash
git clone https://github.com/<your-username>/qubitvista.git
cd qubitvista
```

### 2. Set up the backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Runs on `http://127.0.0.1:8000`.

### 3. Try it without a frontend

Open **http://localhost:8000/docs** for interactive API docs, or:

```bash
curl -X POST http://localhost:8000/api/simulate \
  -H "Content-Type: application/json" \
  -d '{"num_qubits":1,"gates":[{"gate":"H","target":0}]}'
```

Quick sanity checks — `|0⟩` with no gates sits at Bloch `z = +1` (north pole), `H` moves it to `x = +1` (the equator), `X` flips it to `z = -1`.

### 4. Verify the backend

Six checks make up CI, and all six must exit 0:

```bash
python conformance_test.py    --engine quantum_engine              # golden circuits, 1 qubit
python conformance_test_2q.py --engine quantum_engine              # golden circuits, 2 qubits
python verify_live.py         --engine quantum_engine --trials 3000
python verify_live.py         --engine quantum_engine --trials 3000 --qubits 2
python fuzz2.py 20000                                              # 11 invariants, random circuits
cd ../frontend && node cross_engine_test.mjs                       # browser engines vs backend
```

Plus the fast unit tests and the live-server variants:

```bash
pytest tests_phase1.py tests_phase2.py                             # 75 fast unit tests
python conformance_test.py    --endpoint http://localhost:8000/api/simulate
python conformance_test_2q.py --endpoint http://localhost:8000/api/simulate
```

If one fails, the code is wrong — don't loosen a tolerance or edit a spec.

### 5. Frontend

```bash
cd ../frontend
npm install
npm run dev
```

Runs on `http://localhost:5173` and expects the backend on port 8000. If the backend is down the simulators keep working on an exact client-side engine and say so — the numbers agree with Qiskit to all six decimal places either way.

---

## API

| Endpoint | Returns |
|---|---|
| `GET /api/health` | Service status and both catalogue counts |
| `GET /api/gates` | Gate palette with rotation and arity metadata |
| `GET /api/concepts` | The concepts, each with a runnable preset |
| `GET /api/concepts/{name}` | One concept and all its circuits |
| `GET /api/circuits` | Catalogue index (filter with `?concept=`) |
| `GET /api/circuits/{id}` | One circuit's gates plus its teaching notes |
| `POST /api/simulate` | Run a circuit — a full snapshot after every gate |
| `POST /api/explain` | Teaching content for any circuit, not just catalogue ones |

Every catalogue route takes `?qubits=1` (default) or `?qubits=2`. The two catalogues reuse case ids — there is an `S01` in each — so that parameter is what disambiguates them.

`POST /api/simulate` takes a gate list and returns `steps`, where `steps[0]` is the initial `|0…0⟩` state and `steps[k]` is the state after the first *k* gates. At one qubit:

```json
{
  "step": 1,
  "gate": "H",
  "target": 0,
  "rotation": { "axis": [0.707107, 0.0, 0.707107], "angle": 3.141593 },
  "statevector": [{ "re": 0.707107, "im": 0.0, "magnitude": 0.707107, "phase": 0.0 }],
  "probabilities": { "0": 0.5, "1": 0.5 },
  "bloch": { "x": 1.0, "y": 0.0, "z": 0.0, "length": 1.0 }
}
```

Send `"num_qubits": 2` and three things change: `bloch` becomes a list with one entry per wire (each gaining `purity`), every step reports its `control`, and an `entanglement` block carries the concurrence.

```json
{
  "step": 2,
  "gate": "CX",
  "target": 1,
  "control": 0,
  "rotation": null,
  "probabilities": { "00": 0.5, "01": 0.0, "10": 0.0, "11": 0.5 },
  "bloch": [{ "x": 0.0, "y": 0.0, "z": 0.0, "length": 0.0, "purity": 0.5 },
            { "x": 0.0, "y": 0.0, "z": 0.0, "length": 0.0, "purity": 0.5 }],
  "entanglement": { "concurrence": 1.0 }
}
```

`rotation` is `null` on `CX`, `CZ` and `SWAP` — they are not a rotation of either Bloch sphere, so there is no axis to animate along. Anything that draws the motion must check for that rather than assume an axis is always present.

Bit order is little-endian, matching Qiskit: labels read `q1q0`, so an `X` on q0 alone produces the outcome `01`, not `10`.

Unsupported gates, missing rotation angles, out-of-range wires, a two-qubit gate without a control, and a control and target on the same wire all return HTTP 400 with a readable message — a gate is never silently skipped, and a dropped control would produce a plausible-looking wrong answer, which is the worst failure mode a teaching tool has.

---

## How to use it

1. Open the app in your browser and hit **Start exploring**.
2. Pick one qubit or two.
3. Drop gates onto the circuit — on the two-qubit page, onto whichever wire you want them on.
4. Watch the Bloch spheres, statevector, and probability plots react as you go.
5. Step back and forth through the gates to see how the state got where it is.
6. Play. Seriously — that's the point. Put a Hadamard on the qubit and watch it land on the equator. Then add an `S` and notice the probability bars don't move at all, while the sphere clearly does. That gap is what phase *is*.
7. Then go next door and put an `H` on q0 followed by a `CX`. Both spheres empty out — and *that* gap is what entanglement is.

---

## Project structure

```
qubitvista/
├── PROJECT_GUIDE.md                   # project instructions and API contract
├── README.md
├── backend/
│   ├── main.py                 # FastAPI app and routes
│   ├── quantum_engine.py       # Qiskit simulation logic, one and two qubits
│   ├── explain.py              # teaching text, generated from simulated results
│   ├── explain2.py             # the same, for two-qubit circuits
│   ├── schemas.py              # request models
│   ├── circuits_spec.json      # golden data — single-qubit circuits + snapshots
│   ├── circuits_spec_2q.json   # golden data — two-qubit circuits + snapshots
│   ├── conformance_test.py     # contract verification, 1 qubit
│   ├── conformance_test_2q.py  # contract verification, 2 qubits
│   ├── fuzz2.py                # property-based tests on random circuits
│   ├── engine_ref.py           # independent reference implementation, 1 qubit
│   ├── engine2.py              # independent reference implementation, 2 qubits
│   ├── tests_phase1.py         # fast unit tests, 1 qubit
│   ├── tests_phase2.py         # fast unit tests, 2 qubits
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── pages/              # Home · Explore · Simulator · SimulatorTwo · Learn
│       ├── components/         # gate palette, Bloch spheres, readouts
│       ├── data/               # Learn page content (generated)
│       └── utils/              # API client + exact offline engines
└── docs/
    ├── QubitVista_Circuit_Plates.html     # visual catalogue, single-qubit circuits
    ├── QubitVista_TwoQubit_Catalogue.html # visual catalogue, two-qubit circuits
    └── learn_reference.md                 # source text behind the Learn page
```

---

## Roadmap

**Done — Phase 2, two-qubit gates and entanglement.** `CX`, `CZ` and `SWAP`, per-qubit reduced states via `partial_trace`, correlated outcomes, and the Bell state where each Bloch vector shrinks to the origin and the sphere visibly empties out.

**Later**

- Three or more qubits, and the algorithms that need them
- Noise and error modeling
- Shot-based sampling alongside exact probabilities
- Guided learning modules built on the circuit catalogue
- Export circuits to run on real quantum hardware backends

---

## Objectives

For anyone reviewing the project, the core goals were:

1. Provide a user-friendly, web-based environment for building and experimenting with quantum circuits.
2. Simulate circuits in real time and visualize how the quantum state evolves during gate operations.
3. Build interactive visualization modules — Bloch sphere, state vectors, probability distributions — for intuitive understanding.
4. Make the hard concepts (superposition, phase, interference, state transformation) approachable through hands-on interaction.

---

## Verification

Correctness isn't assumed, and the checks are deliberately not all of a kind — the point is that they can't all be wrong in the same direction.

**The one that isn't circular.** Every test that compares against the golden specs is comparing against values *Qiskit produced*; if Qiskit were being driven incorrectly they would agree with the mistake in unison. `verify_live.py` recomputes the entire state in **plain NumPy with no Qiskit anywhere** — textbook gate matrices, explicit partial trace, Wootters concurrence — and compares. It also verifies `rotation` semantically, applying the reported axis and angle to the previous step's Bloch vector via Rodrigues' formula and checking it lands on the current one; a sign error there animates the sphere backwards and no value comparison would notice.

**The browser engines.** `quantumEngine.js` and `quantumEngine2.js` are what runs when the backend is unreachable, so a drift there shows a user wrong numbers with no warning. `cross_engine_test.mjs` replays both golden specs through them, comparing every prefix rather than just final states.

Between them the two spec files hold every golden circuit and its full sequence of state snapshots, every value generated by Qiskit and independently re-derived with raw NumPy including the little-endian bit order. On top of the values themselves, the suites check that each step's stated rotation axis and angle actually carry the previous Bloch vector to the next one, via Rodrigues' rotation formula — a sign error there would animate the sphere backwards without changing a single number in the panels.

At two qubits, two independently computed quantities are cross-checked against each other: `purity = (1 + length²)/2`, and `length = √(1 − concurrence²)` for a pure pair. Neither is derived from the other, so agreeing is evidence rather than tautology.

`fuzz2.py` then does the same on a large batch of random circuits nobody wrote down, which is what actually protects the tool from a circuit a user drags together.

Independent reference implementations are kept deliberately — `engine_ref.py` and `engine2.py` — and are never imported by the shipping engine. Keeping two implementations in agreement across every snapshot is the point.

---

## Contributing

Contributions, bug reports, and suggestions are welcome. If you find something broken or have an idea, open an issue or send a pull request. If you're adding a feature, a short note in the PR describing what it does and why helps a lot.

Before submitting backend changes, run `pytest tests_phase1.py`, `python conformance_test.py --engine quantum_engine` and `python conformance_test_2q.py --engine quantum_engine`. All three must pass.

---

*QubitVista — because quantum states are easier to understand when you can actually watch them move.*
