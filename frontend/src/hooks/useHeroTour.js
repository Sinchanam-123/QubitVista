import { useEffect, useState } from 'react';

/**
 * The hero circuit, which plays itself.
 *
 * Two acts. The first walks the single-qubit ideas the app is built on —
 * superposition, phase, interference, a bit flip. The second does the one thing
 * a single qubit provably cannot: it builds a Bell pair and both Bloch vectors
 * collapse to the origin, then undoes it exactly.
 *
 * Every step runs through the same statevector engines the simulators use, so
 * the numbers on the landing page are the real thing rather than a mocked-up
 * loop. That is the whole point of putting a live circuit here.
 */

const SINGLE = [
  { caption: 'A qubit starts at |0⟩ — certain, and a bit boring.' },
  { gate: 'H', caption: 'Hadamard. Now it is genuinely both at once.' },
  { gate: 'S', caption: 'A quarter turn of phase — the odds do not move at all.' },
  { gate: 'T', caption: 'An eighth more. Watch the coefficient change colour.' },
  { gate: 'H', caption: 'Interference: the amplitudes recombine, and now the odds do move.' },
  { gate: 'X', caption: 'And a bit flip, straight across the sphere.' },
];

const PAIR = [
  { caption: 'Two qubits now. Both at |0⟩, and completely independent.' },
  { op: { gate: 'H', target: 0 }, caption: 'H on q0 alone. One qubit spreads, the other is untouched.' },
  {
    op: { gate: 'CX', control: 0, target: 1 },
    caption: 'CX. Both qubits hollow out, and only 00 and 11 survive — measure one, the other is decided.',
  },
  {
    op: { gate: 'CX', control: 0, target: 1 },
    caption: 'Apply it a second time and the pair comes apart again, exactly as it was.',
  },
];

const STEP_MS = 2600;
// A beat on the last frame of each act, so the payoff is not cut off mid-read.
const HOLD_MS = 1500;

const TIMELINE = [
  ...SINGLE.map((s, i) => ({ ...s, mode: 'single', index: i, last: i === SINGLE.length - 1 })),
  ...PAIR.map((s, i) => ({ ...s, mode: 'pair', index: i, last: i === PAIR.length - 1 })),
];

export default function useHeroTour() {
  const [frame, setFrame] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return undefined;
    const wait = TIMELINE[frame].last ? STEP_MS + HOLD_MS : STEP_MS;
    const id = setTimeout(() => setFrame((f) => (f + 1) % TIMELINE.length), wait);
    return () => clearTimeout(id);
  }, [frame, paused]);

  const current = TIMELINE[frame];
  const act = current.mode === 'single' ? SINGLE : PAIR;

  // Gates placed so far *within the current act* — each act restarts from |0…0⟩.
  const ops = act
    .slice(1, current.index + 1)
    .map((s) => (current.mode === 'single' ? { gate: s.gate } : s.op));

  return {
    mode: current.mode,
    ops,
    caption: current.caption,
    step: current.index,
    total: act.length - 1,
    /** Jump straight to an act, so the mode chips are clickable rather than decorative. */
    goToMode: (mode) => setFrame(mode === 'single' ? 0 : SINGLE.length),
    setPaused,
  };
}
