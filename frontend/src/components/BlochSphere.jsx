import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import useThemeVersion from '../hooks/useThemeVersion';

// Renders a rotatable 3D Bloch sphere with a state-vector arrow.
// `vector` = { x, y, z } each in [-1, 1] (see utils/quantumEngine.js).
// `ambient` = true gives a slow auto-rotate with no drag interaction —
// used for the decorative hero sphere on the Home page.
export default function BlochSphere({ vector = { x: 0, y: 0, z: 1 }, size = 260, ambient = false, label }) {
  const mountRef = useRef(null);
  const arrowRef = useRef(null);
  const stateRef = useRef({ vector });
  // WebGL materials bake their colour in at construction, so the scene has to
  // be rebuilt when the palette changes — see useThemeVersion.
  const themeVersion = useThemeVersion();

  stateRef.current.vector = vector;

  useEffect(() => {
    const mount = mountRef.current;
    const width = size;
    const height = size;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(2.6, 1.8, 2.6);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--phase-0').trim() || '#5B8DEF';
    const accentColor2 = getComputedStyle(document.documentElement).getPropertyValue('--phase-180').trim() || '#C77DFF';

    // Wireframe sphere
    const sphereGeo = new THREE.SphereGeometry(1, 24, 18);
    const sphereMat = new THREE.MeshBasicMaterial({ color: 0x888899, wireframe: true, transparent: true, opacity: 0.18 });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    scene.add(sphere);

    // Equator + meridian rings for orientation
    const ringGeo = new THREE.TorusGeometry(1, 0.004, 8, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x9aa0c3, transparent: true, opacity: 0.4 });
    const equator = new THREE.Mesh(ringGeo, ringMat);
    equator.rotation.x = Math.PI / 2;
    scene.add(equator);
    const meridian = new THREE.Mesh(ringGeo, ringMat);
    scene.add(meridian);

    // Axes
    const axisMat = new THREE.LineBasicMaterial({ color: 0x9aa0c3 });
    ['x', 'y', 'z'].forEach((axis) => {
      const points = [];
      if (axis === 'x') { points.push(new THREE.Vector3(-1.15, 0, 0), new THREE.Vector3(1.15, 0, 0)); }
      if (axis === 'y') { points.push(new THREE.Vector3(0, -1.15, 0), new THREE.Vector3(0, 1.15, 0)); }
      if (axis === 'z') { points.push(new THREE.Vector3(0, 0, -1.15), new THREE.Vector3(0, 0, 1.15)); }
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      scene.add(new THREE.Line(geo, axisMat));
    });

    // State arrow
    const dir = new THREE.Vector3(vector.x, vector.z, -vector.y).normalize();
    const length = Math.max(0.001, Math.sqrt(vector.x ** 2 + vector.y ** 2 + vector.z ** 2));
    const arrow = new THREE.ArrowHelper(
      dir.lengthSq() ? dir : new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 0),
      length || 1,
      new THREE.Color(accentColor).getHex(),
      0.16,
      0.09
    );
    scene.add(arrow);
    arrowRef.current = arrow;

    // Tip glow
    const glowGeo = new THREE.SphereGeometry(0.045, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(accentColor2) });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    scene.add(glow);

    let raf;
    let dragging = false;
    let lastX = 0, lastY = 0;
    let rotY = 0.5, rotX = -0.35;

    const applyRotation = () => {
      scene.rotation.y = rotY;
      scene.rotation.x = rotX;
    };
    applyRotation();

    const onDown = (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; };
    const onUp = () => { dragging = false; };
    const onMove = (e) => {
      if (!dragging) return;
      rotY += (e.clientX - lastX) * 0.008;
      rotX += (e.clientY - lastY) * 0.008;
      rotX = Math.max(-1.3, Math.min(1.3, rotX));
      lastX = e.clientX; lastY = e.clientY;
      applyRotation();
    };

    if (!ambient) {
      renderer.domElement.style.cursor = 'grab';
      renderer.domElement.addEventListener('pointerdown', onDown);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointermove', onMove);
    }

    // The arrow eases toward the target instead of snapping to it, so a
    // gate reads as a rotation you can follow rather than a jump cut.
    // Fast enough (settles in ~150ms) that the simulator still feels live.
    const shown = new THREE.Vector3(vector.x, vector.z, -vector.y);
    const target = new THREE.Vector3();
    const EASE = 0.18;

    const animate = () => {
      const v = stateRef.current.vector;
      target.set(v.x, v.z, -v.y);
      shown.lerp(target, EASE);

      const len = Math.max(0.001, shown.length());
      arrow.setDirection(shown.clone().normalize());
      arrow.setLength(len, 0.16, 0.09);
      glow.position.copy(shown);

      if (ambient) {
        rotY += 0.0025;
        applyRotation();
      }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      renderer.domElement.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointermove', onMove);
      mount.removeChild(renderer.domElement);
      sphereGeo.dispose(); sphereMat.dispose();
      ringGeo.dispose(); ringMat.dispose();
      glowGeo.dispose(); glowMat.dispose();
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, ambient, themeVersion]);

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div ref={mountRef} style={{ width: size, height: size }} />
      {label && <span style={{ fontSize: 12, color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)' }}>{label}</span>}
    </div>
  );
}
