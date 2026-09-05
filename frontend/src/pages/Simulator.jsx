import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LogOut, Undo2, Redo2, Link2, HelpCircle } from 'lucide-react';
import GuidedTour, { tourSeen } from '../components/GuidedTour';
import GatePalette from '../components/GatePalette';
import BlochSphereClassic from '../components/classic/BlochSphereClassic';
import CircuitStrip from '../components/classic/CircuitStrip';
import ExplainPanel from '../components/classic/ExplainPanel';
import { TransportBar, AngleBox } from '../components/classic/Controls';
import TipBox from '../components/classic/TipBox';
import BackendNotice from '../components/classic/BackendNotice';
import { ProbabilityBars, StateVectorPanel } from '../components/classic/Readouts';
import { isParameterized } from '../utils/quantumEngine';
import useSimulation from '../hooks/useSimulation';
import { explain as fetchExplain, getCircuit, getConcepts, isOffline, localResult } from '../utils/api';

/* The simulator, in the project's original layout.
 *
 * Circuit and its explanation down the left, Bloch sphere and the two numeric
 * readouts down the right. The step scrubber is the centrepiece: steps[k] is the
 * state after the first k gates, so scrubbing is an array index, never a new
 * request, and build mode and playback mode can never disagree.
 */

const ROTATIONS = ['RX', 'RY', 'RZ', 'P'];

// Which axis each rotation gate turns about — the same table the engine and the
// API report, so a dragged angle animates along the axis the gate really uses.
const ROTATION_AXIS = {
  RX: [1, 0, 0], RY: [0, 1, 0], RZ: [0, 0, 1], P: [0, 0, 1],
};

/* Shown the first time anyone opens this page, and any time the chooser asks.
 *
 * Ordered so nothing is described before there is a reason to care about it:
 * build something, watch it move, then read the panels, then the controls that
 * only matter once you have a circuit worth keeping. Every panel on the page is
 * covered — an unexplained panel is one the reader assumes is broken. */
const TOUR = [
  {
    title: 'This is your qubit',
    body: 'One qubit, drawn as an arrow inside a ball. Right now it points straight up, which means it would read 0 every single time you looked at it. Everything you do here moves that arrow.',
  },
  { target: 'palette', title: 'Pick a gate here', body: 'These are the things you can do to the qubit — 13 of them. Click one to add it, or drag it onto the wire. Hover any of them for a one-line description. Start with H.' },
  { target: 'circuit', title: 'Your circuit builds up here', body: 'Gates land on the wire in order, left to right. Drag a chip to reorder it, drop one between two others to insert it, or hit the × to remove it — the whole circuit re-runs instantly either way.' },
  { target: 'transport', title: 'This is the important bit', body: 'Step through the circuit one gate at a time, forwards or backwards. Most simulators only show you the final answer; the interesting part is how the arrow got there. Press play — or the space bar — to watch the whole thing from the start.' },
  { target: 'angle', title: 'Gates you can dial', body: 'RX, RY, RZ and P take an angle. Click one in the circuit and drag this slider: the arrow sweeps and the bars follow, continuously. It is the clearest demonstration that a qubit is not a switch with two settings.' },
  { target: 'sphere', title: 'Watch the arrow move', body: 'The arrow travels the real path the gate takes it on — the true axis and angle — not a straight line through the middle. Drag the ball to spin your view of it.' },
  { target: 'readouts', title: 'What you would actually measure', body: 'The odds of getting 0 or 1 if you looked right now. These always add to 1, no matter what you build — if they ever do not, something is wrong.' },
  { target: 'statevector', title: 'The part the bars cannot show', body: 'Each outcome also carries a direction in the complex plane, drawn here as a dial and coloured by angle. Some gates turn that dial and leave the bars completely untouched — watch this panel when you add an S or a T.' },
  { target: 'tip', title: 'Hints as you go', body: 'This line reacts to whatever you just did. When something surprising happens — a gate that appears to do nothing — it stays put and explains why instead of moving on.' },
  { target: 'explain', title: 'And this explains it', body: 'Plain-English notes on what the circuit is doing, including what pointedly did not move. Switch to Gates for a reference card on any gate you have placed.' },
  { target: 'header', title: 'Undo, restart, switch', body: 'Undo and redo any edit, clear the wire, or jump over to two qubits. The ? button replays this tour whenever you want it. End simulation closes out with a summary of what you built.' },
];

