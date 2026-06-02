import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const TOUR_KEY = 'pp-workspace-tour-done';

const STEPS = [
  { title: 'שלב 1: פייפליין', body: 'כאן רואים את כל שלבי התכנון. לחץ על שלב שהושלם לקריאת התוצאה.' },
  { title: 'שלב 2: מסמך', body: 'המסמך שנוצר על ידי ה-AI מוצג כאן. גלול עד הסוף כדי לאשר.' },
  { title: 'שלב 3: פיד חי', body: 'ה-Feed מציג ישיבות צוות, יועצים חיצוניים ולוגים טכניים.' },
];

export default function WorkspaceTour({ onDone }) {
  const { t } = useTranslation();
  const [step, setStep]       = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(TOUR_KEY)) setVisible(true);
  }, []);

  function finish() {
    localStorage.setItem(TOUR_KEY, '1');
    setVisible(false);
    onDone?.();
  }

  if (!visible) return null;

  const s = STEPS[step];
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 16, padding: '28px 32px', maxWidth: 380, width: '90%', textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚡</div>
        <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>{s.title}</h2>
        <p  style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 20 }}>{s.body}</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {step < STEPS.length - 1 ? (
            <button className="btn btn--primary" onClick={() => setStep((v) => v + 1)}>הבא →</button>
          ) : (
            <button className="btn btn--primary" onClick={finish}>בוא נתחיל! 🚀</button>
          )}
          <button className="btn btn--secondary" onClick={finish} style={{ fontSize: 12 }}>דלג</button>
        </div>
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 16 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: i === step ? 'var(--brand-primary)' : 'var(--border)' }} />
          ))}
        </div>
      </div>
    </div>
  );
}
