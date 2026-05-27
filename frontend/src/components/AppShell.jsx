import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { selectCurrentUser, logoutUser } from '../store/slices/authSlice';
import { toggleLanguage, selectLanguage } from '../store/slices/uiSlice';
import NotificationBell from './ui/NotificationBell';
import BottomSheet from './ui/BottomSheet.jsx';

export default function AppShell({ children }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector(selectCurrentUser);
  const lang = useSelector(selectLanguage);

  const [menuOpen, setMenuOpen] = useState(false);

  const isHome = location.pathname === '/dashboard';

  function handleLogout() {
    setMenuOpen(false);
    dispatch(logoutUser());
  }

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <div className="app-topbar__start">
          <button className="app-topbar__brand btn-ghost" onClick={() => navigate('/dashboard')}>
            <span className="app-topbar__brand-icon">⚡</span>
            <span className="app-topbar__brand-name">Power Plan</span>
          </button>
          {!isHome && (
            <button className="btn-ghost app-topbar__home" onClick={() => navigate('/dashboard')}>
              ⌂ בית
            </button>
          )}
        </div>

        <div className="app-topbar__end">
          <button className="btn-ghost app-topbar__lang" onClick={() => dispatch(toggleLanguage())}>
            {lang === 'he' ? 'EN' : 'עב'}
          </button>
          <NotificationBell />
          {user?.name && (
            <span className="app-topbar__username">{user.name}</span>
          )}
          <button
            className={`btn-ghost app-topbar__settings${location.pathname === '/settings' ? ' app-topbar__settings--active' : ''}`}
            onClick={() => navigate('/settings')}
            title="הגדרות"
          >
            ⚙
          </button>
          {user?.role === 'admin' && (
            <button className="btn-ghost app-topbar__admin" onClick={() => navigate('/admin')} title="Admin">
              🔧
            </button>
          )}
          <button
            className="btn btn--secondary app-topbar__logout"
            onClick={() => dispatch(logoutUser())}
          >
            {t('auth.logout')}
          </button>

          {/* Hamburger — mobile only */}
          <button className="btn-ghost app-topbar__hamburger" onClick={() => setMenuOpen(true)} aria-label="תפריט">
            ☰
          </button>
        </div>
      </header>

      {menuOpen && (
        <BottomSheet onClose={() => setMenuOpen(false)}>
          <div className="app-menu">
            <button className="app-menu__item" onClick={() => { dispatch(toggleLanguage()); setMenuOpen(false); }}>
              🌐 {lang === 'he' ? 'English' : 'עברית'}
            </button>
            <button className="app-menu__item" onClick={() => { navigate('/settings'); setMenuOpen(false); }}>
              ⚙️ {t('settings.title')}
            </button>
            {user?.role === 'admin' && (
              <button className="app-menu__item" onClick={() => { navigate('/admin'); setMenuOpen(false); }}>
                🔧 Admin
              </button>
            )}
            <button className="app-menu__item app-menu__item--danger" onClick={handleLogout}>
              {t('auth.logout')}
            </button>
          </div>
        </BottomSheet>
      )}

      <div className="app-shell__content">
        {children}
      </div>
    </div>
  );
}
