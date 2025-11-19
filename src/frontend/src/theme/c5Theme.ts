import { createTheme, ThemeOptions } from '@mui/material/styles';

/**
 * C5 Design System - Material-UI Theme
 * 
 * Implements COBRA's C5 design system with:
 * - Cobalt Blue primary color (#0020C2)
 * - Roboto font family
 * - C5 color palette for consistent branding
 * - 48x48 minimum touch targets
 * - Accessible contrast ratios
 */

// C5 Color Palette
export const c5Colors = {
  // Primary Blues
  cobaltBlue: '#0020C2',
  blue: '#0000FF',
  darkBlue: '#00008B',
  
  // Reds (Delete, Errors, Notifications)
  lavaRed: '#E42217',
  red: '#FF0000',
  chilliPepper: '#C11B17',
  fireBrick: '#B22222',
  
  // Neutrals
  white: '#FFFFFF',
  black: '#000000',
  darkGray: '#3A3B3C',
  dimGray: '#696969',
  battleshipGray: '#848482',
  silver: '#C0C0C0',
  silverWhite: '#DADBDD',
  
  // Backgrounds
  defaultBackground: '#F8F8F8',
  positionBarBackground: '#F1F1F1',
  darkModeBackground: '#1A1A1A',
  
  // Status/Highlights
  whiteBlue: '#DBE9FA',        // Selected rows
  lightBlue: '#EAF2FB',        // Child rows in logbook
  successGreen: '#AEFBB8',     // Toast messages
  infoYellow: '#F9F9BE',       // Toast messages
  
  // Status Chart
  green: '#008000',
  canaryYellow: '#FFEF00',
  
  // Logbook
  logbookIconBrown: '#6F4E37',
} as const;

// Theme configuration
const themeOptions: ThemeOptions = {
  palette: {
    mode: 'light',
    primary: {
      main: c5Colors.cobaltBlue,
      light: c5Colors.blue,
      dark: c5Colors.darkBlue,
      contrastText: c5Colors.white,
    },
    secondary: {
      main: c5Colors.silver,
      light: c5Colors.silverWhite,
      dark: c5Colors.battleshipGray,
      contrastText: c5Colors.darkGray,
    },
    error: {
      main: c5Colors.lavaRed,
      light: c5Colors.red,
      dark: c5Colors.chilliPepper,
      contrastText: c5Colors.white,
    },
    warning: {
      main: c5Colors.canaryYellow,
      contrastText: c5Colors.black,
    },
    success: {
      main: c5Colors.green,
      light: c5Colors.successGreen,
      contrastText: c5Colors.white,
    },
    info: {
      main: c5Colors.whiteBlue,
      light: c5Colors.lightBlue,
      contrastText: c5Colors.darkGray,
    },
    background: {
      default: c5Colors.defaultBackground,
      paper: c5Colors.white,
    },
    text: {
      primary: c5Colors.darkGray,
      secondary: c5Colors.dimGray,
    },
    divider: c5Colors.battleshipGray,
  },
  
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif',
    fontSize: 14,
    
    h1: {
      fontFamily: 'Roboto, Arial, sans-serif',
      fontWeight: 700, // Bold
      fontSize: '2.5rem',
      lineHeight: 1.2,
    },
    h2: {
      fontFamily: 'Roboto, Arial, sans-serif',
      fontWeight: 700,
      fontSize: '2rem',
      lineHeight: 1.3,
    },
    h3: {
      fontFamily: 'Roboto, Arial, sans-serif',
      fontWeight: 700,
      fontSize: '1.75rem',
      lineHeight: 1.4,
    },
    h4: {
      fontFamily: 'Roboto, Arial, sans-serif',
      fontWeight: 700,
      fontSize: '1.5rem',
      lineHeight: 1.4,
    },
    h5: {
      fontFamily: 'Roboto, Arial, sans-serif',
      fontWeight: 700,
      fontSize: '1.25rem',
      lineHeight: 1.5,
    },
    h6: {
      fontFamily: 'Roboto, Arial, sans-serif',
      fontWeight: 700,
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    subtitle1: {
      fontFamily: 'Roboto, Arial, sans-serif',
      fontWeight: 500,
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    subtitle2: {
      fontFamily: 'Roboto, Arial, sans-serif',
      fontWeight: 500,
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    body1: {
      fontFamily: 'Roboto, Arial, sans-serif',
      fontWeight: 400,
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body2: {
      fontFamily: 'Roboto, Arial, sans-serif',
      fontWeight: 400,
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    button: {
      fontFamily: 'Roboto, Arial, sans-serif',
      fontWeight: 500,
      fontSize: '0.875rem',
      textTransform: 'none', // Don't force uppercase (better for readability)
      letterSpacing: '0.02em',
    },
    caption: {
      fontFamily: 'Roboto, Arial, sans-serif',
      fontWeight: 400,
      fontSize: '0.75rem',
      lineHeight: 1.5,
    },
    overline: {
      fontFamily: 'Roboto, Arial, sans-serif',
      fontWeight: 500,
      fontSize: '0.75rem',
      lineHeight: 2,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
    },
  },
  
  shape: {
    borderRadius: 4, // Subtle rounding for modern look
  },
  
  components: {
    // Button overrides per C5 guidelines
    MuiButton: {
      defaultProps: {
        disableElevation: false, // Allow shadow for depth
      },
      styleOverrides: {
        root: {
          minWidth: 48,
          minHeight: 48, // C5 minimum touch target
          padding: '8px 16px',
          borderRadius: 4,
          fontWeight: 500,
        },
        contained: {
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          '&:hover': {
            boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
          },
        },
        outlined: {
          borderWidth: 1,
          '&:hover': {
            borderWidth: 1,
          },
        },
        text: {
          '&:hover': {
            backgroundColor: 'rgba(0, 32, 194, 0.04)', // Subtle Cobalt Blue tint
          },
        },
        // Size variants
        sizeLarge: {
          minHeight: 56,
          padding: '12px 24px',
          fontSize: '1rem',
        },
        sizeMedium: {
          minHeight: 48,
          padding: '8px 16px',
          fontSize: '0.875rem',
        },
        sizeSmall: {
          minHeight: 40,
          padding: '6px 12px',
          fontSize: '0.8125rem',
        },
      },
    },
    
    // Icon button minimum size
    MuiIconButton: {
      styleOverrides: {
        root: {
          minWidth: 48,
          minHeight: 48,
          padding: 12,
        },
      },
    },
    
    // Checkbox larger touch target
    MuiCheckbox: {
      styleOverrides: {
        root: {
          padding: 12, // Larger touch area
        },
      },
    },
    
    // Radio button larger touch target
    MuiRadio: {
      styleOverrides: {
        root: {
          padding: 12,
        },
      },
    },
    
    // Switch larger touch target
    MuiSwitch: {
      styleOverrides: {
        root: {
          padding: 12,
        },
      },
    },
    
    // Chip styling for categories/tags
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          fontWeight: 500,
        },
        filled: {
          backgroundColor: c5Colors.whiteBlue,
          color: c5Colors.darkGray,
        },
        outlined: {
          borderColor: c5Colors.battleshipGray,
        },
      },
    },
    
    // Card elevation
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          borderRadius: 8,
        },
      },
    },
    
    // Data Grid styling
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: `1px solid ${c5Colors.battleshipGray}`,
          '& .MuiDataGrid-cell:focus': {
            outline: `2px solid ${c5Colors.cobaltBlue}`,
          },
          '& .MuiDataGrid-row.Mui-selected': {
            backgroundColor: c5Colors.whiteBlue,
            '&:hover': {
              backgroundColor: c5Colors.lightBlue,
            },
          },
        },
      },
    },
    
    // Dialog styling
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 8,
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        },
      },
    },
    
    // TextField styling
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            backgroundColor: c5Colors.white,
          },
        },
      },
    },
    
    // Linear Progress (for completion bars)
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          height: 8,
          borderRadius: 4,
          backgroundColor: c5Colors.silverWhite,
        },
        bar: {
          borderRadius: 4,
        },
      },
    },
    
    // Tooltip
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: c5Colors.darkGray,
          fontSize: '0.75rem',
          padding: '8px 12px',
          borderRadius: 4,
        },
        arrow: {
          color: c5Colors.darkGray,
        },
      },
    },
    
    // Badge (for notifications)
    MuiBadge: {
      styleOverrides: {
        badge: {
          backgroundColor: c5Colors.lavaRed,
          color: c5Colors.white,
          fontWeight: 700,
        },
      },
    },
  },
};

