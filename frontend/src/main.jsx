import * as Sentry from '@sentry/react';
import posthog from 'posthog-js';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider as ReduxProvider } from 'react-redux';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App.jsx';
import { store } from './store/index.js';
import { AuthProvider } from './context/AuthContext.jsx';
import { LanguageProvider } from './context/LanguageContext.jsx';
import { SocketProvider } from './context/SocketContext.jsx';
import { AppThemeProvider } from './context/ThemeContext.jsx';
import { AppMenuProvider } from './context/AppMenuContext.jsx';
import './i18n';
import './styles/main.scss';

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn:         import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
  });
}

if (import.meta.env.VITE_POSTHOG_KEY) {
  posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://eu.i.posthog.com',
    capture_pageview: true,
  });
  window.posthog = posthog;
}

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

// When a new service worker takes control, notify the app so it can show
// an update prompt instead of silently reloading.
// hadController guards against firing on the very first SW installation.
if ('serviceWorker' in navigator) {
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) window.dispatchEvent(new CustomEvent('sw-updated'));
  });
}

// Apply persisted theme before first paint to avoid flash
const _savedTheme = localStorage.getItem('pp-theme');
if (_savedTheme === 'light') document.documentElement.dataset.theme = 'light';

// Apply persisted language + direction before first paint to avoid flash
const savedLang = localStorage.getItem('lang') || 'en';
document.documentElement.setAttribute('dir',  savedLang === 'he' ? 'rtl' : 'ltr');
document.documentElement.setAttribute('lang', savedLang);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ''}>
      <ReduxProvider store={store}>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <LanguageProvider>
            <AuthProvider>
              <SocketProvider>
                <AppThemeProvider>
                  <AppMenuProvider>
                    <App />
                  </AppMenuProvider>
                </AppThemeProvider>
              </SocketProvider>
            </AuthProvider>
          </LanguageProvider>
        </BrowserRouter>
      </ReduxProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>,
);