/** API gate names are upper case; the palette keys are 'Sdg' / 'Tdg'. */
function normalizeGate(name) {
  const u = String(name).toUpperCase();
  if (u === 'SDG') return 'Sdg';
  if (u === 'TDG') return 'Tdg';
  return u;
}

export default function Simulator() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [history, setHistory] = useState([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [manualCollapse, setManualCollapse] = useState(false);
  const [angle, setAngle] = useState(Math.PI / 2);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  // Runs on the first visit only; the header button replays it on demand.
  // Auto-runs on a first visit, and always when the chooser asks for it.
  const [tour, setTour] = useState(
    () => new URLSearchParams(window.location.search).get('tour') === '1' || !tourSeen('1q'),
  );

  const ops = history[historyIndex];
  const sim = useSimulation(ops);
  const steps = sim.steps;
  const total = steps.length - 1;

  const [explain, setExplain] = useState(null);
  const [concepts, setConcepts] = useState({});

  /* Whether the backend answered at all, and what it said if it refused.
   *
   * These used to be swallowed: every backend call caught its failure and did
   * nothing, so with no server running the explain panel and the catalogue just
   * were not there and the page never said why. The two states are kept apart
   * on purpose — a 400 means the backend is up and the circuit is wrong, and
   * telling someone the app is offline when it is not sends them to fix the
   * wrong thing. */
  const [backendOnline, setBackendOnline] = useState(true);
  const [apiError, setApiError] = useState(null);

  /** Record what a failed call means. Only a call that never reached the
   *  backend counts as offline. */
  const noteFailure = useCallback((err) => {
    if (isOffline(err)) { setBackendOnline(false); setApiError(null); return; }
    setBackendOnline(true);
    setApiError(err.message);
  }, []);

  useEffect(() => {
    getConcepts()
      .then(setConcepts)
      // A rejected catalogue request says nothing about the circuit on screen,
      // so it never becomes an error line — only the offline case matters here.
      .catch((err) => { if (isOffline(err)) setBackendOnline(false); });
  }, []);

  // Teaching text changes only when the gate list does. It is also the page's
  // heartbeat: it re-runs on every edit, so it is what notices the backend
  // coming back and clears the banner again.
  const opsKey = JSON.stringify(ops);
  useEffect(() => {
    let alive = true;
    fetchExplain(ops)
      .then((d) => {
        if (!alive) return;
        setExplain(d);
        setBackendOnline(true);
        setApiError(null);
      })
      .catch((err) => {
        if (!alive) return;
        setExplain(null);
        noteFailure(err);
      });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opsKey, noteFailure]);

  // Keep the scrubber inside the circuit.
  //
  // It clamps to the step that was *asked for*, not to wherever the scrubber
  // happens to sit. A circuit seeded from ?gates= or ?case= asks for its last
  // step before the simulation has caught up, so `total` is still 0 on the
  // first pass; clamping the live value alone pinned it to step 0 and the link
  // opened the circuit without ever showing what it does.
  useEffect(() => {
    setStep(() => {
      const clamped = Math.min(wanted.current, total);
      stepRef.current = clamped;
      return clamped;
    });
  }, [total]);

  const view = steps[Math.min(step, total)] || steps[0];

  // The arc the sphere travels is decided at the moment the step changes, not
  // inferred afterwards in an effect. An effect that compared "where was I last
  // time" against a ref it mutated itself broke under StrictMode's deliberate
  // double-invocation — the second run saw prev === step, concluded nothing had
  // moved, and cleared the arc before it could be drawn. Computing it here makes
  // it deterministic and immune to how many times React re-runs anything.
  const stepsRef = useRef(steps);
  stepsRef.current = steps;
  const stepRef = useRef(step);
  stepRef.current = step;
  // The step last asked for, before any clamping — see the effect above.
  const wanted = useRef(0);
  const [transition, setTransition] = useState(null);

  /** Move the scrubber, working out the rotation that connects the two steps.
   *  `nextSteps` lets a freshly placed gate pass the steps it just created,
   *  before the simulation state has caught up. */
  const goToStep = useCallback((next, nextSteps) => {
    const s = nextSteps || stepsRef.current;
    const target = Math.max(0, Math.min(next, s.length - 1));
    const prev = stepRef.current;
    wanted.current = target;

    const forward = target === prev + 1;
    const backward = target === prev - 1;
    // The rotation connecting two snapshots always lives on the higher-indexed
    // one; travelling backwards runs that same rotation in reverse.
    const rot = forward || backward ? s[Math.max(target, prev)]?.rotation : null;
    const from = forward || backward ? s[prev]?.blochVector : null;

    setTransition(rot && from && Math.abs(rot.angle) > 1e-9
      ? { from: [from.x, from.y, from.z], axis: rot.axis, angle: forward ? rot.angle : -rot.angle }
      : null);

    stepRef.current = target;
    setStep(target);
  }, []);

  // play
  useEffect(() => {
    if (!playing) return undefined;
    if (step >= total) { setPlaying(false); return undefined; }
    const id = setTimeout(() => goToStep(step + 1), 900);
    return () => clearTimeout(id);
  }, [playing, step, total, goToStep]);

  /** Play always rewinds first, so it replays the whole circuit rather than
   *  resuming from wherever the scrubber sat — which, right after building a
   *  circuit, means skipping every gate that set the state up. */
  const togglePlay = () => {
    if (playing) { setPlaying(false); return; }
    if (total === 0) return;
    goToStep(0);
    setPlaying(true);
  };

  /* Any edit to the circuit invalidates the arc the sphere was told to travel.
   *
   * The transition is computed when the SCRUBBER moves, from the gate that
   * connects two steps. Editing the circuit — dragging an angle, removing or
   * reordering a gate, undo — changes the destination without changing that
   * stored arc, so the sphere would animate the old rotation to the old target
   * and then jump to the real one. Dragging an RY slider showed it plainly: the
   * numbers tracked the angle while the arrow kept sweeping to where π/2 used
   * to land. Marking the next paint as a snap says "no arc here", and
   * insertGate still overwrites it with a real one on the same tick. */
  const push = useCallback((next, keepSelection = false) => {
    setTransition({ snap: true });
    const trimmed = history.slice(0, historyIndex + 1);
    setHistory([...trimmed, next]);
    setHistoryIndex(trimmed.length);
    if (!keepSelection) setSelected(null);
    if (!collapsed && !manualCollapse && trimmed.length === 1) setCollapsed(true);
  }, [history, historyIndex, collapsed, manualCollapse]);

  const addGate = (gate) => insertGate(gate, ops.length);

  const insertGate = (gate, index) => {
    const g = normalizeGate(gate);
    const op = isParameterized(g) ? { gate: g, param: angle } : { gate: g };
    const at = Math.max(0, Math.min(index, ops.length));
    const next = [...ops.slice(0, at), op, ...ops.slice(at)];
    push(next);
    if (isParameterized(g)) setSelected(at);
    // Hand over the steps this gate just created, so the sphere can animate into
    // the new state on the same tick rather than waiting for the next render.
    goToStep(at + 1, localResult(next).steps);
  };

  const moveGate = (from, index) => {
    const at = Math.max(0, Math.min(index, ops.length));
    if (at === from || at === from + 1) return;
    const next = [...ops];
    const [op] = next.splice(from, 1);
    next.splice(at > from ? at - 1 : at, 0, op);
    push(next);
  };

  const removeGate = (i) => push(ops.filter((_, k) => k !== i));

  /* Dragging a rotation gate's angle has a real arc, and it is worth drawing.
   *
   * Turning gate k from θ to θ+δ gives R(θ+δ)·ψ = R(δ)·R(θ)·ψ, so the vector
   * already on screen simply rotates by δ about that gate's own axis. That
   * identity only holds while the scrubber is sitting on step k, though —
   * one step later there are further gates applied on top and R(δ) does not
   * commute past them, so the honest move there is to snap rather than draw an
   * arc that isn't the one being taken. */
  const changeAngle = (value) => {
    setAngle(value);
    if (selected === null || !isParameterized(ops[selected]?.gate)) return;

    const onThisGate = step === selected + 1;
    const delta = value - (ops[selected].param ?? 0);
    const axis = ROTATION_AXIS[ops[selected].gate];
    const from = view.blochVector;

    push(ops.map((op, i) => (i === selected ? { ...op, param: value } : op)), true);
    setSelected(selected);

    if (onThisGate && axis && Math.abs(delta) > 1e-9) {
      setTransition({ from: [from.x, from.y, from.z], axis, angle: delta });
    }
  };

  const clearCircuit = () => { push([]); goToStep(0, localResult([]).steps); setPlaying(false); };
  const undo = () => { setTransition({ snap: true }); setHistoryIndex((i) => Math.max(0, i - 1)); setSelected(null); };
  const redo = () => { setTransition({ snap: true }); setHistoryIndex((i) => Math.min(history.length - 1, i + 1)); setSelected(null); };

  // ?gates=H,S or ?case=P13 from the Learn page. Seeded once.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current) return;
    const g = searchParams.get('gates');
    const c = searchParams.get('case');
    if (!g && !c) return;
    seeded.current = true;

    const load = (parsed) => { setHistory([[], parsed]); setHistoryIndex(1); setCollapsed(true); goToStep(parsed.length, localResult(parsed).steps); };

    if (g) {
      load(g.split(',').map((tok) => {
        const [name, a] = tok.split(':');
        const gate = normalizeGate(name.trim());
        return isParameterized(gate) ? { gate, param: a ? Number(a) : Math.PI / 2 } : { gate };
      }));
      return;
    }
    getCircuit(c.toUpperCase())
      .then((data) => load(data.gates.map((op) => {
        const gate = normalizeGate(op.gate);
        return isParameterized(gate) ? { gate, param: op.params?.[0] ?? Math.PI / 2 } : { gate };
      })))
      // An unknown case id is a 404 on a link, not something the banner should
      // claim is a problem with the circuit; only an unreachable backend is.
      .catch((err) => { if (isOffline(err)) setBackendOnline(false); });
  }, [searchParams]);

  // keyboard scrubbing
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.metaKey || e.ctrlKey) return;
      if (e.key === 'ArrowRight') { setPlaying(false); goToStep(stepRef.current + 1); }
      if (e.key === 'ArrowLeft') { setPlaying(false); goToStep(stepRef.current - 1); }
      if (e.key === ' ') {
        e.preventDefault();
        // Same rewind-first rule as the button.
        setPlaying((wasPlaying) => {
          if (wasPlaying || total === 0) return false;
          goToStep(0);
          return true;
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [total, step, goToStep]);

  const gateCard = explain?.gate_cards?.find((c) => c.step === step) || null;
  const conceptExtra = explain ? concepts[explain.concept] : null;

  /* A pinned tip beats a rotating one whenever the circuit is in a state that
     has something specific worth saying. */
  const PHASE_ONLY = new Set(['Z', 'S', 'Sdg', 'T', 'Tdg', 'P', 'RZ']);
  const tip = (() => {
    if (!ops.length) return 'Click a gate in the palette, or drag one onto the wire. An empty circuit is still a valid one — that vector at the north pole is |0⟩.';
    if (selected !== null && isParameterized(ops[selected]?.gate)) {
      return 'Drag the angle slider and watch the sphere follow. Nothing is re-run on the server per frame — the whole circuit re-simulates in microseconds.';
    }
    const last = ops[ops.length - 1]?.gate;
    if (PHASE_ONLY.has(last) && view.blochVector.z > 0.999) {
      return `A phase gate on a pole does nothing visible — ${last} moved the statevector but the sphere and the bars are unchanged. Put an H in front of it and look again.`;
    }
    if (PHASE_ONLY.has(last)) return `${last} is a phase gate: the sphere turns about z and the probability bars do not move at all. That gap is what phase is.`;
    return null;
  })();

  return (
    <div className="container" style={S.page}>
      <GuidedTour steps={TOUR} tourKey="1q" open={tour} onClose={() => setTour(false)} />

      <div style={{ ...S.grid, gridTemplateColumns: collapsed ? '92px minmax(0,1fr)' : '210px minmax(0,1fr)' }}>
        {/* Wrapped so the tour has something to point at — GatePalette fills
            this to 100% height, so the cell measures the same either way. */}
        <div data-tour="palette" style={{ minHeight: 0 }}>
          <GatePalette
            onAddGate={addGate}
            collapsed={collapsed}
            onToggleCollapsed={() => { setManualCollapse(true); setCollapsed((c) => !c); }}
          />
        </div>

        <div style={S.stage}>
          {/* left: circuit, transport, explanation */}
          <div style={S.left}>
            <div className="card" style={S.card}>
              <div style={S.head}>
                <div>
                  <h1 style={{ fontSize: 'clamp(15px, 2.2vh, 18px)', margin: 0 }}>My Circuit</h1>
                  <p style={{ fontSize: 'var(--fs-sm)', marginTop: 3 }}>Build your quantum circuit</p>
                </div>
                <div data-tour="header" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {/* Mirrors the "One qubit instead" button on the two-qubit
                      page. Without it the switch only worked in one direction. */}
                  <IconBtn title="Take the tour again" onClick={() => setTour(true)}>
                    <HelpCircle size={15} />
                  </IconBtn>
                  <IconBtn title="Two qubits instead" onClick={() => navigate('/simulator/two-qubit')}>
                    <Link2 size={14} />
                  </IconBtn>
                  <IconBtn title="Undo" onClick={undo} disabled={historyIndex === 0}><Undo2 size={15} /></IconBtn>
                  <IconBtn title="Redo" onClick={redo} disabled={historyIndex === history.length - 1}><Redo2 size={15} /></IconBtn>
                  <button onClick={clearCircuit} disabled={ops.length === 0} className="btn-ghost"
                    style={{ padding: '8px 14px', fontSize: 13, opacity: ops.length === 0 ? 0.5 : 1 }}>Clear</button>
                  <button onClick={() => navigate('/exit', { state: { gatesUsed: [...new Set(ops.map((o) => o.gate))], gateCount: ops.length, nQubits: 1 } })}
                    className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', fontSize: 13 }}>
                    <LogOut size={14} /> End simulation
                  </button>
                </div>
              </div>

              <div data-tour="circuit">
                <CircuitStrip
                  ops={ops}
                  step={step}
                  selected={selected}
                  onSelect={(i) => { setSelected(i); if (i !== null) goToStep(i + 1); }}
                  onRemove={removeGate}
                  onInsert={insertGate}
                  onMove={moveGate}
                />
              </div>

              <div style={{ marginTop: 14 }}>
                <div data-tour="transport">
                  <TransportBar
                    step={step} total={total} playing={playing}
                    onStep={(s) => { setPlaying(false); goToStep(s); }}
                    onPlayToggle={togglePlay}
                  />
                </div>
                <BackendNotice offline={!backendOnline} error={apiError} />
                <div data-tour="angle">
                  <AngleBox
                    angle={angle}
                    onChange={changeAngle}
                    editing={selected !== null && isParameterized(ops[selected]?.gate) ? selected + 1 : null}
                  />
                </div>
                <div data-tour="tip"><TipBox context={tip} /></div>
              </div>
            </div>

            <div className="card" data-tour="explain" style={S.card}>
              <ExplainPanel
                gateCard={gateCard}
                gateCards={explain?.gate_cards}
                explain={explain?.explain}
                conceptExtra={conceptExtra}
                step={step}
                totalSteps={total}
                onPickStep={(s) => { setPlaying(false); goToStep(s); }}
              />
            </div>
          </div>

          {/* right: sphere, then the two readouts beneath it */}
          <div style={S.right}>
            <div className="card" data-tour="sphere" style={{ ...S.card, alignItems: 'center', display: 'flex', flexDirection: 'column' }}>
              <h4 style={S.sectionHeading}>Bloch sphere</h4>
              <BlochSphereClassic vector={view.blochVector} transition={transition} size={380} />
              <div style={S.stepGate}>
                {view.gate ? `after ${view.gate}` : 'initial state |0⟩'}
              </div>
              <div className="mono" style={S.rotInfo}>
                {view.rotation
                  ? `rotation: ${view.rotation.angle.toFixed(4)} rad about (${view.rotation.axis.map((v) => v.toFixed(2)).join(', ')})`
                  : ''}
              </div>
              <div className="mono" style={S.readout}>
                x <b>{view.blochVector.x.toFixed(4)}</b>&nbsp; y <b>{view.blochVector.y.toFixed(4)}</b>&nbsp;
                z <b>{view.blochVector.z.toFixed(4)}</b><br />
                length <b>{(view.blochLength ?? 1).toFixed(4)}</b>
              </div>
              <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)', marginTop: 6 }}>Drag to rotate the view.</p>
            </div>

            <div className="card" data-tour="readouts" style={S.card}>
              <h4 style={S.sectionHeading}>Probability distribution</h4>
              <ProbabilityBars probabilities={view.probabilities} />
              <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)', marginTop: 12 }}>
                Measured in the computational basis. Always sums to 1.
              </p>
            </div>

            <div className="card" data-tour="statevector" style={S.card}>
              <h4 style={S.sectionHeading}>State vector</h4>
              <StateVectorPanel amplitudes={view.amplitudes} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function IconBtn({ children, title, onClick, disabled }) {
  return (
    <button title={title} onClick={onClick} disabled={disabled}
      style={{
        width: 34, height: 34, borderRadius: 9, border: '1px solid var(--border)',
        background: 'var(--surface-alt)', color: disabled ? 'var(--border)' : 'var(--ink)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}>
      {children}
    </button>
  );
}

const S = {
  page: {
    paddingTop: 'var(--gap-sm)', paddingBottom: 'var(--gap-sm)',
    height: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column',
  },
  grid: { display: 'grid', gap: 'var(--gap-sm)', flex: 1, minHeight: 0 },
  stage: {
    display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 430px',
    gap: 'var(--gap-sm)', minHeight: 0, overflowY: 'auto', alignItems: 'start',
  },
  left: { display: 'flex', flexDirection: 'column', gap: 'var(--gap-sm)', minWidth: 0 },
  right: { display: 'flex', flexDirection: 'column', gap: 'var(--gap-sm)', minWidth: 0 },
  card: { padding: 'var(--pad-card)' },
  head: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 'var(--gap-sm)' },
  sectionHeading: {
    fontSize: 'var(--fs-sm)', textTransform: 'uppercase', letterSpacing: '0.06em',
    color: 'var(--ink-soft)', marginBottom: 'var(--gap-xs)', alignSelf: 'flex-start',
  },
  stepGate: { fontSize: 14, fontWeight: 600, marginTop: 4, textAlign: 'center' },
  rotInfo: { fontSize: 11.5, color: 'var(--phase-270)', marginTop: 4, minHeight: 16, textAlign: 'center' },
  readout: { fontSize: 12, color: 'var(--ink-soft)', marginTop: 6, textAlign: 'center', lineHeight: 1.7 },
};

void ROTATIONS;
