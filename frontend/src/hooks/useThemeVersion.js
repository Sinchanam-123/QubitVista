import { useEffect, useState } from 'react';

/**
 * A counter that bumps every time the theme actually changes on `<html>`.
 *
 * Canvas and WebGL don't inherit CSS variables. They sample them once, while
 * drawing, and then keep whatever pixels they last wrote — so toggling the
 * theme leaves a Bloch sphere painted in the old palette (light-mode gridlines
 * on a dark card) until something unrelated happens to trigger a redraw.
 * Anything that paints imperatively needs to depend on this.
 *
 * It watches the DOM attribute rather than the React state that sets it, and
 * that ordering is the whole point: ThemeProvider writes `data-theme` from an
 * effect, and React runs child effects *before* parent effects. A redraw keyed
 * on the context value would therefore fire while `data-theme` still held the
 * old value and re-read exactly the variables it was trying to escape.
 * Observing the attribute means a redraw can only happen once the new values
 * are live.
 */
export default function useThemeVersion() {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (typeof MutationObserver === 'undefined') return undefined;
    const observer = new MutationObserver(() => setVersion((v) => v + 1));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class', 'style'],
    });
    return () => observer.disconnect();
  }, []);

  return version;
}
