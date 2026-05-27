import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import he from './he.json';

const stored = typeof window !== 'undefined' ? localStorage.getItem('lang') : null;
const initial = stored || 'en';

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, he: { translation: he } },
  lng: initial,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

function applyDir(lng) {
  const dir = lng === 'he' ? 'rtl' : 'ltr';
  document.documentElement.lang = lng;
  document.documentElement.dir  = dir;
  document.body?.setAttribute('data-lang', lng);
}
applyDir(initial);
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('lang', lng);
  applyDir(lng);
});

export default i18n;
