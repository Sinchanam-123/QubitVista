import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LogOut, Undo2, Redo2, Circle, HelpCircle } from 'lucide-react';
import GuidedTour, { tourSeen } from '../components/GuidedTour';
import GatePalette from '../components/GatePalette';
import BlochPair from '../components/classic/BlochPair';
import CircuitStrip2 from '../components/classic/CircuitStrip2';
import ExplainPanel from '../components/classic/ExplainPanel';
import { TransportBar, AngleBox } from '../components/classic/Controls';
import TipBox from '../components/classic/TipBox';
import BackendNotice from '../components/classic/BackendNotice';
import { ProbabilityBars, StateVectorPanel, EntanglementMeter } from '../components/classic/Readouts';
import { isParameterized, GATE_GROUPS_2Q, GATE_LIST_2Q } from '../utils/quantumEngine';
import { isTwoQubit } from '../utils/quantumEngine2';
import useSimulation2 from '../hooks/useSimulation2';
import { explain2 as fetchExplain2, getCircuit, getConcepts, isOffline, localResult2 } from '../utils/api';

/* The two-qubit simulator.
 *
 * Same shape as the single-qubit page and deliberately so — circuit and its
 * explanation down the left, visual state down the right, steps[k] as an array
 * index rather than a request. What changes is what the right column can show:
 * two spheres instead of one, four bars instead of two, and an entanglement
 * readout that only means anything once two wires can interact.
 *
 * The one rule this page must not get wrong: CX, CZ and SWAP report a null
 * rotation, because they are not a rotation of either Bloch sphere. Everything
 * that animates null-checks it.
 */

const NUM_QUBITS = 2;

// Which axis each rotation gate turns about — the same table the engine and the
// API report, so a dragged angle animates along the axis the gate really uses.
const ROTATION_AXIS = {
  RX: [1, 0, 0], RY: [0, 1, 0], RZ: [0, 0, 1], P: [0, 0, 1],
};

/* Its own tour, not a rerun of the one-qubit one. Someone who has already seen
   that page still has not met a second wire, a control, or a readout that goes
   to zero when things are working correctly — and that last one looks so much
   like a bug that it is worth saying out loud before they meet it. */
const TOUR = [
  {
    title: 'Two qubits now',
    body: 'Two balls instead of one, on two wires. Most of this page works exactly like the single-qubit one — what is new is that the two can be joined together, and that changes what the panels mean.',
  },
  { target: 'presets', title: 'Fastest way in', body: 'Eight ready-made circuits, one per idea. Click any of them to load it and see what it does — the quickest way to find out what this page is for.' },
  { target: 'circuit', title: 'Pick a wire, then a gate', body: 'Click q0 or q1 on the left to choose which wire your next gate lands on, or just drag a gate straight onto the one you want. Gates that need both wires draw a line between them.' },
  { target: 'palette', title: 'Three new gates', body: 'CX, CZ and SWAP sit at the top of the palette. They act on two wires at once — one is the control, the other the target — and they are the only gates here that can tie the qubits together. On a placed one, ⇄ swaps which wire is which.' },
  { target: 'transport', title: 'Step through it', body: 'Same scrubber as before. Play replays the circuit from the start, which is the best way to catch the exact moment the two qubits become linked.' },
  { target: 'angle', title: 'Gates you can dial', body: 'RX, RY, RZ and P take an angle. Click one in the circuit and drag this slider — put an RY before a CX and you can tune the pair from completely independent to fully linked and back, continuously.' },
  { target: 'spheres', title: 'Both arrows at once', body: 'One ball per wire. Watch the length reading under each: when the two qubits get joined, both arrows shrink away to nothing. That is not a bug — it is the whole point, and the next panel explains it.' },
  { target: 'entanglement', title: 'The one that surprises people', body: 'This bar fills as the two become linked. When it reads 1, neither qubit has a state of its own any more, even though the pair is perfectly well defined and the bars below are exact.' },
  { target: 'readouts', title: 'Four outcomes, not two', body: 'Two qubits have four possible results. The labels read q1q0 — the right-hand digit is q0 — so an X on q0 alone gives 01, not 10. Getting that backwards is the most common mistake here.' },
  { target: 'statevector', title: 'The part the bars cannot show', body: 'Four amplitudes, each with a direction as well as a size. CZ flips the sign of one of them and moves no bar at all — this is the only panel where that is visible.' },
  { target: 'tip', title: 'Hints as you go', body: 'This line reacts to what you just did. When a two-qubit gate runs and nothing appears to happen, it stays put and tells you why rather than moving on.' },
  { target: 'explain', title: 'And this explains it', body: 'Plain-English notes on what your circuit is doing, and what stayed still. Switch to Gates for a reference card on anything you have placed.' },
  { target: 'header', title: 'Undo, restart, switch', body: 'Undo and redo any edit, clear both wires, or drop back to a single qubit. The ? button replays this tour. End simulation closes out with a summary of what you built.' },
];

