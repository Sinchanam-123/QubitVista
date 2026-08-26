/* The two numeric readouts from the original design.
 *
 * ProbabilityBars — a real bar chart: y-axis 0→1 with gridlines, the value above
 * each bar, zero-probability states still drawn as stubs so the bars never jump.
 *
 * StateVectorPanel — one row per amplitude with a phase dial, a magnitude bar and
 * the raw numbers. The dial is the point: an S or T gate leaves the probability
 * bars untouched and moves only the needle, which is the whole lesson of phase.
 *
 * EntanglementMeter — two qubits only. Concurrence as a 0–1 bar, labelled in
 * English rather than by its physics name.
 *
 * `nQubits` widens all of them to 2**n basis states, in q1q0 order — q0 is the
 * RIGHT character, matching Qiskit. It defaults to 1, so the single-qubit page
 * renders exactly as it did before any of this existed.
 */

const deg = (rad) => `${(rad * 180 / Math.PI).toFixed(1)}°`;
const phaseColor = (p, mag) =>
  mag < 1e-9 ? 'transparent' : `hsl(${((p + Math.PI) / (Math.PI * 2)) * 360} 70% 55%)`;

export function ProbabilityBars({ probabilities, nQubits = 1 }) {
  const entries = probabilities.map((p, i) => [i.toString(2).padStart(nQubits, '0'), p]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '32px minmax(0,1fr)', gap: 6 }}>
      <div style={S.axis}>
        {['1.0', '0.75', '0.50', '0.25', '0'].map((t) => (
          <span key={t} style={{ lineHeight: 1, transform: 'translateY(-4px)' }}>{t}</span>
        ))}
      </div>

      <div style={S.plot}>
        {[0, 25, 50, 75, 100].map((p) => (
          <div key={p} style={{ ...S.gridline, bottom: `${p}%` }} />
        ))}
        <div style={S.bars}>
          {entries.map(([basis, p]) => (
            <div key={basis} style={S.slot}>
              <div className="mono" style={S.value}>{p.toFixed(4)}</div>
              <div
                style={{
                  ...S.bar,
                  height: `calc((100% - 18px) * ${p})`,
                  background: p < 1e-9 ? 'var(--border)' : 'var(--accent-grad)',
                }}
              />
              <div className="mono" style={S.basis}>{`|${basis}⟩`}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function StateVectorPanel({ amplitudes, nQubits = 1 }) {
  return (
    <div>
      {amplitudes.map((a, i) => {
        const basis = i.toString(2).padStart(nQubits, '0');
        const zero = a.magnitude < 1e-9;
        const col = phaseColor(a.phase, a.magnitude);
        const nx = Math.cos(a.phase).toFixed(3);
        const ny = (-Math.sin(a.phase)).toFixed(3);

        return (
          <div key={basis} style={{ ...S.svRow, opacity: zero ? 0.45 : 1 }}>
            <div className="mono" style={{ fontSize: 13 }}>{`|${basis}⟩`}</div>

            <svg viewBox="-1.25 -1.25 2.5 2.5" style={{ width: 34, height: 34 }} aria-hidden="true">
              <circle cx="0" cy="0" r="1" fill="var(--surface-alt)" stroke="var(--border)" strokeWidth="0.07" />
              <line x1="-1" y1="0" x2="1" y2="0" stroke="var(--border)" strokeWidth="0.05" />
              <line x1="0" y1="-1" x2="0" y2="1" stroke="var(--border)" strokeWidth="0.05" />
              {!zero && (
                <>
                  <line x1="0" y1="0" x2={nx} y2={ny} stroke={col} strokeWidth="0.16" strokeLinecap="round" />
                  <circle cx={nx} cy={ny} r="0.17" fill={col} />
                </>
              )}
            </svg>

            <div style={{ minWidth: 0 }}>
              <div style={S.magTrack}>
                <div style={{
                  height: '100%',
                  width: `${(a.magnitude * 100).toFixed(2)}%`,
                  background: zero ? 'transparent' : col,
                  transition: 'width .28s ease',
                }} />
              </div>
              <div className="mono" style={S.nums}>
                {a.re.toFixed(4)} {a.im < 0 ? '−' : '+'} {Math.abs(a.im).toFixed(4)}i<br />
                |a| <b style={{ color: 'var(--ink)' }}>{a.magnitude.toFixed(4)}</b> ·
                φ <b style={{ color: 'var(--ink)' }}>{zero ? '—' : deg(a.phase)}</b> ·
                P <b style={{ color: 'var(--ink)' }}>{(a.magnitude ** 2).toFixed(4)}</b>
              </div>
            </div>
          </div>
        );
      })}

      <div style={S.phaseKey}>
        <span>phase</span>
        <div style={S.phaseBar} />
        <span className="mono">−π … +π</span>
      </div>
    </div>
  );
}

/** Concurrence, as the thing it actually measures.
 *
 *  Labelled "Entanglement" rather than "concurrence" — the number is the same,
 *  but only one of those words means anything to someone meeting the idea here.
 *  The Bloch length is shown beside it because the two are one quantity seen
 *  twice: length = sqrt(1 - C²), so as the bar fills, both spheres empty. */
export function EntanglementMeter({ concurrence, bloch }) {
  const c = Math.max(0, Math.min(1, concurrence || 0));
  const verdict = c < 1e-6 ? 'Separable' : c > 0.999 ? 'Maximally entangled' : 'Partially entangled';

  return (
    <div>
      <div style={S.entHead}>
        <span style={{ fontSize: 13, fontWeight: 600, color: c > 1e-6 ? 'var(--phase-0)' : 'var(--ink-soft)' }}>
          {verdict}
        </span>
        <span className="mono" style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{c.toFixed(4)}</span>
      </div>

      <div style={S.entTrack}>
        <div style={{ ...S.entFill, width: `${(c * 100).toFixed(2)}%` }} />
      </div>

      <div style={S.entScale}>
        <span>0 — two separate qubits</span>
        <span>1 — one shared state</span>
      </div>

      <div style={S.entLengths}>
        {bloch.map((b, q) => (
          <div key={q} className="mono" style={S.entLen}>
            <span style={{ color: 'var(--ink-soft)' }}>q{q} Bloch length</span>
            <b>{b.length.toFixed(4)}</b>
            <span style={{ color: 'var(--ink-soft)' }}>purity {b.purity.toFixed(4)}</span>
          </div>
        ))}
      </div>

      <p style={S.entNote}>
        {c > 1e-6
          ? 'Each qubit has lost its own state — the vectors shrink because the information moved into the correlation between them.'
          : 'Both vectors are full length: each qubit still has a complete state of its own.'}
      </p>
    </div>
  );
}

const S = {
  entHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 },
  entTrack: {
    height: 12, borderRadius: 6, overflow: 'hidden',
    background: 'var(--bg)', border: '1px solid var(--border)',
  },
  entFill: {
    height: '100%', background: 'var(--accent-grad)', minWidth: 0,
    transition: 'width .3s ease',
  },
  entScale: {
    display: 'flex', justifyContent: 'space-between',
    fontSize: 10.5, color: 'var(--ink-soft)', marginTop: 5,
  },
  entLengths: { display: 'flex', flexDirection: 'column', gap: 4, marginTop: 11 },
  entLen: { display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11.5 },
  entNote: { fontSize: 11.5, color: 'var(--ink-soft)', lineHeight: 1.6, margin: '10px 0 0' },

  axis: {
    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
    height: 172, paddingBottom: 22, textAlign: 'right',
    fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-soft)',
  },
  plot: {
    position: 'relative', height: 172, paddingBottom: 22,
    borderLeft: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
  },
  gridline: { position: 'absolute', left: 0, right: 0, height: 1, background: 'var(--border)', opacity: 0.5 },
  bars: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 22, display: 'flex', alignItems: 'flex-end' },
  slot: {
    flex: 1, position: 'relative', height: '100%',
    display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center',
  },
  bar: { width: 'min(52px, 60%)', borderRadius: '4px 4px 0 0', minHeight: 2, transition: 'height .28s ease' },
  value: { fontSize: 10.5, color: 'var(--ink)', marginBottom: 4 },
  basis: { position: 'absolute', bottom: -20, fontSize: 12, color: 'var(--ink-soft)' },

  svRow: {
    display: 'grid', gridTemplateColumns: '34px 34px minmax(0,1fr)',
    gap: 9, alignItems: 'center', marginBottom: 12,
  },
  magTrack: {
    height: 8, background: 'var(--bg)', border: '1px solid var(--border)',
    borderRadius: 4, overflow: 'hidden',
  },
  nums: { fontSize: 11, color: 'var(--ink-soft)', marginTop: 4, lineHeight: 1.5 },

  phaseKey: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 11, color: 'var(--ink-soft)' },
  phaseBar: {
    flex: 1, height: 8, borderRadius: 4, border: '1px solid var(--border)',
    background: 'linear-gradient(90deg, hsl(0 70% 55%), hsl(60 70% 55%), hsl(120 70% 55%), hsl(180 70% 55%), hsl(240 70% 55%), hsl(300 70% 55%), hsl(360 70% 55%))',
  },
};
