import { createTheme } from '@mui/material/styles';

// Tema Material UI para Lyn CRM (mLabs Design System)
export const theme = createTheme({
  palette: {
    primary: {
      main: '#1A73E8',
      light: '#5FC1F8',
      dark: '#1565C0',
      contrastText: '#fff',
    },
    secondary: {
      main: '#F26526',
      light: '#FFA040',
      dark: '#D04E1A',
      contrastText: '#fff',
    },
    error: {
      main: '#d32f2f',
    },
    warning: {
      main: '#ed6c02',
    },
    info: {
      main: '#0288d1',
    },
    success: {
      main: '#2e7d32',
    },
  },
  typography: {
    fontFamily: [
      'Poppins',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'sans-serif',
    ].join(','),
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
  },
});
