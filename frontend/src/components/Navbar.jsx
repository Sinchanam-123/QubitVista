import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import ModeChooser from './ModeChooser';

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [choosing, setChoosing] = useState(false);

  return (
    <header style={styles.header}>
      <ModeChooser open={choosing} onClose={() => setChoosing(false)} />
      <div className="container" style={styles.inner}>
        <Link to="/" style={styles.brand}>
          <img src="/logo-icon.png" alt="" style={styles.dot} />
          QubitVista
        </Link>

        <nav style={styles.nav}>
          <Link
            to="/"
            style={{
              ...styles.link,
              opacity: location.pathname === '/' ? 1 : 0.65,
            }}
          >
            Home
          </Link>
          {/* Opens the chooser rather than jumping straight into one simulator
              — it is also the way to switch qubit count from inside the other
              one, and doing that shouldn't cost a page load. */}
          <button
            onClick={() => setChoosing(true)}
            style={{
              ...styles.link,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              opacity: location.pathname.startsWith('/simulator') ? 1 : 0.65,
            }}
          >
            Simulator
          </button>
          <Link
            to="/learn"
            style={{
              ...styles.link,
              opacity: location.pathname === '/learn' ? 1 : 0.65,
            }}
          >
            Learn
          </Link>
          <Link
            to="/exit"
            style={{
              ...styles.link,
              opacity: location.pathname === '/exit' ? 1 : 0.65,
            }}
          >
            Exit
          </Link>
          <button
            aria-label="Toggle light and dark mode"
            onClick={toggleTheme}
            style={styles.toggle}
          >
            {theme === 'dark' ? '☾' : '☀'}
          </button>
        </nav>
      </div>
    </header>
  );
}

const styles = {
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 20,
    backdropFilter: 'blur(10px)',
    background: 'color-mix(in srgb, var(--bg) 82%, transparent)',
    borderBottom: '1px solid var(--border)',
  },
  inner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 64,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    fontSize: 18,
    textDecoration: 'none',
    color: 'var(--ink)',
  },
  dot: {
    width: 28,
    height: 28,
    objectFit: 'contain',
    display: 'inline-block',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
  },
  link: {
    textDecoration: 'none',
    color: 'var(--ink)',
    fontWeight: 500,
    fontSize: 14,
  },
  toggle: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    border: '1px solid var(--border)',
    background: 'var(--surface)',
    fontSize: 15,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};
