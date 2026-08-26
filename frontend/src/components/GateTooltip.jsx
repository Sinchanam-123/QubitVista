import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const GAP = 10;

// Floating tooltip bubble, styled consistently (not the inconsistent native
// browser title tooltip) so gate meanings are visible the same way
// everywhere a gate symbol appears — the palette, the circuit, etc.
//
// It renders into a portal with fixed positioning: the gate panel is a
// scroll container, and an absolutely positioned bubble inside one gets
// clipped at the panel edge. Since the palette shows descriptions only on
// hover, that clipping would hide them entirely.
export default function GateTooltip({ label, description, position = 'right', wrapperStyle, children }) {
  const triggerRef = useRef(null);
  const bubbleRef = useRef(null);
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const place = useCallback(() => {
    const trigger = triggerRef.current;
    const bubble = bubbleRef.current;
    if (!trigger || !bubble) return;

    const t = trigger.getBoundingClientRect();
    const b = bubble.getBoundingClientRect();

    let top;
    let left;
    if (position === 'top') {
      top = t.top - b.height - GAP;
      left = t.left + t.width / 2 - b.width / 2;
    } else if (position === 'left') {
      top = t.top + t.height / 2 - b.height / 2;
      left = t.left - b.width - GAP;
    } else {
      top = t.top + t.height / 2 - b.height / 2;
      left = t.right + GAP;
    }

    // Flip to the other side rather than hang off the viewport edge.
    if (left + b.width > window.innerWidth - 8) left = t.left - b.width - GAP;
    if (left < 8) left = Math.min(t.right + GAP, window.innerWidth - b.width - 8);
    top = Math.max(8, Math.min(top, window.innerHeight - b.height - 8));

    setCoords({ top, left });
  }, [position]);

  useLayoutEffect(() => {
    if (!show) return undefined;
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [show, place]);

  return (
    <span
      ref={triggerRef}
      style={{ position: 'relative', display: 'inline-flex', ...wrapperStyle }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      {children}
      {show && createPortal(
        <span ref={bubbleRef} style={{ ...bubble, top: coords.top, left: coords.left }}>
          <strong style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>{label}</strong>
          {description && (
            <span style={{ display: 'block', fontSize: 11.5, marginTop: 2, color: '#cfd6e6', lineHeight: 1.4 }}>
              {description}
            </span>
          )}
        </span>,
        document.body
      )}
    </span>
  );
}

const bubble = {
  position: 'fixed',
  zIndex: 200,
  minWidth: 150,
  maxWidth: 220,
  padding: '8px 10px',
  borderRadius: 9,
  background: '#12172A',
  color: '#fff',
  boxShadow: '0 8px 24px rgba(0,0,0,0.28)',
  pointerEvents: 'none',
};
