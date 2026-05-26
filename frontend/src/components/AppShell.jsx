import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { selectCurrentUser, logoutUser } from '../store/slices/authSlice';
import { toggleLanguage, selectLanguage } from '../store/slices/uiSlice';
import NotificationBell from './ui/NotificationBell';

export default function AppShell({ children }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector(selectCurrentUser);
  const lang = useSelector(selectLanguage);

  const isHome = location.pathname === '/dashboard';

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
            <button className="btn-ghost" onClick={() => navigate('/admin')} title="Admin">
              🔧
            </button>
          )}
          <button
            className="btn btn--secondary app-topbar__logout"
            onClick={() => dispatch(logoutUser())}
          >
            יציאה
          </button>
        </div>
      </header>

      <div className="app-shell__content">
        {children}
      </div>
    </div>
  );
}
