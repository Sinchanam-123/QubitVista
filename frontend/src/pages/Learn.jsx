import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { LEARN } from '../data/learnContent';
import { getConcepts, getCircuits } from '../utils/api';
import useViewport from '../hooks/useViewport';

/* Reference material: eight concepts, sixteen gates, the real-world context,
   and the full circuit catalogue — 35 sections in all.

   Three panes, like documentation rather than an article. Sections down the
   left, one section on screen at a time, and its own headings down the right.
   120k characters in a single scroll is a wall; picking a topic should show
   that topic and nothing else, and once inside a long topic you should still
   be able to see its shape.

   Styling is entirely the app's own tokens, so it themes with everything else. */

const R2 = 1 / Math.SQRT2;

// Axis and angle exactly as quantum_engine.rotation_for reports them, so this
// figure and the arc the simulator animates can never disagree. `free` marks
// the gates that take any angle — the figure draws a representative one.
const GATE_AXIS = {
  X:   { axis: [1, 0, 0],   angle: Math.PI,      name: 'x̂' },
  Y:   { axis: [0, 1, 0],   angle: Math.PI,      name: 'ŷ' },
  Z:   { axis: [0, 0, 1],   angle: Math.PI,      name: 'ẑ' },
  H:   { axis: [R2, 0, R2], angle: Math.PI,      name: '(x̂+ẑ)/√2' },
  S:   { axis: [0, 0, 1],   angle: Math.PI / 2,  name: 'ẑ' },
  SDG: { axis: [0, 0, 1],   angle: -Math.PI / 2, name: 'ẑ' },
  T:   { axis: [0, 0, 1],   angle: Math.PI / 4,  name: 'ẑ' },
  TDG: { axis: [0, 0, 1],   angle: -Math.PI / 4, name: 'ẑ' },
  RX:  { axis: [1, 0, 0],   angle: Math.PI / 2,  name: 'x̂', free: true },
  RY:  { axis: [0, 1, 0],   angle: Math.PI / 2,  name: 'ŷ', free: true },
  RZ:  { axis: [0, 0, 1],   angle: Math.PI / 2,  name: 'ẑ', free: true },
  P:   { axis: [0, 0, 1],   angle: Math.PI / 2,  name: 'ẑ', free: true },
};

// Demo per gate. The z-rotations do nothing observable on |0>, so each is
// prefixed with H — exactly the advice the written content gives.
const GATE_DEMO = {
  I: 'I', X: 'X', Y: 'Y', H: 'H',
  Z: 'H,Z', S: 'H,S', SDG: 'H,S,SDG', T: 'H,T,H', TDG: 'H,T,TDG',
  RX: 'RX:1.5708', RY: 'RY:1.0472', RZ: 'H,RZ:1.0472,H', P: 'H,P:1.0472,H',
};

// CX, CZ and SWAP need two wires, so they open the two-qubit page on the
// catalogue circuit that shows each one off.
const GATE_CASE_2Q = { CX: 'E01', CZ: 'P09', SWAP: 'N03' };

// The two concepts that only exist once wires can interact — their circuits
// and presets live in the two-qubit catalogue, not the single-qubit one.
const TWO_QUBIT_CONCEPTS = new Set(['entanglement', 'separability']);

const CIRCUITS_ID = 'circuits';
const SECTION_IDS = [...LEARN.map((s) => s.id), CIRCUITS_ID];
const GROUPS = [...new Set(LEARN.map((s) => s.group)), 'Circuits'];

const GROUP_META = {
  Concepts: { icon: '🧠', blurb: 'The eight ideas, in the order they build on each other.' },
  Gates: { icon: '⚙️', blurb: 'All sixteen, with matrices, axes, history and hardware cost.' },
  'Real world': { icon: '🌍', blurb: 'What actually exists today, and what does not.' },
  Circuits: { icon: '🔗', blurb: 'Every circuit in both golden catalogues, one click from the simulator.' },
};

const gateOf = (id) => (id.startsWith('g-') ? id.slice(2) : null);

