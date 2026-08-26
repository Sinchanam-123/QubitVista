// Backdrop for the exit page: a field of slowly drifting wavefunctions.
// A qubit is a wave until you measure it, so the page you land on after
// measuring one is layered sine curves sliding past each other at
// different speeds, quietly interfering. Restrained on purpose — thin
// strokes, low opacity, nothing moving quickly enough to pull the eye off
// the text.

const VIEW_W = 1200;
const VIEW_H = 400;

// Each wave is drawn two viewBox-widths wide and slid left by exactly one,
// so the loop is seamless as long as the wavelength divides VIEW_W.
const WAVES = [
  { wavelength: 400, amplitude: 34, y: 92, color: 'var(--phase-0)', duration: 34, opacity: 0.30, width: 1.5 },
  { wavelength: 600, amplitude: 46, y: 150, color: 'var(--phase-90)', duration: 46, opacity: 0.24, width: 1.5 },
  { wavelength: 300, amplitude: 26, y: 205, color: 'var(--phase-180)', duration: 28, opacity: 0.22, width: 1.2 },
  { wavelength: 600, amplitude: 38, y: 258, color: 'var(--phase-0)', duration: 54, opacity: 0.20, width: 1.2 },
  { wavelength: 400, amplitude: 30, y: 312, color: 'var(--phase-270)', duration: 40, opacity: 0.18, width: 1.2 },
  { wavelength: 240, amplitude: 18, y: 356, color: 'var(--phase-90)', duration: 24, opacity: 0.16, width: 1 },
];

function sinePath({ wavelength, amplitude, y }) {
  const points = [];
  for (let x = 0; x <= VIEW_W * 2; x += 8) {
    const value = y + amplitude * Math.sin((x / wavelength) * Math.PI * 2);
    points.push(`${x},${value.toFixed(1)}`);
  }
  return `M${points.join(' L')}`;
}

export default function ExitBackground() {
  return (
    <div style={wrap} aria-hidden="true">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="none"
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        {WAVES.map((w, i) => (
          <g
            key={i}
            style={{
              animation: `exit-wave-drift ${w.duration}s linear infinite`,
              animationDelay: `${i * -3}s`,
            }}
          >
            <path
              d={sinePath(w)}
              fill="none"
              stroke={w.color}
              strokeWidth={w.width}
              strokeOpacity={w.opacity}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        ))}
      </svg>

      {/* Fades the field out behind the card so the text keeps its contrast. */}
      <div style={veil} />

      <style>{`
        @keyframes exit-wave-drift {
          from { transform: translateX(0); }
          to   { transform: translateX(-${VIEW_W}px); }
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

const veil = {
  position: 'absolute',
  inset: 0,
  background: 'radial-gradient(ellipse 46% 58% at 50% 50%, var(--bg) 30%, transparent 100%)',
};
