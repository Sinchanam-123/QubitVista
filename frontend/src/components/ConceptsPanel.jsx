import { Sparkles, Waves, RotateCw, Circle, ArrowLeftRight } from 'lucide-react';
import { GATE_CONCEPTS } from '../utils/quantumEngine';

const CONCEPT_ICON = {
  Superposition: Sparkles,
  'Bit flip': ArrowLeftRight,
  'Bit + phase flip': ArrowLeftRight,
  'Phase flip': RotateCw,
  Phase: RotateCw,
  Interference: Waves,
  Rotation: RotateCw,
  Identity: Circle,
};

// Representative formula shown under each concept, in terms of the gate
// that most cleanly demonstrates it. Rotation/Identity are angle-dependent
// or trivial, so they skip the formula and just explain in words.
const CONCEPT_FORMULA = {
  Superposition: { using: 'Hadamard gate (H)', formula: 'H|0\u27E9 = 1/\u221A2 (|0\u27E9 + |1\u27E9)' },
  'Bit flip': { using: 'Pauli-X gate', formula: 'X|0\u27E9 = |1\u27E9' },
  'Bit + phase flip': { using: 'Pauli-Y gate', formula: 'Y|0\u27E9 = i|1\u27E9' },
  'Phase flip': { using: 'Pauli-Z gate', formula: 'Z|1\u27E9 = \u2212|1\u27E9' },
  Phase: { using: 'S / T gates', formula: 'S|1\u27E9 = i|1\u27E9' },
};

export default function ConceptsPanel({ ops }) {
  const concepts = deriveConcepts(ops);

  return (
    <div className="card" style={{ padding: 20 }}>
      <h4 style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-soft)', marginBottom: 14 }}>
        Conceptual learning
      </h4>

      {concepts.length === 0 ? (
        <p style={{ fontSize: 14 }}>
          Add a gate above and this fills in with the concepts it demonstrates — superposition, phase, interference, and so on.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {concepts.map((item) => {
            const Icon = CONCEPT_ICON[item.concept] || Sparkles;
            const formulaInfo = CONCEPT_FORMULA[item.concept];
            return (
              <div key={item.concept} style={conceptCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div>
                    <h3 style={{ fontSize: 15, color: 'var(--phase-180)' }}>Concept: {item.concept}</h3>
                    <p style={{ fontSize: 13.5, marginTop: 6, maxWidth: 460 }}>{item.body}</p>
                  </div>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={16} color="var(--phase-180)" />
                  </div>
                </div>

                {formulaInfo && (
                  <div style={{ marginTop: 12 }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink-soft)' }}>Using {formulaInfo.using}:</span>
                    <div className="mono" style={formulaBox}>{formulaInfo.formula}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function deriveConcepts(ops) {
  const seen = new Map();

  for (const op of ops) {
    const info = GATE_CONCEPTS[op.gate];
    if (info && !seen.has(info.concept)) seen.set(info.concept, info);
  }

  const hIndex = ops.findIndex((op) => op.gate === 'H');
  if (hIndex !== -1 && ops.length > hIndex + 1) {
    seen.set('Interference', { concept: 'Interference', body: 'Stacking gates after a Hadamard lets amplitudes combine — the "wave" side of a qubit\u2019s behavior.' });
  }

  return Array.from(seen.values());
}

const conceptCard = {
  padding: 16,
  borderRadius: 14,
  background: 'var(--surface-alt)',
  border: '1px solid var(--border)',
};

const formulaBox = {
  marginTop: 8,
  padding: '10px 14px',
  borderRadius: 10,
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  fontSize: 14,
  display: 'inline-block',
};
