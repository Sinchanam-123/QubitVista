import BlochSphere from './BlochSphere';

// Ambient hero visual: a glowing backdrop, a slowly rotating Bloch sphere,
// and a few soft orbiting particles — meant to be looked at, not clicked.
// `vector` lets a caller drive the arrow from a real circuit (see HeroDemo);
// left off, it just sits at a pleasant fixed angle.
export default function QuantumVisual({ size = 340, vector }) {
  const orbitRadius = size * 0.47;

  return (
    // The ring of space around the sphere only has to clear the orbiting
    // particles (radius 0.47 x size), so it stays tight — a wider box is
    // dead height on a page that has to fit one screen.
    <div style={{ position: 'relative', width: '100%', maxWidth: size + 48, aspectRatio: '1 / 1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={glow} />

      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            ...particle,
            animationDelay: `${i * -3.4}s`,
            animationDuration: `${9 + i * 3}s`,
            '--orbit-radius': `${orbitRadius}px`,
          }}
        />
      ))}

      <div style={{ position: 'relative', zIndex: 1 }}>
        <BlochSphere vector={vector ?? { x: 0.55, y: 0.35, z: 0.55 }} size={size} ambient />
      </div>

      <style>{`
        @keyframes qv-orbit {
          from { transform: rotate(0deg) translateX(var(--orbit-radius)) rotate(0deg); }
          to   { transform: rotate(360deg) translateX(var(--orbit-radius)) rotate(-360deg); }
        }
        @keyframes qv-pulse {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50% { opacity: 0.55; transform: scale(1.08); }
        }
      `}</style>
    </div>
  );
}

const glow = {
  position: 'absolute',
  inset: 0,
  margin: 'auto',
  width: '80%',
  height: '80%',
  borderRadius: '50%',
  background: 'radial-gradient(circle, var(--phase-0) 0%, transparent 70%)',
  filter: 'blur(40px)',
  opacity: 0.35,
  animation: 'qv-pulse 6s ease-in-out infinite',
};

const particle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  width: 8,
  height: 8,
  marginTop: -4,
  marginLeft: -4,
  borderRadius: '50%',
  background: 'var(--phase-180)',
  boxShadow: '0 0 12px var(--phase-180)',
  animationName: 'qv-orbit',
  animationTimingFunction: 'linear',
  animationIterationCount: 'infinite',
};
