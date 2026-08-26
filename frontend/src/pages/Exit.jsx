import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, BookOpen, Home, RotateCcw } from 'lucide-react';
import { GATE_CONCEPTS, GATE_SHORT, GATE_HUE } from '../utils/quantumEngine';
import ExitBackground from '../components/ExitBackground';

/* The end-of-session screen.
 *
 * It reports back what the visitor actually did rather than thanking them
 * generically — the gates they placed, how long the circuit got, and whether
 * they reached the one thing that only happens on two wires. A summary that
 * names your own circuit is worth reading; "thanks for visiting" is not.
 *
 * Everything shown comes from router state handed over by whichever simulator
 * they left, so this page needs no backend and no session storage.
 */

const STATES = [
  { id: 'fuzzy', emoji: '🤔', label: 'Still fuzzy', hue: 210 },
  { id: 'clicking', emoji: '🙂', label: 'Starting to click', hue: 175 },
  { id: 'blown', emoji: '🤯', label: 'Mind = blown', hue: 300 },
];

export default function Exit() {
  const location = useLocation();
  const gatesUsed = location.state?.gatesUsed || [];
  const gateCount = location.state?.gateCount || 0;
  const nQubits = location.state?.nQubits || 1;
  const entangled = Boolean(location.state?.entangled);

  const [collapsedState, setCollapsedState] = useState(null);
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const allConcepts = Array.from(new Set(gatesUsed.map((g) => GATE_CONCEPTS[g]?.concept).filter(Boolean)));
  const conceptSummary = summarize(allConcepts);

  // Either half of the form is enough to send: a written note on its own is
  // real feedback, so it must not be silently swallowed for want of an emoji.
  const hasFeedback = Boolean(collapsedState) || message.trim().length > 0;

  function handleSubmit(e) {
    e.preventDefault();
    if (!hasFeedback) {
      setError('Pick a state above or write a note — either one is enough.');
      return;
    }
    // No backend wired up yet — confirms locally. Swap for a fetch() once
    // a feedback endpoint exists.
    setError('');
    setSubmitted(true);
  }

  const otherSim = nQubits === 2 ? '/simulator' : '/simulator/two-qubit';
  const otherLabel = nQubits === 2 ? 'Try one qubit' : 'Try two qubits';

  return (
    <div style={S.page}>
      <ExitBackground />

      <div className="container" style={S.inner}>
        <div style={S.head}>
          <img src="/logo-full.png" alt="" style={S.logo} />
          <div>
            <span className="mono" style={S.eyebrow}>session ended</span>
            <h1 className="exit-title" style={S.title}>Nice work.</h1>
          </div>
        </div>

        <div className="card" style={S.card}>
          {gateCount > 0 ? (
            <>
              <div style={S.stats}>
                <Stat value={gateCount} label={`gate${gateCount === 1 ? '' : 's'} placed`} hue={178} />
                <Stat value={gatesUsed.length} label="different gates" hue={205} />
                <Stat value={nQubits} label={`qubit${nQubits === 1 ? '' : 's'}`} hue={285} />
              </div>

              {gatesUsed.length > 0 && (
                <div style={S.chipRow}>
                  {gatesUsed.map((g) => (
                    <span
                      key={g}
                      className="mono"
                      style={{
                        ...S.chip,
                        background: `linear-gradient(150deg, hsl(${GATE_HUE[g] ?? 200}, 80%, 66%), hsl(${(GATE_HUE[g] ?? 200) + 25}, 75%, 46%))`,
                      }}
                    >
                      {GATE_SHORT[g] || g}
                    </span>
                  ))}
                </div>
              )}

              <p style={S.summary}>
                You built {article(gateCount)} {gateCount}-gate circuit
                {conceptSummary && <> and touched <b style={{ color: 'var(--ink)' }}>{conceptSummary}</b></>}
                {' '}along the way. That&apos;s real intuition, not a definition you read once.
              </p>

              {entangled && (
                <div style={S.badge}>
                  <span style={{ fontSize: 15 }}>🔗</span>
                  <span>
                    You got the two qubits linked — both arrows shrank to nothing while the pair
                    stayed perfectly defined. That is the part no single qubit can do.
                  </span>
                </div>
              )}
            </>
          ) : (
            <p style={S.summary}>
              You had a look without building anything — that&apos;s a fine start too. Drop a single
              H on the wire next time and watch the arrow swing onto the equator; it takes one click.
            </p>
          )}

          <div style={S.actions}>
            <Link to={otherSim} className="btn-primary" style={S.actionPrimary}>
              {otherLabel} <ArrowRight size={15} />
            </Link>
            <Link to="/learn" className="btn-ghost" style={S.actionGhost}>
              <BookOpen size={14} /> Read up on it
            </Link>
            <Link to="/" className="btn-ghost" style={S.actionGhost}>
              <Home size={14} /> Home
            </Link>
          </div>
        </div>

        <div className="card" style={S.card}>
          {submitted ? (
            <div style={S.thanks}>
              <span style={{ fontSize: 22 }}>✨</span>
              <p style={{ margin: '6px 0 0', fontSize: 'var(--fs-sm)' }}>
                Your state collapsed and we caught it — thank you, genuinely.
              </p>
              <button type="button" onClick={() => setSubmitted(false)} style={S.again}>
                <RotateCcw size={12} /> Send something else
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <label style={S.label}>Collapse your experience into one state</label>
              <div style={S.stateRow}>
                {STATES.map((s) => {
                  const active = collapsedState === s.id;
                  return (
                    <button
                      type="button"
                      key={s.id}
                      aria-pressed={active}
                      onClick={() => { setCollapsedState(s.id); setError(''); }}
                      style={{
                        ...S.stateBtn,
                        // color-mix rather than a fixed light colour: the old
                        // hsl(...,96%) fill was a near-white block in dark mode.
                        border: `1px solid ${active ? `hsl(${s.hue} 65% var(--accent-l))` : 'var(--border)'}`,
                        background: active
                          ? `color-mix(in srgb, hsl(${s.hue}, 70%, 55%) 16%, var(--surface-alt))`
                          : 'var(--surface-alt)',
                        color: active ? `hsl(${s.hue} 65% var(--accent-l))` : 'var(--ink-soft)',
                        fontWeight: active ? 600 : 400,
                      }}
                    >
                      <span style={{ fontSize: 'clamp(18px, 2.4vh, 24px)' }}>{s.emoji}</span>
                      <span style={{ fontSize: 'var(--fs-sm)' }}>{s.label}</span>
                    </button>
                  );
                })}
              </div>

              <label style={S.label} htmlFor="feedback-message">Anything you&apos;d change or add? (optional)</label>
              <textarea
                id="feedback-message"
                value={message}
                onChange={(e) => { setMessage(e.target.value); if (error) setError(''); }}
                placeholder="Tell us what confused you or what you wanted to see"
                style={S.textarea}
              />

              {error && <p role="alert" style={S.error}>{error}</p>}

              <button type="submit" className="btn-primary" style={{ ...S.send, opacity: hasFeedback ? 1 : 0.6 }}>
                Send feedback
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ value, label, hue }) {
  return (
    <div style={S.stat}>
      <span style={{ ...S.statValue, color: `hsl(${hue} 68% var(--accent-l))` }}>{value}</span>
      <span style={S.statLabel}>{label}</span>
    </div>
  );
}

// "an 8-gate circuit", not "a 8-gate circuit" — keyed off how the number is
// spoken (eight / eleven / eighteen / eighty-something).
function article(n) {
  return n === 8 || n === 11 || n === 18 || (n >= 80 && n <= 89) ? 'an' : 'a';
}

// Capped at three: a full run touches seven concepts, and naming all of
// them reads as a list dump and pushes the card past a short screen.
function summarize(concepts) {
  if (concepts.length === 0) return '';
  const named = concepts.slice(0, 3).join(', ').toLowerCase();
  const rest = concepts.length - 3;
  return rest > 0 ? `${named} and ${rest} more` : named;
}

const S = {
  page: { position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' },
  inner: {
    maxWidth: 640, position: 'relative', zIndex: 1, height: '100%', boxSizing: 'border-box',
    display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 'var(--gap-sm)',
    paddingTop: 'var(--gap-xs)', paddingBottom: 'var(--gap-xs)',
  },

  head: { display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'center' },
  logo: { width: 'clamp(38px, 6.5vh, 66px)', height: 'auto', objectFit: 'contain', flexShrink: 0 },
  eyebrow: {
    fontSize: 10.5, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--phase-180)',
  },
  title: {
    fontSize: 'clamp(1.5rem, 1.2vw + 2.4vh, 2.6rem)', margin: '2px 0 0', lineHeight: 1,
    background: 'linear-gradient(100deg, var(--phase-0), var(--phase-90), var(--phase-180), var(--phase-0))',
    backgroundSize: '300% auto', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
    animation: 'exit-gradient 7s ease-in-out infinite',
  },

  card: { padding: 'clamp(14px, 2.4vh, 24px)' },

  stats: { display: 'flex', gap: 'clamp(10px, 2vw, 22px)', marginBottom: 'var(--gap-sm)' },
  stat: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 },
  statValue: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(19px, 2.8vh, 27px)', lineHeight: 1.05 },
  statLabel: { fontSize: 'clamp(10px, 1.2vh, 11.5px)', color: 'var(--ink-soft)' },

  chipRow: { display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 'var(--gap-sm)' },
  chip: {
    minWidth: 26, height: 26, padding: '0 8px', borderRadius: 8,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: 700, color: '#fff',
  },

  summary: { fontSize: 'var(--fs-sm)', lineHeight: 1.65, color: 'var(--ink-soft)', margin: 0 },

  badge: {
    display: 'flex', gap: 9, alignItems: 'flex-start',
    marginTop: 'var(--gap-sm)', padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    background: 'color-mix(in srgb, var(--phase-90) 10%, var(--surface-alt))',
    border: '1px solid color-mix(in srgb, var(--phase-90) 35%, transparent)',
    fontSize: 12, lineHeight: 1.6, color: 'var(--ink)',
  },

  actions: { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 'var(--gap-md)' },
  actionPrimary: {
    display: 'inline-flex', alignItems: 'center', gap: 7, textDecoration: 'none',
    padding: 'clamp(8px, 1.3vh, 12px) 18px', fontSize: 'var(--fs-sm)',
  },
  actionGhost: {
    display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none',
    padding: 'clamp(7px, 1.2vh, 11px) 15px', fontSize: 'var(--fs-sm)',
  },

  label: { display: 'block', fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)', marginBottom: 'var(--gap-xs)', fontWeight: 500 },
  stateRow: { display: 'flex', gap: 8, marginBottom: 'var(--gap-sm)', flexWrap: 'wrap' },
  stateBtn: {
    flex: '1 1 120px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
    padding: 'clamp(8px, 1.3vh, 13px) 10px', borderRadius: 12, cursor: 'pointer',
    transition: 'background .15s ease, border-color .15s ease, color .15s ease',
  },
  textarea: {
    width: '100%', height: 'clamp(44px, 8vh, 88px)', borderRadius: 12,
    border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--ink)',
    padding: 10, fontFamily: 'var(--font-body)', fontSize: 'var(--fs-sm)', resize: 'vertical', display: 'block',
  },
  error: { marginTop: 8, fontSize: 'var(--fs-sm)', color: 'var(--phase-0)' },
  send: { marginTop: 'var(--gap-sm)', width: '100%', padding: 'clamp(9px, 1.4vh, 13px) 24px', fontSize: 'var(--fs-body)' },

  thanks: { textAlign: 'center' },
  again: {
    display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 10,
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 11.5, color: 'var(--ink-soft)', textDecoration: 'underline',
  },
};
