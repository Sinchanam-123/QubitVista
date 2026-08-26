import { X } from 'lucide-react';
import { GATE_LABEL, GATE_DESCRIPTION, isParameterized } from '../utils/quantumEngine';

const PRESETS = [
  { label: '\u03C0/4', value: Math.PI / 4 },
  { label: '\u03C0/2', value: Math.PI / 2 },
  { label: '\u03C0', value: Math.PI },
  { label: '3\u03C0/2', value: (3 * Math.PI) / 2 },
];

export default function GateInspector({ op, onChangeParam, onRemove, onClose }) {
  if (!op) return null;
  const param = isParameterized(op.gate);

  return (
    <div className="card" style={{ padding: 16, marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div>
          <span className="mono" style={{ fontSize: 14, fontWeight: 700 }}>{GATE_LABEL[op.gate] || op.gate}</span>
          <p style={{ fontSize: 12.5, marginTop: 2 }}>{GATE_DESCRIPTION[op.gate]}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={onRemove} title="Remove gate" style={iconBtn}>
            <X size={14} />
          </button>
        </div>
      </div>

      {param && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <label style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>Angle</label>
            <span className="mono" style={{ fontSize: 12.5 }}>{op.param.toFixed(2)} rad</span>
          </div>
          <input
            type="range"
            min={0}
            max={2 * Math.PI}
            step={0.01}
            value={op.param}
            onChange={(e) => onChangeParam(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--phase-180)' }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => onChangeParam(p.value)}
                className="mono"
                style={{
                  fontSize: 12, padding: '5px 12px', borderRadius: 999,
                  border: '1px solid var(--border)', background: 'var(--surface-alt)', color: 'var(--ink)',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const iconBtn = {
  width: 28, height: 28, borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--surface-alt)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-soft)',
};
