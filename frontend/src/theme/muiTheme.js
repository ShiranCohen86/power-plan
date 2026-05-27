import { createTheme } from '@mui/material/styles';

export function buildMuiTheme(mode) {
  return createTheme({
    palette: {
      mode,
      primary: {
        main:  mode === 'light' ? '#0284c7' : '#06b6d4',
        dark:  mode === 'light' ? '#0369a1' : '#0891b2',
        light: mode === 'light' ? '#0891b2' : '#22d3ee',
      },
      error:   { main: '#f87171' },
      warning: { main: '#fbbf24' },
      success: { main: '#34d399' },
      background: {
        default: mode === 'light' ? '#f0f5f8' : '#090b0d',
        paper:   mode === 'light' ? '#ffffff'  : '#171b1f',
      },
      text: {
        primary:   mode === 'light' ? '#111820' : '#e2eaed',
        secondary: mode === 'light' ? '#4a6070' : '#5a7280',
      },
      divider: mode === 'light' ? '#ccd9e3' : '#1a2028',
    },
    shape:      { borderRadius: 10 },
    typography: { fontFamily: "'Inter', 'Heebo', system-ui, -apple-system, sans-serif" },
    components: {
      MuiButton:   { styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } } },
      MuiSkeleton: { defaultProps: { animation: 'wave' } },
      MuiTooltip:  { defaultProps: { arrow: true, placement: 'top' } },
    },
  });
}
