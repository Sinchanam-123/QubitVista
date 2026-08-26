import { useEffect, useRef, useState } from 'react';

// Measures a element's content box via ResizeObserver. Used where a child
// has to be given a pixel size that depends on how much room its flex
// parent actually ended up with — the Bloch sphere canvas, mainly.
// Rounded to a 4px step so tiny sub-pixel reflows don't thrash React.
const STEP = 4;
const snap = (n) => Math.round(n / STEP) * STEP;

export default function useElementSize() {
  const ref = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;

    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (!box) return;
      const next = { width: snap(box.width), height: snap(box.height) };
      setSize((prev) => (prev.width === next.width && prev.height === next.height ? prev : next));
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, size];
}
