import { useEffect, useState } from 'react';
import { StepForward, Orbit, Eye } from 'lucide-react';

/* The band under the call to action.
 *
 * Three claims, not three counts. Gate and circuit totals are what every
 * simulator advertises and none of them are a reason to open one; these are
 * the things this tool does that the others don't, and each is checkable in
 * the app in under a minute.
 *
 * Deliberately about the tool rather than the physics: naming a concept here
 * assumes the reader already knows what it means, and the landing page is
 * exactly where that assumption fails. The concepts get taught inside.
 *
 * The rail highlights one at a time and walks along on its own, so the row
 * reads as something alive rather than a static spec sheet — hovering pins the
 * highlight where you put it.
 */

const ITEMS = [
  {
    icon: StepForward,
    hue: 178,
    title: 'Step-by-step',
    sub: 'Scrub the circuit gate by gate, forwards and back. Most tools show you the final state and nothing else.',
  },
  {
    icon: Orbit,
    hue: 205,
    title: 'True rotation arcs',
    sub: 'The vector follows the gate’s real axis and angle, not a straight line cutting through the sphere.',
  },
  {
    icon: Eye,
    hue: 15,
    title: 'It tells you what didn’t move',
    sub: 'The panels beside every circuit say which readings stayed put, and why that matters.',
  },
];

const DWELL_MS = 3400;

export default function FeatureRail() {
  const [active, setActive] = useState(0);
  const [pinned, setPinned] = useState(null);

  useEffect(() => {
    if (pinned !== null) return undefined;
    const id = setTimeout(() => setActive((n) => (n + 1) % ITEMS.length), DWELL_MS);
    return () => clearTimeout(id);
  }, [active, pinned]);

  const live = pinned ?? active;

  return (
    <div style={rail} onMouseLeave={() => setPinned(null)}>
      {ITEMS.map((item, i) => {
        const Icon = item.icon;
        const on = i === live;
        const accent = `hsl(${item.hue} 68% var(--accent-l))`;

        return (
          <div
            key={item.title}
            className={on ? 'rail-card rail-card--on' : 'rail-card'}
            onMouseEnter={() => setPinned(i)}
            style={{
              ...slot,
              // The card that is "up" faces the reader square on and rises off
              // the page; the others stay tilted back and sunk. Two properties
              // doing the work of a highlight, so the row reads as a physical
              // stack rather than a colour change.
              transform: on
                ? 'translateY(-5px) translateZ(34px) rotateX(0deg)'
                : 'translateY(0) translateZ(0) rotateX(7deg)',
              borderColor: on ? `hsla(${item.hue}, 70%, 58%, 0.5)` : 'var(--border)',
              background: on
                ? `linear-gradient(160deg, hsla(${item.hue}, 70%, 55%, 0.13), var(--surface) 62%)`
                : 'var(--surface)',
              boxShadow: on
                ? `inset 0 1px 0 hsla(${item.hue}, 80%, 75%, 0.28),
                   0 8px 0 -3px hsla(${item.hue}, 45%, 22%, 0.55),
                   0 26px 42px -18px hsla(${item.hue}, 70%, 30%, 0.75)`
                : 'inset 0 1px 0 rgba(255,255,255,0.04), 0 5px 0 -3px rgba(0,0,0,0.28), 0 14px 22px -14px rgba(0,0,0,0.5)',
            }}
          >
            {/* A sheen that only crosses the raised card, so the lift reads as
                a surface catching light rather than a colour swap. */}
            <span style={{ ...sheen, opacity: on ? 1 : 0 }} />

            <div style={head}>
              <span
                style={{
                  ...iconBox,
                  background: on ? `hsla(${item.hue}, 70%, 55%, 0.18)` : 'var(--surface-alt)',
                  borderColor: on ? `hsla(${item.hue}, 70%, 55%, 0.5)` : 'var(--border)',
                  boxShadow: on ? `0 0 16px -2px hsla(${item.hue}, 75%, 55%, 0.55)` : 'none',
                  transform: on ? 'translateZ(18px)' : 'translateZ(0)',
                }}
              >
                <Icon size={15} color={on ? accent : 'var(--ink-soft)'} />
              </span>
              <span
                style={{
                  ...title,
                  color: on ? 'var(--ink)' : 'var(--ink-soft)',
                  transform: on ? 'translateZ(12px)' : 'translateZ(0)',
                }}
              >
                {item.title}
              </span>
            </div>

            <p style={{ ...sub, opacity: on ? 1 : 0.5 }}>{item.sub}</p>
          </div>
        );
      })}
    </div>
  );
}

// The shared vanishing point. Without a perspective on the parent the cards'
// rotateX would flatten to nothing and the whole effect would be a shadow.
const rail = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 'clamp(10px, 1.3vw, 20px)',
  width: '100%',
  perspective: '1100px',
  perspectiveOrigin: '50% 30%',
  paddingBottom: 10,
};

const slot = {
  position: 'relative',
  overflow: 'hidden',
  flex: '1 1 230px',
  minWidth: 0,
  padding: 'clamp(11px, 1.5vh, 15px) clamp(12px, 1vw, 16px)',
  borderRadius: 13,
  border: '1px solid',
  cursor: 'default',
  transformStyle: 'preserve-3d',
  transition: 'transform .55s cubic-bezier(.22,1,.36,1), box-shadow .55s ease,'
    + ' background .55s ease, border-color .55s ease',
};

const sheen = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  background: 'linear-gradient(115deg, rgba(255,255,255,0.10) 0%, transparent 42%)',
  transition: 'opacity .55s ease',
};

const head = { position: 'relative', display: 'flex', alignItems: 'center', gap: 9, marginBottom: 5 };

const iconBox = {
  width: 27,
  height: 27,
  borderRadius: 9,
  border: '1px solid',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  transition: 'background .45s ease, border-color .45s ease, box-shadow .45s ease, transform .55s cubic-bezier(.22,1,.36,1)',
};

const title = {
  fontFamily: 'var(--font-display)',
  fontWeight: 600,
  fontSize: 'clamp(12.5px, 1.6vh, 14.5px)',
  lineHeight: 1.2,
  transition: 'color .45s ease, transform .55s cubic-bezier(.22,1,.36,1)',
};

const sub = {
  position: 'relative',
  margin: 0,
  fontSize: 'clamp(10.5px, 1.25vh, 12px)',
  lineHeight: 1.5,
  color: 'var(--ink-soft)',
  transition: 'opacity .45s ease',
};
