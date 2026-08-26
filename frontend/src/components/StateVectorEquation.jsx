import { basisLabel, phaseToHue, formatAmplitude } from '../utils/quantumEngine';

// Renders |psi> = c0|0> + c1|1> as an actual equation, each coefficient
// colored by its phase angle (same phase = color convention used
// everywhere else in the UI).
export default function StateVectorEquation({ amplitudes }) {
  const terms = amplitudes
    .map((amp, i) => ({ ...amp, index: i }))
    .filter((amp) => amp.magnitude > 0.0005);

  return (
    <div style={{ width: '100%' }}>
      <div className="mono" style={{ fontSize: 15, lineHeight: 1.9, wordBreak: 'break-word' }}>
        <span style={{ color: 'var(--ink)' }}>{'|\u03C8\u27E9'}&nbsp;=&nbsp;</span>
        {terms.length === 0 && <span style={{ color: 'var(--ink-soft)' }}>0</span>}
        {terms.map((t, idx) => {
          const hue = phaseToHue(t.phase);
          const coeff = formatAmplitude(t.re, t.im);
          return (
            <span key={t.index}>
              {idx > 0 && <span style={{ color: 'var(--ink-soft)' }}>&nbsp;+&nbsp;</span>}
              <span style={{ color: `hsl(${hue}, 70%, 45%)`, fontWeight: 600 }}>{coeff}</span>
              <span style={{ color: 'var(--ink)' }}>{basisLabel(t.index)}</span>
            </span>
          );
        })}
      </div>
      <p style={{ marginTop: 14, fontSize: 12.5 }}>
        Each coefficient's color is its phase angle — same hue, same phase, everywhere in this app.
      </p>
    </div>
  );
}

