import { createSlice } from '@reduxjs/toolkit';
import i18n from '../../i18n/index.js';

const storedLanguage = (typeof window !== 'undefined' && localStorage.getItem('lang')) || 'en';

const initialState = {
  language:  storedLanguage,
  direction: storedLanguage === 'he' ? 'rtl' : 'ltr',
  toasts:    [],
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setLanguage(state, action) {
      state.language  = action.payload;
      state.direction = action.payload === 'he' ? 'rtl' : 'ltr';
      i18n.changeLanguage(action.payload);
    },
    toggleLanguage(state) {
      const next      = state.language === 'he' ? 'en' : 'he';
      state.language  = next;
      state.direction = next === 'he' ? 'rtl' : 'ltr';
      i18n.changeLanguage(next);
    },
    pushToast(state, action) {
      const toast = { id: Date.now() + Math.random(), severity: 'info', ...action.payload };
      state.toasts.push(toast);
    },
    dismissToast(state, action) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
  },
});

export const { setLanguage, toggleLanguage, pushToast, dismissToast } = uiSlice.actions;

export const selectLanguage  = (state) => state.ui.language;
export const selectDirection = (state) => state.ui.direction;
export const selectToasts    = (state) => state.ui.toasts;

export default uiSlice.reducer;
