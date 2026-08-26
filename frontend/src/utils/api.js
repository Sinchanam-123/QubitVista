// Talks to the FastAPI/Qiskit backend.
//
// The simulator's numbers come from here, so they are the same values the
// golden spec verifies (104 circuits, 359 snapshots). quantumEngine.js stays as
// an offline fallback: identical single-qubit maths, used only when the backend
// is unreachable, so the UI keeps working with the dev server alone.
//
// Everything is adapted to the shapes the existing components already expect —
// BlochSphere takes {x,y,z}, StateVectorEquation takes [{re,im,magnitude,phase}],
// ProbabilityChart takes [p0, p1] — so no visual component had to change.

import { runCircuit } from './quantumEngine';
import { runCircuit2, isTwoQubit } from './quantumEngine2';

export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

const ROTATIONS = new Set(['RX', 'RY', 'RZ', 'P']);

/** UI op -> API gate. 'Sdg' becomes 'SDG', `param` becomes `params: [angle]`. */
function toApiGate(op) {
  const gate = String(op.gate).toUpperCase();
  const out = { gate, target: 0 };
  if (ROTATIONS.has(gate)) out.params = [op.param ?? Math.PI / 2];
  return out;
}

/** Same, on the two-qubit page, where `target` is a real choice and a
 *  two-qubit gate must carry its control wire or the API returns 400. */
function toApiGate2(op) {
  const gate = String(op.gate).toUpperCase();
  const out = { gate, target: op.target ?? 0 };
  if (isTwoQubit(gate)) out.control = op.control ?? (out.target === 0 ? 1 : 0);
  if (ROTATIONS.has(gate)) out.params = [op.param ?? Math.PI / 2];
  return out;
}

/** One API step -> the shape the visual components consume. */
function toStep(step) {
  return {
    gate: step.gate,
    rotation: step.rotation,
    amplitudes: step.statevector,
    probabilities: Object.keys(step.probabilities)
      .sort()
      .map((k) => step.probabilities[k]),
    blochVector: { x: step.bloch.x, y: step.bloch.y, z: step.bloch.z },
    blochLength: step.bloch.length,
  };
}

// Axis/angle each gate rotates the Bloch vector about, mirroring the backend's
// table. Needed so the offline fallback can still animate along the true arc.
const R2 = 1 / Math.SQRT2;
const FIXED_ROTATION = {
  X: [[1, 0, 0], Math.PI], Y: [[0, 1, 0], Math.PI], Z: [[0, 0, 1], Math.PI],
  S: [[0, 0, 1], Math.PI / 2], SDG: [[0, 0, 1], -Math.PI / 2],
  T: [[0, 0, 1], Math.PI / 4], TDG: [[0, 0, 1], -Math.PI / 4],
  H: [[R2, 0, R2], Math.PI], I: [[0, 0, 1], 0],
};
const ROTATION_AXIS = { RX: [1, 0, 0], RY: [0, 1, 0], RZ: [0, 0, 1], P: [0, 0, 1] };

function rotationFor(op) {
  const g = String(op.gate).toUpperCase();
  if (FIXED_ROTATION[g]) {
    const [axis, angle] = FIXED_ROTATION[g];
    return { axis, angle };
  }
  if (ROTATION_AXIS[g]) return { axis: ROTATION_AXIS[g], angle: op.param ?? Math.PI / 2 };
  return null;
}

/**
 * Local engine result, in the same shape as the backend's — including one entry
 * per step, not just the final state. Matching the step count matters: the
 * scrubber reads `steps.length`, and a fallback that returned a single step
 * would collapse the scrubber to zero on every edit.
 */
export function localResult(ops) {
  const steps = [];
  for (let k = 0; k <= ops.length; k++) {
    const prefix = ops.slice(0, k);
    const r = runCircuit(prefix);
    const b = r.blochVector;
    steps.push({
      gate: k ? ops[k - 1].gate : null,
      rotation: k ? rotationFor(ops[k - 1]) : null,
      amplitudes: r.amplitudes.map((a) => {
        // Decide "is this zero" on the ROUNDED magnitude, matching the backend.
        // An amplitude whose raw magnitude is below 5e-7 serialises as 0.000000;
        // leaving its phase intact draws an empty bar with a phase dial on it,
        // which reads as a rendering fault. Reproduced on catalogue circuit I08
        // (H·T·T·T·T·H). localResult2 has always guarded this; this one did not.
        const magnitude = r6(a.magnitude);
        return {
          re: magnitude === 0 ? 0 : r6(a.re),
          im: magnitude === 0 ? 0 : r6(a.im),
          magnitude,
          phase: magnitude === 0 ? 0 : r6(a.phase),
        };
      }),
      probabilities: r.probabilities.map(r6),
      blochVector: { x: r6(b.x), y: r6(b.y), z: r6(b.z) },
      blochLength: r6(Math.hypot(b.x, b.y, b.z)),
    });
  }
  return { source: 'local', steps, final: steps[steps.length - 1], error: null };
}

