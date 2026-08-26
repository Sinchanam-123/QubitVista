import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

/* A first-run walkthrough of whichever simulator you opened.
 *
 * It spotlights the real elements rather than showing screenshots, so the thing
 * being described is the thing you are looking at, and the layout underneath is
 * already the one you will be using.
 *
 * It blocks interaction while it runs — that is the point of a tour — but it
 * runs once. The flag lives in localStorage per page, because the two pages
 * teach different things and someone who learned the one-qubit layout still
 * has not seen a control wire. "Take the tour" in the header replays it.
 *
 * Targets are addressed by data-tour attributes rather than class names or DOM
 * position, so restyling a panel cannot silently point the spotlight at the
 * wrong thing.
 */

export const tourSeen = (key) => {
  try { return window.localStorage.getItem(`qv-tour-${key}`) === 'done'; } catch { return true; }
};
const markSeen = (key) => {
  try { window.localStorage.setItem(`qv-tour-${key}`, 'done'); } catch { /* private mode */ }
};

const PAD = 8;

/* Bring a target into view by walking its scrollable ancestors and setting
 * scrollTop directly.
 *
 * scrollIntoView would be the obvious call, but its `behavior` is a hint the
 * browser may ignore — the same reason the circuit strip needs a fallback — and
 * a tour that highlights something off-screen is just a dimmed page. Assigning
 * scrollTop always lands.
 *
 * Panels taller than their container get their top aligned rather than centred;
 * centring a 850px card in a 600px pane hides the heading, which is the part
 * the tour is talking about. */
function revealInScrollParents(el) {
  const MARGIN = 16;
  let node = el.parentElement;

  while (node && node !== document.body && node !== document.documentElement) {
    const canScroll = /(auto|scroll)/.test(getComputedStyle(node).overflowY)
      && node.scrollHeight > node.clientHeight + 1;

    if (canScroll) {
      const box = el.getBoundingClientRect();
      const view = node.getBoundingClientRect();
      const delta = box.height > view.height - MARGIN * 2
        ? box.top - view.top - MARGIN
        : (box.top + box.height / 2) - (view.top + view.height / 2);
      node.scrollTop += delta;
    }
    node = node.parentElement;
  }
}

