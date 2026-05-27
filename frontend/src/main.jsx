import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider as ReduxProvider } from 'react-redux';
import App from './App.jsx';
import { store } from './store/index.js';
import { AuthProvider } from './context/AuthContext.jsx';
import { LanguageProvider } from './context/LanguageContext.jsx';
import { SocketProvider } from './context/SocketContext.jsx';
import { AppThemeProvider } from './context/ThemeContext.jsx';
import './i18n';
import './styles/main.scss';

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
    <ReduxProvider store={store}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <LanguageProvider>
          <AuthProvider>
            <SocketProvider>
              <AppThemeProvider>
                <App />
              </AppThemeProvider>
            </SocketProvider>
          </AuthProvider>
        </LanguageProvider>
      </BrowserRouter>
    </ReduxProvider>
  </React.StrictMode>,
);