// Create theme
export const c5Theme = createTheme(themeOptions);

/**
 * Helper function to get progress bar color based on completion percentage
 * Per C5 standards: 0-33% = red, 34-66% = yellow, 67-99% = blue, 100% = green
 */
export const getProgressColor = (percentage: number): string => {
  if (percentage === 100) return c5Colors.green;
  if (percentage >= 67) return c5Colors.cobaltBlue;
  if (percentage >= 34) return c5Colors.canaryYellow;
  return c5Colors.lavaRed;
};

/**
 * Helper function to get status chip color
 */
export const getStatusChipColor = (status: string): { bg: string; text: string } => {
  const statusLower = status.toLowerCase();
  
  switch (statusLower) {
    case 'completed':
    case 'complete':
      return { bg: c5Colors.successGreen, text: c5Colors.darkGray };
    case 'in progress':
    case 'in-progress':
      return { bg: c5Colors.whiteBlue, text: c5Colors.darkGray };
    case 'not started':
    case 'not-started':
      return { bg: c5Colors.silverWhite, text: c5Colors.dimGray };
    case 'blocked':
      return { bg: c5Colors.lavaRed, text: c5Colors.white };
    case 'n/a':
    case 'na':
      return { bg: c5Colors.silver, text: c5Colors.darkGray };
    default:
      return { bg: c5Colors.silver, text: c5Colors.darkGray };
  }
};

/**
 * Helper function to get priority chip color
 */
export const getPriorityChipColor = (priority: string): { bg: string; text: string } => {
  const priorityLower = priority.toLowerCase();
  
  switch (priorityLower) {
    case 'critical':
      return { bg: c5Colors.lavaRed, text: c5Colors.white };
    case 'high':
      return { bg: c5Colors.canaryYellow, text: c5Colors.black };
    case 'medium':
      return { bg: c5Colors.whiteBlue, text: c5Colors.darkGray };
    case 'low':
      return { bg: c5Colors.silverWhite, text: c5Colors.dimGray };
    default:
      return { bg: c5Colors.silver, text: c5Colors.darkGray };
  }
};

export default c5Theme;
