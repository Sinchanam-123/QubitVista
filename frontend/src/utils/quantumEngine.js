// Single-qubit statevector engine — 13-gate set matching the project spec:
// 9 fixed gates (no parameters) + 4 rotation gates (1 angle, radians).
// Runs entirely client-side so the simulator is interactive today, before
// the Qiskit/FastAPI backend is wired in.

const c = (re, im = 0) => ({ re, im });
const cMul = (a, b) => c(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
const cAdd = (a, b) => c(a.re + b.re, a.im + b.im);
const cAbs2 = (a) => a.re * a.re + a.im * a.im;
const SQRT1_2 = 1 / Math.sqrt(2);

const FIXED_MATRICES = {
  I: [[c(1), c(0)], [c(0), c(1)]],
  X: [[c(0), c(1)], [c(1), c(0)]],
  Y: [[c(0), c(0, -1)], [c(0, 1), c(0)]],
  Z: [[c(1), c(0)], [c(0), c(-1)]],
  H: [[c(SQRT1_2), c(SQRT1_2)], [c(SQRT1_2), c(-SQRT1_2)]],
  S: [[c(1), c(0)], [c(0), c(0, 1)]],
  Sdg: [[c(1), c(0)], [c(0), c(0, -1)]],
  T: [[c(1), c(0)], [c(0), c(Math.cos(Math.PI / 4), Math.sin(Math.PI / 4))]],
  Tdg: [[c(1), c(0)], [c(0), c(Math.cos(-Math.PI / 4), Math.sin(-Math.PI / 4))]],
};

const ROTATION_GATES = new Set(['RX', 'RY', 'RZ', 'P']);

function rotationMatrix(gate, theta) {
  const cos = Math.cos(theta / 2);
  const sin = Math.sin(theta / 2);
  switch (gate) {
    case 'RX':
      return [[c(cos), c(0, -sin)], [c(0, -sin), c(cos)]];
    case 'RY':
      return [[c(cos), c(-sin)], [c(sin), c(cos)]];
    case 'RZ':
      return [[c(Math.cos(-theta / 2), Math.sin(-theta / 2)), c(0)], [c(0), c(Math.cos(theta / 2), Math.sin(theta / 2))]];
    case 'P':
      return [[c(1), c(0)], [c(0), c(Math.cos(theta), Math.sin(theta))]];
    default:
      return FIXED_MATRICES.I;
  }
}

// The matrix table is keyed 'Sdg' / 'Tdg' — the palette's spelling — while the
// API and both golden specs use 'SDG' / 'TDG'. Accepting either is safer than
// depending on every caller remembering to normalize first.
const GATE_ALIAS = { SDG: 'Sdg', TDG: 'Tdg' };

/** Matrix for one gate op. Throws on anything it doesn't recognise.
 *
 *  This used to fall back to the identity, which meant a misspelled or
 *  un-normalized gate name silently became a no-op and still rendered a
 *  perfectly plausible circuit — the worst failure mode a teaching tool has,
 *  because nothing on screen looks wrong. Throwing is safe here: useSimulation
 *  already catches and keeps the backend's answer, so a loud failure degrades
 *  to correct numbers while a silent one degrades to wrong ones. */
export function gateMatrix(op) {
  const raw = String(op.gate);
  const upper = raw.toUpperCase();

  if (ROTATION_GATES.has(upper)) return rotationMatrix(upper, op.param ?? Math.PI / 2);

  const matrix = FIXED_MATRICES[raw] ?? FIXED_MATRICES[GATE_ALIAS[upper] ?? upper];
  if (!matrix) throw new Error(`Unknown gate '${op.gate}'`);
  return matrix;
}

export function isParameterized(gate) {
  return ROTATION_GATES.has(gate);
}

// The 9 fixed gates, in spec order.
const FIXED_ORDER = ['I', 'X', 'Y', 'Z', 'H', 'S', 'Sdg', 'T', 'Tdg'];
// The 4 rotation gates, in spec order.
const ROTATION_ORDER = ['RX', 'RY', 'RZ', 'P'];
export const GATE_LIST = [...FIXED_ORDER, ...ROTATION_ORDER];

// The 3 two-qubit gates. Kept out of GATE_LIST and GATE_GROUPS on purpose \u2014
// they are meaningless on the one-qubit page, and a palette that offers a gate
// the engine will reject is worse than one that never shows it.
const TWO_QUBIT_ORDER = ['CX', 'CZ', 'SWAP'];

// Same gates, kept grouped so the palette can label the two families
// instead of presenting 13 undifferentiated entries.
export const GATE_GROUPS = [
  { title: 'Fixed gates', gates: FIXED_ORDER },
  { title: 'Rotations', gates: ROTATION_ORDER },
];

// The two-qubit page's palette: everything above, plus the gates that need
// two wires. Two-qubit first \u2014 it is what the page exists to demonstrate.
export const GATE_GROUPS_2Q = [
  { title: 'Two-qubit', gates: TWO_QUBIT_ORDER },
  { title: 'Fixed gates', gates: FIXED_ORDER },
  { title: 'Rotations', gates: ROTATION_ORDER },
];

export const GATE_LIST_2Q = [...TWO_QUBIT_ORDER, ...FIXED_ORDER, ...ROTATION_ORDER];

export const GATE_LABEL = {
  Sdg: 'S\u2020', Tdg: 'T\u2020',
  RX: 'RX(\u03B8)', RY: 'RY(\u03B8)', RZ: 'RZ(\u03B8)', P: 'P(\u03BB)',
  CX: 'CX', CZ: 'CZ', SWAP: 'SWAP',
};

export const GATE_SHORT = {
  I: 'I', X: 'X', Y: 'Y', Z: 'Z', H: 'H', S: 'S', Sdg: 'S\u2020', T: 'T', Tdg: 'T\u2020',
  RX: 'RX', RY: 'RY', RZ: 'RZ', P: 'P',
  CX: '\u2295', CZ: 'CZ', SWAP: '\u2715',
};

export const GATE_DESCRIPTION = {
  I: 'Identity \u2014 does nothing, a placeholder gate.',
  X: 'Flips 0 \u2194 1 \u2014 180\u00B0 rotation around the x-axis.',
  Y: 'Rotates around the y-axis with a phase twist.',
  Z: 'Flips the phase of |1\u27E9 \u2014 rotation around the z-axis.',
  H: 'Creates superposition \u2014 pushes the state to the equator.',
  S: 'Quarter phase turn \u2014 +90\u00B0 around the z-axis.',
  Sdg: 'Undoes S \u2014 \u221290\u00B0 around the z-axis.',
  T: 'Eighth phase turn \u2014 +45\u00B0 around the z-axis.',
  Tdg: 'Undoes T \u2014 \u221245\u00B0 around the z-axis.',
  RX: 'Custom rotation around the x-axis \u2014 drag to set the angle.',
  RY: 'Custom rotation around the y-axis \u2014 drag to set the angle.',
  RZ: 'Custom rotation around the z-axis \u2014 drag to set the angle.',
  P: 'Adjustable phase shift on |1\u27E9 \u2014 drag to set the angle.',
  CX: 'Flips the target \u2014 but only when the control is |1\u27E9. The gate that entangles.',
  CZ: 'Flips the sign of |11\u27E9 only. No probability moves.',
  SWAP: 'Exchanges the two qubits\u2019 states. A two-qubit gate that never entangles.',
};

// Icon hue per gate — groups gates visually the way the reference mock does
// (Pauli gates cool blue, H a standout teal, phase gates violet, rotations magenta).
export const GATE_HUE = {
  I: 215, X: 205, Y: 230, Z: 250, H: 178,
  S: 285, Sdg: 285, T: 300, Tdg: 300,
  RX: 205, RY: 230, RZ: 250, P: 320,
  // Two-qubit gates get their own warm band so they never read as "just
  // another single-qubit chip" in the palette.
  CX: 15, CZ: 340, SWAP: 40,
};

export const GATE_CONCEPTS = {
  I: { concept: 'Identity', body: 'Leaves the state exactly as it was \u2014 useful as a placeholder or a timing spacer.' },
  H: { concept: 'Superposition', body: 'Hadamard tips the qubit onto the equator \u2014 equal odds of measuring 0 or 1 until you look.' },
  X: { concept: 'Bit flip', body: 'Pauli-X swaps |0\u27E9 and |1\u27E9 \u2014 the quantum version of a classical NOT.' },
  Y: { concept: 'Bit + phase flip', body: 'Pauli-Y flips the bit and rotates the phase at the same time.' },
  Z: { concept: 'Phase flip', body: 'Pauli-Z leaves probabilities untouched but flips the sign of |1\u27E9.' },
  S: { concept: 'Phase', body: 'A quarter-turn phase gate \u2014 probabilities don\u2019t move, but the state\u2019s phase does.' },
  Sdg: { concept: 'Phase', body: 'The inverse quarter-turn \u2014 undoes what S does to the phase.' },
  T: { concept: 'Phase', body: 'An eighth-turn phase gate \u2014 finer phase control.' },
  Tdg: { concept: 'Phase', body: 'The inverse eighth-turn \u2014 undoes what T does to the phase.' },
  RX: { concept: 'Rotation', body: 'A tunable rotation around the x-axis \u2014 drag the angle and watch the arrow sweep.' },
  RY: { concept: 'Rotation', body: 'A tunable rotation around the y-axis.' },
  RZ: { concept: 'Rotation', body: 'A tunable rotation around the z-axis \u2014 a phase shift you control directly.' },
  P: { concept: 'Phase', body: 'Adds an adjustable phase to |1\u27E9 without touching the measurement odds.' },
  CX: { concept: 'Entanglement', body: 'Controlled-NOT \u2014 on a control already in superposition it fires and doesn\u2019t at once, and the pair ends up sharing one state.' },
  CZ: { concept: 'Phase', body: 'Controlled-Z marks |11\u27E9 with a minus sign. Invisible in the bars, plain in the state vector.' },
  SWAP: { concept: 'Separability', body: 'Exchanges the two wires. Uses two qubits, entangles neither \u2014 the counterexample worth knowing.' },
};

function initState() {
  return [c(1), c(0)];
}

function applyGate(state, matrix) {
  return [
    cAdd(cMul(matrix[0][0], state[0]), cMul(matrix[0][1], state[1])),
    cAdd(cMul(matrix[1][0], state[0]), cMul(matrix[1][1], state[1])),
  ];
}

// Run a single-qubit circuit: ops = [{ gate: 'H' }, { gate: 'RX', param: 1.57 }, ...]
export function runCircuit(ops) {
  let state = initState();
  for (const op of ops) {
    state = applyGate(state, gateMatrix(op));
  }

  const [a, b] = state;
  const probabilities = [cAbs2(a), cAbs2(b)];
  const amplitudes = state.map((amp) => {
    const magnitude = Math.sqrt(cAbs2(amp));
    // Phase of a zero amplitude is undefined, and "zero" has to be decided at
    // the precision the contract is specified to — 6 dp — not at float epsilon.
    // H·T·T·T·T·H is exactly X, so the |0> amplitude should vanish; in floating
    // point it lands at ~6e-17, whose atan2 is a confident π/2. Shipping that
    // draws a zero-height bar with a phase dial pointing at 90°, which reads as
    // a rendering fault. The Python engine and runCircuit2 both guard here, so
    // this is where it belongs rather than in each caller.
    const zero = Math.round(magnitude * 1e6) === 0;
    return {
      re: zero ? 0 : amp.re,
      im: zero ? 0 : amp.im,
      magnitude,
      phase: zero ? 0 : Math.atan2(amp.im, amp.re),
    };
  });

  const x = 2 * (a.re * b.re + a.im * b.im);
  const y = 2 * (a.re * b.im - a.im * b.re);
  const z = cAbs2(a) - cAbs2(b);
  const blochVector = { x: clamp(x), y: clamp(y), z: clamp(z) };

  return { probabilities, amplitudes, blochVector };
}

function clamp(v) {
  return Math.max(-1, Math.min(1, v));
}

export function basisLabel(index) {
  return index === 0 ? '|0\u27E9' : '|1\u27E9';
}

// Renders one complex amplitude the way it reads in a statevector line:
// a bare real, a bare imaginary, or a bracketed pair.
export function formatAmplitude(re, im) {
  const r = round2(re);
  const i = round2(im);
  if (Math.abs(i) < 0.005) return `${r}`;
  if (Math.abs(r) < 0.005) return `${i}i`;
  return `(${r}${i >= 0 ? '+' : '-'}${Math.abs(i)}i)`;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

export function phaseToHue(phase) {
  const norm = (phase + Math.PI) / (2 * Math.PI);
  return Math.round(norm * 360);
}
