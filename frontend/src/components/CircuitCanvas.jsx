import { GATE_LABEL, GATE_SHORT, GATE_HUE, GATE_DESCRIPTION, isParameterized } from '../utils/quantumEngine';
import GateTooltip from './GateTooltip';

// Single-qubit circuit: one wire, a row of placed gates with step numbers
// underneath (matches the reference circuit-diagram layout), plus a couple
// of dashed placeholder slots to invite the next drop.
//
// The row is a fixed-height track with everything centred on it, and each
// step number is taken out of flow beneath its gate. Laying it out that way
// keeps the gate itself centred on the wire and keeps the tallest thing in
// the row shorter than the track, so nothing gets clipped by the horizontal
// scroll container.
// Tall enough to clear the gate (44), its step number below, and the gate's
// drop shadow, with margin to spare — the track clips, so anything that
// doesn't fit disappears.
const TRACK_HEIGHT = 96;
const GATE_SIZE = 44;

export default function CircuitCanvas({ ops, selectedIndex, onSelectOp, onDropGate }) {
  const handleDrop = (e) => {
    e.preventDefault();
    const gate = e.dataTransfer.getData('text/gate');
    if (gate) onDropGate(gate);
  };

  const placeholderCount = 2;

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      // overflowY is pinned to hidden because `overflowX: auto` alone makes
      // the y axis compute to auto too, which showed a stray vertical
      // scrollbar over the couple of pixels the gate shadows extend.
      style={{ overflowX: 'auto', overflowY: 'hidden' }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          height: TRACK_HEIGHT,
          minWidth: Math.max(360, (ops.length + placeholderCount) * 66 + 100),
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
          <span className="mono" style={{ fontSize: 13, color: 'var(--ink-soft)' }}>q0</span>
          <span className="mono" style={{ fontSize: 11, color: 'var(--ink-soft)' }}>{'|0⟩'}</span>
        </div>

        <div style={wire}>
          {ops.map((op, i) => {
            const hue = GATE_HUE[op.gate];
            const selected = selectedIndex === i;
            return (
              <div key={i} style={{ position: 'relative', flexShrink: 0, display: 'flex' }}>
                <GateTooltip label={GATE_LABEL[op.gate] || op.gate} description={GATE_DESCRIPTION[op.gate]} position="top">
                  <button
                    onClick={() => onSelectOp(i)}
                    style={{
                      width: GATE_SIZE, height: GATE_SIZE, borderRadius: 11, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: `linear-gradient(150deg, hsl(${hue}, 80%, 68%), hsl(${hue + 25}, 75%, 48%))`,
                      color: '#fff',
                      fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13,
                      border: selected ? '2px solid var(--ink)' : '2px solid transparent',
                      boxShadow: `0 4px 12px hsla(${hue}, 70%, 45%, 0.35)`,
                    }}
                  >
                    {GATE_SHORT[op.gate]}{isParameterized(op.gate) ? '•' : ''}
                  </button>
                </GateTooltip>
                <span className="mono" style={stepNumber}>{i + 1}</span>
              </div>
            );
          })}

          {Array.from({ length: placeholderCount }).map((_, i) => (
            <div
              key={`ph-${i}`}
              style={{
                width: GATE_SIZE, height: GATE_SIZE, borderRadius: 11, flexShrink: 0,
                border: '1.5px dashed var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--border)', fontSize: 18,
              }}
            >
              +
            </div>
          ))}

          <div style={{ flex: 1, minWidth: 20, height: 2, background: 'var(--border)' }} />
          <span style={{
            width: 34, height: 34, borderRadius: '50%', border: '1.5px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--ink-soft)', fontSize: 14,
          }}>
            {'↗'}
          </span>
        </div>
      </div>

      {ops.length === 0 && (
        <p style={{ marginTop: 6, fontSize: 13 }}>
          Drag a gate onto the wire above, or click one in the panel to add it to q0.
        </p>
      )}
    </div>
  );
}

// The wire itself is drawn as a background line so gates can sit on top of
// it without the line dictating the row's height.
const wire = {
  position: 'relative',
  flex: 1,
  alignSelf: 'center',
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  backgroundImage: 'linear-gradient(var(--border), var(--border))',
  backgroundSize: '100% 2px',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
};

const stepNumber = {
  position: 'absolute',
  top: '100%',
  left: 0,
  right: 0,
  marginTop: 5,
  textAlign: 'center',
  fontSize: 11,
  color: 'var(--ink-soft)',
  pointerEvents: 'none',
};
