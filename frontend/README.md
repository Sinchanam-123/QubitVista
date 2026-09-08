# QubitVista — Frontend

React + Vite frontend for QubitVista, built from the project README and objectives.

## What's here

- **Home** (`/`) — landing page: a demo circuit that runs itself, then links into the simulator
- **Simulator** (`/simulator`) — one qubit. The workbench: gate palette, circuit strip, step scrubber,
  live Bloch sphere (Canvas 2D — the Three.js sphere is the landing-page hero only), phase-colored
  statevector amplitudes, and a probability distribution chart (hand-built CSS/SVG)
- **Simulator, two qubits** (`/simulator/two-qubit`) — the same workbench with two wires: CX, CZ and
  SWAP, a Bloch sphere per wire, four outcomes, and an entanglement readout
- **Learn** (`/learn`) — reference material: 8 concepts, 16 gates, the real-world picture, and both
  circuit catalogues, one click from the simulator
- **About** (`/about`) — what the project is and how it was built
- **Exit** (`/exit`) — session summary + a short feedback form

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

The numbers come from the Qiskit/FastAPI backend (`src/utils/api.js`, called through
`src/hooks/useSimulation.js` and `useSimulation2.js`), which is where the values the
golden spec verifies live.

Two in-browser statevector engines back it up: `src/utils/quantumEngine.js` for one
qubit (the 13-gate set — 9 fixed, 4 rotation) and `src/utils/quantumEngine2.js` for
two (the same 13 plus CX, CZ and SWAP). They are not an approximation — the same
complex-number math to the same 6 decimal places, checked circuit by circuit against
the backend by `cross_engine_test.mjs` — so they serve two purposes: an instant first
paint before the API replies, and a full fallback when it is unreachable.

**With no backend at all the app still works.** The simulator runs on those engines,
and the concepts, circuit catalogue, gate reference cards and every built-in circuit's
teaching notes are read from `src/data/catalogue*.json`, a generated copy of the
catalogue routes. The one thing that genuinely needs the API is the written notes for
a circuit you build yourself, which the backend composes from the simulated result —
and the offline banner under the transport bar says exactly that rather than leaving
a panel silently empty.

`VITE_API_BASE` points the app at a different API; unset it means `http://localhost:8000`.

## Design system

Tokens live in `src/index.css`. The signature idea is **phase = color**: the
same hue-by-phase-angle convention physicists use when plotting statevectors
is reused across the UI (the statevector panel, accent gradient, gate highlights)
instead of an arbitrary accent color. Light/dark mode is a CSS variable swap
via `data-theme` on `<html>`, toggled from `ThemeContext`.

## Folder structure

```
src/
├── main.jsx                    # entry point
├── App.jsx                     # router + theme provider shell, lazy routes
├── index.css                   # design tokens + base styles
├── context/
│   └── ThemeContext.jsx        # light/dark mode
├── pages/
│   ├── Home.jsx
│   ├── Simulator.jsx           # one qubit
│   ├── SimulatorTwo.jsx        # two qubits
│   ├── Learn.jsx               # concepts, gates, both catalogues
│   ├── About.jsx
│   └── Exit.jsx
├── components/
│   ├── Navbar.jsx · Footer.jsx
│   ├── BlochSphere.jsx         # Three.js 3D sphere — landing page only
│   ├── GatePalette.jsx         # draggable + clickable gate chips
│   ├── GuidedTour.jsx          # the per-page tour, run on first visit
│   ├── HeroDemo.jsx            # the self-running circuit on the landing page
│   ├── ...                     # HomeHeader, ModeChooser, FeatureRail, WorkflowStrip,
│   │                           # QuantumVisual, PairVisual, GateTooltip, backgrounds
│   └── classic/                # everything the two simulator pages draw
│       ├── BlochSphereClassic.jsx  # Canvas 2D sphere, animates the real rotation arc
│       ├── BlochPair.jsx           # one sphere per wire
│       ├── CircuitStrip.jsx        # the wire, drag to reorder
│       ├── CircuitStrip2.jsx       # two wires, control/target links
│       ├── Controls.jsx            # step scrubber + angle slider
│       ├── Readouts.jsx            # probability bars, statevector, entanglement meter
│       ├── ExplainPanel.jsx        # teaching notes and per-gate reference cards
│       ├── TipBox.jsx
│       └── BackendNotice.jsx       # offline banner / validation errors
├── hooks/
│   ├── useSimulation.js        # backend call + local fallback, one qubit
│   ├── useSimulation2.js       # the same, two qubits
│   ├── useViewport.js · useElementSize.js · useThemeVersion.js · useHeroTour.js
├── data/
│   ├── learnContent.js         # Learn page prose (generated from docs/learn_reference.md)
│   ├── catalogue1q.json        # offline catalogue copy (generated, 1 qubit)
│   └── catalogue2q.json        # offline catalogue copy (generated, 2 qubits)
└── utils/
    ├── api.js                  # backend client + static catalogue fallback
    ├── quantumEngine.js        # statevector math, one qubit
    └── quantumEngine2.js       # statevector math, two qubits
```

The two `catalogue*.json` files are generated by `backend/export_catalogue.py` and
verified against the live routes in CI — never edit them by hand.

## Known gaps / next steps

- The feedback form on the Exit page confirms locally and sends nothing; there is no
  endpoint behind it yet
- Both engines stop at two qubits, matching the backend and the roadmap note in the
  main README
