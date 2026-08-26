// Decorative, non-interactive backdrop: a few slow drifting glow orbs in
// the logo's own palette. Fills the Home page's empty space without adding
// any scrollable height.
export default function AmbientBackground() {
  return (
    <div style={wrap} aria-hidden="true">
      <span style={{ ...orb, width: 340, height: 340, top: '8%', left: '4%', background: 'var(--phase-0)', animationDuration: '22s' }} />
      <span style={{ ...orb, width: 260, height: 260, bottom: '10%', right: '6%', background: 'var(--phase-180)', animationDuration: '26s', animationDelay: '-6s' }} />
      <span style={{ ...orb, width: 200, height: 200, top: '55%', left: '48%', background: 'var(--phase-90)', animationDuration: '30s', animationDelay: '-14s' }} />

      <style>{`
        @keyframes ambient-drift {
          0%   { transform: translate(0, 0) scale(1); }
          50%  { transform: translate(24px, -18px) scale(1.06); }
          100% { transform: translate(0, 0) scale(1); }
        }
      `}</style>
    </div>
  );
}

const wrap = {
  position: 'absolute',
  inset: 0,
  overflow: 'hidden',
  pointerEvents: 'none',
  zIndex: 0,
};

const orb = {
  position: 'absolute',
  borderRadius: '50%',
  filter: 'blur(60px)',
  opacity: 0.16,
  animationName: 'ambient-drift',
  animationTimingFunction: 'ease-in-out',
  animationIterationCount: 'infinite',
};
