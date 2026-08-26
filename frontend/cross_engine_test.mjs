#!/usr/bin/env node
/**
 * QubitVista cross-engine test.
 *
 * The browser does not always talk to the backend. When the API is unreachable
 * useSimulation falls back to localResult()/localResult2(), which run
 * quantumEngine.js and quantumEngine2.js instead. That is a SECOND
 * implementation of the physics, and until now nothing checked it.
 *
 * If it drifts from the Python engine, a user working offline sees wrong
 * numbers with no warning at all -- the panels still render, they are just
 * incorrect. This file makes that impossible to ship unnoticed.
 *
 * It replays every circuit in the golden specs through the JavaScript engines
 * and compares against the Qiskit-produced values, field by field.
 *
 *     node cross_engine_test.mjs
 *
 * Run it from frontend/ (or anywhere -- paths are resolved relative to this
 * file). Exits 0 when the two engines agree, 1 otherwise.
 */

import { readFileSync, existsSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve, basename } from 'node:path';
import { tmpdir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));

/** Look for the pieces in the usual places, so this runs from repo root or frontend/. */
function findFile(...candidates) {
  for (const c of candidates) {
    const p = resolve(HERE, c);
    if (existsSync(p)) return p;
  }
  return null;
}

const SPEC_1Q = findFile(
  '../backend/circuits_spec.json',
  'backend/circuits_spec.json',
  'circuits_spec.json',
);
const SPEC_2Q = findFile(
  '../backend/circuits_spec_2q.json',
  'backend/circuits_spec_2q.json',
  'circuits_spec_2q.json',
);
const ENGINE_1Q = findFile('src/utils/quantumEngine.js', '../frontend/src/utils/quantumEngine.js');
const ENGINE_2Q = findFile('src/utils/quantumEngine2.js', '../frontend/src/utils/quantumEngine2.js');

if (!SPEC_1Q || !ENGINE_1Q) {
  console.error('Could not locate circuits_spec.json or quantumEngine.js.');
  console.error('Run this from frontend/ with backend/ as a sibling directory.');
  process.exit(2);
}

/**
 * The engines are written for Vite, which resolves extensionless relative
 * imports. Plain Node ESM does not, so copy them to a temp dir with the
 * extensions filled in. The source files are never modified.
 */
const TMP = mkdtempSync(join(tmpdir(), 'qv-cross-'));
process.on('exit', () => { try { rmSync(TMP, { recursive: true, force: true }); } catch {} });

function loadable(path) {
  const src = readFileSync(path, 'utf8')
    .replace(/from\s+'(\.[^']*?)'/g, (m, spec) => (/\.[a-z]+$/.test(spec) ? m : `from '${spec}.js'`));
  const out = join(TMP, basename(path));
  writeFileSync(out, src);
  return pathToFileURL(out).href;
}

/**
 * The UI stores gates as 'Sdg'/'Tdg' and only uppercases when calling the API
 * (see toApiGate in api.js); both simulator pages run spec gates through
 * normalizeGate before they reach the engine. Mirror that here so the test
 * exercises the real path.
 *
 * Note the engines fall back to identity on an unknown key rather than
 * throwing, so a casing slip would silently turn SDG into a no-op. This
 * function is what keeps that from being hidden.
 */
const UI_NAME = { SDG: 'Sdg', TDG: 'Tdg' };
const normalizeGate = (name) => {
  const u = String(name).toUpperCase();
  return UI_NAME[u] ?? u;
};

const TOL = 2e-5;
const failures = [];
const fail = (id, what, detail) => failures.push({ id, what, detail });
const near = (a, b, tol = TOL) => Math.abs(Number(a) - Number(b)) <= tol;

/** The specs store angles in `params: [x]`; the JS engines take `param: x`. */
function toJsOp(g) {
  const op = { gate: normalizeGate(g.gate), target: g.target ?? 0 };
  if (g.params && g.params.length) op.param = g.params[0];
  if (g.control !== undefined && g.control !== null) op.control = g.control;
  return op;
}