/** Round to 6 dp, exactly as the backend serialises.
 *
 *  Without this the local answer differs from the backend's in the last digits
 *  (6.1e-17 where the API says 0), so when the backend reply lands mid-animation
 *  the sphere sees a "new" target and restarts the arc. Matching the precision
 *  makes the handover invisible. */
const r6 = (x) => Math.round(x * 1e6) / 1e6;

/**
 * Run a circuit on the backend.
 * Returns every intermediate step as well as the final state — step-by-step
 * evolution is the project's core feature, so the data is always carried even
 * when the current UI only draws the last one.
 */
export async function simulate(ops, { signal } = {}) {
  const res = await fetch(`${API_BASE}/api/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ num_qubits: 1, qubit: 0, gates: ops.map(toApiGate) }),
    signal,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);

  const steps = data.steps.map(toStep);
  return { source: 'backend', steps, final: steps[steps.length - 1], error: null };
}

/** Teaching text for any circuit, generated by the backend from the real result. */
export async function explain(ops, { signal } = {}) {
  const res = await fetch(`${API_BASE}/api/explain`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ num_qubits: 1, qubit: 0, gates: ops.map(toApiGate) }),
    signal,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// The two catalogues reuse case ids — there is an S01 in each — so every
// catalogue call carries the qubit count. It defaults to 1, which is why none
// of the Phase 1 callers had to change.

export async function getConcepts(qubits = 1) {
  const res = await fetch(`${API_BASE}/api/concepts?qubits=${qubits}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function getCircuits(qubits = 1) {
  const res = await fetch(`${API_BASE}/api/circuits?qubits=${qubits}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function getCircuit(id, qubits = 1) {
  const res = await fetch(
    `${API_BASE}/api/circuits/${encodeURIComponent(id)}?qubits=${qubits}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ----------------------------------------------------------------- two qubits
//
// A separate response shape, on the same route: `bloch` is a list with one
// entry per wire, every step carries its `control`, and there is an
// entanglement block. `rotation` is null on CX/CZ/SWAP — they are not a
// rotation of either Bloch sphere — so anything that animates must null-check
// it rather than assume an axis is always there.

/** One two-qubit API step -> the shape the visual components consume. */
function toStep2(step) {
  return {
    gate: step.gate,
    target: step.target,
    control: step.control,
    rotation: step.rotation,
    amplitudes: step.statevector,
    probabilities: Object.keys(step.probabilities)
      .sort()
      .map((k) => step.probabilities[k]),
    bloch: step.bloch.map((b) => ({
      vector: { x: b.x, y: b.y, z: b.z },
      length: b.length,
      purity: b.purity,
    })),
    concurrence: step.entanglement?.concurrence ?? 0,
  };
}

/** Local two-qubit result, in the same shape and at the same 6 dp as the
 *  backend's, so the handover when the real reply lands is invisible. */
export function localResult2(ops) {
  const steps = [];
  for (let k = 0; k <= ops.length; k++) {
    const op = k ? ops[k - 1] : null;
    const r = runCircuit2(ops.slice(0, k));
    steps.push({
      gate: op ? String(op.gate).toUpperCase() : null,
      target: op ? op.target ?? 0 : null,
      control: op ? op.control ?? null : null,
      rotation: op && !isTwoQubit(op.gate) ? rotationFor(op) : null,
      amplitudes: r.amplitudes.map((a) => ({
        re: r6(a.re), im: r6(a.im), magnitude: r6(a.magnitude),
        phase: r6(a.magnitude) === 0 ? 0 : r6(a.phase),
      })),
      probabilities: r.probabilities.map(r6),
      bloch: r.bloch.map((b) => ({
        vector: { x: r6(b.x), y: r6(b.y), z: r6(b.z) },
        length: r6(b.length),
        purity: r6(b.purity),
      })),
      concurrence: r6(r.concurrence) < 1e-6 ? 0 : r6(r.concurrence),
    });
  }
  return { source: 'local', steps, final: steps[steps.length - 1], error: null };
}

export async function simulate2(ops, { signal } = {}) {
  const res = await fetch(`${API_BASE}/api/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ num_qubits: 2, qubit: 0, gates: ops.map(toApiGate2) }),
    signal,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);

  const steps = data.steps.map(toStep2);
  return { source: 'backend', steps, final: steps[steps.length - 1], error: null };
}

/** `concept` tells the backend what the circuit is *for*, when that is known —
 *  a catalogue preset knows; a circuit the user dragged together does not, and
 *  omitting it lets the backend infer. */
export async function explain2(ops, { signal, concept } = {}) {
  const query = concept ? `?concept=${encodeURIComponent(concept)}` : '';
  const res = await fetch(`${API_BASE}/api/explain${query}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ num_qubits: 2, qubit: 0, gates: ops.map(toApiGate2) }),
    signal,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
