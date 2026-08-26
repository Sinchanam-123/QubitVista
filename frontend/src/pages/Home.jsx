import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen } from 'lucide-react';
import ModeChooser from '../components/ModeChooser';
import HomeHeader from '../components/HomeHeader';
import HeroDemo from '../components/HeroDemo';
import FeatureRail from '../components/FeatureRail';
import WorkflowStrip from '../components/WorkflowStrip';
import AmbientBackground from '../components/AmbientBackground';
import useViewport from '../hooks/useViewport';
import useHeroTour from '../hooks/useHeroTour';

/* The landing page.
 *
 * One screen, no scrolling: pitch on the left, a circuit that runs itself on
 * the right, and the four-step how-to anchored at the bottom. The demo is the
 * argument — it walks a single qubit through superposition, phase and
 * interference, then builds a Bell pair and empties both spheres. Nothing on
 * this page is a mock-up; it all comes out of the same engines the simulators
 * use, which is the claim the project is actually making.
 *
 * "Start exploring" raises the chooser over this page rather than opening a
 * simulator directly: there are two of them now and the choice is worth making
 * explicitly, but it is not worth a navigation.
 */

export default function Home() {
  const { height } = useViewport();
  const tour = useHeroTour();
  const [choosing, setChoosing] = useState(false);

  // Three.js needs a pixel value, so the hero sphere is derived from viewport
  // height the same way the clamps around it are.
  const visualSize = Math.round(Math.max(140, Math.min(height * 0.25, 260)));

  return (
    <div className="container" style={page}>
      <AmbientBackground />
      <ModeChooser open={choosing} onClose={() => setChoosing(false)} />

      <div style={{ position: 'relative', zIndex: 1, flexShrink: 0 }}>
        <HomeHeader />
      </div>

      <div style={main}>
        <div style={hero}>
          {/* Left: the pitch */}
          <div style={pitch}>
            {/* Logo and wordmark as one lockup, at masthead size. Split across
                two blocks the way it was, the name read as body copy and the
                page had no identifiable title. */}
            <div className="home-rise" style={{ ...step(0), ...masthead }}>
              <span style={logoMark}>
                <span style={logoHalo} />
                <img src="/logo-full.png" alt="QubitVista" style={logoImg} />
              </span>

              <div style={{ minWidth: 0 }}>
                <h1 style={titleStyle}>QubitVista</h1>
                <div style={eyebrowRow}>
                  <span style={eyebrowRule} />
                  <span style={eyebrow}>watch a qubit think</span>
                </div>
              </div>
            </div>

            <p className="home-rise" style={{ ...step(1), ...tagline }}>
              Quantum states, one gate at a time — on a Bloch sphere you can actually watch move.
            </p>

            <p className="home-rise" style={{ ...step(2), ...body }}>
              A browser-based circuit simulator built for learning rather than research. Drop a gate
              and the sphere, the amplitudes and the probabilities all move at once. Add a second
              qubit and you get the thing one qubit provably cannot do:{' '}
              <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>entanglement</strong>, where
              both Bloch vectors collapse to the origin and only the pair still has a state.
            </p>

            <div className="home-rise" style={{ ...step(3), ...ctaRow }}>
              {/* Opens the chooser over the page rather than navigating to it —
                  two options is not worth a round trip. */}
              <button onClick={() => setChoosing(true)} className="btn-primary" style={ctaPrimary}>
                Start exploring <ArrowRight size={16} />
              </button>
              <Link to="/learn" className="btn-ghost" style={ctaGhost}>
                <BookOpen size={15} /> Learn the concepts
              </Link>
            </div>

            {/* Spans the whole column rather than sitting under the paragraph's
                measure. That is what carries the left side out to meet the demo
                panel on a wide screen, instead of leaving a dead band between
                them. */}
            <div className="home-rise" style={step(4)}>
              <FeatureRail />
            </div>
          </div>

          {/* Right: the circuit itself, running on the real engines */}
          <div className="home-rise" style={{ ...demoCol, ...step(2) }}>
            <HeroDemo size={visualSize} tour={tour} onHoverChange={tour.setPaused} />
          </div>
        </div>

        <div className="home-rise" style={{ ...step(5), position: 'relative', zIndex: 1, flexShrink: 0 }}>
          <WorkflowStrip />
        </div>
      </div>
    </div>
  );
}

// Hero blocks land one after another instead of all at once.
const step = (i) => ({ animationDelay: `${i * 0.09}s` });

const page = {
  position: 'relative',
  height: '100%',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  paddingBottom: 'var(--gap-sm)',
};

// Hero sits near the top and the how-to strip anchors to the bottom.
// Centring the whole column instead left a large dead band above the title
// on a tall screen, which read as the page floating rather than filling.
const main = {
  flex: 1,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  gap: 'var(--gap-md)',
  paddingTop: 'var(--gap-sm)',
  position: 'relative',
  zIndex: 1,
};

