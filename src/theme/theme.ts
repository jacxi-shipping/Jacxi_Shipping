'use client';

import { createTheme } from '@mui/material/styles';

const palette = {
	accentGold: '#D4AF37',
	background: '#F9FAFB',
	panel: '#E4E9F0',
	textPrimary: '#1C1C1E',
	textSecondary: '#5F6368',
	border: '#E0E0E0',
	error: '#EF4444',
};

// Create a custom Material-UI theme
export const theme = createTheme({
    palette: {
      mode: 'light',
      primary: {
        main: palette.accentGold,
        light: palette.accentGold,
        dark: '#BD9430',
        contrastText: palette.background,
      },
      secondary: {
        main: palette.accentGold,
        light: palette.accentGold,
        dark: '#BD9430',
        contrastText: palette.background,
      },
      success: {
        main: palette.accentGold,
        light: palette.accentGold,
        dark: '#BD9430',
      },
      warning: {
        main: palette.accentGold,
        light: palette.accentGold,
        dark: '#BD9430',
      },
      error: {
        main: palette.error,
        light: '#F87171',
        dark: '#B91C1C',
      },
      info: {
        main: palette.accentGold,
        light: palette.accentGold,
        dark: '#BD9430',
      },
      grey: {
        50: palette.background,
        100: palette.panel,
        200: palette.panel,
        300: palette.border,
        400: palette.textSecondary,
        500: palette.textSecondary,
        600: palette.textSecondary,
        700: palette.textSecondary,
        800: palette.textPrimary,
        900: palette.textPrimary,
      },
      background: {
        default: palette.background,
        paper: palette.background,
      },
      text: {
        primary: palette.textPrimary,
        secondary: palette.textSecondary,
      },
    },
  typography: {
    fontFamily: 'var(--font-geist-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h1: {
      fontSize: '2.25rem',
      fontWeight: 700,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '1.875rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
  shadows: [
    'none',
    '0 1px 2px 0 rgb(var(--text-primary-rgb) / 0.05)',
    '0 1px 3px 0 rgb(var(--text-primary-rgb) / 0.1), 0 1px 2px -1px rgb(var(--text-primary-rgb) / 0.1)',
    '0 4px 6px -1px rgb(var(--text-primary-rgb) / 0.1), 0 2px 4px -2px rgb(var(--text-primary-rgb) / 0.1)',
    '0 10px 15px -3px rgb(var(--text-primary-rgb) / 0.1), 0 4px 6px -4px rgb(var(--text-primary-rgb) / 0.1)',
    '0 20px 25px -5px rgb(var(--text-primary-rgb) / 0.1), 0 8px 10px -6px rgb(var(--text-primary-rgb) / 0.1)',
    '0 25px 50px -12px rgb(var(--text-primary-rgb) / 0.25)',
    '0 1px 3px 0 rgb(var(--text-primary-rgb) / 0.1), 0 1px 2px -1px rgb(var(--text-primary-rgb) / 0.1)',
    '0 4px 6px -1px rgb(var(--text-primary-rgb) / 0.1), 0 2px 4px -2px rgb(var(--text-primary-rgb) / 0.1)',
    '0 10px 15px -3px rgb(var(--text-primary-rgb) / 0.1), 0 4px 6px -4px rgb(var(--text-primary-rgb) / 0.1)',
    '0 20px 25px -5px rgb(var(--text-primary-rgb) / 0.1), 0 8px 10px -6px rgb(var(--text-primary-rgb) / 0.1)',
    '0 25px 50px -12px rgb(var(--text-primary-rgb) / 0.25)',
    '0 1px 3px 0 rgb(var(--text-primary-rgb) / 0.1), 0 1px 2px -1px rgb(var(--text-primary-rgb) / 0.1)',
    '0 4px 6px -1px rgb(var(--text-primary-rgb) / 0.1), 0 2px 4px -2px rgb(var(--text-primary-rgb) / 0.1)',
    '0 10px 15px -3px rgb(var(--text-primary-rgb) / 0.1), 0 4px 6px -4px rgb(var(--text-primary-rgb) / 0.1)',
    '0 20px 25px -5px rgb(var(--text-primary-rgb) / 0.1), 0 8px 10px -6px rgb(var(--text-primary-rgb) / 0.1)',
    '0 25px 50px -12px rgb(var(--text-primary-rgb) / 0.25)',
    '0 1px 3px 0 rgb(var(--text-primary-rgb) / 0.1), 0 1px 2px -1px rgb(var(--text-primary-rgb) / 0.1)',
    '0 4px 6px -1px rgb(var(--text-primary-rgb) / 0.1), 0 2px 4px -2px rgb(var(--text-primary-rgb) / 0.1)',
    '0 10px 15px -3px rgb(var(--text-primary-rgb) / 0.1), 0 4px 6px -4px rgb(var(--text-primary-rgb) / 0.1)',
    '0 20px 25px -5px rgb(var(--text-primary-rgb) / 0.1), 0 8px 10px -6px rgb(var(--text-primary-rgb) / 0.1)',
    '0 25px 50px -12px rgb(var(--text-primary-rgb) / 0.25)',
    '0 1px 3px 0 rgb(var(--text-primary-rgb) / 0.1), 0 1px 2px -1px rgb(var(--text-primary-rgb) / 0.1)',
    '0 4px 6px -1px rgb(var(--text-primary-rgb) / 0.1), 0 2px 4px -2px rgb(var(--text-primary-rgb) / 0.1)',
    '0 10px 15px -3px rgb(var(--text-primary-rgb) / 0.1), 0 4px 6px -4px rgb(var(--text-primary-rgb) / 0.1)',
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
          fontWeight: 500,
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 1px 3px 0 rgb(var(--text-primary-rgb) / 0.1), 0 1px 2px -1px rgb(var(--text-primary-rgb) / 0.1)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 1px 3px 0 rgb(var(--text-primary-rgb) / 0.1), 0 1px 2px -1px rgb(var(--text-primary-rgb) / 0.1)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 500,
        },
      },
    },
  },
});

