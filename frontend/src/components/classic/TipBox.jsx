import { useEffect, useState } from 'react';

/* The tip strip under the angle control.
 *
 * Two modes, and the page decides which. When the circuit is in a state that
 * has something specific worth saying — the pair just entangled, a two-qubit
 * gate ran and changed nothing, a gate is selected that can be flipped — the
 * page passes that line as `context` and it stays pinned. A rotating tip would
 * be actively unhelpful there: the user is looking at something surprising
 * right now and wants it explained, not a general hint about the scrubber.
 *
 * With nothing specific to say it cycles the general ones instead, which is
 * where the things nobody discovers on their own live — drag-to-reorder,
 * keyboard scrubbing, clicking a gate to edit its angle.
 */

const GENERAL = [
  'Scrubbing never re-runs anything. Every step is a full snapshot, so ← and → are instant.',
  'Drag a gate along the wire to reorder it. The whole circuit re-simulates as you drop it.',
  'Click a rotation gate in the circuit, then drag the angle slider — the sphere follows continuously.',
  'Press space to play the circuit from the start, and again to pause.',
  'A phase gate never moves the probability bars. That is not a bug — it is the entire point of phase.',
];

const GENERAL_2Q = [
  'Outcomes read q1q0 — q0 is the right-hand character. An X on q0 alone gives 01, not 10.',
  'CX, CZ and SWAP report no rotation axis, because they are not a rotation of either sphere.',
  'Bloch length is √(1 − C²). When the pair is maximally entangled both vectors vanish.',
  'SWAP uses two wires and never entangles. A two-qubit gate is not automatically an entangling gate.',
  'Scrubbing never re-runs anything. Every step is a full snapshot, so ← and → are instant.',
];

const DWELL_MS = 9000;

export default function TipBox({ context = null, nQubits = 1 }) {
  const pool = nQubits === 2 ? GENERAL_2Q : GENERAL;
  const [i, setI] = useState(0);

  useEffect(() => {
    if (context) return undefined;           // pinned — nothing to rotate
    const id = setTimeout(() => setI((n) => (n + 1) % pool.length), DWELL_MS);
    return () => clearTimeout(id);
  }, [i, context, pool.length]);

  const pinned = Boolean(context);
  const text = context || pool[i % pool.length];

  return (
    <div style={{ ...S.box, borderLeftColor: pinned ? 'var(--phase-0)' : 'var(--phase-90)' }}>
      <span style={S.icon}>{pinned ? '👁' : '💡'}</span>

      <p style={S.body}>
        <span className="mono" style={{ ...S.tag, color: pinned ? 'var(--phase-0)' : 'var(--phase-90)', borderColor: pinned ? 'var(--phase-0)' : 'var(--phase-90)' }}>
          tip
        </span>
        {text}
      </p>

      {!pinned && (
        <div style={S.dots}>
          {pool.map((t, n) => (
            <button
              key={t}
              onClick={() => setI(n)}
              aria-label={`tip ${n + 1}`}
              style={{
                ...S.dot,
                background: n === i % pool.length ? 'var(--phase-90)' : 'var(--border)',
                width: n === i % pool.length ? 13 : 5,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const S = {
  box: {
    display: 'flex', gap: 9, alignItems: 'center',
    marginTop: 8, padding: '8px 11px',
    background: 'var(--surface-alt)', border: '1px solid var(--border)',
    borderLeft: '3px solid', borderRadius: 'var(--radius-sm)',
    transition: 'border-color .3s ease',
  },
  icon: { fontSize: 13, lineHeight: 1.4, flexShrink: 0 },
  tag: {
    fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase',
    border: '1px solid', borderRadius: 999, padding: '1px 6px',
    marginRight: 8, opacity: 0.85, whiteSpace: 'nowrap',
  },
  body: { margin: 0, flex: 1, minWidth: 0, fontSize: 11.5, lineHeight: 1.65, color: 'var(--ink-soft)' },
  dots: { display: 'flex', gap: 4, flexShrink: 0 },
  dot: {
    height: 5, padding: 0, borderRadius: 999, border: 'none', cursor: 'pointer',
    transition: 'width .3s ease, background .3s ease',
  },
};
