/* The two-qubit hero visual — deliberately NOT a pair of Bloch spheres.
 *
 * Two spheres side by side is the obvious drawing and the least informative
 * one: they show what each qubit is doing separately, which for an entangled
 * pair is precisely nothing. The interesting object is the *relationship*, and
 * a sphere has nowhere to put it.
 *
 * So this draws the relationship directly:
 *
 *   nodes   one per qubit. Solid and bright while the qubit still has a state
 *           of its own; hollowing out to a dashed ring as its Bloch length
 *           falls to zero. That emptying is the same fact the sphere shows, in
 *           a shape that has room for the bond.
 *   bond    thickness, glow and flow speed track concurrence. Slack grey dashes
 *           when the pair is separable; a taut, travelling gradient at 1.
 *   grid    the four joint outcomes as a 2x2 board, q0 across and q1 down.
 *           A Bell pair lights the diagonal and leaves the off-diagonal black,
 *           which IS the correlation — measure one and the other is decided.
 *
 * Every value comes from quantumEngine2, the same engine the simulator runs.
 */

export default function PairVisual({ bloch, probabilities, concurrence, size = 240 }) {
  const c = Math.max(0, Math.min(1, concurrence));
  const w = size;
  const h = Math.round(size * 0.42);

  const cx = [w * 0.26, w * 0.74];
  const cy = h * 0.5;
  const r = Math.min(26, w * 0.11);

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: w, overflow: 'visible' }} aria-hidden="true">
        <defs>
          <linearGradient id="pv-bond" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--phase-90)" />
            <stop offset="50%" stopColor="var(--phase-180)" />
            <stop offset="100%" stopColor="var(--phase-90)" />
          </linearGradient>
          {[0, 1].map((q) => (
            <radialGradient key={q} id={`pv-node-${q}`} cx="35%" cy="30%">
              <stop offset="0%" stopColor="var(--phase-90)" />
              <stop offset="100%" stopColor="var(--phase-0)" />
            </radialGradient>
          ))}
        </defs>

        {/* the bond, drawn under the nodes */}
        <line
          x1={cx[0] + r} y1={cy} x2={cx[1] - r} y2={cy}
          stroke={c > 0.01 ? 'url(#pv-bond)' : 'var(--border)'}
          strokeWidth={1.5 + c * 5}
          strokeLinecap="round"
          strokeDasharray={c > 0.01 ? '10 7' : '3 5'}
          opacity={c > 0.01 ? 0.55 + c * 0.45 : 0.6}
          style={{
            filter: c > 0.01 ? `drop-shadow(0 0 ${4 + c * 8}px var(--phase-180))` : 'none',
            animation: `pv-flow ${(2.2 - c * 1.4).toFixed(2)}s linear infinite`,
            transition: 'stroke-width .5s ease, opacity .5s ease',
          }}
        />

        {bloch.map((b, q) => {
          // length 1 = its own state, solid. length 0 = nothing left of its
          // own, so the fill drains away and only the outline remains.
          const solid = Math.max(0, Math.min(1, b.length));
          return (
            <g key={q}>
              <circle
                cx={cx[q]} cy={cy} r={r}
                fill={`url(#pv-node-${q})`}
                opacity={solid}
                style={{ transition: 'opacity .5s ease' }}
              />
              <circle
                cx={cx[q]} cy={cy} r={r}
                fill="none"
                stroke={solid > 0.02 ? 'var(--phase-90)' : 'var(--phase-180)'}
                strokeWidth="1.6"
                strokeDasharray={solid > 0.02 ? 'none' : '4 4'}
                opacity={solid > 0.02 ? 0.8 : 0.9}
              />
              <text
                x={cx[q]} y={cy + 4}
                textAnchor="middle"
                style={{
                  fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700,
                  fill: solid > 0.5 ? '#fff' : 'var(--ink-soft)',
                }}
              >
                q{q}
              </text>
              <text
                x={cx[q]} y={cy + r + 15}
                textAnchor="middle"
                style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, fill: 'var(--ink-soft)' }}
              >
                {solid > 0.02 ? `own state ${solid.toFixed(2)}` : 'no own state'}
              </text>
            </g>
          );
        })}

        <text
          x={w / 2} y={cy - r - 8}
          textAnchor="middle"
          style={{
            fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.1em',
            fill: c > 0.01 ? 'var(--phase-180)' : 'var(--ink-soft)',
            transition: 'fill .4s ease',
          }}
        >
          {c > 0.01 ? `ENTANGLED ${c.toFixed(2)}` : 'INDEPENDENT'}
        </text>
      </svg>

      <OutcomeGrid probabilities={probabilities} />
    </div>
  );
}

/** The four joint outcomes as a board: q0 across, q1 down.
 *  The shape of the lit cells is the lesson — a diagonal means the two agree. */
function OutcomeGrid({ probabilities }) {
  return (
    <div style={gridWrap}>
      <span className="mono" style={axisTop}>q0 →</span>
      <span className="mono" style={axisLeft}>q1 ↓</span>

      <div style={grid}>
        {[0, 1].map((q1) => [0, 1].map((q0) => {
          const i = q1 * 2 + q0;
          const p = probabilities[i];
          const lit = p > 0.001;
          return (
            <div
              key={i}
              style={{
                ...cell,
                background: lit
                  ? `linear-gradient(140deg, hsla(178, 70%, 55%, ${0.18 + p * 0.6}), hsla(285, 70%, 60%, ${0.18 + p * 0.6}))`
                  : 'var(--surface-alt)',
                borderColor: lit ? 'color-mix(in srgb, var(--phase-90) 55%, transparent)' : 'var(--border)',
                boxShadow: lit ? `0 0 ${Math.round(p * 16)}px hsla(200, 70%, 55%, ${p * 0.5})` : 'none',
              }}
            >
              <span className="mono" style={{ ...cellLabel, opacity: lit ? 1 : 0.4 }}>{`${q1}${q0}`}</span>
              <span className="mono" style={{ ...cellPct, opacity: lit ? 1 : 0.35 }}>
                {Math.round(p * 100)}%
              </span>
            </div>
          );
        }))}
      </div>
    </div>
  );
}

const gridWrap = {
  position: 'relative',
  display: 'inline-block',
  paddingTop: 13,
  paddingLeft: 26,
};

const axisTop = {
  position: 'absolute', top: 0, left: 26,
  fontSize: 9, letterSpacing: '0.08em', color: 'var(--ink-soft)',
};

const axisLeft = {
  position: 'absolute', left: 0, top: '58%',
  transform: 'translateY(-50%)',
  fontSize: 9, letterSpacing: '0.08em', color: 'var(--ink-soft)',
};

const grid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 4,
  width: 'min(150px, 42vw)',
};

const cell = {
  aspectRatio: '1.5 / 1',
  borderRadius: 8,
  border: '1px solid',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 1,
  transition: 'background .45s ease, box-shadow .45s ease, border-color .45s ease',
};

const cellLabel = { fontSize: 11, fontWeight: 700, color: 'var(--ink)', lineHeight: 1 };
const cellPct = { fontSize: 9.5, color: 'var(--ink-soft)', lineHeight: 1 };
