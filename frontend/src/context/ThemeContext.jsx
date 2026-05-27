import { createContext, useContext, useState, useMemo } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { buildMuiTheme } from '../theme/muiTheme';

const ThemeCtx = createContext({ mode: 'dark', toggleTheme: () => {} });
export const useAppTheme = () => useContext(ThemeCtx);

export function AppThemeProvider({ children }) {
  const [mode, setMode] = useState(() => localStorage.getItem('pp-theme') || 'dark');

  const toggleTheme = () => {
    const next = mode === 'dark' ? 'light' : 'dark';
    setMode(next);
    localStorage.setItem('pp-theme', next);
    document.documentElement.dataset.theme = next === 'light' ? 'light' : '';
  };

  const muiTheme = useMemo(() => buildMuiTheme(mode), [mode]);

  return (
    <ThemeCtx.Provider value={{ mode, toggleTheme }}>
      <ThemeProvider theme={muiTheme}>
        {children}
      </ThemeProvider>
    </ThemeCtx.Provider>
  );
}
