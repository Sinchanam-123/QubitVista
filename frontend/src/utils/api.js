// Talks to the FastAPI/Qiskit backend.
//
// The simulator's numbers come from here, so they are the same values the
// golden spec verifies (104 circuits, 359 snapshots). quantumEngine.js stays as
// an offline fallback: identical single-qubit maths, used only when the backend
// is unreachable, so the UI keeps working with the dev server alone.
//
// The teaching content has the same arrangement: catalogue*.json under data/ is
// a generated copy of the catalogue routes, and the three catalogue calls below
// answer from it when nothing is listening on the API. Only /api/explain for a
// circuit the user built themselves has no static answer.
//
// Everything is adapted to the shapes the existing components already expect —
// BlochSphereClassic takes {x,y,z} (one per wire, via BlochPair, on the
// two-qubit page), StateVectorPanel takes [{re,im,magnitude,phase}] and
// ProbabilityBars takes [p0, p1] — so no visual component had to change.

import { runCircuit } from './quantumEngine';
import { runCircuit2, isTwoQubit } from './quantumEngine2';

export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

const ROTATIONS = new Set(['RX', 'RY', 'RZ', 'P']);

/* Two failures that look identical to a caller, and must not be treated alike.
 *
 * A rejected request — 400, the circuit is invalid — is the user's to fix, and
 * the reason has to reach them. A backend that is not running makes fetch
 * itself reject, and nothing the user does to the circuit will help. The only
 * thing that separates them is whether a response came back at all, so every
 * error raised from a real response carries its status and a fetch rejection
 * carries none. isOffline() is that test, and the pages branch on it. */

function statusError(status, detail) {
  const err = new Error(detail || `HTTP ${status}`);
  err.status = status;
  return err;
}

/** Non-OK response -> Error carrying its status and, when the body has one,
 *  the backend's own explanation. FastAPI's 422 detail is a list rather than a
 *  sentence, so only a string is used as the message. */
async function failed(res) {
  let detail = null;
  try {
    const body = await res.json();
    if (typeof body?.detail === 'string') detail = body.detail;
  } catch { /* body was not JSON — the status alone will have to do */ }
  return statusError(res.status, detail);
}

/** True when the call never reached the backend. An aborted request is neither
 *  — it is a newer edit cancelling an older one, and means nothing is wrong. */
export function isOffline(err) {
  return Boolean(err) && err.name !== 'AbortError' && err.status === undefined;
}

/* ---------------------------------------------------------- static catalogue
 *
 * The teaching content is the point of the project, and all of it used to
 * require a running backend: a statically built frontend lost the gate
 * reference cards, the concepts, the circuit index and every circuit's notes.
 * catalogue*.json is a generated copy of exactly those routes —
 * backend/export_catalogue.py writes it by calling the route functions
 * themselves, and backend/catalogue_drift_test.py fails the build if the two
 * ever disagree — so answering from it offline is the same bargain
 * quantumEngine.js already strikes for /api/simulate: identical data, no server.
 *
 * Imported dynamically, not at the top of the module. It is ~380 kB of prose,
 * and a user whose backend is up must never pay to download a copy of what the
 * backend just told them.
 */
const CATALOGUE = {};

/** Cache one promise per catalogue — but never a rejected one. A chunk that
 *  failed to load once must not disable the fallback for the whole session. */
function memo(store, q, make) {
  if (!store[q]) {
    store[q] = make().catch((err) => { delete store[q]; throw err; });
  }
  return store[q];
}

function catalogue(qubits) {
  const q = qubits === 2 ? 2 : 1;
  // Two literal specifiers rather than one computed path: a bundler can only
  // split what it can see, and a template string here would inline both.
  return memo(CATALOGUE, q, () => (q === 2
    ? import('../data/catalogue2q.json')
    : import('../data/catalogue1q.json')).then((m) => m.default));
}

/** Run a catalogue request, answering from the static copy when — and only
 *  when — the backend could not be reached. A 404 for an unknown case id is a
 *  real answer to a bad link and still throws. */
async function withStatic(qubits, request, fromStatic) {
  try {
    return await request();
  } catch (err) {
    if (!isOffline(err)) throw err;
    return fromStatic(await catalogue(qubits));
  }
}

/* Teaching notes for a circuit that is already one of the catalogue's.
 *
 * /api/explain writes its text from the simulated result, so a circuit somebody
 * assembled themselves genuinely needs the backend — there is nothing static to
 * fall back to. A catalogue circuit is different: its explain block is golden
 * data, sitting in the file above. Matching the gate list against the catalogue
 * means opening E01 from the Learn page, or clicking a preset chip, still
 * teaches something with no server running.
 *
 * The key is built from the fields the API compares on, at the precision the
 * spec stores, so a preset loaded through the UI and its catalogue entry
 * produce the same string. */
const BY_GATES = {};

const gateKey = (g) => [
  String(g.gate).toUpperCase(),
  g.target ?? 0,
  g.control ?? '',
  (g.params || []).map((p) => Number(p).toFixed(6)).join(','),
].join(':');

const circuitKey = (gates) => gates.map(gateKey).join(' ');

/* The Gates tab's reference cards.
 *
 * They reach the UI inside the /api/explain payload, which made them the one
 * piece of teaching content still missing offline even once the catalogue was
 * static — the tab sat empty next to a circuit full of gates. The cards are not
 * per-circuit data though: they are one fixed table per gate, served by
 * /api/gates as `detail[].info`, so they dump and fall back like everything
 * else here.
 */
const GATE_INFO = {};