function describe(gates) {
  if (!gates.length) return '(empty)';
  return gates
    .map((g) => {
      let s = g.gate;
      if (g.params?.length) s += `(${g.params[0].toFixed(4)})`;
      if (g.control !== undefined && g.control !== null) return `${g.gate} q${g.control}->q${g.target}`;
      return `${s} q${g.target ?? 0}`;
    })
    .join(' · ');
}

// ---------------------------------------------------------------- 1 qubit
async function checkSingleQubit() {
  const { runCircuit } = await import(loadable(ENGINE_1Q));
  const spec = JSON.parse(readFileSync(SPEC_1Q, 'utf8'));
  const cases = spec.cases ?? spec;
  let checked = 0;

  for (const c of cases) {
    const gates = c.gates ?? [];
    // every prefix, so per-step evolution is covered too, not just the final state
    for (let k = 0; k <= gates.length; k++) {
      const prefix = gates.slice(0, k).map(toJsOp);
      let r;
      try {
        r = runCircuit(prefix);
      } catch (e) {
        fail(c.id, `step${k} threw`, String(e).slice(0, 90));
        continue;
      }
      const want = c.expect.steps[k];

      // amplitudes
      r.amplitudes.forEach((a, j) => {
        const w = want.statevector[j];
        if (!near(a.re, w.re)) fail(c.id, `step${k} amp${j}.re`, `${a.re} vs ${w.re}`);
        if (!near(a.im, w.im)) fail(c.id, `step${k} amp${j}.im`, `${a.im} vs ${w.im}`);
        if (!near(a.magnitude, w.magnitude))
          fail(c.id, `step${k} amp${j}.magnitude`, `${a.magnitude} vs ${w.magnitude}`);
        // a zero amplitude must not carry a phase, or the UI draws an empty bar
        // with a phase dial pointing somewhere
        const mag6 = Math.round(a.magnitude * 1e6) / 1e6;
        const ph6 = Math.round(a.phase * 1e6) / 1e6;
        if (mag6 === 0 && ph6 !== 0)
          fail(c.id, `step${k} amp${j}`, `zero magnitude but phase ${ph6}`);
      });

      // probabilities
      const keys = Object.keys(want.probabilities).sort();
      keys.forEach((key, j) => {
        if (!near(r.probabilities[j], want.probabilities[key]))
          fail(c.id, `step${k} P(${key})`, `${r.probabilities[j]} vs ${want.probabilities[key]}`);
      });
      const total = r.probabilities.reduce((s, p) => s + p, 0);
      if (!near(total, 1)) fail(c.id, `step${k} unitarity`, `sums to ${total}`);

      // bloch
      const wb = Array.isArray(want.bloch) ? want.bloch[0] : want.bloch;
      for (const axis of ['x', 'y', 'z']) {
        if (!near(r.blochVector[axis], wb[axis]))
          fail(c.id, `step${k} bloch.${axis}`, `${r.blochVector[axis]} vs ${wb[axis]}`);
      }
      const len = Math.hypot(r.blochVector.x, r.blochVector.y, r.blochVector.z);
      if (!near(len, wb.length)) fail(c.id, `step${k} bloch.length`, `${len} vs ${wb.length}`);
      checked++;
    }
  }
  return { checked, cases: cases.length };
}