/** API gate names are upper case; the palette keys are 'Sdg' / 'Tdg'. */
function normalizeGate(name) {
  const u = String(name).toUpperCase();
  if (u === 'SDG') return 'Sdg';
  if (u === 'TDG') return 'Tdg';
  return u;
}

export default function SimulatorTwo() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [history, setHistory] = useState([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [manualCollapse, setManualCollapse] = useState(false);
  const [angle, setAngle] = useState(Math.PI / 2);
  const [wire, setWire] = useState(0);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  // Auto-runs on a first visit, and always when the chooser asks for it via
  // ?tour=1. The header ? button replays it on demand.
  const [tour, setTour] = useState(
    () => new URLSearchParams(window.location.search).get('tour') === '1' || !tourSeen('2q'),
  );

  const ops = history[historyIndex];
  const sim = useSimulation2(ops);
  const steps = sim.steps;
  const total = steps.length - 1;

  const [explain, setExplain] = useState(null);
  const [concepts, setConcepts] = useState({});
  // What the loaded circuit is *for*, when it came from the catalogue. Several
  // circuits demonstrate two things at once — H·H·CZ really is entangled — so
  // without this the phase preset would open a panel about entanglement.
  // Cleared the moment the user edits, at which point inference is the honest
  // answer again.
  const [presetConcept, setPresetConcept] = useState(null);

  /* Whether the backend answered at all, and what it said if it refused — the
   * same two states as the single-qubit page, and kept apart for the same
   * reason. This page has more to lose when the backend goes: without it the
   * preset row above the circuit strip vanishes entirely, since every preset is
   * read from the catalogue. See the note in BackendNotice. */
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
    getConcepts(NUM_QUBITS)
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
    fetchExplain2(ops, { concept: presetConcept })
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
  }, [opsKey, presetConcept, noteFailure]);

  // Clamps to the step that was *asked for*, not to wherever the scrubber
  // happens to sit — a circuit loaded from a preset or ?case= asks for its last
  // step before the simulation has caught up, and clamping the live value alone
  // would pin it to step 0 and open the circuit without ever showing it run.
  useEffect(() => {
    setStep(() => {
      const clamped = Math.min(wanted.current, total);
      stepRef.current = clamped;
      return clamped;
    });
  }, [total]);

  const view = steps[Math.min(step, total)] || steps[0];

  const stepsRef = useRef(steps);
  stepsRef.current = steps;
  const stepRef = useRef(step);
  stepRef.current = step;
  // The step last asked for, before any clamping — see the effect above.
  const wanted = useRef(0);
  const [transitions, setTransitions] = useState([null, null]);

  /** Move the scrubber, working out the arc each sphere travels.
   *
   *  Only the gate's target wire moves under a single-qubit gate, so the other
   *  sphere gets no transition at all. An entangling gate has no axis on either
   *  sphere — rotation is null — and both fall through to a direct cut, which
   *  is the honest picture: the motion genuinely is not a rotation. */
  const goToStep = useCallback((next, nextSteps) => {
    const s = nextSteps || stepsRef.current;
    const target = Math.max(0, Math.min(next, s.length - 1));
    const prev = stepRef.current;
    wanted.current = target;

    const forward = target === prev + 1;
    const backward = target === prev - 1;
    const edge = forward || backward ? s[Math.max(target, prev)] : null;
    const rot = edge?.rotation;
    const wireIndex = edge?.target ?? 0;
    const from = forward || backward ? s[prev]?.bloch?.[wireIndex]?.vector : null;

    const next2 = [null, null];
    if (rot && from && Math.abs(rot.angle) > 1e-9) {
      next2[wireIndex] = {
        from: [from.x, from.y, from.z],
        axis: rot.axis,
        angle: forward ? rot.angle : -rot.angle,
      };
    }
    setTransitions(next2);

    stepRef.current = target;
    setStep(target);
  }, []);

  useEffect(() => {
    if (!playing) return undefined;
    if (step >= total) { setPlaying(false); return undefined; }
    const id = setTimeout(() => goToStep(step + 1), 900);
    return () => clearTimeout(id);
  }, [playing, step, total, goToStep]);

  /** Play always replays the whole circuit from |00⟩.
   *
   *  It used to resume from wherever the scrubber sat, which meant that after
   *  building a circuit — when the scrubber is parked on the last step — play
   *  either did nothing or skipped the setup gates that everything after them
   *  depends on. Watching a Bell pair form is the point; starting at the CX
   *  shows only the half of it that has no rotation. */
  const togglePlay = () => {
    if (playing) { setPlaying(false); return; }
    if (total === 0) return;
    goToStep(0);
    setPlaying(true);
  };

  /* Any edit to the circuit invalidates the arcs the spheres were told to
   * travel — see the note on the single-qubit page. Dragging an angle, flipping
   * a control, removing or reordering a gate all move the destination without
   * changing the stored rotation, so the arrows would sweep to where the old
   * angle used to land before jumping. insertGate overwrites this with a real
   * arc on the same tick. */
  const push = useCallback((next, keepSelection = false) => {
    setTransitions([{ snap: true }, { snap: true }]);
    // Any edit means this is no longer the catalogue's circuit.
    setPresetConcept(null);
    const trimmed = history.slice(0, historyIndex + 1);
    setHistory([...trimmed, next]);
    setHistoryIndex(trimmed.length);
    if (!keepSelection) setSelected(null);
    if (!collapsed && !manualCollapse && trimmed.length === 1) setCollapsed(true);
  }, [history, historyIndex, collapsed, manualCollapse]);

  /** Build an op for a gate landing on `onWire`. With exactly two wires the
   *  control of a two-qubit gate is fully determined by its target. */
  const makeOp = (gate, onWire) => {
    const g = normalizeGate(gate);
    const op = { gate: g, target: onWire };
    if (isTwoQubit(g)) op.control = 1 - onWire;
    if (isParameterized(g)) op.param = angle;
    return op;
  };

  const addGate = (gate) => insertGate(gate, ops.length, wire);

  const insertGate = (gate, index, onWire = wire) => {
    const op = makeOp(gate, onWire);
    const at = Math.max(0, Math.min(index, ops.length));
    const next = [...ops.slice(0, at), op, ...ops.slice(at)];
    push(next);
    if (isParameterized(op.gate) || isTwoQubit(op.gate)) setSelected(at);
    goToStep(at + 1, localResult2(next).steps);
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

  /** Swap a two-qubit gate's control and target. CX is the gate where this
   *  changes the physics; on CZ and SWAP it changes only the drawing. */
  const flipGate = (i) => {
    push(ops.map((op, k) => (
      k === i && isTwoQubit(op.gate)
        ? { ...op, target: op.control ?? 1 - (op.target ?? 0), control: op.target ?? 0 }
        : op
    )), true);
    setSelected(i);
  };

  /* Dragging a rotation gate's angle has a real arc — see the note on the
   * single-qubit page. Only the gate's own wire turns, so the other sphere gets
   * no transition, and the identity only holds while the scrubber is on that
   * gate's step. */
  const changeAngle = (value) => {
    setAngle(value);
    if (selected === null || !isParameterized(ops[selected]?.gate)) return;

    const op = ops[selected];
    const onThisGate = step === selected + 1;
    const delta = value - (op.param ?? 0);
    const axis = ROTATION_AXIS[op.gate];
    const wireIndex = op.target ?? 0;
    const from = view.bloch?.[wireIndex]?.vector;

    push(ops.map((o, i) => (i === selected ? { ...o, param: value } : o)), true);
    setSelected(selected);

    if (onThisGate && axis && from && Math.abs(delta) > 1e-9) {
      const next = [null, null];
      next[wireIndex] = { from: [from.x, from.y, from.z], axis, angle: delta };
      setTransitions(next);
    }
  };

  const clearCircuit = () => { push([]); goToStep(0, localResult2([]).steps); setPlaying(false); };
  const undo = () => { setTransitions([{ snap: true }, { snap: true }]); setHistoryIndex((i) => Math.max(0, i - 1)); setSelected(null); };
  const redo = () => { setTransitions([{ snap: true }, { snap: true }]); setHistoryIndex((i) => Math.min(history.length - 1, i + 1)); setSelected(null); };

  /** Load a catalogue circuit — API gate ops straight into UI ops. */
  const loadGates = useCallback((apiGates, concept = null) => {
    const parsed = apiGates.map((g) => {
      const gate = normalizeGate(g.gate);
      const op = { gate, target: g.target ?? 0 };
      if (isTwoQubit(gate)) op.control = g.control ?? 1 - op.target;
      if (isParameterized(gate)) op.param = g.params?.[0] ?? Math.PI / 2;
      return op;
    });
    setHistory([[], parsed]);
    setHistoryIndex(1);
    setCollapsed(true);
    setSelected(null);
    setPlaying(false);
    setPresetConcept(concept);
    goToStep(parsed.length, localResult2(parsed).steps);
  }, [goToStep]);

  // ?case=E01 opens a catalogue circuit. Seeded once.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current) return;
    const c = searchParams.get('case');
    if (!c) return;
    seeded.current = true;
    getCircuit(c.toUpperCase(), NUM_QUBITS)
      .then((data) => loadGates(data.gates, data.concept))
      // An unknown case id is a 404 on a link, not something the banner should
      // claim is a problem with the circuit; only an unreachable backend is.
      .catch((err) => { if (isOffline(err)) setBackendOnline(false); });
  }, [searchParams, loadGates]);

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
  const tip = (() => {
    if (!ops.length) return 'Pick a wire on the left of the strip, then click a gate. CX, CZ and SWAP take the other wire as their control.';
    const twoQ = ops[selected ?? -1] && isTwoQubit(ops[selected].gate);
    if (twoQ) return 'This gate spans both wires. Hit ⇄ under it to swap control and target — on a CX that changes the result, on CZ and SWAP it only changes the drawing.';
    if (view.concurrence > 0.999) return 'Both Bloch vectors have collapsed to the origin. The pair has a state; neither qubit has one of its own.';
    if (view.concurrence > 1e-6) return `Partially entangled — concurrence ${view.concurrence.toFixed(2)}. The Bloch length is √(1 − C²), which is why it sits between 0 and 1.`;
    if (ops.some((o) => isTwoQubit(o.gate))) return 'A two-qubit gate ran and the pair is still separable. Being a two-qubit gate is not the same as being an entangling gate.';
    return null;
  })();

  return (
    <div className="container" style={S.page}>
      <GuidedTour steps={TOUR} tourKey="2q" open={tour} onClose={() => setTour(false)} />

      <div style={{ ...S.grid, gridTemplateColumns: collapsed ? '92px minmax(0,1fr)' : '210px minmax(0,1fr)' }}>
        <div data-tour="palette" style={{ minHeight: 0 }}>
        <GatePalette
          onAddGate={addGate}
          collapsed={collapsed}
          onToggleCollapsed={() => { setManualCollapse(true); setCollapsed((c) => !c); }}
          groups={GATE_GROUPS_2Q}
          list={GATE_LIST_2Q}
        />
        </div>

        <div style={S.stage}>
          {/* left: circuit, transport, explanation */}
          <div style={S.left}>
            <div className="card" style={S.card}>
              <div style={S.head}>
                <div>
                  <h1 style={{ fontSize: 'clamp(15px, 2.2vh, 18px)', margin: 0 }}>My Circuit — two qubits</h1>
                  <p style={{ fontSize: 'var(--fs-sm)', marginTop: 3 }}>
                    CX, CZ and SWAP need two wires. Outcomes read <span className="mono">q1q0</span>.
                  </p>
                </div>
                <div data-tour="header" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <IconBtn title="Take the tour again" onClick={() => setTour(true)}><HelpCircle size={15} /></IconBtn>
                  <IconBtn title="One qubit instead" onClick={() => navigate('/simulator')}><Circle size={14} /></IconBtn>
                  <IconBtn title="Undo" onClick={undo} disabled={historyIndex === 0}><Undo2 size={15} /></IconBtn>
                  <IconBtn title="Redo" onClick={redo} disabled={historyIndex === history.length - 1}><Redo2 size={15} /></IconBtn>
                  <button onClick={clearCircuit} disabled={ops.length === 0} className="btn-ghost"
                    style={{ padding: '8px 14px', fontSize: 13, opacity: ops.length === 0 ? 0.5 : 1 }}>Clear</button>
                  <button onClick={() => navigate('/exit', { state: { gatesUsed: [...new Set(ops.map((o) => o.gate))], gateCount: ops.length, nQubits: NUM_QUBITS, entangled: steps.some((s) => (s.concurrence || 0) > 1e-6) } })}
                    className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', fontSize: 13 }}>
                    <LogOut size={14} /> End simulation
                  </button>
                </div>
              </div>

              <div data-tour="presets"><ConceptPresets concepts={concepts} onPick={loadGates} /></div>

              <div data-tour="circuit">
              <CircuitStrip2
                ops={ops}
                step={step}
                selected={selected}
                wire={wire}
                onWire={setWire}
                onSelect={(i) => { setSelected(i); if (i !== null) goToStep(i + 1); }}
                onRemove={removeGate}
                onInsert={insertGate}
                onMove={moveGate}
                onFlip={flipGate}
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
                <div data-tour="tip"><TipBox nQubits={NUM_QUBITS} context={tip} /></div>
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

          {/* right: the pair, entanglement, then the two numeric readouts */}
          <div style={S.right}>
            <div className="card" data-tour="spheres" style={{ ...S.card, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h4 style={S.sectionHeading}>Bloch spheres</h4>
              <BlochPair bloch={view.bloch} transitions={transitions} size={205} />
              <div style={S.stepGate}>
                {view.gate
                  ? `after ${describeStep(view)}`
                  : 'initial state |00⟩'}
              </div>
              <div className="mono" style={S.rotInfo}>
                {view.gate && !view.rotation
                  ? 'no rotation — a two-qubit gate is not a turn of either sphere'
                  : view.rotation
                    ? `q${view.target}: ${view.rotation.angle.toFixed(4)} rad about (${view.rotation.axis.map((v) => v.toFixed(2)).join(', ')})`
                    : ''}
              </div>
            </div>

            <div className="card" data-tour="entanglement" style={S.card}>
              <h4 style={S.sectionHeading}>Entanglement</h4>
              <EntanglementMeter concurrence={view.concurrence} bloch={view.bloch} />
            </div>

            <div className="card" data-tour="readouts" style={S.card}>
              <h4 style={S.sectionHeading}>Probability distribution</h4>
              <ProbabilityBars probabilities={view.probabilities} nQubits={NUM_QUBITS} />
              <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-soft)', marginTop: 12 }}>
                Labels read <span className="mono">q1q0</span> — q0 is the right-hand character, matching
                Qiskit. Always sums to 1.
              </p>
            </div>

            <div className="card" data-tour="statevector" style={S.card}>
              <h4 style={S.sectionHeading}>State vector</h4>
              <StateVectorPanel amplitudes={view.amplitudes} nQubits={NUM_QUBITS} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** One-click demo per concept, straight from the golden catalogue. */
function ConceptPresets({ concepts, onPick }) {
  const entries = Object.entries(concepts).filter(([, v]) => v.preset);
  if (!entries.length) return null;

  return (
    <div style={S.presets}>
      <span style={S.presetsLabel}>Try</span>
      {entries.map(([name, meta]) => (
        <button
          key={name}
          onClick={() => onPick(meta.preset.gates, name)}
          title={`${meta.preset.case_id} · ${meta.preset.label}`}
          style={S.presetChip}
        >
          {meta.icon ? `${meta.icon} ` : ''}{meta.label}
        </button>
      ))}
    </div>
  );
}

/** "CX q0→q1" rather than just "CX" — with two wires in play the name alone
 *  does not say what happened. SWAP gets ↔ instead: it has two wires but no
 *  direction, and an arrow would imply one that isn't there. */
function describeStep(view) {
  if (view.control === null || view.control === undefined) return `${view.gate} q${view.target}`;
  const join = view.gate === 'SWAP' ? '↔' : '→';
  return `${view.gate} q${view.control}${join}q${view.target}`;
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
    display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 470px',
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
  stepGate: { fontSize: 14, fontWeight: 600, marginTop: 8, textAlign: 'center' },
  rotInfo: { fontSize: 11.5, color: 'var(--phase-270)', marginTop: 4, minHeight: 16, textAlign: 'center' },

  presets: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 5, marginBottom: 10 },
  presetsLabel: {
    fontSize: 10.5, fontFamily: 'var(--font-mono)', letterSpacing: '0.1em',
    textTransform: 'uppercase', color: 'var(--ink-soft)', marginRight: 3,
  },
  presetChip: {
    padding: '4px 10px', fontSize: 11.5, cursor: 'pointer', whiteSpace: 'nowrap',
    background: 'var(--surface-alt)', color: 'var(--ink-soft)',
    border: '1px solid var(--border)', borderRadius: 999,
  },
};
