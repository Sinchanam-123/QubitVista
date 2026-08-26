import { useEffect, useRef, useState } from 'react';
import { fmtAngle } from './Controls';
import { GATE_SHORT, isParameterized } from '../../utils/quantumEngine';
import { isTwoQubit } from '../../utils/quantumEngine2';

/* Two wires, gates in columns.
 *
 * A two-qubit gate is drawn the way a circuit diagram draws it — a filled dot
 * on the control wire, the gate's own glyph on the target, and a vertical link
 * between them — because that picture, not a 4x4 matrix, is what says which
 * wire is doing what. Swap the wires and the matrix changes; the diagram just
 * flips, which is why the diagram is the honest view.
 *
 * Drop a gate on a wire to place it there. A two-qubit gate takes the wire it
 * was dropped on as its target and the other wire as its control; click the
 * column afterwards to flip that.
 */

const WIRES = [0, 1];

export default function CircuitStrip2({
  ops, step, selected, wire, onWire, onSelect, onRemove, onInsert, onMove, onFlip,
}) {
  const stripRef = useRef(null);
  const trackRef = useRef(null);
  const dragRef = useRef(null);
  const [caret, setCaret] = useState(null);      // insertion index while dragging

  /* Keep the scrubber's gate on screen.
   *
   * A long circuit scrolls, and pressing play used to leave the strip parked
   * wherever it happened to be — so the transport marched through steps 1, 2,
   * 3 while the visible gates never moved and nothing appeared to happen.
   * Step 0 rewinds all the way left, since that is the start of the circuit. */
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;

    let target = null;
    if (step === 0) {
      target = 0;
    } else {
      const col = track.querySelector(`[data-col="${step - 1}"]`);
      if (!col) return undefined;
      const c = col.getBoundingClientRect();
      const t = track.getBoundingClientRect();
      const margin = 48;               // keep a gate's neighbours in view too
      if (c.left < t.left + margin || c.right > t.right - margin) {
        target = track.scrollLeft + (c.left - t.left) - (t.width - c.width) / 2;
      }
    }
    if (target === null) return undefined;

    const limit = track.scrollWidth - track.clientWidth;
    const want = Math.max(0, Math.min(target, limit));

    // Smooth where it works, but never *only* smooth: the behaviour is a hint
    // browsers are free to drop — reduced-motion settings turn it off, and it
    // is a silent no-op in some embedded views. Landing on the right gate
    // matters more than the glide, so a timer force-assigns if it didn't take.
    track.scrollTo({ left: want, behavior: 'smooth' });
    const settle = setTimeout(() => {
      if (Math.abs(track.scrollLeft - want) > 1) track.scrollLeft = want;
    }, 420);
    return () => clearTimeout(settle);
  }, [step]);

  /** Which column a pointer is over, and which wire. Columns are laid out in
   *  reading order on one row, so x alone is enough here — unlike the
   *  single-qubit strip, this one never wraps. */
  const dropAt = (clientX, clientY) => {
    const cols = [...stripRef.current.querySelectorAll('[data-col]')];
    let index = cols.length;
    for (let i = 0; i < cols.length; i++) {
      const r = cols[i].getBoundingClientRect();
      if (clientX < r.left + r.width / 2) { index = i; break; }
    }
    const lane = stripRef.current.querySelector('[data-lane="1"]');
    const wire = lane && clientY >= lane.getBoundingClientRect().top ? 1 : 0;
    return { index, wire };
  };

  const isNewGate = (e) => [...(e.dataTransfer?.types || [])].includes('text/gate');

  const onDragOver = (e) => {
    if (!dragRef.current && !isNewGate(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = dragRef.current ? 'move' : 'copy';
    setCaret(dropAt(e.clientX, e.clientY).index);
  };

  const onDrop = (e) => {
    const moving = dragRef.current;
    if (!moving && !isNewGate(e)) return;
    e.preventDefault();
    const { index, wire } = dropAt(e.clientX, e.clientY);
    dragRef.current = null;
    setCaret(null);
    if (moving) onMove(moving.index, index);
    else {
      const gate = e.dataTransfer.getData('text/gate');
      if (gate) onInsert(gate, index, wire);
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
      {/* The wire labels ARE the wire selector. A separate "place on q0 / q1"
          control said the same thing twice and took a row to do it; clicking
          the wire you want is where the hand already is. */}
      <div style={S.labels}>
        {WIRES.map((q) => {
          const armed = wire === q;
          return (
            <button
              key={q}
              onClick={() => onWire?.(q)}
              className="mono"
              title={`Place the next gate on q${q}${armed ? ' (armed)' : ''}`}
              style={{ ...S.qLabel, ...(armed ? S.qLabelArmed : null) }}
            >
              <span style={{ ...S.qDot, opacity: armed ? 1 : 0 }} />
              q{q} |0⟩
            </button>
          );
        })}
      </div>

      <div ref={trackRef} style={S.track}>
        {/* Everything sits inside a max-content box so the wires span the whole
            scrollable circuit rather than stopping at the visible edge — the
            lanes below are positioned against THIS, not against the viewport
            of the scroll container. */}
        <div style={S.inner}>
          {/* the two wires, drawn once behind everything */}
          {WIRES.map((q) => (
            <div key={q} data-lane={q} style={{ ...S.lane, top: q === 0 ? LANE_TOP_0 : LANE_TOP_1 }}>
              <div style={S.wire} />
            </div>
          ))}

          <div style={S.cols}>
            {ops.length === 0 && (
              <span style={S.empty}>empty circuit — drop a gate on either wire</span>
            )}

            {ops.map((op, i) => (
              <Column
                key={i}
                op={op}
                index={i}
                caret={caret === i}
                selected={selected === i}
                current={step === i + 1}
                onSelect={onSelect}
                onRemove={onRemove}
                onFlip={onFlip}
                dragRef={dragRef}
                setCaret={setCaret}
              />
            ))}

            <div style={S.tail}>{caret === ops.length && ops.length > 0 && <span style={S.caret} />}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Column({ op, index, caret, selected, current, onSelect, onRemove, onFlip, dragRef, setCaret }) {
  const two = isTwoQubit(op.gate);
  const target = op.target ?? 0;
  const control = two ? (op.control ?? 1 - target) : null;

  return (
    <div
      data-col={index}
      draggable
      onDragStart={(e) => {
        dragRef.current = { kind: 'move', index };
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', op.gate);
      }}
      onDragEnd={() => { dragRef.current = null; setCaret(null); }}
      onClick={() => onSelect(selected ? null : index)}
      title={two ? 'Click to select · use ⇄ to swap control and target' : `Step ${index + 1}`}
      style={{ ...S.col, ...(current ? S.colCurrent : null) }}
    >
      {caret && <span style={S.caret} />}

      {/* the vertical link joining the two wires — with only two of them there
          is exactly one span it can have, from wire centre to wire centre */}
      {two && <span style={S.link} />}

      {WIRES.map((q) => (
        <div key={q} style={S.cell}>
          {q === target && (
            <Glyph
              op={op}
              selected={selected}
              // A two-qubit gate spans both wires, so its remove control belongs
              // to the column, not to one end of it.
              onRemove={two ? null : (e) => { e.stopPropagation(); onRemove(index); }}
            />
          )}
          {two && q === control && (
            <Mark kind={MARKS[String(op.gate).toUpperCase()].control} title={`control · q${q}`} />
          )}
        </div>
      ))}

      {two && (
        <span
          role="button"
          title="Remove"
          onClick={(e) => { e.stopPropagation(); onRemove(index); }}
          style={{ ...S.remove, top: -4, right: -2 }}
        >
          ×
        </span>
      )}

      {two && selected && (
        <button
          title="Swap control and target"
          onClick={(e) => { e.stopPropagation(); onFlip(index); }}
          style={S.flip}
        >
          ⇄
        </button>
      )}
    </div>
  );
}

// How each two-qubit gate is drawn, per circuit-diagram convention: CX is a
// filled control dot and a bare ⊕ on the target, CZ is a dot at both ends
// (it is symmetric — which wire you call the control genuinely does not
// matter), SWAP is a × at both. A boxed chip would imply the gate acts on one
// wire, which is the one thing these gates do not do.
const MARKS = {
  CX: { control: 'dot', target: 'oplus' },
  CZ: { control: 'dot', target: 'dot' },
  SWAP: { control: 'cross', target: 'cross' },
};

function Mark({ kind, title, selected }) {
  const style = kind === 'dot' ? S.dot : S.bare;
  return (
    <span style={{ ...style, ...(selected ? S.markActive : null) }} title={title}>
      {kind === 'oplus' ? '⊕' : kind === 'cross' ? '✕' : ''}
    </span>
  );
}

function Glyph({ op, selected, onRemove }) {
  const name = String(op.gate).toUpperCase();

  if (MARKS[name]) {
    return <Mark kind={MARKS[name].target} title={`${name} · target`} selected={selected} />;
  }

  return (
    <span style={{ ...S.chip, ...(selected ? S.chipActive : null) }}>
      <span className="mono" style={{ fontWeight: 600, fontSize: 13 }}>
        {GATE_SHORT[op.gate] || op.gate}
      </span>
      {isParameterized(op.gate) && <small style={S.chipAngle}>{fmtAngle(op.param)}</small>}
      <span role="button" title="Remove" onClick={onRemove} style={S.remove}>×</span>
    </span>
  );
}

// Tall enough for a rotation chip to carry its angle on a second line without
// the two lines colliding — at 26 the gate name and the angle were clipped.
const LANE_H = 34;
const GAP = 28;

// Breathing room INSIDE the scroll container. `overflow-x: auto` forces the
// other axis to `auto` too, so anything hanging outside the box — the remove
// badge above a chip, the ⇄ button below a two-qubit column — gets clipped
// unless the padding makes room for it.
const PAD_TOP = 12;
const PAD_BOTTOM = 16;

const LANE_TOP_0 = PAD_TOP;
const LANE_TOP_1 = PAD_TOP + LANE_H + GAP;

const S = {
  strip: {
    display: 'flex', gap: 10, padding: '6px 14px 10px',
    background: 'var(--surface-alt)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
  },
  // Full shorthand, matching S.strip — React warns if the two forms are mixed.
  stripActive: { border: '1px solid var(--phase-0)' },

  labels: {
    display: 'flex', flexDirection: 'column', gap: GAP,
    paddingTop: PAD_TOP, flexShrink: 0,
  },
  qLabel: {
    display: 'flex', alignItems: 'center', gap: 5,
    height: LANE_H, padding: '0 8px 0 6px', cursor: 'pointer', whiteSpace: 'nowrap',
    fontSize: 12, color: 'var(--ink-soft)',
    background: 'transparent', border: '1px solid transparent',
    borderRadius: 'var(--radius-sm)',
  },
  qLabelArmed: {
    color: 'var(--phase-0)', fontWeight: 600,
    border: '1px solid color-mix(in srgb, var(--phase-0) 45%, transparent)',
    background: 'color-mix(in srgb, var(--phase-0) 10%, transparent)',
  },
  qDot: {
    width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
    background: 'var(--phase-0)', transition: 'opacity .2s ease',
  },

  track: { position: 'relative', flex: 1, minWidth: 0, overflowX: 'auto' },
  // max-content is what makes the wires run the length of the whole circuit
  // instead of stopping at the right edge of the visible area.
  inner: {
    position: 'relative',
    width: 'max-content',
    minWidth: '100%',
    paddingTop: PAD_TOP,
    paddingBottom: PAD_BOTTOM,
  },
  lane: { position: 'absolute', left: 0, right: 0, display: 'flex', alignItems: 'center', height: LANE_H },
  wire: { flex: 1, height: 2, background: 'var(--border)' },

  cols: {
    position: 'relative', display: 'flex', alignItems: 'stretch',
    minHeight: LANE_H * 2 + GAP, gap: 4,
  },
  empty: {
    position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
    color: 'var(--ink-soft)', fontSize: 12, fontStyle: 'italic',
  },

  // No vertical padding of its own — `inner` owns that, so the lanes and the
  // cells stay on the same grid however the padding is tuned.
  col: {
    position: 'relative', display: 'flex', flexDirection: 'column', gap: GAP,
    paddingLeft: 6, paddingRight: 6,
    cursor: 'grab', flexShrink: 0,
  },
  colCurrent: {
    background: 'color-mix(in srgb, var(--phase-270) 12%, transparent)',
    borderRadius: 'var(--radius-sm)',
  },
  cell: { height: LANE_H, display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 42 },

  // Wire centre to wire centre, measured from the top of the column.
  link: {
    position: 'absolute', left: '50%', width: 2, marginLeft: -1, zIndex: 0,
    top: LANE_H / 2, height: LANE_H + GAP,
    background: 'var(--phase-0)',
  },

  chip: {
    position: 'relative', zIndex: 1, display: 'inline-flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 1,
    minWidth: 34, height: LANE_H, padding: '0 8px', borderRadius: 'var(--radius-sm)',
    background: 'var(--surface)', border: '1px solid var(--border)',
    whiteSpace: 'nowrap', fontSize: 13, color: 'var(--ink)',
  },
  chipActive: { boxShadow: '0 0 0 2px color-mix(in srgb, var(--phase-0) 30%, transparent)' },
  chipAngle: { fontSize: 9, fontWeight: 400, color: 'var(--ink-soft)', lineHeight: 1 },

  // ⊕ and × sit straight on the wire with no box around them.
  bare: {
    position: 'relative', zIndex: 1, display: 'inline-flex',
    alignItems: 'center', justifyContent: 'center',
    width: 22, height: 22, fontSize: 21, lineHeight: 1,
    color: 'var(--phase-0)', background: 'var(--surface-alt)',
  },
  dot: {
    position: 'relative', zIndex: 1,
    width: 13, height: 13, borderRadius: '50%',
    background: 'var(--phase-0)', display: 'inline-flex',
    alignItems: 'center', justifyContent: 'center', fontSize: 15, lineHeight: 1,
  },
  markActive: {
    outline: '2px solid color-mix(in srgb, var(--phase-0) 55%, transparent)',
    outlineOffset: 3, borderRadius: 4,
  },

  tail: { position: 'relative', flex: '1 0 24px', minWidth: 24 },

  remove: {
    position: 'absolute', top: -7, right: -7, width: 16, height: 16,
    borderRadius: '50%', background: 'var(--phase-0)', color: 'var(--bg)',
    fontSize: 11, lineHeight: '15px', textAlign: 'center', cursor: 'pointer', zIndex: 2,
  },
  flip: {
    position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)',
    width: 20, height: 18, borderRadius: 5, fontSize: 11, cursor: 'pointer',
    border: '1px solid var(--phase-0)', background: 'var(--surface)', color: 'var(--phase-0)',
  },
  caret: {
    position: 'absolute', left: -3, top: 0, bottom: 0, width: 3,
    borderRadius: 2, background: 'var(--phase-0)', zIndex: 3,
  },
};
