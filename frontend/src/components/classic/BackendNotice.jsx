/* The line that says which half of the page is not working, and why.
 *
 * Two failures reach this component and they are not the same failure.
 *
 * OFFLINE — nothing answered on the API. The simulation itself is unaffected:
 * quantumEngine.js runs the identical maths in the browser, so gates still
 * place, the sphere still animates and both readouts still update. What does
 * disappear is everything the backend generates — the teaching notes and the
 * circuit catalogue. Panels that silently empty themselves read as a broken
 * page, so this says which half is missing and that the numbers are still good.
 *
 * ERROR — the backend answered and rejected the circuit (a 400: a control on
 * the same wire as its target, an unknown gate). That is the user's to fix and
 * the backend's own sentence is the most useful thing to show, so it is shown
 * verbatim rather than folded into an "offline" message it has nothing to do
 * with.
 *
 * Deliberately a strip under the transport bar rather than a modal or a toast:
 * it has to be visible without interrupting a circuit that is still working.
 */
export default function BackendNotice({ offline = false, error = null }) {
  if (!offline && !error) return null;

  // A rejected circuit is the more specific fact, so it wins if both are set.
  const accent = error ? 'var(--phase-270)' : 'var(--phase-0)';

  return (
    <div
      role={error ? 'alert' : 'status'}
      style={{ ...S.box, borderLeftColor: accent }}
    >
      <span style={S.icon}>{error ? '⚠' : '◍'}</span>
      <p style={S.body}>
        <span className="mono" style={{ ...S.tag, color: accent, borderColor: accent }}>
          {error ? 'error' : 'offline'}
        </span>
        {error || (
          <>
            Backend offline — simulation is running on the exact in-browser engine.
            Teaching notes and the circuit catalogue need the backend.
          </>
        )}
      </p>
    </div>
  );
}

const S = {
  box: {
    display: 'flex', gap: 9, alignItems: 'center',
    marginTop: 8, padding: '8px 11px',
    background: 'var(--surface-alt)', border: '1px solid var(--border)',
    borderLeft: '3px solid', borderRadius: 'var(--radius-sm)',
  },
  icon: { fontSize: 13, lineHeight: 1.4, flexShrink: 0 },
  tag: {
    fontSize: 9, letterSpacing: '.14em', textTransform: 'uppercase',
    border: '1px solid', borderRadius: 999, padding: '1px 6px',
    marginRight: 8, opacity: 0.85, whiteSpace: 'nowrap',
  },
  body: {
    margin: 0, flex: 1, minWidth: 0,
    fontSize: 11.5, lineHeight: 1.65, color: 'var(--ink-soft)',
  },
};
