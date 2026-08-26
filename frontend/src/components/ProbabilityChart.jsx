import { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';
import { basisLabel } from '../utils/quantumEngine';

export default function ProbabilityChart({ probabilities, theme }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    const labels = probabilities.map((_, i) => basisLabel(i));
    const inkSoft = getComputedStyle(document.documentElement).getPropertyValue('--ink-soft').trim();
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--phase-0').trim();

    const data = [{
      x: labels,
      y: probabilities.map((p) => Math.round(p * 1000) / 1000),
      type: 'bar',
      marker: { color: accent, opacity: 0.85 },
      hovertemplate: '%{x}: %{y}<extra></extra>',
    }];

    const layout = {
      margin: { t: 6, r: 8, l: 34, b: 30 },
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      font: { color: inkSoft, family: 'Inter, sans-serif', size: 11 },
      yaxis: { range: [0, 1], gridcolor: 'rgba(128,128,128,0.15)', title: { text: 'Probability', standoff: 6 } },
      xaxis: { tickfont: { family: 'IBM Plex Mono, monospace' } },
      bargap: 0.35,
    };

    Plotly.react(ref.current, data, layout, { displayModeBar: false, responsive: true });
  }, [probabilities, theme]);

  // The card this sits in flexes with the window, and Plotly's own
  // `responsive` option only listens to window resize — not to the plot's
  // box changing because a sibling card grew. Watch the box directly.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;

    const observer = new ResizeObserver(() => {
      if (el.offsetParent !== null) Plotly.Plots.resize(el);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return <div ref={ref} style={{ width: '100%', height: '100%', minHeight: 120 }} />;
}
