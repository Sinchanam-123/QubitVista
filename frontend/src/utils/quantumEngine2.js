// Two-qubit statevector engine — the 13 single-qubit gates plus CX, CZ, SWAP.
//
// Same role quantumEngine.js plays for the one-qubit page: an offline fallback
// so the simulator stays interactive when the backend is unreachable, and an
// instant first paint before the backend reply lands. The numbers on screen
// still come from Qiskit whenever the API is up.
//
// Index convention matches Qiskit exactly: basis index i = q1*2 + q0, so the
// label is read q1q0 and q0 is the RIGHT character. Getting this backwards
// mirrors every histogram, which is the classic two-qubit bug.

import { gateMatrix } from './quantumEngine';

const c = (re, im = 0) => ({ re, im });
const cMul = (a, b) => c(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
const cAdd = (a, b) => c(a.re + b.re, a.im + b.im);
const cAbs2 = (a) => a.re * a.re + a.im * a.im;

export const N_QUBITS = 2;
const DIM = 4;

export const TWO_QUBIT_GATES = new Set(['CX', 'CZ', 'SWAP']);
export const isTwoQubit = (gate) => TWO_QUBIT_GATES.has(String(gate).toUpperCase());

/** Basis label for an index, in q1q0 order. */
export function basisLabel2(index) {
  return index.toString(2).padStart(N_QUBITS, '0');
}

const bit = (index, q) => (index >> q) & 1;
const withBit = (index, q, value) => (value ? index | (1 << q) : index & ~(1 << q));

/** Apply a 2x2 matrix to one wire, leaving the other untouched. */
function applyOne(state, matrix, target) {
  const out = state.slice();
  for (let i = 0; i < DIM; i++) {
    if (bit(i, target) !== 0) continue;
    const j = withBit(i, target, 1);
    const a = state[i];
    const b = state[j];
    out[i] = cAdd(cMul(matrix[0][0], a), cMul(matrix[0][1], b));
    out[j] = cAdd(cMul(matrix[1][0], a), cMul(matrix[1][1], b));
  }
  return out;
}

/** CX / CZ / SWAP, written directly on basis indices rather than as 4x4
 *  matrices — a permutation is what these gates actually are, and it reads
 *  the same way the circuit diagram does. */
function applyTwo(state, gate, control, target) {
  const out = state.slice();
  for (let i = 0; i < DIM; i++) {
    switch (gate) {
      case 'CX':
        // Flip the target only on the branch where the control is |1>.
        if (bit(i, control) === 1) out[withBit(i, target, 1 - bit(i, target))] = state[i];
        break;
      case 'CZ':
        // One sign, no probability anywhere changes.
        if (bit(i, control) === 1 && bit(i, target) === 1) out[i] = c(-state[i].re, -state[i].im);
        break;
      case 'SWAP': {
        const swapped = withBit(withBit(i, control, bit(i, target)), target, bit(i, control));
        out[swapped] = state[i];
        break;
      }
      default:
        return state;
    }
  }
  return out;
}

/** Reduced state of one wire: Bloch coordinates, true length, and purity.
 *  Length is never normalised — at two qubits its collapse to 0 IS the
 *  entanglement, and hiding that would hide the whole point of the page. */
function blochOf(state, q) {
  const other = 1 - q;
  // rho[m][n] = sum over the other wire of psi(m, o) * conj(psi(n, o))
  let r01 = c(0, 0);
  let r00 = 0;
  let r11 = 0;
  for (let o = 0; o < 2; o++) {
    const i0 = withBit(withBit(0, q, 0), other, o);
    const i1 = withBit(withBit(0, q, 1), other, o);
    const a = state[i0];
    const b = state[i1];
    r00 += cAbs2(a);
    r11 += cAbs2(b);
    r01 = cAdd(r01, cMul(a, c(b.re, -b.im)));
  }
  const x = 2 * r01.re;
  const y = -2 * r01.im;
  const z = r00 - r11;
  const length = Math.sqrt(x * x + y * y + z * z);
  return { x, y, z, length, purity: (1 + length * length) / 2 };
}

/** Concurrence of a two-qubit pure state: 2 * |a00*a11 - a01*a10|.
 *  0 for a separable pair, 1 for a Bell state. */
function concurrenceOf(state) {
  const ad = cMul(state[0], state[3]);
  const bc = cMul(state[1], state[2]);
  return Math.min(1, 2 * Math.hypot(ad.re - bc.re, ad.im - bc.im));
}

function initState() {
  return [c(1), c(0), c(0), c(0)];
}

/**
 * Run a two-qubit circuit.
 * ops = [{ gate:'H', target:0 }, { gate:'CX', control:0, target:1 }, ...]
 */
export function runCircuit2(ops) {
  let state = initState();
  for (const op of ops) {
    const g = String(op.gate).toUpperCase();
    if (isTwoQubit(g)) state = applyTwo(state, g, op.control ?? 0, op.target ?? 1);
    else state = applyOne(state, gateMatrix(op), op.target ?? 0);
  }

  const amplitudes = state.map((a) => ({
    re: a.re,
    im: a.im,
    magnitude: Math.sqrt(cAbs2(a)),
    phase: Math.atan2(a.im, a.re),
  }));

  return {
    amplitudes,
    probabilities: state.map(cAbs2),
    bloch: [blochOf(state, 0), blochOf(state, 1)],
    concurrence: concurrenceOf(state),
  };
}
