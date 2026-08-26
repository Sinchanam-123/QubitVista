import { Link } from 'react-router-dom';
import { Info, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

// Home page top bar: just the About link + theme toggle, pinned top-right.
// The logo lives in the hero now, front and center.
export default function HomeHeader() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 'clamp(10px, 1.6vh, 18px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Link to="/about" style={iconBtnStyle} aria-label="About this project" title="About QubitVista">
          <Info size={18} />
        </Link>
        <button onClick={toggleTheme} style={iconBtnStyle} aria-label="Toggle light and dark mode" title="Toggle theme">
          {theme === 'dark' ? <Moon size={17} /> : <Sun size={17} />}
        </button>
      </div>
    </div>
  );
}

const iconBtnStyle = {
  width: 38,
  height: 38,
  borderRadius: '50%',
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--ink)',
  textDecoration: 'none',
};
