import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import HomeOutlined from '@mui/icons-material/HomeOutlined';
import AddCircleOutlineOutlined from '@mui/icons-material/AddCircleOutlineOutlined';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';

export default function AppFooter() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { path: '/dashboard',   icon: <HomeOutlined />,             label: t('nav.projects') },
    { path: '/new-project', icon: <AddCircleOutlineOutlined />, label: t('nav.new') },
    { path: '/settings',    icon: <SettingsOutlined />,         label: t('topbar.settings') },
  ];

  return (
    <nav className="app-footer">
      {tabs.map((tab) => (
        <button
          key={tab.path}
          className={`app-footer__tab${location.pathname.startsWith(tab.path) ? ' app-footer__tab--active' : ''}`}
          onClick={() => navigate(tab.path)}
          aria-label={tab.label}
        >
          {tab.icon}
          <span className="app-footer__tab-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
