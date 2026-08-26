import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { ArrowRight, X } from 'lucide-react';

/* The fork between the two simulators, as a floating panel rather than a page.
 *
 * It used to be a route of its own, which meant a full navigation away from the
 * hero and a second navigation back if you changed your mind — a lot of
 * ceremony for a two-option question. Floating it keeps the page you were on
 * underneath and makes backing out free.
 *
 * The copy deliberately names nothing. A visitor who already knows what
 * "superposition" or "entanglement" means does not need this panel; a visitor
 * who doesn't is exactly who it is for, and a wall of terms is where they stop.
 * So it describes what is on the screen — balls, arrows, bars — and leaves the
 * vocabulary to the pages that actually teach it.
 */

/* `?tour=1` asks the simulator to run its walkthrough regardless of whether it
 * has been seen before. Arriving through this panel is someone choosing to be
 * shown around, so the tour should be there every time — the once-only flag is
 * for people who land straight on a simulator by link or back button. */
const MODES = [
  {
    to: '/simulator?tour=1',
    hue: 178,
    badge: 'start here',
    title: 'One qubit',
    blurb:
      'A single ball with an arrow inside it. Add a gate and the arrow turns; the bars '
      + 'underneath tell you what you would actually get if you looked. Nothing to set up '
      + 'and no maths needed — just watch what moves.',
    points: ['Everything happens on one ball', 'Add a gate, watch the arrow turn', 'Best place to begin'],
  },
  {
    to: '/simulator/two-qubit?tour=1',
    hue: 15,
    badge: 'once that clicks',
    title: 'Two qubits',
    blurb:
      'Two balls instead of one. Certain gates tie them together, and when they do '
      + 'something genuinely odd happens — each arrow shrinks away to nothing, even though '
      + 'the pair as a whole is behaving perfectly predictably.',
    points: ['Two balls, four bars', 'Some gates link them up', 'Where the strange part lives'],
  },
];

export default function ModeChooser({ open, onClose }) {
  const panelRef = useRef(null);
  const firstRef = useRef(null);
  const returnTo = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    // Remember where focus was so closing puts it back — otherwise a keyboard
    // user is dumped at the top of the document.
    returnTo.current = document.activeElement;
    firstRef.current?.focus();

    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); return; }
      if (e.key !== 'Tab') return;
      // Keep tabbing inside the panel while it is up.
      const items = panelRef.current?.querySelectorAll('a[href], button');
      if (!items?.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    };

    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      if (returnTo.current instanceof HTMLElement) returnTo.current.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  /* Rendered into the body rather than in place. The navbar that opens this
   * panel is a blurred bar, and `backdrop-filter` makes an element a containing
   * block for fixed-position descendants — mounted inside it, the backdrop's
   * `inset: 0` resolved to the 64px header and folded the whole panel into that
   * strip. Portalling out means the panel measures against the viewport wherever
   * it is opened from, so it looks the same from the navbar as from the hero. */
  return createPortal((
    <div
      className="chooser-backdrop"
      style={S.backdrop}
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={panelRef}
        className="chooser-panel"
        style={S.panel}
        role="dialog"
        aria-modal="true"
        aria-label="Choose a simulator"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} aria-label="Close" style={S.close}><X size={16} /></button>

        <header style={S.head}>
          <h2 style={S.h2}>How many do you want to play with?</h2>
          <p style={S.sub}>
            Both work the same way — drop gates in and watch. You can switch over at any time.
          </p>
        </header>

        <div style={S.grid}>
          {MODES.map((m, i) => (
            <Link
              key={m.to}
              to={m.to}
              ref={i === 0 ? firstRef : null}
              onClick={onClose}
              className="chooser-card"
              style={{ ...S.card, '--mode-hue': m.hue }}
            >
              <span
                style={{
                  ...S.wash,
                  background: `radial-gradient(120% 90% at 20% 0%, hsla(${m.hue}, 80%, 55%, 0.16), transparent 62%)`,
                }}
              />

              <span style={{ ...S.badge, color: `hsl(${m.hue} 70% var(--accent-l))`, borderColor: `hsla(${m.hue}, 70%, 55%, 0.45)` }}>
                {m.badge}
              </span>

              <h3 style={S.cardTitle}>{m.title}</h3>
              <p style={S.blurb}>{m.blurb}</p>

              <ul style={S.points}>
                {m.points.map((p) => (
                  <li key={p} style={S.point}>
                    <span style={{ ...S.dot, background: `hsl(${m.hue} 70% var(--accent-l))` }} />
                    {p}
                  </li>
                ))}
              </ul>

              <span style={{ ...S.go, color: `hsl(${m.hue}, 70%, 60%)` }}>
                Open <ArrowRight size={15} />
              </span>
            </Link>
          ))}
        </div>

        <p style={S.foot}>Not sure? Take the left one — everything there still applies on the right.</p>
      </div>
    </div>
  ), document.body);
}

const S = {
  backdrop: {
    position: 'fixed', inset: 0, zIndex: 60,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 'clamp(14px, 3vh, 34px)',
    background: 'color-mix(in srgb, var(--bg) 72%, transparent)',
    backdropFilter: 'blur(7px)',
  },
  panel: {
    position: 'relative',
    width: '100%', maxWidth: 880, maxHeight: '100%', overflowY: 'auto',
    padding: 'clamp(18px, 3vh, 30px)',
    borderRadius: 'var(--radius-lg)',
    background: 'var(--surface)', border: '1px solid var(--border)',
    boxShadow: '0 40px 90px -30px rgba(0,0,0,0.6)',
  },
  close: {
    position: 'absolute', top: 12, right: 12,
    width: 30, height: 30, borderRadius: '50%', cursor: 'pointer',
    border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--ink-soft)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },

  head: { textAlign: 'center', marginBottom: 'var(--gap-md)' },
  h2: { fontSize: 'clamp(18px, 2.6vh, 25px)', margin: 0, lineHeight: 1.15 },
  sub: { fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)', margin: '7px auto 0', maxWidth: 460, lineHeight: 1.55 },

  grid: { display: 'grid', gap: 'var(--gap-sm)', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))' },

  card: {
    position: 'relative', overflow: 'hidden', textDecoration: 'none', color: 'var(--ink)',
    display: 'flex', flexDirection: 'column', gap: 9,
    padding: 'clamp(14px, 2vh, 20px)',
    borderRadius: 'var(--radius-md)',
    background: 'var(--surface-alt)', border: '1px solid var(--border)',
    transition: 'transform .2s cubic-bezier(.22,1,.36,1), border-color .2s ease, box-shadow .2s ease',
  },
  wash: { position: 'absolute', inset: 0, pointerEvents: 'none' },

  badge: {
    position: 'relative', alignSelf: 'flex-start',
    fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '.12em', textTransform: 'uppercase',
    padding: '2px 9px', borderRadius: 999, border: '1px solid',
  },
  cardTitle: { position: 'relative', fontSize: 'clamp(17px, 2.2vh, 21px)', margin: 0 },
  blurb: { position: 'relative', margin: 0, fontSize: 12.5, lineHeight: 1.6, color: 'var(--ink-soft)' },

  points: { position: 'relative', listStyle: 'none', margin: '2px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 5 },
  point: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--ink)' },
  dot: { width: 5, height: 5, borderRadius: '50%', flexShrink: 0 },

  go: {
    position: 'relative', marginTop: 'auto', paddingTop: 6,
    display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13.5, fontWeight: 600,
  },

  foot: { textAlign: 'center', fontSize: 12, color: 'var(--ink-soft)', margin: 'var(--gap-sm) 0 0' },
};
