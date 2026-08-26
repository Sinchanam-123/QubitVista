import { useState } from 'react';

/* Teaching text from the backend.
 *
 * Two tabs rather than two stacked sections. The old layout put "this gate"
 * above "this circuit" and showed both at once, which meant the concept — the
 * thing the circuit is actually *for* — was always below the fold on a long
 * gate card. Concepts is the default because that is the question the tool
 * exists to answer; Gates is there when you want the reference for the one
 * chip you just placed.
 *
 * Both come from explain.py / explain2.py, generated against the actual
 * simulated result, so a number quoted here can never drift from the number in
 * the panels beside it.
 */

const NOTE_TONE = {
  key: 'var(--phase-270)',
  warn: 'var(--phase-0)',
  world: 'var(--phase-90)',
  history: 'var(--ink-soft)',
};

export default function ExplainPanel({
  gateCard, explain, conceptExtra, step, totalSteps, gateCards, onPickStep,
}) {
  const [tab, setTab] = useState('concept');

  return (
    <div>
      <div style={S.tabs}>
        <Tab on={tab === 'concept'} onClick={() => setTab('concept')} icon={conceptExtra?.icon || '◍'}>
          Concepts
        </Tab>
        <Tab on={tab === 'gate'} onClick={() => setTab('gate')} icon="⚙">
          Gates
          {gateCards?.length ? <span style={S.tabCount}>{gateCards.length}</span> : null}
        </Tab>
      </div>

      {tab === 'concept' ? (
        explain
          ? <CircuitExplain e={explain} extra={conceptExtra} />
          : <p style={S.placeholder}>Build a circuit to see what it demonstrates.</p>
      ) : (
        <GatesTab
          gateCard={gateCard}
          gateCards={gateCards}
          step={step}
          totalSteps={totalSteps}
          onPickStep={onPickStep}
        />
      )}
    </div>
  );
}

function Tab({ on, onClick, icon, children }) {
  return (
    <button onClick={onClick} style={S.tab(on)}>
      <span style={{ fontSize: 13 }}>{icon}</span>
      {children}
    </button>
  );
}

// ---------------------------------------------------------------- gates tab

function GatesTab({ gateCard, gateCards, step, totalSteps, onPickStep }) {
  const cards = gateCards || [];

  if (!cards.length) {
    return <p style={S.placeholder}>Drag a gate onto the circuit — or click one — and its reference card appears here.</p>;
  }

  return (
    <div>
      {/* The circuit's gates as a strip, so this tab is useful at step 0 too —
          otherwise it would sit empty until you scrubbed onto a gate. */}
      <div style={S.chipRow}>
        {cards.map((c) => {
          const on = c.step === step;
          return (
            <button
              key={c.index}
              onClick={() => onPickStep?.(c.step)}
              title={`Step ${c.step} — ${c.label}`}
              className="mono"
              style={S.chip(on)}
            >
              {c.gate}
              {c.control != null && <sub style={S.chipWires}>{c.control}→{c.target}</sub>}
            </button>
          );
        })}
      </div>

      {gateCard
        ? <GateCard info={gateCard} step={step} totalSteps={totalSteps} />
        : (
          <p style={S.placeholder}>
            Step 0 is the initial state, before any gate runs. Pick a gate above, or step
            forward, to read what it does.
          </p>
        )}
    </div>
  );
}

function GateCard({ info, step, totalSteps }) {
  return (
    <div>
      <div style={S.gcHead}>
        <div className="mono" style={S.gcSym}>
          {info.angle != null ? `${info.gate}(${round(info.angle)})` : info.gate}
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13.5 }}>{info.label}</div>
          <span style={S.badge}>{info.concept_label}</span>
        </div>
      </div>

      <p style={{ ...S.p, color: 'var(--phase-0)' }}>{info.summary}</p>
      <p style={S.p}>{info.detail}</p>

      <div style={S.matrixWrap}>
        <div style={{ ...S.brk, borderRight: 'none', borderRadius: '3px 0 0 3px' }} />
        <table><tbody>
          {info.matrix.map((row, i) => (
            <tr key={i}>{row.map((c, j) => (
              <td key={j} className="mono" style={S.mcell}>{c}</td>
            ))}</tr>
          ))}
        </tbody></table>
        <div style={{ ...S.brk, borderLeft: 'none', borderRadius: '0 3px 3px 0' }} />
      </div>

      <dl style={S.kv}>
        <dt style={S.dt}>Rotation</dt><dd className="mono" style={S.dd}>{info.rotation}</dd>
        <dt style={S.dt}>Inverse</dt><dd className="mono" style={S.dd}>{info.inverse}</dd>
        {info.control != null && (
          <>
            <dt style={S.dt}>Wires</dt>
            <dd className="mono" style={S.dd}>control q{info.control} → target q{info.target}</dd>
          </>
        )}
        <dt style={S.dt}>Step</dt><dd className="mono" style={S.dd}>{step} of {totalSteps}</dd>
      </dl>

      <ul style={S.list}>
        {info.facts.map((f, i) => <li key={i} style={S.li}>{f}</li>)}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------- concept tab

