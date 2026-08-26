import { useEffect, useRef } from 'react';

/* Transport and angle controls from the original design.
 *
 * TransportBar is the step scrubber — first / previous / play / next / last plus
 * a slider. Stepping through a circuit one gate at a time is the point of the
 * tool, so this is not decoration: steps[k] is the state after the first k
 * gates, which is why scrubbing needs no new request.
 *
 * AngleBox is the docked angle control: a slider with the common angles as
 * presets, sitting under the circuit next to the transport buttons.
 */

export function TransportBar({ step, total, playing, onStep, onPlayToggle }) {
  return (
    <div style={S.row}>
      <IconBtn title="First step" onClick={() => onStep(0)} disabled={step === 0}>⏮</IconBtn>
      <IconBtn title="Previous gate" onClick={() => onStep(step - 1)} disabled={step === 0}>◀</IconBtn>
      <IconBtn title={playing ? 'Pause' : 'Play'} onClick={onPlayToggle} disabled={total === 0} accent>
        {playing ? '⏸' : '▶'}
      </IconBtn>
      <IconBtn title="Next gate" onClick={() => onStep(step + 1)} disabled={step >= total}>▶</IconBtn>
      <IconBtn title="Last step" onClick={() => onStep(total)} disabled={step >= total}>⏭</IconBtn>

      <input
        type="range"
        min={0}
        max={Math.max(0, total)}
        step={1}
        value={step}
        onChange={(e) => onStep(Number(e.target.value))}
        style={{ flex: 1, minWidth: 110, accentColor: 'var(--phase-0)' }}
      />
      <span className="mono" style={S.stepLabel}>step {step} / {total}</span>
    </div>
  );
}

const PRESETS = [
  { label: 'π/4', value: Math.PI / 4 },
  { label: 'π/2', value: Math.PI / 2 },
  { label: 'π', value: Math.PI },
  { label: 'π/3', value: Math.PI / 3 },
  { label: '−π/2', value: -Math.PI / 2 },
];

export function AngleBox({ angle, onChange, editing }) {
  // Dragging fires a flood of changes; the parent debounces the simulate call,
  // so this only has to stay responsive.
  const raf = useRef(0);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  return (
    <div style={S.angleBox}>
      <label style={S.angleLabel}>
        Angle <span className="mono" style={{ color: 'var(--phase-0)' }}>{fmtAngle(angle)}</span>
      </label>

      <input
        type="range"
        min={-Math.PI}
        max={Math.PI}
        step={Math.PI / 240}
        value={angle}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ flex: '1 1 150px', minWidth: 120, accentColor: 'var(--phase-0)' }}
      />

      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {PRESETS.map((p) => (
          <button key={p.label} onClick={() => onChange(p.value)} style={S.preset}>{p.label}</button>
        ))}
      </div>

      <span style={S.angleHint}>
        {editing ? `Editing gate ${editing}` : 'Sets the angle for the next rotation gate'}
      </span>
    </div>
  );
}

function IconBtn({ children, title, onClick, disabled, accent }) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...S.iconBtn,
        color: disabled ? 'var(--border)' : accent ? 'var(--phase-0)' : 'var(--ink)',
        borderColor: accent && !disabled ? 'var(--phase-0)' : 'var(--border)',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
  );
}

export function fmtAngle(a) {
  if (Math.abs(a) < 1e-9) return '0';
  const table = [[1, 1, 'π'], [1, 2, 'π/2'], [1, 3, 'π/3'], [1, 4, 'π/4'],
    [1, 6, 'π/6'], [1, 8, 'π/8'], [2, 3, '2π/3'], [3, 4, '3π/4']];
  for (const [n, d, label] of table) {
    if (Math.abs(Math.abs(a) - (n / d) * Math.PI) < 5e-3) return (a < 0 ? '−' : '') + label;
  }
  return a.toFixed(3);
}

const S = {
  row: { display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  iconBtn: {
    minWidth: 34, padding: '6px 10px', fontSize: 12,
    borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
    background: 'var(--surface-alt)',
  },
  stepLabel: { fontSize: 12, color: 'var(--ink-soft)', whiteSpace: 'nowrap', minWidth: 82, textAlign: 'right' },

  angleBox: {
    display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10,
    marginTop: 8, padding: '8px 11px',
    background: 'var(--surface-alt)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
  },
  angleLabel: { display: 'flex', gap: 6, fontSize: 12, color: 'var(--ink-soft)', whiteSpace: 'nowrap' },
  preset: {
    padding: '4px 9px', fontSize: 11, cursor: 'pointer',
    background: 'transparent', color: 'var(--ink-soft)',
    border: '1px solid var(--border)', borderRadius: 6,
  },
  angleHint: { fontSize: 11, color: 'var(--ink-soft)' },
};
