import { useEffect, useMemo, useRef, useState } from 'react';
import { simulate, localResult } from '../utils/api';

/**
 * Runs the circuit on the Qiskit backend, falling back to the local engine.
 *
 * The local result is computed synchronously so the first paint is instant and
 * dragging a rotation slider never shows an empty card; the backend response
 * replaces it as soon as it lands. Both agree — the fallback is exact
 * single-qubit maths, not an approximation — so the swap is invisible.
 *
 * Responses can arrive out of order while a slider is being dragged, so each
 * request carries an id and anything older than the newest applied one is
 * dropped. Without that the sphere jumps backwards mid-drag.
 */
export default function useSimulation(ops, { debounceMs = 60 } = {}) {
  const immediate = useMemo(() => localResult(ops), [ops]);
  const [result, setResult] = useState(immediate);

  const reqId = useRef(0);
  const applied = useRef(0);
  const key = useMemo(() => JSON.stringify(ops), [ops]);

  useEffect(() => {
    // Show the local answer straight away, then confirm against the backend.
    setResult(immediate);

    const id = ++reqId.current;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const data = await simulate(ops, { signal: controller.signal });
        if (id < applied.current) return;      // stale — a newer edit won
        applied.current = id;
        setResult(data);
      } catch (err) {
        if (err.name === 'AbortError' || id < applied.current) return;
        applied.current = id;
        // Keep the local numbers on screen, but say where they came from.
        setResult({ ...localResult(ops), error: describe(err) });
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
