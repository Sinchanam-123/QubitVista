import { useEffect, useMemo, useRef, useState } from 'react';
import { simulate2, localResult2 } from '../utils/api';

/**
 * The two-qubit twin of useSimulation.
 *
 * Same contract, same guarantees: the local engine answers synchronously so the
 * first paint is instant and dragging a rotation slider never shows an empty
 * card, and the Qiskit reply replaces it as soon as it lands. Both agree — the
 * fallback is exact four-amplitude maths, not an approximation.
 *
 * Requests carry an id and anything older than the newest applied one is
 * dropped, because responses arrive out of order while a slider is dragged and
 * a late one would otherwise snap the spheres backwards.
 */
export default function useSimulation2(ops, { debounceMs = 60 } = {}) {
  const immediate = useMemo(() => localResult2(ops), [ops]);
  const [result, setResult] = useState(immediate);

  const reqId = useRef(0);
  const applied = useRef(0);
  const key = useMemo(() => JSON.stringify(ops), [ops]);

  useEffect(() => {
    setResult(immediate);

    const id = ++reqId.current;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const data = await simulate2(ops, { signal: controller.signal });
        if (id < applied.current) return;      // stale — a newer edit won
        applied.current = id;
        setResult(data);
      } catch (err) {
        if (err.name === 'AbortError' || id < applied.current) return;
        applied.current = id;
        setResult({ ...localResult2(ops), error: describe(err) });
      }
    }, debounceMs);

    return () => { clearTimeout(timer); controller.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, debounceMs]);

  return result;
}

function describe(err) {
  const msg = String(err.message || err);
  return /failed to fetch|networkerror|load failed/i.test(msg)
    ? 'Backend offline — showing locally computed values.'
    : msg;
}
