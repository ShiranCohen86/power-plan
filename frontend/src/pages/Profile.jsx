import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import { selectCurrentUser } from '../store/slices/authSlice.js';
import { updateCurrentUser } from '../api/auth.api.js';

export default function Profile() {
  const { t }   = useTranslation();
  const dispatch = useDispatch();
  const user    = useSelector(selectCurrentUser);
  const [name, setName]   = useState(user?.name || '');
  const [busy, setBusy]   = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr]     = useState('');

  async function handleSave(e) {
    e.preventDefault();
    if (!name.trim() || name.trim() === user?.name) return;
    setBusy(true); setErr(''); setSaved(false);
    try {
      await updateCurrentUser({ name: name.trim() });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setErr(e.message || t('settings.errorSave'));
    } finally { setBusy(false); }
  }

  return (
    <div className="settings-page">
      <div className="settings-page__heading">
        <h1 className="settings-page__title">👤 {t('profile.title')}</h1>
      </div>
      <div className="settings-page__body">
        <section className="settings-section">
          <h2 className="settings-section__title">{t('profile.infoSection')}</h2>
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 400 }}>
            <div className="form-group">
              <label style={{ fontSize: 13, marginBottom: 4, display: 'block', color: 'var(--text-muted)' }}>
                {t('profile.email')}
              </label>
              <input type="email" value={user?.email || ''} readOnly
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', width: '100%', color: 'var(--text-muted)', fontSize: 14 }} />
            </div>
            <div className="form-group">
              <label style={{ fontSize: 13, marginBottom: 4, display: 'block', color: 'var(--text-muted)' }}>
                {t('profile.name')}
              </label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', width: '100%', color: 'var(--text)', fontSize: 14 }} />
            </div>
            {err && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{err}</p>}
            {saved && <p style={{ color: 'var(--success, #22c55e)', fontSize: 13 }}>✅ {t('profile.saved')}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="btn btn--primary" disabled={busy || !name.trim() || name.trim() === user?.name}>
                {busy ? t('settings.saving') : t('common.save')}
              </button>
            </div>
          </form>
        </section>

        <section className="settings-section">
          <h2 className="settings-section__title">{t('profile.accountSection')}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
            <div><span style={{ color: 'var(--text-muted)' }}>{t('profile.role')}:</span> {user?.role}</div>
            <div><span style={{ color: 'var(--text-muted)' }}>{t('profile.plan')}:</span> {user?.plan}</div>
            <div><span style={{ color: 'var(--text-muted)' }}>{t('profile.joined')}:</span> {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</div>
          </div>
        </section>
      </div>
    </div>
  );
}
