import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';

export default function Footer() {
  return (
    <footer style={styles.footer}>
      <div className="container" style={styles.inner}>
        <Link to="/" style={styles.brand}>
          <img src="/logo-icon.png" alt="" style={styles.logo} />
          <span>QubitVista</span>
        </Link>

        <a href="mailto:hello@qubitvista.app" style={styles.link}>
          <Mail size={14} /> hello@qubitvista.app
        </a>
      </div>
    </footer>
  );
}

const styles = {
  footer: {
    borderTop: '1px solid var(--border)',
    flexShrink: 0,
  },
  inner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    padding: 'clamp(8px, 1.4vh, 16px) clamp(16px, 2vw, 30px)',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    textDecoration: 'none',
    color: 'var(--ink)',
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: 'clamp(15px, 1.9vh, 18px)',
  },
  logo: {
    width: 'clamp(24px, 3.4vh, 32px)',
    height: 'clamp(24px, 3.4vh, 32px)',
    objectFit: 'contain',
  },
  link: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    fontSize: 'var(--fs-sm)',
    fontWeight: 500,
    color: 'var(--ink)',
    textDecoration: 'none',
  },
};
