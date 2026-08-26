import { useEffect, useState } from 'react';

// Window size, for the few places that need a real pixel number rather than
// a CSS clamp() — Three.js canvases and Plotly plots both size imperatively.
// Values are rounded to a 10px step so a slow drag-resize doesn't re-run
// expensive scene rebuilds on every intermediate pixel.
const STEP = 10;
const snap = (n) => Math.round(n / STEP) * STEP;

function read() {
  return {
    width: snap(window.innerWidth),
    height: snap(window.innerHeight),
  };
}

export default function useViewport() {
  const [size, setSize] = useState(read);

  useEffect(() => {
    // Handled synchronously rather than debounced through rAF: the snap
    // above already collapses a drag-resize down to a handful of renders,
    // and rAF callbacks stall while the tab isn't compositing, which would
    // leave sizes stale until the next resize after the user comes back.
    const onResize = () => {
      const next = read();
      setSize((prev) => (prev.width === next.width && prev.height === next.height ? prev : next));
    };

    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return size;
}
