import { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { selectCurrentUser, logoutUser } from '../store/slices/authSlice';
import { setSearch } from '../store/slices/projectsSlice';
import { toggleLanguage, selectLanguage } from '../store/slices/uiSlice';
import { selectProjectById } from '../store/slices/projectsSlice';
import NotificationBell from './ui/NotificationBell';
import AppFooter from './AppFooter.jsx';
import BottomSheet from './ui/BottomSheet.jsx';
import { useAppTheme } from '../context/ThemeContext.jsx';
import { useAppMenu } from '../context/AppMenuContext.jsx';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import ArrowForwardOutlined from '@mui/icons-material/ArrowForwardOutlined';
import BuildOutlined from '@mui/icons-material/BuildOutlined';
import MenuOutlined from '@mui/icons-material/MenuOutlined';
import HelpOutlineOutlined from '@mui/icons-material/HelpOutlineOutlined';
import LightModeOutlined from '@mui/icons-material/LightModeOutlined';
import DarkModeOutlined from '@mui/icons-material/DarkModeOutlined';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import CloseOutlined from '@mui/icons-material/CloseOutlined';

export default function AppShell({ children }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { id: projectId } = useParams();
  const user = useSelector(selectCurrentUser);
  const lang = useSelector(selectLanguage);
  const currentProject = useSelector(selectProjectById(projectId));
  const { mode, toggleTheme } = useAppTheme();
  const { menuOpen, openMenu, closeMenu } = useAppMenu();
  const [showHelp, setShowHelp]       = useState(false);
  const [showSearch, setShowSearch]   = useState(false);
  const [searchVal, setSearchVal]     = useState('');
  const searchTimerRef                = useRef(null);
  const searchInputRef                = useRef(null);

  useEffect(() => {
    if (showSearch && searchInputRef.current) searchInputRef.current.focus();
  }, [showSearch]);

  // Close search when entering workspace
  useEffect(() => {
    if (isInProject && showSearch) {
      setShowSearch(false);
      setSearchVal('');
      dispatch(setSearch(''));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInProject]);

  function openSearch() { setShowSearch(true); }

  function closeSearch() {
    setShowSearch(false);
    setSearchVal('');
    clearTimeout(searchTimerRef.current);
    dispatch(setSearch(''));
  }

  function handleSearchChange(e) {
    const val = e.target.value;
    setSearchVal(val);
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      dispatch(setSearch(val));
      if (val && location.pathname !== '/dashboard') navigate('/dashboard');
    }, 350);
  }

  const isHome = location.pathname === '/dashboard';
  const isInProject = /^\/projects\/[^/]+\//.test(location.pathname);
  const showBack = !isHome && !isInProject;
  const brandLabel = (isInProject && currentProject?.title) ? currentProject.title : 'Power Plan';

  function handleLogout() {
    closeMenu();
    dispatch(logoutUser());
  }

  return (
    <div className={`app-shell${!isInProject ? ' app-shell--has-footer' : ''}`}>
      <header className={`app-topbar${isInProject ? ' app-topbar--in-project' : ''}`}>
        <div className="app-topbar__row">
        <div className="app-topbar__start">
          {/* Hamburger first in DOM = rightmost in RTL ✓ */}
          <button className="btn-ghost app-topbar__hamburger" onClick={openMenu} aria-label="תפריט">
            <MenuOutlined />
          </button>
          <NotificationBell />
          <button className="app-topbar__brand btn-ghost" onClick={() => navigate('/dashboard')}>
            <span className="app-topbar__brand-icon">⚡</span>
            <span className="app-topbar__brand-name">{brandLabel}</span>
          </button>
          {showBack && (
            <button className="btn-ghost app-topbar__back" onClick={() => navigate(-1)}>
              <ArrowForwardOutlined fontSize="small" /> חזור
            </button>
          )}
        </div>

        <div className="app-topbar__end">
          <button className="btn-ghost app-topbar__lang" onClick={() => dispatch(toggleLanguage())}>
            {lang === 'he' ? 'EN' : 'עב'}
          </button>
          <button className="btn-ghost app-topbar__theme" onClick={toggleTheme} title={mode === 'dark' ? 'מצב בהיר' : 'מצב כהה'}>
            {mode === 'dark' ? <LightModeOutlined fontSize="small" /> : <DarkModeOutlined fontSize="small" />}
          </button>
          {user?.name && (
            <span className="app-topbar__username">{user.name}</span>
          )}
          <button
            className={`btn-ghost app-topbar__settings${location.pathname === '/settings' ? ' app-topbar__settings--active' : ''}`}
            onClick={() => navigate('/settings')}
            title="הגדרות"
          >
            <SettingsOutlined fontSize="small" />
          </button>
          {user?.role === 'admin' && (
            <button className="btn-ghost app-topbar__admin" onClick={() => navigate('/admin')} title="Admin">
              <BuildOutlined fontSize="small" />
            </button>
          )}
          <button className="btn-ghost app-topbar__help" onClick={() => setShowHelp(true)} title="עזרה">
            <HelpOutlineOutlined fontSize="small" />
          </button>
          <button
            className="btn btn--secondary app-topbar__logout"
            onClick={() => dispatch(logoutUser())}
          >
            {t('auth.logout')}
          </button>
          {!isInProject && (
            <button className="btn-ghost app-topbar__search-toggle" onClick={openSearch} title={t('search.open')}>
              <SearchOutlined fontSize="small" />
            </button>
          )}
        </div>
        </div>
        {showSearch && !isInProject && (
          <div className="app-topbar__search-row">
            <SearchOutlined className="app-topbar__search-icon" fontSize="small" />
            <input
              ref={searchInputRef}
              type="search"
              className="app-topbar__search-input"
              placeholder={t('search.placeholder')}
              value={searchVal}
              onChange={handleSearchChange}
              onKeyDown={(e) => e.key === 'Escape' && closeSearch()}
              dir={lang === 'he' ? 'rtl' : 'ltr'}
            />
            <button className="btn-ghost app-topbar__search-close" onClick={closeSearch} aria-label="סגור חיפוש">
              <CloseOutlined fontSize="small" />
            </button>
          </div>
        )}
      </header>

      {menuOpen && (
        <BottomSheet onClose={closeMenu}>
          <div className="app-menu">
            <button className="app-menu__item" onClick={() => { dispatch(toggleLanguage()); closeMenu(); }}>
              🌐 {lang === 'he' ? 'English' : 'עברית'}
            </button>
            <button className="app-menu__item" onClick={() => { toggleTheme(); closeMenu(); }}>
              {mode === 'dark' ? '☀️ מצב בהיר' : '🌙 מצב כהה'}
            </button>
            <button className="app-menu__item" onClick={() => { setShowHelp(true); closeMenu(); }}>
              ❓ עזרה
            </button>
            {user?.role === 'admin' && (
              <button className="app-menu__item" onClick={() => { navigate('/admin'); closeMenu(); }}>
                🔧 Admin
              </button>
            )}
            <button className="app-menu__item app-menu__item--danger" onClick={handleLogout}>
              {t('auth.logout')}
            </button>
          </div>
        </BottomSheet>
      )}

      {showHelp && (
        <BottomSheet onClose={() => setShowHelp(false)}>
          <div className="help-panel">
            <h3 className="help-panel__title">{t('help.title')}</h3>
            <div className="help-panel__section">
              <h4>{t('help.anthropicTitle')}</h4>
              <p>{t('help.anthropicDesc')}</p>
            </div>
            <div className="help-panel__section">
              <h4>{t('help.pipelineTitle')}</h4>
              <ul>
                <li>{t('help.planning')}</li>
                <li>{t('help.coding')}</li>
                <li>{t('help.deploy')}</li>
              </ul>
            </div>
            <div className="help-panel__section">
              <h4>{t('help.faqTitle')}</h4>
              <ul>
                <li><strong>{t('help.faq1Q')}</strong> {t('help.faq1A')}</li>
                <li><strong>{t('help.faq2Q')}</strong> {t('help.faq2A')}</li>
                <li><strong>{t('help.faq3Q')}</strong> {t('help.faq3A')}</li>
              </ul>
            </div>
            <div className="help-panel__section">
              <a href="mailto:shiranc86@gmail.com" className="btn btn--secondary btn--full">
                {t('help.contactBtn')}
              </a>
            </div>
          </div>
        </BottomSheet>
      )}

      <div className="app-shell__content">
        {children}
      </div>
      {!isInProject && <AppFooter />}
    </div>
  );
}