function CircuitExplain({ e, extra }) {
  return (
    <div>
      <div style={S.banner}>
        <span style={{ fontSize: 24, lineHeight: 1 }}>{extra?.icon || '◍'}</span>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{e.concept_label}</div>
          <p style={{ ...S.p, fontSize: 11.5, margin: '2px 0 0' }}>{e.concept_intro}</p>
        </div>
      </div>

      <p style={S.lead}>{e.summary}</p>
      <p style={S.p}>{e.what_happens}</p>

      <Note tone={NOTE_TONE.warn} icon="👁" title="Watch the panels" items={e.watch} />
      {extra?.analogy && (
        <Note tone={NOTE_TONE.key} icon="💡" title="Think of it like" body={extra.analogy} />
      )}
      {extra?.real_world && (
        <Note tone={NOTE_TONE.world} icon="🌍" title="In the real world" items={extra.real_world} />
      )}
      <Note tone="var(--phase-270)" icon="⚛" title="In quantum computing" items={e.uses} />
      <Note tone="var(--ink-soft)" icon="↗" title="Try next" items={e.try_next} />
    </div>
  );
}

function Note({ tone, icon, title, items, body }) {
  return (
    <div style={{ ...S.note, borderLeftColor: tone }}>
      <h5 style={{ ...S.noteHead, color: tone }}><span>{icon}</span>{title}</h5>
      {items
        ? <ul style={{ ...S.list, marginBottom: 0 }}>{items.map((t, i) => <li key={i} style={S.li}>{t}</li>)}</ul>
        : <p style={{ ...S.p, margin: 0 }}>{body}</p>}
    </div>
  );
}

const round = (a) => {
  const table = [[1, 1, 'π'], [1, 2, 'π/2'], [1, 3, 'π/3'], [1, 4, 'π/4'], [1, 6, 'π/6'], [2, 3, '2π/3'], [3, 4, '3π/4']];
  for (const [n, d, label] of table) {
    if (Math.abs(Math.abs(a) - (n / d) * Math.PI) < 5e-3) return (a < 0 ? '−' : '') + label;
  }
  return a.toFixed(3);
};

const S = {
  tabs: {
    display: 'flex', gap: 6, marginBottom: 14,
    borderBottom: '1px solid var(--border)', paddingBottom: 10,
  },
  tab: (on) => ({
    display: 'inline-flex', alignItems: 'center', gap: 7,
    padding: '6px 14px', fontSize: 12.5, cursor: 'pointer', borderRadius: 999,
    border: `1px solid ${on ? 'var(--phase-0)' : 'var(--border)'}`,
    background: on ? 'color-mix(in srgb, var(--phase-0) 13%, transparent)' : 'transparent',
    color: on ? 'var(--phase-0)' : 'var(--ink-soft)',
    fontWeight: on ? 600 : 400,
  }),
  tabCount: {
    fontSize: 10, padding: '0 5px', borderRadius: 999,
    background: 'var(--surface-alt)', border: '1px solid var(--border)', color: 'var(--ink-soft)',
  },

  placeholder: { fontSize: 12.5, color: 'var(--ink-soft)', fontStyle: 'italic', margin: 0 },

  chipRow: { display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 14 },
  chip: (on) => ({
    display: 'inline-flex', alignItems: 'baseline', gap: 2,
    padding: '4px 9px', fontSize: 12, cursor: 'pointer', borderRadius: 'var(--radius-sm)',
    border: `1px solid ${on ? 'var(--phase-0)' : 'var(--border)'}`,
    background: on ? 'color-mix(in srgb, var(--phase-0) 14%, transparent)' : 'var(--surface-alt)',
    color: on ? 'var(--phase-0)' : 'var(--ink-soft)',
    fontWeight: on ? 600 : 400,
  }),
  chipWires: { fontSize: 8.5, opacity: 0.8 },

  gcHead: { display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 },
  gcSym: {
    minWidth: 40, padding: '7px 9px', textAlign: 'center', fontWeight: 600, fontSize: 14,
    background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
  },
  badge: {
    display: 'inline-block', marginTop: 2, padding: '1px 7px', borderRadius: 999, fontSize: 10.5,
    background: 'color-mix(in srgb, var(--phase-270) 14%, transparent)',
    color: 'var(--phase-270)', border: '1px solid color-mix(in srgb, var(--phase-270) 35%, transparent)',
  },

  p: { fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.65, margin: '0 0 10px' },
  lead: {
    fontSize: 13.5, lineHeight: 1.55, color: 'var(--ink)', margin: '0 0 10px',
    paddingLeft: 11, borderLeft: '3px solid var(--phase-0)',
  },
  banner: {
    display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', marginBottom: 12,
    borderRadius: 'var(--radius-md)', background: 'var(--surface-alt)', border: '1px solid var(--border)',
  },

  matrixWrap: { display: 'flex', alignItems: 'stretch', gap: 6, margin: '0 0 10px' },
  brk: { width: 7, border: '1px solid var(--ink-soft)' },
  mcell: { padding: '3px 9px', textAlign: 'center', fontSize: 11.5 },

  kv: { display: 'grid', gridTemplateColumns: 'auto minmax(0,1fr)', gap: '3px 10px', fontSize: 11.5, margin: '0 0 10px' },
  dt: { color: 'var(--ink-soft)' },
  dd: { margin: 0, fontSize: 11.5 },

  list: { margin: '0 0 10px', paddingLeft: 17 },
  li: { fontSize: 12.5, lineHeight: 1.6, marginBottom: 4, color: 'var(--ink-soft)' },

  note: {
    padding: '10px 13px', borderRadius: 'var(--radius-md)', marginBottom: 10,
    background: 'var(--surface-alt)', border: '1px solid var(--border)', borderLeft: '3px solid',
  },
  noteHead: {
    display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5,
    textTransform: 'uppercase', letterSpacing: '.07em', margin: '0 0 7px', fontWeight: 700,
  },
};