// Fills the width rather than sitting in a centred 1320px column, which left
// an obvious empty margin down both sides of a wide screen.
//
// It was capped in the first place because two columns stretched to the edges
// left a dead band down the middle. The fix is to give the left column
// something that genuinely wants the width: the feature rail spans it fully,
// so the pitch reaches across to the demo panel even though the prose above it
// keeps a readable measure and stops well short.
const hero = {
  display: 'flex',
  alignItems: 'center',
  gap: 'clamp(20px, 2.6vw, 48px)',
  flexWrap: 'wrap-reverse',
  width: '100%',
};

const pitch = {
  flex: '1 1 520px',
  minWidth: 290,
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--gap-sm)',
};

const demoCol = {
  flex: '0 1 clamp(320px, 26vw, 450px)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
};

const masthead = {
  display: 'flex',
  alignItems: 'center',
  gap: 'clamp(14px, 1.4vw, 24px)',
};

// The logo sits in a glass tile rather than floating loose on the background:
// it gives the mark an edge to sit against, which is what makes it read as a
// brand mark instead of a decorative sphere that happens to be there.
const logoMark = {
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  padding: 'clamp(9px, 1.4vh, 15px)',
  borderRadius: 'clamp(16px, 2.4vh, 24px)',
  background: 'linear-gradient(150deg, color-mix(in srgb, var(--phase-90) 14%, transparent),'
    + ' color-mix(in srgb, var(--phase-180) 12%, transparent))',
  border: '1px solid color-mix(in srgb, var(--phase-180) 30%, transparent)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10), 0 18px 40px -20px hsla(285, 70%, 45%, 0.7)',
  animation: 'logo-float 6s ease-in-out infinite',
};

const logoHalo = {
  position: 'absolute',
  inset: '-34%',
  borderRadius: '50%',
  background: 'radial-gradient(circle, var(--phase-180) 0%, transparent 70%)',
  filter: 'blur(26px)',
  opacity: 0.85,
  animation: 'logo-halo 5.2s ease-in-out infinite',
  pointerEvents: 'none',
};

const logoImg = {
  position: 'relative',
  width: 'clamp(52px, 8.4vh, 92px)',
  height: 'auto',
  objectFit: 'contain',
  filter: 'drop-shadow(0 8px 20px hsla(280, 65%, 50%, 0.5))',
};

const eyebrowRow = { display: 'flex', alignItems: 'center', gap: 9, marginTop: 4 };

const eyebrowRule = {
  width: 'clamp(18px, 2.4vw, 40px)',
  height: 1.5,
  borderRadius: 2,
  background: 'linear-gradient(90deg, var(--phase-90), var(--phase-180))',
  flexShrink: 0,
};

const eyebrow = {
  fontFamily: 'var(--font-mono)',
  fontSize: 'clamp(11px, 1.5vh, 13.5px)',
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: 'var(--phase-180)',
};

/* The wordmark.
 *
 * The gradient fill makes the glyphs transparent, so a text-shadow shows
 * through as a coloured halo rather than a drop shadow — that glow is what
 * stops the name reading as another line of body copy on a dark background.
 *
 * The tight tracking and the heavier weight do the rest: at -0.03em the two
 * halves of the compound read as one word, which is what a wordmark has to do
 * before anything else. */
const titleStyle = {
  fontFamily: 'var(--font-display)',
  fontWeight: 700,
  fontSize: 'clamp(2.7rem, 2.7vw + 3.7vh, 5.4rem)',
  lineHeight: 0.92,
  letterSpacing: '-0.032em',
  margin: 0,
  background: 'linear-gradient(96deg, var(--phase-90) 0%, var(--phase-0) 28%,'
    + ' var(--phase-180) 58%, var(--phase-270) 78%, var(--phase-90) 100%)',
  backgroundSize: '280% auto',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
  textShadow: '0 8px 44px hsla(285, 75%, 55%, 0.45)',
  animation: 'exit-gradient 9s ease-in-out infinite',
};

// The one line someone reads if they read nothing else.
const tagline = {
  fontSize: 'clamp(14px, 2vh, 19px)',
  fontWeight: 500,
  color: 'var(--ink)',
  lineHeight: 1.35,
  margin: 0,
  maxWidth: 700,
};

const body = {
  fontSize: 'var(--fs-body)',
  lineHeight: 1.6,
  maxWidth: 640,
  margin: 0,
};

const ctaRow = { display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' };

const ctaPrimary = {
  padding: 'clamp(10px, 1.5vh, 14px) clamp(20px, 2vw, 28px)',
  fontSize: 'var(--fs-body)',
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
};

const ctaGhost = {
  padding: 'clamp(9px, 1.3vh, 13px) clamp(16px, 1.6vw, 22px)',
  fontSize: 'var(--fs-sm)',
  textDecoration: 'none',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
};
