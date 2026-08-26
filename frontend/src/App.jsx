import { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import About from './pages/About';
import Simulator from './pages/Simulator';
import SimulatorTwo from './pages/SimulatorTwo';
import Learn from './pages/Learn';
import Exit from './pages/Exit';

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
      </div>
      <Footer />
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
