import BlochSphereClassic from './BlochSphereClassic';

/* Two spheres, one per wire.
 *
 * BlochSphereClassic is reused untouched — it already draws the vector at its
 * true length rather than assuming 1, which is the single thing that makes an
 * entangled pair readable here: at maximal entanglement both vectors collapse
 * to the origin and the spheres visibly go empty, while the joint state beside
 * them stays perfectly well defined.
 *
 * Each sphere gets its own transition. A CX has no rotation axis at all, so on
 * an entangling step both transitions are null and the vectors cut straight to
 * their new positions — which is honest: there is no arc to follow, because the
 * motion is not a rotation of either sphere.
 */

export default function BlochPair({ bloch, transitions, size = 210 }) {
  return (
    <div style={S.row}>
      {bloch.map((b, q) => (
        <div key={q} style={S.col}>
          <div style={S.head}>
            <span className="mono" style={S.wire}>q{q}</span>
            <span style={S.len} title="Vector length — 1 when the qubit has its own state, 0 when it is maximally entangled">
              len <b style={{ color: 'var(--ink)' }}>{b.length.toFixed(3)}</b>
            </span>
          </div>

          <div style={{ position: 'relative' }}>
            <BlochSphereClassic vector={b.vector} transition={transitions?.[q] || null} size={size} />
            {b.length < 1e-6 && <span style={S.emptyTag}>no state of its own</span>}
          </div>

          <div className="mono" style={S.coords}>
            x {b.vector.x.toFixed(3)}&nbsp; y {b.vector.y.toFixed(3)}&nbsp; z {b.vector.z.toFixed(3)}
          </div>
        </div>
      ))}
    </div>
  );
}

const S = {
  row: { display: 'flex', gap: 'var(--gap-sm)', justifyContent: 'center', flexWrap: 'wrap', width: '100%' },
  col: { display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 0 },
  head: {
    display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
    gap: 10, width: '100%', marginBottom: 2,
  },
  wire: { fontSize: 12.5, fontWeight: 600, color: 'var(--phase-0)' },
  len: { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-soft)' },
  coords: { fontSize: 10.5, color: 'var(--ink-soft)', marginTop: 2, textAlign: 'center' },
  emptyTag: {
    position: 'absolute', left: '50%', bottom: 6, transform: 'translateX(-50%)',
    fontSize: 10, padding: '2px 8px', borderRadius: 999, whiteSpace: 'nowrap',
    background: 'color-mix(in srgb, var(--phase-0) 16%, transparent)',
    border: '1px solid color-mix(in srgb, var(--phase-0) 40%, transparent)',
    color: 'var(--phase-0)',
  },
};
