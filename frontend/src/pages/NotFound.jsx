import { Link, useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', color: 'var(--text)', direction: 'rtl',
      padding: '32px 16px', gap: 16, textAlign: 'center',
    }}>
      <div style={{ fontSize: 80, lineHeight: 1 }}>🔍</div>
      <h1 style={{ fontSize: 'var(--text-4xl)', fontWeight: 'var(--weight-extrabold)', margin: 0 }}>404</h1>
      <p style={{ fontSize: 'var(--text-lg)', color: 'var(--text-muted)', margin: 0, maxWidth: 320 }}>
        הדף שחיפשת לא נמצא — ייתכן שהקישור שגוי או שהדף הועבר.
      </p>
      <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button className="btn btn--secondary" onClick={() => navigate(-1)}>← חזור</button>
        <Link to="/dashboard" className="btn btn--primary" style={{ textDecoration: 'none' }}>
          לוח הבקרה
        </Link>
      </div>
    </div>
  );
}
