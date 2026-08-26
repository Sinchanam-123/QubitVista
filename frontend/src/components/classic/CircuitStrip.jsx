import { useRef, useState } from 'react';
import { fmtAngle } from './Controls';
import { GATE_SHORT, isParameterized } from '../../utils/quantumEngine';

/* The original circuit strip: one wire, gates as chips along it.
 *
 * Gates drop anywhere — start, middle or end — with a caret showing where they
 * will land, and existing chips reorder by dragging. Hit-testing walks the chips
 * in reading order using both axes, because the strip wraps and comparing x
 * alone sends every drop on a second row to index 0.
 */

export default function CircuitStrip({ ops, step, selected, onSelect, onRemove, onInsert, onMove }) {
  const stripRef = useRef(null);
  const dragRef = useRef(null);
  const [caret, setCaret] = useState(null);   // insertion index while dragging

  const dropIndexAt = (clientX, clientY) => {
    const chips = [...stripRef.current.querySelectorAll('[data-chip]')];
    for (let i = 0; i < chips.length; i++) {
      const r = chips[i].getBoundingClientRect();
      if (clientY < r.top) return i;
      if (clientY <= r.bottom && clientX < r.left + r.width / 2) return i;
    }
    return chips.length;
  };

  // The palette stamps 'text/gate'. Its value is unreadable during dragover
  // (browsers only expose it on drop), so dragover just checks the type is
  // present and drop reads the gate name.
  const isNewGate = (e) => [...(e.dataTransfer?.types || [])].includes('text/gate');

  const onDragOver = (e) => {
    if (!dragRef.current && !isNewGate(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = dragRef.current ? 'move' : 'copy';
    setCaret(dropIndexAt(e.clientX, e.clientY));
  };

  const onDrop = (e) => {
    const moving = dragRef.current;
    if (!moving && !isNewGate(e)) return;
    e.preventDefault();
    const index = dropIndexAt(e.clientX, e.clientY);
    dragRef.current = null;
    setCaret(null);
    if (moving) onMove(moving.index, index);
    else {
      const gate = e.dataTransfer.getData('text/gate');
      if (gate) onInsert(gate, index);
    }
  };

  return (
    <div
      ref={stripRef}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragLeave={(e) => { if (!stripRef.current.contains(e.relatedTarget)) setCaret(null); }}
      style={{ ...S.strip, ...(caret !== null ? S.stripActive : null) }}
    >
      <span className="mono" style={S.qLabel}>q0 |0⟩</span>

      {ops.length === 0 && (
        <>
          <div style={S.wireLong} />
          <span style={S.empty}>empty circuit — drag a gate here, or click one</span>
          <div style={S.wireLong} />
        </>
      )}

      {ops.map((op, i) => (
        <div key={i} style={{ display: 'contents' }}>
          <div style={S.wire} />
          <div style={{ position: 'relative', display: 'flex' }}>
            {caret === i && <span style={S.caret} />}
            <button
              data-chip
              draggable
              onDragStart={(e) => {
                dragRef.current = { kind: 'move', index: i };
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', op.gate);
              }}
              onDragEnd={() => { dragRef.current = null; setCaret(null); }}
              onClick={() => onSelect(i === selected ? null : i)}
              title={isParameterized(op.gate) ? 'Click to edit this angle' : `Step ${i + 1}`}
              style={{
                ...S.chip,
                ...(selected === i ? S.chipActive : null),
                ...(step === i + 1 ? S.chipCurrent : null),
              }}
            >
              <span className="mono" style={{ fontWeight: 600 }}>{GATE_SHORT[op.gate] || op.gate}</span>
              {isParameterized(op.gate) && (
                <small style={S.chipAngle}>{fmtAngle(op.param)}</small>
              )}
              <span
                role="button"
                title="Remove"
                onClick={(e) => { e.stopPropagation(); onRemove(i); }}
                style={S.remove}
              >
                ×
              </span>
            </button>
          </div>
        </div>
      ))}

      <div style={{ ...S.wireLong, position: 'relative' }}>
        {caret === ops.length && ops.length > 0 && <span style={{ ...S.caret, left: 6 }} />}
      </div>
    </div>
  );
}

const S = {
  strip: {
    display: 'flex', alignItems: 'center', flexWrap: 'wrap',
    minHeight: 60, padding: '10px 14px',
    background: 'var(--surface-alt)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
  },
  stripActive: { borderColor: 'var(--phase-0)' },
  qLabel: { color: 'var(--ink-soft)', fontSize: 12, marginRight: 4 },
  wire: { flex: '0 0 18px', height: 2, background: 'var(--border)' },
  wireLong: { flex: '1 0 24px', minWidth: 24, height: 2, background: 'var(--border)' },
  empty: { color: 'var(--ink-soft)', fontSize: 12, fontStyle: 'italic', padding: '0 10px' },

  chip: {
    position: 'relative', padding: '9px 11px', borderRadius: 'var(--radius-sm)',
    background: 'var(--surface)', border: '1px solid var(--border)',
    cursor: 'grab', whiteSpace: 'nowrap', fontSize: 13, color: 'var(--ink)',
  },
  chipActive: { borderColor: 'var(--phase-0)', boxShadow: '0 0 0 2px color-mix(in srgb, var(--phase-0) 22%, transparent)' },
  chipCurrent: { outline: '2px solid var(--phase-270)', outlineOffset: 2 },
  chipAngle: { display: 'block', fontSize: 10, fontWeight: 400, color: 'var(--ink-soft)', marginTop: 2 },
  remove: {
    position: 'absolute', top: -7, right: -7, width: 17, height: 17,
    borderRadius: '50%', background: 'var(--phase-0)', color: 'var(--bg)',
    fontSize: 12, lineHeight: '16px', textAlign: 'center', cursor: 'pointer',
  },
  caret: {
    position: 'absolute', left: -11, top: -5, bottom: -5, width: 3,
    borderRadius: 2, background: 'var(--phase-0)',
  },
};