export default function Learn() {
  const [current, setCurrent] = useState(SECTION_IDS[0]);
  const [query, setQuery] = useState('');
  const [concepts, setConcepts] = useState({});
  const [concepts2, setConcepts2] = useState({});
  const [circuits, setCircuits] = useState([]);
  const [circuits2, setCircuits2] = useState([]);
  const [circuitQubits, setCircuitQubits] = useState(1);
  const [circuitFilter, setCircuitFilter] = useState('all');
  const [catalogueError, setCatalogueError] = useState(null);
  const [visited, setVisited] = useState(() => new Set([SECTION_IDS[0]]));
  const [progress, setProgress] = useState(0);
  const [activeHeading, setActiveHeading] = useState(0);
  const mainRef = useRef(null);

  // Below this the three panes are all too narrow to be useful, and the prose
  // column is the one that has to survive. Gated in JS rather than by a media
  // query because the grid template is an inline style, which would win.
  const { width } = useViewport();
  const showToc = width >= 1150;

  useEffect(() => { loadCatalogue(); }, []);

  async function loadCatalogue() {
    setCatalogueError(null);
    try {
      const [c1, c2, l1, l2] = await Promise.all([
        getConcepts(1), getConcepts(2), getCircuits(1), getCircuits(2),
      ]);
      setConcepts(c1); setConcepts2(c2);
      setCircuits(l1.circuits || []); setCircuits2(l2.circuits || []);
    } catch {
      // Reachable only if the generated copy in src/data fails to load too —
      // with the backend down these calls now answer from it. The page used to
      // lose its whole catalogue the moment :8000 was not there.
      setCatalogueError('The circuit list could not be loaded. It normally works even with the backend down — everything written here works regardless.');
    }
  }

  const section = LEARN.find((s) => s.id === current);
  const headings = useMemo(
    () => (section ? section.blocks.map((b, i) => ({ b, i })).filter((x) => x.b.t === 'h') : []),
    [section],
  );

  const go = useCallback((id) => {
    setCurrent(id);
    setVisited((v) => new Set(v).add(id));
    setActiveHeading(0);
    setProgress(0);
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, []);

  /* Reading progress, plus which heading the reader is actually under. Both
     come off the same scroll event — a second listener for the scroll spy
     would fire on the same frames for no benefit. */
  const onScroll = () => {
    const el = mainRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    setProgress(max > 8 ? Math.min(1, el.scrollTop / max) : 1);

    let active = 0;
    for (let k = 0; k < headings.length; k++) {
      const h = el.querySelector(`#lh-${headings[k].i}`);
      if (h && h.getBoundingClientRect().top - el.getBoundingClientRect().top < 90) active = k;
    }
    setActiveHeading(active);
  };

  const jumpTo = (i) => {
    const el = mainRef.current;
    const h = el?.querySelector(`#lh-${i}`);
    if (!el || !h) return;
    el.scrollTo({
      top: el.scrollTop + h.getBoundingClientRect().top - el.getBoundingClientRect().top - 12,
      behavior: 'smooth',
    });
  };

  // Search titles and body text; matches filter the rail in place.
  const haystack = useMemo(
    () => LEARN.map((s) => ({
      id: s.id, group: s.group,
      text: (s.title + ' ' + (s.sub || '') + ' ' + JSON.stringify(s.blocks)).toLowerCase(),
    })),
    [],
  );
  const matched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const set = new Set(haystack.filter((h) => h.text.includes(q)).map((h) => h.id));
    if ('all circuits'.includes(q)) set.add(CIRCUITS_ID);
    return set;
  }, [query, haystack]);

  // A search hit outside the open group should still be reachable, so while
  // searching the rail shows every group at once.
  const activeGroup = current === CIRCUITS_ID ? 'Circuits' : section?.group;
  const [openGroup, setOpenGroup] = useState(GROUPS[0]);
  useEffect(() => { if (activeGroup) setOpenGroup(activeGroup); }, [activeGroup]);

  const railItems = useMemo(() => {
    const all = [...LEARN, { id: CIRCUITS_ID, group: 'Circuits', label: 'All circuits', icon: '🔗' }];
    const inGroup = matched ? all : all.filter((s) => s.group === openGroup);
    return inGroup.filter((s) => !matched || matched.has(s.id));
  }, [matched, openGroup]);

  // Arrow keys walk the whole path, unless the user is typing.
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.metaKey || e.ctrlKey || e.altKey) return;
      const i = SECTION_IDS.indexOf(current);
      if (e.key === 'ArrowRight' && i < SECTION_IDS.length - 1) go(SECTION_IDS[i + 1]);
      if (e.key === 'ArrowLeft' && i > 0) go(SECTION_IDS[i - 1]);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, go]);

  const idx = SECTION_IDS.indexOf(current);
  const labelOf = (id) => LEARN.find((s) => s.id === id)?.label || 'All circuits';
  const countIn = (g) => (g === 'Circuits' ? 1 : LEARN.filter((s) => s.group === g).length);

  return (
    <div className="container" style={S.page}>
      {/* ---------------------------------------------------------- header */}
      <header style={S.top}>
        <div style={S.topTitle}>
          <span style={S.topMark}>📚</span>
          <div>
            <h1 style={S.topH1}>Learn</h1>
            <p style={S.topSub}>
              <b>8</b> concepts · <b>16</b> gates · the real-world picture — every matrix and
              probability checked numerically.
            </p>
          </div>
        </div>

        <div style={S.searchWrap}>
          <input
            className="learn-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search all 35 sections…"
            style={S.search}
          />
          {matched && (
            <span style={S.hits}>
              {matched.size ? `${matched.size} match${matched.size === 1 ? '' : 'es'}` : 'no matches'}
            </span>
          )}
        </div>
      </header>

      <nav style={S.tabs}>
        {GROUPS.map((g) => {
          const on = openGroup === g && !matched;
          return (
            <button
              key={g}
              onClick={() => {
                setQuery('');
                setOpenGroup(g);
                const first = g === 'Circuits' ? CIRCUITS_ID : LEARN.find((s) => s.group === g)?.id;
                if (first) go(first);
              }}
              style={S.tab(on)}
              title={GROUP_META[g]?.blurb}
            >
              <span>{GROUP_META[g]?.icon || '◍'}</span>
              {g}
              <span style={S.tabCount}>{countIn(g)}</span>
            </button>
          );
        })}
        <span style={S.tabBlurb}>{GROUP_META[openGroup]?.blurb}</span>
      </nav>

      {/* ---------------------------------------------------------- body */}
      <div
        style={{
          ...S.body,
          gridTemplateColumns: showToc
            ? 'minmax(0, 218px) minmax(0, 1fr) minmax(0, 186px)'
            : 'minmax(0, 218px) minmax(0, 1fr)',
        }}
      >
        <aside style={S.side}>
          <div style={S.progressRow}>
            <div style={S.track}>
              <div style={{ ...S.fill, width: `${(visited.size / SECTION_IDS.length) * 100}%` }} />
            </div>
            <span className="mono" style={S.progressLabel}>{visited.size}/{SECTION_IDS.length}</span>
          </div>

          <nav style={{ overflowY: 'auto', minHeight: 0 }}>
            {matched && <div style={S.navGroup}>Results</div>}
            {railItems.map((s) => (
              <button key={s.id} onClick={() => go(s.id)} style={S.navItem(current === s.id)}>
                <span>{s.icon || '◍'}</span>
                <span style={{ flex: 1, textAlign: 'left' }}>{s.label}</span>
                {matched && <span style={S.navWhere}>{s.group}</span>}
                {visited.has(s.id) && current !== s.id && <span style={S.tick}>✓</span>}
              </button>
            ))}
            {!railItems.length && <p style={S.railEmpty}>Nothing matches that.</p>}
          </nav>
        </aside>

        <main ref={mainRef} onScroll={onScroll} style={S.main}>
          <div style={S.readBar}><div style={{ ...S.readFill, width: `${progress * 100}%` }} /></div>

          {section ? (
            <article className="card" style={S.card}>
              <header style={S.banner}>
                <span style={S.bannerIcon}>{section.icon || '◍'}</span>
                <div style={{ minWidth: 0 }}>
                  <span style={S.crumb}>{section.group}</span>
                  <h2 style={S.h1}>{section.title}</h2>
                  {section.sub && <p style={S.sub}>{section.sub}</p>}
                </div>
              </header>

              {GATE_AXIS[gateOf(section.id)] && <AxisFigure gate={gateOf(section.id)} />}
              {GATE_CASE_2Q[gateOf(section.id)] && <TwoQubitFigure gate={gateOf(section.id)} />}

              {section.blocks.map((b, i) => <Block key={i} b={b} index={i} />)}

              <Actions
                section={section}
                concepts={concepts}
                concepts2={concepts2}
                onSeeCircuits={(c, q) => { setCircuitFilter(c); setCircuitQubits(q); go(CIRCUITS_ID); }}
              />
            </article>
          ) : (
            <article className="card" style={S.card}>
              <header style={S.banner}>
                <span style={S.bannerIcon}>🔗</span>
                <div>
                  <span style={S.crumb}>Circuits</span>
                  <h2 style={S.h1}>All circuits</h2>
                  <p style={S.sub}>Every circuit in the golden catalogues. Click one to open it in the simulator.</p>
                </div>
              </header>

              {catalogueError ? (
                <div>
                  <p style={S.p}>{catalogueError}</p>
                  <button className="btn-ghost" style={{ padding: '8px 14px' }} onClick={loadCatalogue}>Retry</button>
                </div>
              ) : (
                <Catalogue
                  qubits={circuitQubits}
                  onQubits={(q) => { setCircuitQubits(q); setCircuitFilter('all'); }}
                  circuits={circuitQubits === 1 ? circuits : circuits2}
                  concepts={circuitQubits === 1 ? concepts : concepts2}
                  filter={circuitFilter}
                  onFilter={setCircuitFilter}
                />
              )}
            </article>
          )}

          <div style={S.pager}>
            {idx > 0 ? (
              <button className="card" style={S.pg} onClick={() => go(SECTION_IDS[idx - 1])}>
                <span style={S.pgHint}>← Previous</span>
                <b style={S.pgLabel}>{labelOf(SECTION_IDS[idx - 1])}</b>
              </button>
            ) : <span />}
            <span className="mono" style={S.pgCount}>{idx + 1} of {SECTION_IDS.length}</span>
            {idx < SECTION_IDS.length - 1 ? (
              <button className="card" style={{ ...S.pg, textAlign: 'right' }} onClick={() => go(SECTION_IDS[idx + 1])}>
                <span style={S.pgHint}>Next →</span>
                <b style={S.pgLabel}>{labelOf(SECTION_IDS[idx + 1])}</b>
              </button>
            ) : <span />}
          </div>
        </main>

        {/* The section's own shape, so a 30-block topic is still navigable. */}
        {showToc && (
          <aside style={S.toc}>
            {headings.length > 1 && (
              <>
                <div style={S.tocHead}>On this page</div>
                {headings.map((h, k) => (
                  <button
                    key={h.i}
                    onClick={() => jumpTo(h.i)}
                    style={S.tocItem(k === activeHeading)}
                    title={h.b.text.replace(/<[^>]+>/g, '')}
                  >
                    {h.b.text.replace(/<[^>]+>/g, '')}
                  </button>
                ))}
              </>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- actions

function Actions({ section, concepts, concepts2, onSeeCircuits }) {
  const gate = gateOf(section.id);
  const demo = gate && GATE_DEMO[gate];
  const case2q = gate && GATE_CASE_2Q[gate];

  const twoQ = section.concept && TWO_QUBIT_CONCEPTS.has(section.concept);
  const source = twoQ ? concepts2 : concepts;
  const preset = section.concept && source[section.concept]?.preset?.case_id;
  const simPath = twoQ ? '/simulator/two-qubit' : '/simulator';

  if (!demo && !case2q && !section.concept) return null;

  return (
    <div style={S.actions}>
      {demo && (
        <Link to={`/simulator?gates=${encodeURIComponent(demo)}`} style={S.tryLink}>
          ▶ Try <span className="mono">{demo}</span> in the simulator
        </Link>
      )}
      {case2q && (
        <Link to={`/simulator/two-qubit?case=${encodeURIComponent(case2q)}`} style={S.tryLink}>
          ▶ See <span className="mono">{gate}</span> on two wires ({case2q})
        </Link>
      )}
      {preset && (
        <Link to={`${simPath}?case=${encodeURIComponent(preset)}`} style={S.tryLink}>
          ▶ Open the {preset} demo circuit
        </Link>
      )}
      {section.concept && (
        <button style={S.seeLink} onClick={() => onSeeCircuits(section.concept, twoQ ? 2 : 1)}>
          See the circuits that demonstrate this →
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- catalogue

function Catalogue({ qubits, onQubits, circuits, concepts, filter, onFilter }) {
  const order = Object.keys(concepts);
  const shown = filter === 'all' ? circuits : circuits.filter((c) => c.concept === filter);
  const simPath = qubits === 1 ? '/simulator' : '/simulator/two-qubit';

  const groups = [];
  for (const c of shown) {
    const g = groups.find((x) => x.k === c.concept);
    (g || groups[groups.push({ k: c.concept, items: [] }) - 1]).items.push(c);
  }

  return (
    <>
      {/* The two catalogues reuse case ids, so which one you are looking at
          has to be an explicit choice rather than a guess. */}
      <div style={S.qubitToggle}>
        {[1, 2].map((q) => (
          <button key={q} onClick={() => onQubits(q)} style={S.qubitBtn(qubits === q)}>
            {q === 1 ? 'One qubit' : 'Two qubits'}
          </button>
        ))}
        <span style={S.qubitHint}>
          {qubits === 1 ? '104 circuits · 6 concepts' : '77 circuits · 8 concepts'}
        </span>
      </div>

      <div style={S.filters}>
        {['all', ...order].map((k) => {
          const n = k === 'all' ? circuits.length : circuits.filter((c) => c.concept === k).length;
          if (!n && k !== 'all') return null;
          return (
            <button key={k} onClick={() => onFilter(k)} style={S.filterChip(filter === k)}>
              {k === 'all' ? '◍ All' : `${concepts[k]?.icon || '◍'} ${concepts[k]?.label || k}`}
              <span style={S.count}>{n}</span>
            </button>
          );
        })}
      </div>

      {groups.map((g) => (
        <div key={g.k}>
          <h3 style={S.cgroup}>
            {concepts[g.k]?.icon || '◍'} {concepts[g.k]?.label || g.k}
            <span style={S.count}>{g.items.length}</span>
          </h3>
          <div style={S.grid}>
            {g.items.map((c) => {
              const isPreset = concepts[g.k]?.preset?.case_id === c.id;
              return (
                <Link key={c.id} to={`${simPath}?case=${encodeURIComponent(c.id)}`} style={S.ccard(isPreset)}>
                  <div style={S.ccTop}>
                    <b className="mono" style={{ color: 'var(--phase-90)' }}>{c.id}</b>
                    {isPreset && <span title="Start here" style={{ color: 'var(--phase-270)' }}>★</span>}
                    <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--ink-soft)' }}>
                      {c.gate_count} gate{c.gate_count === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="mono" style={{ fontSize: 12, marginBottom: 3 }}>{c.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-soft)', lineHeight: 1.45 }}>{c.summary}</div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}

// ---------------------------------------------------------------- axis figure

const rodrigues = (v, k, a) => {
  const c = Math.cos(a), s = Math.sin(a);
  const d = k[0] * v[0] + k[1] * v[1] + k[2] * v[2];
  const cr = [k[1] * v[2] - k[2] * v[1], k[2] * v[0] - k[0] * v[2], k[0] * v[1] - k[1] * v[0]];
  return v.map((_, i) => v[i] * c + cr[i] * s + k[i] * d * (1 - c));
};

function proj([x, y, z], R = 62, cx = 78, cy = 78) {
  const az = -0.6, el = 0.32;
  const ca = Math.cos(az), sa = Math.sin(az);
  const x1 = x * ca - y * sa, y1 = x * sa + y * ca;
  const ce = Math.cos(el), se = Math.sin(el);
  return [cx + x1 * R, cy - (z * ce - y1 * se) * R];
}
const toPath = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');

/** Which axis this gate turns about, and by how much. */
function AxisFigure({ gate }) {
  const g = GATE_AXIS[gate];
  const equator = toPath(Array.from({ length: 61 }, (_, i) => {
    const a = (i / 60) * Math.PI * 2;
    return proj([Math.cos(a), Math.sin(a), 0]);
  }));
  const [ax1, ay1] = proj(g.axis.map((c) => c * 1.22));
  const [ax2, ay2] = proj(g.axis.map((c) => -c * 1.22));

  const seed = Math.abs(g.axis[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1];
  let perp = [
    g.axis[1] * seed[2] - g.axis[2] * seed[1],
    g.axis[2] * seed[0] - g.axis[0] * seed[2],
    g.axis[0] * seed[1] - g.axis[1] * seed[0],
  ];
  const n = Math.hypot(...perp);
  perp = perp.map((c) => (c / n) * 0.72);

  const N = 40;
  const arc = toPath(Array.from({ length: N + 1 }, (_, i) => proj(rodrigues(perp, g.axis, g.angle * (i / N)))));
  const tip = proj(rodrigues(perp, g.axis, g.angle));
  const start = proj(perp);

  return (
    <div style={S.axisFig}>
      <svg viewBox="0 0 156 156" style={{ width: 156, height: 156, flexShrink: 0 }} aria-label={`rotation axis for ${gate}`}>
        <circle cx="78" cy="78" r="62" fill="var(--surface-alt)" stroke="var(--border)" strokeWidth="1.2" />
        <path d={equator} fill="none" stroke="var(--border)" strokeWidth="1" />
        <line x1={ax2} y1={ay2} x2={ax1} y2={ay1} stroke="var(--phase-270)" strokeWidth="2" strokeDasharray="4 3" />
        <path d={arc} fill="none" stroke="var(--phase-0)" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx={start[0].toFixed(1)} cy={start[1].toFixed(1)} r="3" fill="var(--ink-soft)" />
        <circle cx={tip[0].toFixed(1)} cy={tip[1].toFixed(1)} r="4" fill="var(--phase-0)" />
        <circle cx={ax1.toFixed(1)} cy={ay1.toFixed(1)} r="3" fill="var(--phase-270)" />
      </svg>
      <div>
        <div style={S.amRow}><span>Axis</span><b className="mono">{g.name}</b></div>
        <div style={S.amRow}>
          <span>Angle</span>
          <b className="mono">{g.free ? 'θ — any' : `${Math.round(g.angle * 180 / Math.PI)}°`}</b>
        </div>
        <p style={{ ...S.p, maxWidth: 230, marginTop: 8, fontSize: 12 }}>
          {g.free
            ? 'Drawn at 90°. Drag the angle slider in the simulator and the arc grows with it.'
            : 'The dot travels the arc — that is the whole gate.'}
        </p>
      </div>
    </div>
  );
}

/* The two-qubit gates get a circuit diagram where the others get an axis,
   because they have no axis — and that absence is the single rule most likely
   to be missed. Same glyphs the simulator draws, so the two agree on sight. */
const TWO_Q_FIG = {
  CX: { control: 'dot', target: 'oplus', note: 'Fires only on the branch where the control is |1⟩ — which is why a control in superposition entangles the pair.' },
  CZ: { control: 'dot', target: 'dot', note: 'Symmetric: swap the wires and it is the same gate. Marks |11⟩ with a sign and moves no probability at all.' },
  SWAP: { control: 'cross', target: 'cross', note: 'Exchanges the two states. Uses two wires and entangles nothing — the counterexample worth knowing.' },
};

function TwoQubitFigure({ gate }) {
  const f = TWO_Q_FIG[gate];
  const mark = (kind, cx, cy) => (kind === 'dot'
    ? <circle cx={cx} cy={cy} r="6" fill="var(--phase-0)" />
    : (
      <text x={cx} y={cy + 7} textAnchor="middle" style={{ fontSize: 20, fill: 'var(--phase-0)' }}>
        {kind === 'oplus' ? '⊕' : '✕'}
      </text>
    ));

  return (
    <div style={S.axisFig}>
      <svg viewBox="0 0 156 110" style={{ width: 156, height: 110, flexShrink: 0 }} aria-label={`${gate} circuit symbol`}>
        <line x1="14" y1="34" x2="142" y2="34" stroke="var(--border)" strokeWidth="2" />
        <line x1="14" y1="82" x2="142" y2="82" stroke="var(--border)" strokeWidth="2" />
        <line x1="78" y1="34" x2="78" y2="82" stroke="var(--phase-0)" strokeWidth="2" />
        {mark(f.control, 78, 34)}
        {mark(f.target, 78, 82)}
        <text x="6" y="38" style={{ fontSize: 10, fill: 'var(--ink-soft)', fontFamily: 'var(--font-mono)' }}>q0</text>
        <text x="6" y="86" style={{ fontSize: 10, fill: 'var(--ink-soft)', fontFamily: 'var(--font-mono)' }}>q1</text>
      </svg>
      <div>
        <div style={S.amRow}><span>Axis</span><b className="mono" style={{ color: 'var(--phase-0)' }}>none</b></div>
        <div style={S.amRow}><span>Angle</span><b className="mono" style={{ color: 'var(--phase-0)' }}>none</b></div>
        <p style={{ ...S.p, maxWidth: 250, marginTop: 8, fontSize: 12 }}>
          Not a rotation of either Bloch sphere, so the API reports{' '}
          <span className="mono">rotation: null</span> here. {f.note}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- blocks

const html = (s) => ({ dangerouslySetInnerHTML: { __html: s } });

function Block({ b, index }) {
  switch (b.t) {
    case 'lead':   return <p style={S.lead} {...html(b.text)} />;
    case 'p':      return <p style={S.p} {...html(b.text)} />;
    case 'h':      return <h3 id={`lh-${index}`} style={S.h3} {...html(b.text)} />;
    case 'list':   return <ul style={S.list}>{b.items.map((i, k) => <li key={k} style={S.li} {...html(i)} />)}</ul>;
    case 'num':    return <ol style={S.list}>{b.items.map((i, k) => <li key={k} style={S.li} {...html(i)} />)}</ol>;
    case 'code':   return <pre className="mono" style={S.code}>{b.text}</pre>;

    case 'table':
      return (
        <div style={{ overflowX: 'auto', marginBottom: 14 }}>
          <table style={S.table}>
            <thead>
              <tr>{b.head.map((h, k) => <th key={k} style={S.th} {...html(h)} />)}</tr>
            </thead>
            <tbody>
              {b.rows.map((r, k) => (
                <tr key={k}>{r.map((c, j) => <td key={j} style={S.td} {...html(c)} />)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'kv':
      return (
        <dl style={S.kv}>
          {b.pairs.map(([k, v], i) => (
            <div key={i} style={{ display: 'contents' }}>
              <dt style={S.dt} {...html(k)} />
              <dd className="mono" style={S.dd} {...html(v)} />
            </div>
          ))}
        </dl>
      );

    case 'matrix':
      return (
        <div style={S.matrixWrap}>
          {b.prefix && <span className="mono" style={{ color: 'var(--ink-soft)' }}>{b.prefix}</span>}
          <div style={S.matrix}>
            <div style={{ ...S.brk, borderRight: 'none', borderRadius: '3px 0 0 3px' }} />
            <table><tbody>
              {b.rows.map((r, i) => (
                <tr key={i}>{r.map((c, j) => <td key={j} className="mono" style={S.mcell}>{c}</td>)}</tr>
              ))}
            </tbody></table>
            <div style={{ ...S.brk, borderLeft: 'none', borderRadius: '0 3px 3px 0' }} />
          </div>
          <dl style={{ ...S.kv, marginBottom: 0 }}>
            <dt style={S.dt}>Axis</dt><dd className="mono" style={S.dd}>{b.axis}</dd>
            <dt style={S.dt}>Angle</dt><dd className="mono" style={S.dd}>{b.angle}</dd>
          </dl>
        </div>
      );

    case 'note': {
      const tone = NOTE_TONE[b.kind] || 'var(--ink-soft)';
      return (
        <div style={S.note(tone)}>
          <h4 style={S.noteHead(tone)}><span>{b.icon || '•'}</span>{b.title}</h4>
          {b.items
            ? <ul style={{ ...S.list, marginBottom: 0 }}>{b.items.map((i, k) => <li key={k} style={S.li} {...html(i)} />)}</ul>
            : <p style={{ ...S.p, marginBottom: 0 }} {...html(b.body)} />}
        </div>
      );
    }

    default: return null;
  }
}

const NOTE_TONE = {
  key: 'var(--phase-270)',
  warn: 'var(--phase-0)',
  world: 'var(--phase-90)',
  history: 'var(--ink-soft)',
  analogy: 'var(--phase-270)',
};

// ---------------------------------------------------------------- styles

const S = {
  page: {
    display: 'flex', flexDirection: 'column', gap: 'var(--gap-xs)',
    flex: 1, minHeight: 0,
    paddingTop: 'var(--gap-sm)', paddingBottom: 'var(--gap-sm)',
  },

  top: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 16, flexWrap: 'wrap', flexShrink: 0,
  },
  topTitle: { display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 },
  topMark: { fontSize: 26, lineHeight: 1 },
  topH1: { fontSize: 'clamp(19px, 2.4vh, 25px)', margin: 0, lineHeight: 1.1 },
  topSub: { fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)', margin: '2px 0 0' },
  searchWrap: { display: 'flex', alignItems: 'center', gap: 8, flex: '0 1 320px', minWidth: 200 },
  search: {
    flex: 1, padding: '8px 12px', fontSize: 13,
    borderRadius: 999, border: '1px solid var(--border)',
    background: 'var(--surface)', color: 'var(--ink)',
  },
  hits: { fontSize: 11, color: 'var(--ink-soft)', whiteSpace: 'nowrap' },

  tabs: {
    display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
    flexShrink: 0, paddingBottom: 2,
  },
  tab: (on) => ({
    display: 'inline-flex', alignItems: 'center', gap: 7,
    padding: '6px 13px', fontSize: 12.5, cursor: 'pointer', borderRadius: 999,
    border: `1px solid ${on ? 'var(--phase-0)' : 'var(--border)'}`,
    background: on ? 'color-mix(in srgb, var(--phase-0) 12%, transparent)' : 'var(--surface)',
    color: on ? 'var(--phase-0)' : 'var(--ink-soft)',
    fontWeight: on ? 600 : 400,
  }),
  tabCount: {
    fontSize: 10, color: 'var(--ink-soft)', background: 'var(--bg)',
    border: '1px solid var(--border)', borderRadius: 999, padding: '0 6px',
  },
  tabBlurb: {
    fontSize: 11.5, color: 'var(--ink-soft)', marginLeft: 6,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0,
  },

  // Columns are set inline on the element — the third one comes and goes.
  body: { display: 'grid', gap: 'var(--gap-sm)', flex: 1, minHeight: 0 },

  side: {
    display: 'flex', flexDirection: 'column', minHeight: 0,
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)', padding: 12,
  },
  progressRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 },
  track: { flex: 1, height: 4, background: 'var(--surface-alt)', borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', background: 'var(--accent-grad)', borderRadius: 3, transition: 'width .3s ease' },
  progressLabel: { fontSize: 10, color: 'var(--ink-soft)' },

  navGroup: {
    fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em',
    color: 'var(--ink-soft)', fontWeight: 700, margin: '4px 0 4px 6px',
  },
  navItem: (active) => ({
    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
    padding: '6px 8px', marginBottom: 2, cursor: 'pointer', fontSize: 12.5,
    borderRadius: 'var(--radius-sm)', border: '1px solid transparent',
    background: active ? 'var(--surface-alt)' : 'transparent',
    color: active ? 'var(--ink)' : 'var(--ink-soft)',
    borderLeft: `2px solid ${active ? 'var(--phase-0)' : 'transparent'}`,
    fontWeight: active ? 600 : 400,
  }),
  navWhere: { fontSize: 9.5, color: 'var(--ink-soft)', opacity: 0.7 },
  tick: { fontSize: 10, color: 'var(--phase-90)', opacity: 0.7 },
  railEmpty: { fontSize: 12, color: 'var(--ink-soft)', fontStyle: 'italic', padding: '6px 8px' },

  main: { position: 'relative', minHeight: 0, overflowY: 'auto', paddingRight: 4 },
  readBar: {
    position: 'sticky', top: 0, zIndex: 3, height: 2,
    background: 'transparent', marginBottom: -2,
  },
  readFill: { height: '100%', background: 'var(--accent-grad)', borderRadius: 2, transition: 'width .12s linear' },

  card: { padding: 'clamp(18px, 2.4vw, 28px)', marginBottom: 'var(--gap-sm)' },

  banner: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 },
  bannerIcon: { fontSize: 34, lineHeight: 1 },
  crumb: {
    fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.12em',
    textTransform: 'uppercase', color: 'var(--phase-90)',
  },
  h1: { fontSize: 'clamp(19px, 2.6vw, 24px)', margin: '2px 0 0' },
  sub: { fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)', margin: '4px 0 0' },

  toc: {
    display: 'flex', flexDirection: 'column', gap: 2,
    minHeight: 0, overflowY: 'auto', paddingTop: 4,
  },
  tocHead: {
    fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em',
    color: 'var(--ink-soft)', fontWeight: 700, margin: '0 0 6px 10px',
  },
  tocItem: (on) => ({
    textAlign: 'left', padding: '4px 10px', fontSize: 11.5, cursor: 'pointer',
    background: 'transparent', border: 'none',
    borderLeft: `2px solid ${on ? 'var(--phase-0)' : 'var(--border)'}`,
    color: on ? 'var(--ink)' : 'var(--ink-soft)',
    fontWeight: on ? 600 : 400, lineHeight: 1.35,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  }),

  lead: {
    fontSize: 15.5, lineHeight: 1.55, color: 'var(--ink)', margin: '0 0 14px',
    paddingLeft: 13, borderLeft: '3px solid var(--phase-0)',
  },
  p: { fontSize: 13.5, lineHeight: 1.75, color: 'var(--ink-soft)', margin: '0 0 12px' },
  h3: { fontSize: 14.5, color: 'var(--ink)', margin: '24px 0 9px', fontWeight: 600, scrollMarginTop: 12 },
  list: { margin: '0 0 14px', paddingLeft: 20 },
  li: { fontSize: 13, lineHeight: 1.75, color: 'var(--ink-soft)', marginBottom: 7 },

  code: {
    margin: '0 0 14px', padding: '13px 15px', overflowX: 'auto', whiteSpace: 'pre',
    background: 'var(--surface-alt)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)', fontSize: 12.5, lineHeight: 1.7, color: 'var(--phase-90)',
  },

  table: { borderCollapse: 'collapse', width: '100%', fontSize: 12.5, minWidth: 380 },
  th: {
    textAlign: 'left', padding: '8px 11px', whiteSpace: 'nowrap',
    background: 'var(--surface-alt)', color: 'var(--phase-270)',
    borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 11.5,
    textTransform: 'uppercase', letterSpacing: '.05em',
  },
  td: {
    padding: '8px 11px', borderBottom: '1px solid var(--border)',
    color: 'var(--ink-soft)', lineHeight: 1.6, verticalAlign: 'top',
  },

  kv: { display: 'grid', gridTemplateColumns: 'auto minmax(0,1fr)', gap: '5px 14px', margin: '0 0 14px', fontSize: 12.5 },
  dt: { color: 'var(--ink-soft)', whiteSpace: 'nowrap' },
  dd: { margin: 0, color: 'var(--ink)', fontSize: 12 },

  matrixWrap: {
    display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 16,
    margin: '0 0 16px', padding: '14px 16px',
    background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
  },
  matrix: { display: 'flex', alignItems: 'stretch', gap: 6 },
  brk: { width: 7, border: '1px solid var(--ink-soft)' },
  mcell: { padding: '3px 9px', textAlign: 'center', fontSize: 11.5 },

  note: (tone) => ({
    padding: '10px 13px', borderRadius: 'var(--radius-md)', marginBottom: 12,
    background: 'var(--surface-alt)', border: '1px solid var(--border)',
    borderLeft: `3px solid ${tone}`,
  }),
  noteHead: (tone) => ({
    display: 'flex', alignItems: 'center', gap: 6, fontSize: 11,
    textTransform: 'uppercase', letterSpacing: '.07em',
    margin: '0 0 7px', color: tone, fontWeight: 700,
  }),

  axisFig: {
    display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap',
    margin: '0 0 18px', padding: '12px 16px',
    background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
  },
  amRow: { display: 'flex', gap: 10, fontSize: 12.5, marginBottom: 3 },

  actions: { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 20 },
  tryLink: {
    display: 'inline-block', padding: '9px 14px', textDecoration: 'none', fontSize: 12.5,
    background: 'var(--surface-alt)', color: 'var(--phase-270)',
    border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
  },
  seeLink: {
    padding: '9px 14px', fontSize: 12.5, cursor: 'pointer',
    background: 'var(--surface-alt)', color: 'var(--phase-0)',
    border: '1px solid var(--border)', borderLeft: '3px solid var(--phase-0)',
    borderRadius: 'var(--radius-sm)',
  },

  qubitToggle: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 },
  qubitBtn: (on) => ({
    padding: '6px 14px', fontSize: 12.5, cursor: 'pointer', borderRadius: 999,
    border: `1px solid ${on ? 'var(--phase-90)' : 'var(--border)'}`,
    background: on ? 'color-mix(in srgb, var(--phase-90) 14%, transparent)' : 'transparent',
    color: on ? 'var(--phase-90)' : 'var(--ink-soft)',
    fontWeight: on ? 600 : 400,
  }),
  qubitHint: { fontSize: 11, color: 'var(--ink-soft)', marginLeft: 4 },

  filters: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 },
  filterChip: (active) => ({
    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 11px',
    cursor: 'pointer', fontSize: 12, borderRadius: 999,
    border: `1px solid ${active ? 'var(--phase-0)' : 'var(--border)'}`,
    background: active ? 'var(--surface-alt)' : 'transparent',
    color: active ? 'var(--phase-0)' : 'var(--ink-soft)',
  }),
  count: {
    fontSize: 10, color: 'var(--ink-soft)', background: 'var(--bg)',
    border: '1px solid var(--border)', borderRadius: 999, padding: '1px 6px',
  },
  cgroup: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, margin: '20px 0 10px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 9 },
  ccard: (preset) => ({
    display: 'block', padding: '10px 12px', textDecoration: 'none',
    background: 'var(--surface-alt)', border: '1px solid var(--border)',
    borderLeft: preset ? '3px solid var(--phase-270)' : '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)', color: 'var(--ink)',
  }),
  ccTop: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, fontSize: 12 },

  pager: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 'var(--gap-sm)' },
  pg: { display: 'flex', flexDirection: 'column', gap: 2, padding: '10px 14px', cursor: 'pointer', maxWidth: '45%', textAlign: 'left' },
  pgHint: { fontSize: 10.5, color: 'var(--ink-soft)' },
  pgLabel: { fontSize: 12.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  pgCount: { fontSize: 11, color: 'var(--ink-soft)', whiteSpace: 'nowrap' },
};