/** The gate palette, with a reference card per gate. */
export async function getGates(qubits = 1) {
  return withStatic(qubits, async () => {
    const res = await fetch(`${API_BASE}/api/gates?qubits=${qubits}`);
    if (!res.ok) throw await failed(res);
    return res.json();
  }, (doc) => doc.gates);
}

/** name -> reference card, built once per catalogue. */
function gateInfo(qubits) {
  const q = qubits === 2 ? 2 : 1;
  return memo(GATE_INFO, q, () => getGates(q)
    .then((palette) => new Map(palette.detail.map((d) => [d.name, d.info]))));
}

/** Gate cards for one circuit, assembled exactly as the explain route does:
 *  the gate's own table, plus where this particular placement sits. A gate with
 *  no card is skipped rather than drawn blank, which is the route's rule too. */
async function staticGateCards(qubits, apiGates) {
  const info = await gateInfo(qubits);
  const cards = [];
  apiGates.forEach((g, i) => {
    const card = info.get(String(g.gate).toUpperCase());
    if (!card) return;
    cards.push({
      ...card,
      index: i,
      step: i + 1,
      angle: (g.params || [])[0] ?? null,
      target: g.target ?? null,
      control: g.control ?? null,
    });
  });
  return cards;
}

/** As much of the /api/explain response as static data can honestly supply.
 *
 *  The gate cards are always there — they belong to the gates, not to the
 *  circuit. `explain` is there when the circuit is one of the catalogue's, and
 *  null otherwise: those notes are written from the simulated result, and only
 *  the backend can write them. */
async function staticExplain(qubits, apiGates) {
  const q = qubits === 2 ? 2 : 1;
  const index = await memo(BY_GATES, q, () => catalogue(q).then((doc) => {
    const byGates = new Map();
    // First id wins. A few gate sequences appear twice under different
    // concepts, and the earlier id is the one the index route lists first.
    for (const c of Object.values(doc.cases)) {
      const key = circuitKey(c.gates);
      if (!byGates.has(key)) byGates.set(key, c);
    }
    return byGates;
  }));

  const found = index.get(circuitKey(apiGates));
  return {
    // Marked, the same way localResult marks its answer 'local'. The pages
    // watch for it: a static answer means the backend did not reply, and the
    // offline banner has to appear even though the panel filled in.
    source: 'static',
    num_qubits: q,
    gates: apiGates,
    concept: found ? found.explain.concept : null,
    explain: found ? found.explain : null,
    gate_cards: await staticGateCards(q, apiGates),
  };
}

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
  if (!res.ok) throw statusError(res.status, data.detail);

  const steps = data.steps.map(toStep);
  return { source: 'backend', steps, final: steps[steps.length - 1], error: null };
}

/** Teaching text for any circuit, generated by the backend from the real result.
 *  Offline it falls back to static data — the gate cards always, the circuit's
 *  notes when it is one of the catalogue's. See staticExplain. */
export async function explain(ops, { signal } = {}) {
  const gates = ops.map(toApiGate);
  try {
    const res = await fetch(`${API_BASE}/api/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ num_qubits: 1, qubit: 0, gates }),
      signal,
    });
    if (!res.ok) throw await failed(res);
    return res.json();
  } catch (err) {
    if (!isOffline(err)) throw err;
    return staticExplain(1, gates);
  }
}

// The two catalogues reuse case ids — there is an S01 in each — so every
// catalogue call carries the qubit count. It defaults to 1, which is why none
// of the Phase 1 callers had to change.

export async function getConcepts(qubits = 1) {
  return withStatic(qubits, async () => {
    const res = await fetch(`${API_BASE}/api/concepts?qubits=${qubits}`);
    if (!res.ok) throw await failed(res);
    return res.json();
  }, (doc) => doc.concepts);
}

export async function getCircuits(qubits = 1) {
  return withStatic(qubits, async () => {
    const res = await fetch(`${API_BASE}/api/circuits?qubits=${qubits}`);
    if (!res.ok) throw await failed(res);
    return res.json();
  }, (doc) => doc.circuits);
}

export async function getCircuit(id, qubits = 1) {
  return withStatic(qubits, async () => {
    const res = await fetch(
      `${API_BASE}/api/circuits/${encodeURIComponent(id)}?qubits=${qubits}`);
    if (!res.ok) throw await failed(res);
    return res.json();
  }, (doc) => {
    // The route upper-cases the id it is given, so the offline lookup does too
    // — and answers a bad id the same way, with the backend's own 404 wording.
    const hit = doc.cases[String(id).toUpperCase()];
    if (!hit) {
      throw statusError(404, `Unknown circuit '${id}' in the ${qubits}-qubit catalogue.`);
    }
    return hit;
  });
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
  if (!res.ok) throw statusError(res.status, data.detail);

  const steps = data.steps.map(toStep2);
  return { source: 'backend', steps, final: steps[steps.length - 1], error: null };
}

/** `concept` tells the backend what the circuit is *for*, when that is known —
 *  a catalogue preset knows; a circuit the user dragged together does not, and
 *  omitting it lets the backend infer. */
export async function explain2(ops, { signal, concept } = {}) {
  const query = concept ? `?concept=${encodeURIComponent(concept)}` : '';
  const gates = ops.map(toApiGate2);
  try {
    const res = await fetch(`${API_BASE}/api/explain${query}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ num_qubits: 2, qubit: 0, gates }),
      signal,
    });
    if (!res.ok) throw await failed(res);
    return res.json();
  } catch (err) {
    if (!isOffline(err)) throw err;
    // No `concept` hint offline: the block found IS that circuit's own, which
    // is what the hint exists to select.
    return staticExplain(2, gates);
  }
}
