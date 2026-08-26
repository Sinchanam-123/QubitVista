import { GATE_GROUPS, GATE_LIST, GATE_LABEL, GATE_SHORT, GATE_DESCRIPTION, GATE_HUE } from '../utils/quantumEngine';
import GateTooltip from './GateTooltip';

// Vertical gate nav. Expanded, the gates sit in a two-column grid of
// compact chips grouped by family — the full description lives in the
// hover tooltip rather than in every row, which is what let the whole set
// fit in the panel instead of needing its own scrollbar. Collapsed, it
// falls back to a single icon-only stack. Collapses itself the moment the
// first gate is placed, per the reference layout.
//
// `groups` is what the two-qubit page passes to add its CX/CZ/SWAP section.
// It defaults to the 13 single-qubit gates, so the one-qubit page never sees
// a gate its engine would reject.
export default function GatePalette({
  onAddGate, collapsed, onToggleCollapsed, groups = GATE_GROUPS, list = GATE_LIST,
}) {
  return (
    <div
      className="card"
      style={{
        padding: collapsed ? 'clamp(7px, 1vh, 10px)' : 'clamp(11px, 1.6vh, 16px)',
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        transition: 'padding 0.25s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--gap-xs)', flexShrink: 0 }}>
        {!collapsed && (
          <div>
            <h4 style={{ fontSize: 'clamp(12.5px, 1.7vh, 14px)', fontWeight: 700 }}>Circuit gates</h4>
            <p style={{ fontSize: 'var(--fs-sm)', marginTop: 1 }}>Drag or click to add</p>
          </div>
        )}
        <button
          onClick={onToggleCollapsed}
          title={collapsed ? 'Expand gate panel' : 'Collapse gate panel'}
          style={{
            width: 26, height: 26, borderRadius: 7, border: '1px solid var(--border)',
            background: 'var(--surface-alt)', fontSize: 12, color: 'var(--ink-soft)',
            marginLeft: collapsed ? 0 : 'auto', flexShrink: 0,
          }}
        >
          {collapsed ? '»' : '«'}
        </button>
      </div>

      {/* Only scrolls if the window is genuinely shorter than the grid. */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {collapsed ? (
          // Two columns here too — a single 13-icon stack is taller than the
          // panel on any laptop and brings back the scrollbar this layout
          // exists to remove.
          <div style={grid}>
            {list.map((g) => (
              <GateChip key={g} gate={g} collapsed onAddGate={onAddGate} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-sm)' }}>
            {groups.map((group) => (
              <div key={group.title}>
                <span style={groupLabel}>{group.title}</span>
                <div style={grid}>
                  {group.gates.map((g) => (
                    <GateChip key={g} gate={g} onAddGate={onAddGate} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GateChip({ gate, collapsed, onAddGate }) {
  const hue = GATE_HUE[gate];
  const label = GATE_LABEL[gate] || gate;

  return (
    <GateTooltip
      label={label}
      description={GATE_DESCRIPTION[gate]}
      position="right"
      wrapperStyle={{ width: '100%', minWidth: 0 }}
    >
      <button
        draggable
        onDragStart={(e) => e.dataTransfer.setData('text/gate', gate)}
        onClick={() => onAddGate(gate)}
        aria-label={`${label} — ${GATE_DESCRIPTION[gate]}`}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: collapsed ? 0 : 7,
          width: '100%',
          padding: collapsed ? 4 : '5px 7px',
          borderRadius: 11,
          border: '1px solid var(--border)',
          background: 'var(--surface)',
          textAlign: 'left',
          cursor: 'grab',
          justifyContent: collapsed ? 'center' : 'flex-start',
          transition: 'border-color 0.15s ease, transform 0.15s ease',
        }}
      >
        <span
          style={{
            width: collapsed ? 32 : 28,
            height: collapsed ? 32 : 28,
            borderRadius: 9,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `linear-gradient(150deg, hsl(${hue}, 80%, 68%), hsl(${hue + 25}, 75%, 48%))`,
            color: '#fff',
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            fontSize: collapsed ? 12 : 11.5,
            boxShadow: `0 3px 9px hsla(${hue}, 70%, 45%, 0.32)`,
          }}
        >
          {GATE_SHORT[gate]}
        </span>

        {!collapsed && (
          <span
            style={{
              fontSize: 11.5,
              fontWeight: 600,
              fontFamily: 'var(--font-mono)',
              color: 'var(--ink)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </span>
        )}
      </button>
    </GateTooltip>
  );
}

const groupLabel = {
  display: 'block',
  fontSize: 10.5,
  fontFamily: 'var(--font-mono)',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'var(--ink-soft)',
  marginBottom: 6,
};

const grid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 6,
};
