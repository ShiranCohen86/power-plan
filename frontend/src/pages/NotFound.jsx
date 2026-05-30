import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', color: 'var(--text)', direction: 'rtl',
      padding: '32px 16px', gap: 16, textAlign: 'center',
    }}>
      <div style={{ fontSize: 64, lineHeight: 1 }}>⚡</div>
      <h1 style={{ fontSize: 'var(--text-4xl)', fontWeight: 'var(--weight-extrabold)', margin: 0 }}>404</h1>
      <p style={{ fontSize: 'var(--text-lg)', color: 'var(--text-muted)', margin: 0 }}>
        הדף שחיפשת לא נמצא
      </p>
      <Link
        to="/dashboard"
        className="btn btn--primary"
        style={{ marginTop: 8, textDecoration: 'none' }}
      >
        חזור ללוח הבקרה
      </Link>
    </div>
  );
}
