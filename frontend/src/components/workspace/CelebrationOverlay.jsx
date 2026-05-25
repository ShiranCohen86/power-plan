import { useEffect, useRef, useState } from 'react';

// Pure-CSS confetti — no external deps
const COLORS = ['#7c3aed', '#a78bfa', '#fbbf24', '#34d399', '#f472b6', '#60a5fa', '#fb923c'];

function randomBetween(a, b) { return a + Math.random() * (b - a); }

function createPiece() {
  return {
    id:    Math.random(),
    x:     randomBetween(5, 95),   // vw %
    delay: randomBetween(0, 1.2),  // s
    dur:   randomBetween(2.5, 4),  // s
    size:  randomBetween(6, 14),   // px
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    rotate: randomBetween(-180, 180),
    shape: Math.random() > 0.5 ? 'circle' : 'rect',
  };
}

const PIECES = Array.from({ length: 80 }, createPiece);

export default function CelebrationOverlay({ liveUrl, githubUrl, projectTitle, onClose }) {
  const [copied, setCopied] = useState(false);
  const overlayRef = useRef();

  // Close on backdrop click
  function handleBackdrop(e) {
    if (e.target === overlayRef.current) onClose?.();
  }

  // Keyboard ESC
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(liveUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <div className="celebration-overlay" ref={overlayRef} onClick={handleBackdrop}>
      {/* Confetti */}
      {PIECES.map((p) => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left:            `${p.x}%`,
            animationDelay:  `${p.delay}s`,
            animationDuration: `${p.dur}s`,
            width:           p.size,
            height:          p.shape === 'circle' ? p.size : p.size * 0.6,
            borderRadius:    p.shape === 'circle' ? '50%' : 2,
            background:      p.color,
            '--rotate':      `${p.rotate}deg`,
          }}
        />
      ))}

      {/* Card */}
      <div className="celebration-card">
        <button className="celebration-close" onClick={onClose}>✕</button>

        <div className="celebration-icon">🎉</div>
        <h1 className="celebration-title">האפליקציה שלך חיה!</h1>
        {projectTitle && (
          <p className="celebration-project">{projectTitle}</p>
        )}

        <div className="celebration-url-box">
          <span className="celebration-url-label">הלינק שלך:</span>
          <a className="celebration-url" href={liveUrl} target="_blank" rel="noreferrer">
            {liveUrl}
          </a>
        </div>

        <div className="celebration-actions">
          <a
            className="btn celebration-btn-primary"
            href={liveUrl}
            target="_blank"
            rel="noreferrer"
          >
            פתח את האפליקציה ←
          </a>
          <button className="btn btn--secondary" onClick={copyUrl}>
            {copied ? '✓ הועתק!' : 'העתק לינק'}
          </button>
        </div>

        <div className="celebration-secondary">
          {githubUrl && (
            <a href={githubUrl} target="_blank" rel="noreferrer" className="celebration-link">
              📦 GitHub Repo
            </a>
          )}
          <button className="celebration-link" onClick={onClose}>
            📋 צפה בתכנון
          </button>
        </div>

        <p className="celebration-sub">
          כל 12 שלבי התכנון, הקוד והפריסה — הושלמו ע"י AI ⚡
        </p>
      </div>
    </div>
  );
}
