import { MousePointerClick, Boxes, Orbit, StepForward } from 'lucide-react';

// Each step borrows a stop from the phase-color wheel, so the strip reads
// as one sweep around the same hue circle the Bloch sphere uses — the
// "how to use" row and the simulator share a color language.
//
// The last step is the scrubber rather than "read the probabilities", because
// stepping through the circuit is the thing this tool has that the others
// don't. Reading the final bars is what every simulator already does.
const STEPS = [
  { icon: MousePointerClick, label: 'Pick a gate', hint: '16 of them, CX and SWAP included', color: 'var(--phase-0)' },
  { icon: Boxes, label: 'Drop it on a wire', hint: 'one qubit, or two', color: 'var(--phase-90)' },
  { icon: Orbit, label: 'Watch the state move', hint: 'along the gate’s true rotation arc', color: 'var(--phase-180)' },
  { icon: StepForward, label: 'Step through it', hint: 'every gate, forwards and back', color: 'var(--phase-270)' },
];

export default function WorkflowStrip() {
  return (
    <div>
      <div style={headingRow}>
        <span style={rule} />
        <span style={headingText}>How to use</span>
        <span style={rule} />
      </div>

      <div style={strip}>
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          // Steps land one after another, and each connector draws in the
          // gap between the two steps it joins.
          const stepDelay = `${i * 0.16}s`;
          const lineDelay = `${i * 0.16 + 0.1}s`;

          return (
            <div key={step.label} style={{ display: 'contents' }}>
              <div className="wf-step" style={{ ...stepBox, animationDelay: stepDelay }} tabIndex={0}>
                <div className="wf-icon" style={iconCircle}>
                  <span
                    className="wf-halo"
                    style={{
                      background: `radial-gradient(circle, ${step.color} 0%, transparent 70%)`,
                      animationDelay: `${i * 0.9}s`,
                    }}
                  />
                  <Icon size={20} color={step.color} style={{ position: 'relative', zIndex: 1 }} />
                  <span className="wf-num" style={{ background: step.color }}>{i + 1}</span>
                </div>

                <span style={labelStyle}>{step.label}</span>
                <span style={hintStyle}>{step.hint}</span>
              </div>

              {i < STEPS.length - 1 && (
                <span className="wf-line" style={{ ...lineStyle, animationDelay: lineDelay }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const headingRow = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 14,
  marginBottom: 'var(--gap-md)',
};

const rule = {
  height: 1,
  width: 'clamp(24px, 6vw, 70px)',
  background: 'linear-gradient(90deg, transparent, var(--border))',
};

const headingText = {
  fontFamily: 'var(--font-mono)',
  fontSize: 'clamp(10.5px, 1.3vh, 12px)',
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: 'var(--ink-soft)',
  whiteSpace: 'nowrap',
};

// Steps and connectors are siblings in one flex row (the wrappers use
// display:contents) so the connectors shrink first when space is tight.
const strip = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  gap: 'clamp(6px, 1vw, 14px)',
  flexWrap: 'wrap',
};

const stepBox = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 8,
  padding: '2px clamp(2px, 0.6vw, 10px)',
  maxWidth: 132,
  outline: 'none',
  cursor: 'default',
};

const iconCircle = {
  width: 'clamp(40px, 5.6vh, 54px)',
  height: 'clamp(40px, 5.6vh, 54px)',
  flexShrink: 0,
};

const labelStyle = {
  fontSize: 'clamp(11.5px, 1.5vh, 13px)',
  fontWeight: 600,
  color: 'var(--ink)',
  textAlign: 'center',
  lineHeight: 1.25,
};

const hintStyle = {
  fontSize: 'clamp(10px, 1.2vh, 11.5px)',
  color: 'var(--ink-soft)',
  textAlign: 'center',
  lineHeight: 1.3,
};

const lineStyle = {
  flex: '0 1 clamp(18px, 5vw, 64px)',
  minWidth: 14,
  marginTop: 'clamp(20px, 2.8vh, 27px)',
};