// ---------------------------------------------------------------- 2 qubits
async function checkTwoQubit() {
  if (!SPEC_2Q || !ENGINE_2Q) return null;
  const { runCircuit2 } = await import(loadable(ENGINE_2Q));
  const spec = JSON.parse(readFileSync(SPEC_2Q, 'utf8'));
  const cases = spec.cases ?? spec;
  let checked = 0;

  for (const c of cases) {
    const gates = c.gates ?? [];
    for (let k = 0; k <= gates.length; k++) {
      const prefix = gates.slice(0, k).map(toJsOp);
      let r;
      try {
        r = runCircuit2(prefix);
      } catch (e) {
        fail(c.id, `step${k} threw`, String(e).slice(0, 90));
        continue;
      }
      const want = c.expect.steps[k];

      r.amplitudes.forEach((a, j) => {
        const w = want.statevector[j];
        if (!near(a.re, w.re)) fail(c.id, `step${k} amp${j}.re`, `${a.re} vs ${w.re}`);
        if (!near(a.im, w.im)) fail(c.id, `step${k} amp${j}.im`, `${a.im} vs ${w.im}`);
        if (!near(a.magnitude, w.magnitude))
          fail(c.id, `step${k} amp${j}.magnitude`, `${a.magnitude} vs ${w.magnitude}`);
      });

      const keys = Object.keys(want.probabilities).sort();
      keys.forEach((key, j) => {
        if (!near(r.probabilities[j], want.probabilities[key]))
          fail(c.id, `step${k} P(${key})`, `${r.probabilities[j]} vs ${want.probabilities[key]}`);
      });

      r.bloch.forEach((b, q) => {
        const w = want.bloch[q];
        for (const axis of ['x', 'y', 'z']) {
          if (!near(b[axis], w[axis])) fail(c.id, `step${k} bloch[${q}].${axis}`, `${b[axis]} vs ${w[axis]}`);
        }
        if (!near(b.length, w.length))
          fail(c.id, `step${k} bloch[${q}].length`, `${b.length} vs ${w.length}`);
        if (b.purity !== undefined && !near(b.purity, w.purity, 1e-4))
          fail(c.id, `step${k} bloch[${q}].purity`, `${b.purity} vs ${w.purity}`);
      });

      const wc = want.entanglement?.concurrence;
      if (wc !== undefined && wc !== null && r.concurrence !== undefined) {
        if (Number.isNaN(r.concurrence)) fail(c.id, `step${k} concurrence`, 'NaN');
        else if (!near(r.concurrence, wc, 1e-4))
          fail(c.id, `step${k} concurrence`, `${r.concurrence} vs ${wc}`);
      }
      checked++;
    }
  }
  return { checked, cases: cases.length };
}

// ---------------------------------------------------------------- run
console.log('QubitVista cross-engine test — browser JS vs Python golden values\n');

const one = await checkSingleQubit();
const oneBad = new Set(failures.map((f) => f.id)).size;
console.log(
  `  single qubit  ${failures.length === 0 ? 'PASS' : 'FAIL'}   ` +
    `${one.cases} circuits, ${one.checked} snapshots compared`,
);

const before = failures.length;
const two = await checkTwoQubit();
if (two) {
  console.log(
    `  two qubits    ${failures.length === before ? 'PASS' : 'FAIL'}   ` +
      `${two.cases} circuits, ${two.checked} snapshots compared`,
  );
} else {
  console.log('  two qubits    SKIP   (spec or engine not found)');
}

console.log();
if (failures.length) {
  const byId = new Map();
  for (const f of failures) {
    if (!byId.has(f.id)) byId.set(f.id, []);
    byId.get(f.id).push(f);
  }
  console.log(`${failures.length} DISAGREEMENTS across ${byId.size} circuits\n`);
  let shown = 0;
  for (const [id, list] of byId) {
    if (shown >= 12) break;
    console.log(`   x  ${id.padEnd(6)} ${list[0].what.padEnd(28)} ${list[0].detail}`);
    if (list.length > 1) console.log(`      ${''.padEnd(6)} ... and ${list.length - 1} more in this circuit`);
    shown++;
  }
  if (byId.size > shown) console.log(`   ... and ${byId.size - shown} more circuits`);
  console.log('\nThe browser fallback engine does not match the backend.');
  console.log('A user working offline would see these wrong values with no warning.');
  process.exit(1);
}

console.log('verified — the browser engine matches the Python backend on every circuit');
process.exit(0);
