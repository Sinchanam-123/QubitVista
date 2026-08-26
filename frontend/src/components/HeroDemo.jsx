import QuantumVisual from './QuantumVisual';
import PairVisual from './PairVisual';
import {
  runCircuit,
  basisLabel,
  formatAmplitude,
  phaseToHue,
  GATE_SHORT,
  GATE_HUE,
} from '../utils/quantumEngine';
import { runCircuit2 } from '../utils/quantumEngine2';

/* The live panel in the hero.
 *
 * Two modes off one component, and deliberately two *different* drawings. One
 * qubit gets the Bloch sphere, because for one qubit the sphere is the whole
 * state. Two qubits get a bond-and-board instead (see PairVisual): repeating
 * the sphere twice would show what each qubit is doing on its own, which for
 * an entangled pair is exactly nothing, and would bury the one fact the second
 * act exists to show.
 *
 * Both modes run on the same engines the simulators use, so nothing here is a
 * mock-up — including the moment both qubits stop having a state of their own.
 */

export default function HeroDemo({ size = 240, tour, onHoverChange }) {
  const { mode, ops, caption, goToMode, step, total } = tour;
  const pair = mode === 'pair';

  return (
    <div
      className="card"
      style={panel}
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
    >
      <div style={tabRow}>
        {[
          ['single', 'one qubit'],
          ['pair', 'two qubits'],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => goToMode(key)}
            className="mono"
            style={{ ...tab, ...(mode === key ? tabActive : null) }}
          >
            {label}
          </button>
        ))}
        <span style={{ flex: 1 }} />
        <span className="mono" style={progress}>{step}/{total}</span>
      </div>

      {pair ? <PairView ops={ops} size={size} /> : <SingleView ops={ops} size={size} />}

      <div style={chipRow}>
        {ops.length === 0 ? (
          <span style={emptyChip}>{pair ? '|00⟩' : '|0⟩'}</span>
        ) : (
          ops.map((op, i) => {
            const hue = GATE_HUE[op.gate];
            const isLast = i === ops.length - 1;
            return (
              <span
                key={i}
                style={{
                  ...chip,
                  background: `linear-gradient(150deg, hsl(${hue}, 80%, 68%), hsl(${hue + 25}, 75%, 48%))`,
                  boxShadow: isLast ? `0 5px 14px hsla(${hue}, 70%, 45%, 0.45)` : 'none',
                  transform: isLast ? 'translateY(-2px)' : 'none',
                }}
                title={pair ? describe(op) : op.gate}
              >
                {GATE_SHORT[op.gate]}
              </span>
            );
          })
        )}
      </div>

      <p style={captionStyle}>{caption}</p>
    </div>
  );
}

/** "CX q0→q1" — with two wires the gate name alone doesn't say what happened. */
function describe(op) {
  if (op.control == null) return `${op.gate} q${op.target ?? 0}`;
  return `${op.gate} q${op.control}${op.gate === 'SWAP' ? '↔' : '→'}q${op.target}`;
}

function SingleView({ ops, size }) {
  const r = runCircuit(ops);

  return (
    <>
      <QuantumVisual size={size} vector={r.blochVector} />

      <div className="mono" style={equation}>
        <span style={{ color: 'var(--ink-soft)' }}>|ψ⟩ = </span>
        {r.amplitudes.map((amp, i) => {
          if (amp.magnitude <= 0.0005) return null;
          const hue = phaseToHue(amp.phase);
          return (
            <span key={i}>
              {i > 0 && <span style={{ color: 'var(--ink-soft)' }}> + </span>}
              <span style={{ color: `hsl(${hue} 70% var(--accent-l))`, fontWeight: 600 }}>
                {formatAmplitude(amp.re, amp.im)}
              </span>
              <span>{basisLabel(i)}</span>
            </span>
          );
        })}
      </div>

      <Bars values={r.probabilities} label={basisLabel} />
    </>
  );
}

function PairView({ ops, size }) {
  const r = runCircuit2(ops);

  return (
    <PairVisual
      bloch={r.bloch}
      probabilities={r.probabilities}
      concurrence={r.concurrence}
      size={size}
    />
  );
}

function Bars({ values, label }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, width: '100%' }}>
      {values.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span className="mono" style={barLabel}>{label(i)}</span>
          <span style={barTrack}>
            <span style={{ ...barFill, width: `${Math.round(p * 100)}%` }} />
          </span>
          <span className="mono" style={{ ...barLabel, width: 34, textAlign: 'right' }}>
            {Math.round(p * 100)}%
          </span>
        </div>
      ))}
    </div>
  );
}

const panel = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 'var(--gap-xs)',
  width: '100%',
  padding: 'clamp(11px, 1.6vh, 18px)',
};

const tabRow = { display: 'flex', alignItems: 'center', gap: 5, width: '100%', marginBottom: 2 };

const tab = {
  padding: '3px 10px',
  borderRadius: 999,
  fontSize: 10.5,
  letterSpacing: '0.04em',
  border: '1px solid var(--border)',
  background: 'transparent',
  color: 'var(--ink-soft)',
  cursor: 'pointer',
  transition: 'color .2s ease, border-color .2s ease',
};

const tabActive = {
  border: '1px solid var(--phase-90)',
  color: 'var(--phase-90)',
  background: 'color-mix(in srgb, var(--phase-90) 12%, transparent)',
};

const progress = { fontSize: 10.5, color: 'var(--ink-soft)' };

const chipRow = {
  display: 'flex',
  gap: 5,
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: 30,
  flexWrap: 'wrap',
  marginTop: 2,
};

const chip = {
  width: 26,
  height: 26,
  borderRadius: 8,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'var(--font-mono)',
  fontWeight: 700,
  fontSize: 11,
  color: '#fff',
  transition: 'all 0.3s ease',
};

const emptyChip = { fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--ink-soft)' };

const captionStyle = {
  fontSize: 'clamp(11.5px, 1.5vh, 13px)',
  textAlign: 'center',
  minHeight: '2.5em',
  lineHeight: 1.35,
  margin: 0,
};

const equation = {
  fontSize: 'clamp(11.5px, 1.5vh, 13.5px)',
  textAlign: 'center',
  color: 'var(--ink)',
};

const barLabel = { fontSize: 11.5, color: 'var(--ink-soft)', width: 30, flexShrink: 0 };
const barTrack = { flex: 1, height: 6, borderRadius: 999, background: 'var(--surface-alt)', overflow: 'hidden' };
const barFill = {
  display: 'block',
  height: '100%',
  borderRadius: 999,
  background: 'var(--accent-grad)',
  transition: 'width 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
};
