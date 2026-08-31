# QubitVista — Frontend

React + Vite frontend for QubitVista, built from the project README and objectives.

## What's here

- **Home** (`/`) — landing page, explains the project, links to the simulator
- **Simulator** (`/simulator`) — the workbench: gate palette, circuit canvas, live Bloch sphere (Canvas 2D —
  the Three.js sphere is the landing-page hero only), phase-colored statevector amplitudes, and a probability
  distribution chart (hand-built CSS/SVG)
- **Exit** (`/exit`) — thank-you message + a short feedback form

## Running it

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

```bash
npm run build      # production build to dist/
npm run preview    # preview the production build
```

## About the simulation

Right now the simulator runs on a small in-browser statevector engine
(`src/utils/quantumEngine.js`) — plain complex-number math, no dependencies —
so the UI is fully interactive today, before the Qiskit/FastAPI backend from
the main README is wired up. It supports up to 3 qubits and the gates
H, X, Y, Z, S, T, and CNOT.

To connect the real backend once it exists: replace the call to `runCircuit()`
in `src/pages/Simulator.jsx` with a `fetch()` to your FastAPI endpoint that
returns the same shape (`{ probabilities, amplitudes, blochVectors }`).
Nothing else on the page needs to change.

## Design system

Tokens live in `src/index.css`. The signature idea is **phase = color**: the
same hue-by-phase-angle convention physicists use when plotting statevectors
is reused across the UI (amplitude bars, accent gradient, gate highlights)
instead of an arbitrary accent color. Light/dark mode is a CSS variable swap
via `data-theme` on `<html>`, toggled from `ThemeContext`.

## Folder structure

```
src/
├── main.jsx              # entry point
├── App.jsx                # router + theme provider shell
├── index.css               # design tokens + base styles
├── context/
│   └── ThemeContext.jsx    # light/dark mode
├── pages/
│   ├── Home.jsx
│   ├── Simulator.jsx
│   └── Exit.jsx
├── components/
│   ├── Navbar.jsx
│   ├── BlochSphere.jsx      # Three.js 3D Bloch sphere
│   ├── AmplitudeBars.jsx    # phase-colored statevector bars
│   └── GatePalette.jsx      # draggable + clickable gate chips
└── utils/
    └── quantumEngine.js     # statevector math (gates, Bloch vector, probabilities)
```

## Known gaps / next steps

- No backend wired up yet — feedback form and circuit results are local-only
- Statevector engine is capped at 3 qubits for now (browser performance,
  matches the roadmap note in the main README)
- No step-through / gate-by-gate animation yet — gates apply instantly
