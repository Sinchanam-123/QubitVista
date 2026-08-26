import { Link } from 'react-router-dom';
import { ArrowLeft, Sparkles, Boxes, Orbit, GraduationCap } from 'lucide-react';

const OBJECTIVES = [
  {
    icon: Sparkles,
    title: 'A user-friendly, web-based environment',
    body: 'Build and experiment with basic quantum circuits without installing a research-grade toolchain first.',
  },
  {
    icon: Orbit,
    title: 'Real-time simulation',
    body: 'Every gate you add visualizes the quantum state evolving immediately — no re-running, no waiting.',
  },
  {
    icon: Boxes,
    title: 'Interactive visualization modules',
    body: 'Bloch sphere representation, state vectors, and probability distributions, built for intuitive understanding.',
  },
  {
    icon: GraduationCap,
    title: 'Simplifying the hard concepts',
    body: 'Superposition, phase, interference, and state transformation — approachable through hands-on interaction, not just equations.',
  },
];

export default function About() {
  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 90, maxWidth: 760 }}>
      <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, textDecoration: 'none', color: 'var(--ink-soft)' }}>
        <ArrowLeft size={16} /> Back to home
      </Link>

      <h1 style={{ fontSize: 34, marginTop: 24 }}>About QubitVista</h1>
      <p style={{ marginTop: 14, fontSize: 16 }}>
        Quantum computing is hard to feel. Superposition, entanglement, interference, and phase tend to stay
        equations on a page — you can run a circuit in most existing tools, but you rarely get to see how the
        state actually evolved to get there. QubitVista puts that front and center: it's a browser-based quantum
        circuit simulator built for students, educators, and anyone curious who doesn't want to fight through a
        research-grade toolchain just to watch a qubit move.
      </p>

      <h2 style={{ fontSize: 20, marginTop: 40, marginBottom: 18 }}>Project objectives</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {OBJECTIVES.map((o) => {
          const Icon = o.icon;
          return (
            <div key={o.title} className="card" style={{ padding: 18, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--surface-alt)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={18} color="var(--phase-0)" />
              </div>
              <div>
                <h3 style={{ fontSize: 15 }}>{o.title}</h3>
                <p style={{ fontSize: 14, marginTop: 4 }}>{o.body}</p>
              </div>
            </div>
          );
        })}
      </div>

      <h2 style={{ fontSize: 20, marginTop: 40, marginBottom: 12 }}>How it works</h2>
      <p style={{ fontSize: 15 }}>
        The simulation itself runs on Qiskit, exposed through a FastAPI backend, so the numbers you see are
        correct rather than approximated. The frontend handles all the drawing: Three.js renders the 3D Bloch
        sphere, and Plotly renders the probability and amplitude plots. Right now the interface also ships with
        a small in-browser statevector engine so you can try it immediately, even before that backend is wired
        up.
      </p>

      <h2 style={{ fontSize: 20, marginTop: 40, marginBottom: 12 }}>What's next</h2>
      <p style={{ fontSize: 15 }}>
        Support for larger multi-qubit circuits, stepping through a circuit one gate at a time, noise and error
        modeling, more guided example circuits, and the ability to export a circuit to run on real quantum
        hardware are all on the roadmap.
      </p>

      <Link to="/simulator" className="btn-primary" style={{ marginTop: 36, textDecoration: 'none', display: 'inline-block' }}>
        Try the simulator
      </Link>
    </div>
  );
}
