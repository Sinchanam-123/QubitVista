import { useCallback, useEffect, useRef } from 'react';
import useThemeVersion from '../../hooks/useThemeVersion';

/* The project's original Bloch sphere, as a component.
 *
 * Shaded body, latitude/longitude graticule split front/back by depth, the six
 * basis states labelled, a ground shadow, and the vector drawn at its true
 * length — never normalised, because in Phase 2 a shrinking vector is the visual
 * signature of entanglement.
 *
 * When a gate is applied the vector travels the gate's real rotation arc
 * (Rodrigues), not a straight line: a straight interpolation between two Bloch
 * vectors cuts through the inside of the sphere and misrepresents the motion.
 *
 * When there is no rotation at all it glides instead. Those are two different
 * situations and only the first has a "true path" to be wrong about:
 *
 *   rotation present   follow the arc. Substituting a straight line here WOULD
 *                      misrepresent a real rotation, which is the whole reason
 *                      the API carries axis and angle.
 *   rotation null      CX, CZ and SWAP are not a rotation of this sphere — the
 *                      vector retracts toward the origin as the qubit stops
 *                      having a state of its own. There is no arc to follow, so
 *                      a glide invents nothing; it just stops the vector
 *                      teleporting, which reads as a rendering glitch and hides
 *                      the single most important motion on the two-qubit page.
 */

const TAU = Math.PI * 2;
const BACK = 0.30;

const BASIS_MARKS = [
  [[0, 0, 1], '|0⟩'], [[0, 0, -1], '|1⟩'],
  [[1, 0, 0], '|+⟩'], [[-1, 0, 0], '|−⟩'],
  [[0, 1, 0], '|+i⟩'], [[0, -1, 0], '|−i⟩'],
];

export function rodrigues(v, axis, angle) {
  const [kx, ky, kz] = axis, [vx, vy, vz] = v;
  const c = Math.cos(angle), s = Math.sin(angle);
  const dot = kx * vx + ky * vy + kz * vz;
  const cr = [ky * vz - kz * vy, kz * vx - kx * vz, kx * vy - ky * vx];
  return [
    vx * c + cr[0] * s + kx * dot * (1 - c),
    vy * c + cr[1] * s + ky * dot * (1 - c),
    vz * c + cr[2] * s + kz * dot * (1 - c),
  ];
}

