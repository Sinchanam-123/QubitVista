import { lazy, Suspense, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';

/* Every route but the landing page is fetched when it is first visited.
 *
 * The whole app used to arrive as one file, so opening the home page also
 * downloaded both simulators, the Learn page's 120 kB of reference text and
 * everything they import. Home stays eager on purpose: it is the entry point,
 * and lazy-loading the page the user is already looking at only adds a
 * round trip before anything is drawn.
 *
 * These are the same components with the same props — nothing about what they
 * render changes, only when their code arrives. */
const About = lazy(() => import('./pages/About'));
const Simulator = lazy(() => import('./pages/Simulator'));
const SimulatorTwo = lazy(() => import('./pages/SimulatorTwo'));
const Learn = lazy(() => import('./pages/Learn'));
const Exit = lazy(() => import('./pages/Exit'));

// Home and Exit are sized to fit one screen exactly, so they get their
// page-level scroll locked off. About stays scrollable (it's long-form),
// and the simulators fit by construction but keep the safety net.
const LOCKED_ROUTES = new Set(['/', '/exit']);

function Shell() {
  const location = useLocation();
  const showNavbar = location.pathname !== '/'; // Home has its own header
  const locked = LOCKED_ROUTES.has(location.pathname);
  const scrollRef = useRef(null);

  // The scroll container outlives the route swap, so a page left scrolled
  // (About, say) would hand its offset to the next one and push that page's
  // content out of view. Every route starts at the top instead.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [location.pathname]);

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {showNavbar && <Navbar />}
      <div
        ref={scrollRef}
        className={locked ? 'shell-scroll shell-scroll--locked' : 'shell-scroll'}
        style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
      >
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/simulator" element={<Simulator />} />
            <Route path="/simulator/two-qubit" element={<SimulatorTwo />} />
            <Route path="/learn" element={<Learn />} />
            <Route path="/exit" element={<Exit />} />
            {/* /explore used to be a page and is now a panel on the home page.
                Anything unmatched — including that old link — lands home rather
                than on a blank screen. */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>
      <Footer />
    </div>
  );
}

/* Held for as long as a route's chunk is in flight — one frame on a warm
 * cache, a moment on a cold one. A spinner would be louder than the wait it
 * describes, so this is the app's own quiet vocabulary: mono lower-case on the
 * page background, in the same soft ink every secondary label uses. It fills
 * the shell's flex row so the footer does not jump up to meet it and then back
 * down when the page arrives. */
function RouteFallback() {
  return (
    <div
      role="status"
      style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 10, color: 'var(--ink-soft)',
      }}
    >
      <span
        style={{
          width: 22, height: 3, borderRadius: 999,
          background: 'var(--accent-grad)', opacity: 0.75,
        }}
      />
      <span className="mono" style={{ fontSize: 'var(--fs-sm)', letterSpacing: '0.04em' }}>
        loading…
      </span>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </ThemeProvider>
  );
}