export default function GuidedTour({ steps, tourKey, open, onClose }) {
  const [i, setI] = useState(0);
  const [box, setBox] = useState(null);
  const [cardH, setCardH] = useState(220);
  const cardRef = useRef(null);

  const step = steps[i];

  const finish = useCallback(() => {
    markSeen(tourKey);
    setI(0);
    onClose();
  }, [tourKey, onClose]);

  /* Measure the target every time the step changes, and keep measuring while
     anything scrolls or resizes.
   *
   * The scrolling matters: the panels a tour talks about are not all above the
   * fold, and a spotlight drawn around something off-screen is just a dimmed
   * page. So the target is scrolled into view first, and the ring re-measures
   * on every scroll event until it settles — that also covers the case where
   * smooth scrolling is unavailable and the jump is instant. */
  useLayoutEffect(() => {
    if (!open || !step) return undefined;

    const find = () => (step.target ? document.querySelector(`[data-tour="${step.target}"]`) : null);

    const measure = () => {
      const el = find();
      if (!el) { setBox(null); return; }
      const r = el.getBoundingClientRect();
      setBox({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });
    };

    const el = find();
    if (el) revealInScrollParents(el);

    measure();
    const raf = requestAnimationFrame(measure);
    // capture:true so it hears scrolls on inner containers, which don't bubble.
    window.addEventListener('scroll', measure, true);
    window.addEventListener('resize', measure);
    const settle = setTimeout(measure, 420);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(settle);
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, [open, step, i]);

  // The card's own height decides whether it fits beside, above or below the
  // target, so it has to be measured rather than guessed.
  useLayoutEffect(() => {
    if (!open || !cardRef.current) return;
    const h = cardRef.current.getBoundingClientRect().height;
    if (h && Math.abs(h - cardH) > 2) setCardH(h);
  }, [open, i, box, cardH]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); finish(); }
      if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); setI((n) => Math.min(n + 1, steps.length - 1)); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); setI((n) => Math.max(n - 1, 0)); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, finish, steps.length]);

  if (!open || !step) return null;

  const last = i === steps.length - 1;
  const card = placeCard(box, cardH);

  return (
    <div style={S.layer} role="dialog" aria-modal="true" aria-label="Guided tour">
      {/* One element does the dimming and the hole: a huge spread shadow around
          the ring darkens everything outside it, so there is no four-rectangle
          mask to keep in sync. */}
      {box ? (
        <div
          className="tour-ring"
          style={{ ...S.ring, top: box.top, left: box.left, width: box.width, height: box.height }}
        />
      ) : (
        <div style={S.fullDim} />
      )}

      <div ref={cardRef} className="tour-card" style={{ ...S.card, ...card }}>
        <div style={S.head}>
          <span className="mono" style={S.count}>{i + 1} / {steps.length}</span>
          <button onClick={finish} style={S.skip}>Skip</button>
        </div>

        <h3 style={S.title}>{step.title}</h3>
        <p style={S.body}>{step.body}</p>

        <div style={S.foot}>
          <div style={S.dots}>
            {steps.map((s, n) => (
              <span key={s.title} style={{ ...S.dot, background: n === i ? 'var(--phase-0)' : 'var(--border)', width: n === i ? 15 : 5 }} />
            ))}
          </div>

          <div style={{ display: 'flex', gap: 7 }}>
            {i > 0 && (
              <button onClick={() => setI(i - 1)} className="btn-ghost" style={S.back}>Back</button>
            )}
            <button
              onClick={() => (last ? finish() : setI(i + 1))}
              className="btn-primary"
              style={S.next}
            >
              {last ? 'Start building' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Put the card next to the spotlight without covering it.
 *
 * Right and left are tried before below and above, because the panels being
 * described are often tall — a palette or a sphere card can be 600px high, and
 * a card placed under it either lands off-screen or, if clamped back on, sits
 * squarely over the thing it is pointing at. Sideways always has room when
 * vertical does not.
 *
 * Whatever is chosen is clamped into the viewport, and the last resort is a
 * corner far from the ring rather than the middle of it. */
function placeCard(box, cardH) {
  const W = 320;
  const M = 14;                       // margin from the viewport edge
  const GAP = 16;                     // clearance from the spotlight
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (!box) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: W };

  const clampY = (t) => Math.max(M, Math.min(t, vh - cardH - M));
  const clampX = (l) => Math.max(M, Math.min(l, vw - W - M));
  const midY = clampY(box.top + box.height / 2 - cardH / 2);
  const midX = clampX(box.left + box.width / 2 - W / 2);

  const right = box.left + box.width + GAP;
  if (right + W <= vw - M) return { top: midY, left: right, width: W };

  const left = box.left - GAP - W;
  if (left >= M) return { top: midY, left, width: W };

  const below = box.top + box.height + GAP;
  if (below + cardH <= vh - M) return { top: below, left: midX, width: W };

  const above = box.top - GAP - cardH;
  if (above >= M) return { top: above, left: midX, width: W };

  // Nothing fits cleanly — sit in whichever corner the ring is furthest from.
  const top = box.top + box.height / 2 > vh / 2 ? M : vh - cardH - M;
  return { top, left: clampX(box.left + box.width / 2 - W / 2), width: W };
}

const S = {
  layer: { position: 'fixed', inset: 0, zIndex: 70 },

  ring: {
    position: 'absolute',
    borderRadius: 12,
    border: '2px solid var(--phase-0)',
    // The spread is what dims the rest of the screen.
    boxShadow: '0 0 0 9999px color-mix(in srgb, var(--bg) 78%, transparent)',
    transition: 'top .32s cubic-bezier(.22,1,.36,1), left .32s cubic-bezier(.22,1,.36,1),'
      + ' width .32s cubic-bezier(.22,1,.36,1), height .32s cubic-bezier(.22,1,.36,1)',
    pointerEvents: 'none',
  },
  fullDim: {
    position: 'absolute', inset: 0,
    background: 'color-mix(in srgb, var(--bg) 78%, transparent)',
    backdropFilter: 'blur(2px)',
  },

  card: {
    position: 'absolute',
    padding: 16,
    borderRadius: 'var(--radius-md)',
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    boxShadow: '0 26px 60px -20px rgba(0,0,0,0.6)',
  },
  head: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 },
  count: { fontSize: 10.5, color: 'var(--ink-soft)', letterSpacing: '.08em' },
  skip: {
    fontSize: 11, cursor: 'pointer', background: 'none', border: 'none',
    color: 'var(--ink-soft)', textDecoration: 'underline', padding: 0,
  },
  title: { fontSize: 15, margin: '0 0 6px' },
  body: { fontSize: 12.5, lineHeight: 1.65, color: 'var(--ink-soft)', margin: '0 0 14px' },

  foot: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  dots: { display: 'flex', gap: 4 },
  dot: { height: 5, borderRadius: 999, transition: 'width .25s ease, background .25s ease' },
  back: { padding: '7px 13px', fontSize: 12 },
  next: { padding: '7px 15px', fontSize: 12 },
};