export default function BlochSphereClassic({ vector, transition, size = 380 }) {
  const canvasRef = useRef(null);
  const view = useRef({ az: -0.6, el: 0.32 });
  const anim = useRef({ raf: 0, active: false });
  const current = useRef([vector.x, vector.y, vector.z]);
  const themeVersion = useThemeVersion();

  const project = useCallback((x, y, z) => {
    const { az, el } = view.current;
    const ca = Math.cos(az), sa = Math.sin(az);
    const x1 = x * ca - y * sa;
    const y1 = x * sa + y * ca;
    const ce = Math.cos(el), se = Math.sin(el);
    return [x1, -(z * ce - y1 * se), y1 * ce + z * se];
  }, []);

  const draw = useCallback((v, arc = null) => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    const cxp = W / 2, cyp = H / 2;
    const R = Math.min(W, H) * 0.36;

    const css = getComputedStyle(document.documentElement);
    const grid = css.getPropertyValue('--border').trim() || '#2b3446';
    const inkSoft = css.getPropertyValue('--ink-soft').trim() || '#8b95a8';
    const a0 = css.getPropertyValue('--phase-0').trim() || '#5eead4';
    const a1 = css.getPropertyValue('--phase-270').trim() || '#818cf8';

    ctx.clearRect(0, 0, W, H);
    ctx.lineJoin = ctx.lineCap = 'round';
    const to = ([x, y, d]) => [cxp + x * R, cyp + y * R, d];

    // shaded body, lit from the upper left
    const glow = ctx.createRadialGradient(cxp - R * 0.35, cyp - R * 0.4, R * 0.05, cxp, cyp, R);
    glow.addColorStop(0, hexA(a1, 0.20));
    glow.addColorStop(0.55, hexA(a0, 0.07));
    glow.addColorStop(1, 'rgba(10,14,22,.30)');
    ctx.beginPath(); ctx.arc(cxp, cyp, R, 0, TAU);
    ctx.fillStyle = glow; ctx.fill();

    ctx.beginPath(); ctx.arc(cxp, cyp, R, 0, TAU);
    ctx.strokeStyle = inkSoft; ctx.globalAlpha = 0.45;
    ctx.lineWidth = 1.3; ctx.stroke(); ctx.globalAlpha = 1;

    // a curve on the sphere, split front/back so it reads as a ball not a disc
    const curve = (fn, color, width) => {
      for (const front of [false, true]) {
        ctx.beginPath();
        let pen = false;
        for (let i = 0; i <= 120; i++) {
          const [sx, sy, d] = to(project(...fn((i / 120) * TAU)));
          if ((d >= 0) !== front) { pen = false; continue; }
          pen ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy);
          pen = true;
        }
        ctx.strokeStyle = color;
        ctx.globalAlpha = front ? 1 : BACK;
        ctx.lineWidth = width;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    };

    for (let k = -2; k <= 2; k++) {
      if (k === 0) continue;
      const lat = (k / 3) * (Math.PI / 2);
      const r = Math.cos(lat), z = Math.sin(lat);
      curve((a) => [r * Math.cos(a), r * Math.sin(a), z], grid, 0.8);
    }
    for (let k = 0; k < 6; k++) {
      const lon = (k / 6) * Math.PI;
      const cl = Math.cos(lon), sl = Math.sin(lon);
      curve((a) => [cl * Math.cos(a), sl * Math.cos(a), Math.sin(a)], grid, 0.8);
    }
    curve((a) => [Math.cos(a), Math.sin(a), 0], inkSoft, 1.3);

    // axes through the middle
    for (const vec of [[1, 0, 0], [0, 1, 0], [0, 0, 1]]) {
      const [px, py] = to(project(...vec.map((c) => c * 1.13)));
      const [nx, ny] = to(project(...vec.map((c) => -c * 1.13)));
      ctx.beginPath(); ctx.moveTo(nx, ny); ctx.lineTo(px, py);
      ctx.strokeStyle = grid; ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]); ctx.stroke(); ctx.setLineDash([]);
    }

    // basis-state labels, faded when behind the sphere
    ctx.font = '11px "IBM Plex Mono", Consolas, monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const [vec, label] of BASIS_MARKS) {
      const [sx, sy, d] = to(project(...vec.map((c) => c * 1.3)));
      ctx.globalAlpha = d >= 0 ? 1 : 0.45;
      ctx.fillStyle = inkSoft;
      ctx.fillText(label, sx, sy);
      ctx.globalAlpha = 1;
    }

    // the arc actually being travelled
    if (arc) {
      ctx.beginPath();
      const N = 60;
      for (let i = 0; i <= N; i++) {
        const p = rodrigues(arc.from, arc.axis, arc.angle * arc.t * (i / N));
        const [sx, sy] = to(project(...p));
        i ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy);
      }
      ctx.strokeStyle = a1; ctx.lineWidth = 2.2;
      ctx.shadowColor = a1; ctx.shadowBlur = 8;
      ctx.stroke(); ctx.shadowBlur = 0;
    }

    // ground shadow onto the equatorial plane
    const [gx, gy] = to(project(v[0], v[1], 0));
    const [vx, vy, vd] = to(project(...v));
    ctx.strokeStyle = inkSoft; ctx.globalAlpha = 0.35; ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    ctx.beginPath(); ctx.moveTo(vx, vy); ctx.lineTo(gx, gy); ctx.stroke();
    ctx.globalAlpha = 0.22;
    ctx.beginPath(); ctx.moveTo(cxp, cyp); ctx.lineTo(gx, gy); ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1;

    // the vector, at its true length
    const grad = ctx.createLinearGradient(cxp, cyp, vx, vy);
    grad.addColorStop(0, a1);
    grad.addColorStop(1, a0);
    ctx.beginPath(); ctx.moveTo(cxp, cyp); ctx.lineTo(vx, vy);
    ctx.strokeStyle = grad; ctx.lineWidth = 3.4;
    ctx.shadowColor = a0; ctx.shadowBlur = 10;
    ctx.stroke(); ctx.shadowBlur = 0;

    // cone arrowhead along the screen direction
    const ang = Math.atan2(vy - cyp, vx - cxp);
    const head = 11;
    ctx.beginPath();
    ctx.moveTo(vx, vy);
    ctx.lineTo(vx - head * Math.cos(ang - 0.34), vy - head * Math.sin(ang - 0.34));
    ctx.lineTo(vx - head * 0.62 * Math.cos(ang), vy - head * 0.62 * Math.sin(ang));
    ctx.lineTo(vx - head * Math.cos(ang + 0.34), vy - head * Math.sin(ang + 0.34));
    ctx.closePath();
    ctx.fillStyle = a0; ctx.fill();

    ctx.globalAlpha = vd >= 0 ? 1 : 0.7;
    ctx.beginPath(); ctx.arc(vx, vy, 3.2, 0, TAU);
    ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.globalAlpha = 1;

    ctx.beginPath(); ctx.arc(cxp, cyp, 2.6, 0, TAU);
    ctx.fillStyle = inkSoft; ctx.fill();
  }, [project]);

  // Repaint in the new palette when the theme flips. The canvas holds pixels,
  // not styles, so without this the sphere keeps its old colours until the next
  // gate happens to redraw it. Skipped mid-animation — the running frame loop
  // is already repainting, and it reads the new variables too.
  useEffect(() => {
    if (!anim.current.active) draw(current.current);
  }, [themeVersion, draw]);

  // keep the backing store at device resolution so the sphere is not soft
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    cv.width = size * dpr;
    cv.height = size * dpr;
    cv.style.width = `${size}px`;
    cv.style.height = `${size}px`;
    draw(current.current);
  }, [size, draw]);

  // animate along the gate's true arc when the state changes
  const target = [vector.x, vector.y, vector.z];
  const targetKey = target.join(',');
  useEffect(() => {
    const stop = () => { if (anim.current.raf) cancelAnimationFrame(anim.current.raf); anim.current.raf = 0; };
    stop();

    const end = target;

    // `snap` means the circuit itself changed underneath us — an angle being
    // dragged, a gate removed or reordered — rather than the scrubber moving
    // between two fixed states. There is no arc to draw because there is no
    // single gate connecting the two positions, and gliding would lag a drag
    // by a whole animation behind the numbers.
    if (transition?.snap) {
      current.current = end;
      draw(end);
      return undefined;
    }

    const from = transition?.from || current.current;
    const axis = transition?.axis;
    const angle = transition?.angle;

    const rotating = Boolean(axis) && Math.abs(angle) > 1e-9;
    // Distance matters only on the glide path — a rotation can return the
    // vector to where it started (X twice) and still be worth watching.
    const moved = Math.hypot(end[0] - from[0], end[1] - from[1], end[2] - from[2]) > 1e-6;

    if (!rotating && !moved) {
      current.current = end;
      draw(end);
      return undefined;
    }

    const dur = rotating ? Math.min(700, 180 + Math.abs(angle) * 190) : 480;
    const t0 = performance.now();
    anim.current.active = true;

    const frame = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      if (rotating) draw(rodrigues(from, axis, angle * e), { from, axis, angle, t: e });
      else draw([0, 1, 2].map((i) => from[i] + (end[i] - from[i]) * e));
      if (t < 1) anim.current.raf = requestAnimationFrame(frame);
      else { anim.current.active = false; current.current = end; draw(end); }
    };
    anim.current.raf = requestAnimationFrame(frame);

    // a backgrounded tab freezes rAF; make sure the end state still lands
    const fallback = setTimeout(() => {
      if (anim.current.active) { anim.current.active = false; current.current = end; draw(end); }
    }, dur + 250);

    return () => { stop(); clearTimeout(fallback); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetKey, transition, draw]);

  // drag to orbit the camera
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return undefined;
    let dragging = false, lx = 0, ly = 0;

    const down = (e) => { dragging = true; lx = e.clientX; ly = e.clientY; cv.setPointerCapture(e.pointerId); };
    const move = (e) => {
      if (!dragging) return;
      view.current.az += (e.clientX - lx) * 0.01;
      view.current.el = Math.max(-1.4, Math.min(1.4, view.current.el + (e.clientY - ly) * 0.01));
      lx = e.clientX; ly = e.clientY;
      if (!anim.current.active) draw(current.current);
    };
    const up = () => { dragging = false; };

    cv.addEventListener('pointerdown', down);
    cv.addEventListener('pointermove', move);
    cv.addEventListener('pointerup', up);
    return () => {
      cv.removeEventListener('pointerdown', down);
      cv.removeEventListener('pointermove', move);
      cv.removeEventListener('pointerup', up);
    };
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      style={{ cursor: 'grab', touchAction: 'none', maxWidth: '100%', display: 'block' }}
    />
  );
}

/** Accept a hex or rgb token and return it at a given alpha. */
function hexA(color, alpha) {
  const c = color.trim();
  if (c.startsWith('#')) {
    const n = c.length === 4
      ? c.slice(1).split('').map((h) => parseInt(h + h, 16))
      : [c.slice(1, 3), c.slice(3, 5), c.slice(5, 7)].map((h) => parseInt(h, 16));
    return `rgba(${n[0]},${n[1]},${n[2]},${alpha})`;
  }
  return c;
}
