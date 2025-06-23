import { createTheme, alpha } from '@mui/material/styles';

// --- NEW THEME FOR "CHASELESS" ---

// Base configuration for the ChaseLess brand
const baseConfig = {
  // A calm, professional slate blue for trust and stability.
  primary: '#4A5568', 
  // A confident, successful green for payments, success states, and calls-to-action.
  secondary: '#48BB78',
  fontFamily: "'Inter', sans-serif", // Keeping the clean, modern font
  borderRadius: 4, // Slightly softer border radius for a modern feel
  borderRadiusLG: 4,
};

// Mode-specific configurations for light and dark themes
const modeSpecificConfig = (mode) => ({
  ...(mode === 'dark' ? {
    // Dark mode uses a deep, desaturated blue-gray palette
    background: '#1A202C', // Very dark blue
    paper: '#2D3748',    // Slate gray for cards
    text: '#E2E8F0',       // Soft, off-white
    textSecondary: '#A0AEC0', // Lighter gray for secondary text
    divider: alpha('#A0AEC0', 0.12),
  } : {
    // Light mode uses a clean, airy, professional palette
    background: '#F7FAFC', // Very light, almost white gray
    paper: '#FFFFFF',      // Pure white for cards
    text: '#2D3748',       // Dark slate for high contrast
    textSecondary: '#718096', // Medium gray
    divider: alpha('#CBD5E0', 0.8),
  }),
  ...baseConfig,
  mode,
});

// Function to create the complete theme object
export const createAppTheme = (mode = 'dark') => {
  const config = modeSpecificConfig(mode);

  return createTheme({
    palette: {
      mode: config.mode,
      primary: { main: config.primary },
      secondary: { main: config.secondary },
      background: { default: config.background, paper: config.paper },
      text: { primary: config.text, secondary: config.textSecondary, disabled: alpha(config.textSecondary, 0.5) },
      error: { main: '#E53E3E' },
      success: { main: config.secondary }, // Use our secondary green for success
      warning: { main: '#DD6B20' },
      info: { main: '#3182CE' },
      divider: config.divider,
      action: {
        hover: alpha(config.primary, 0.06),
        selected: alpha(config.primary, 0.12),
      },
    },
    typography: {
      fontFamily: config.fontFamily,
      h1: { fontWeight: 800, fontSize: '2.75rem' },
      h2: { fontWeight: 700, fontSize: '2.25rem' },
      h3: { fontWeight: 700, fontSize: '1.875rem' },
      h4: { fontWeight: 600, fontSize: '1.5rem' },
      h5: { fontWeight: 600, fontSize: '1.25rem' },
      h6: { fontWeight: 600, fontSize: '1.125rem' },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    shape: {
      borderRadius: config.borderRadius,
      borderRadiusLG: config.borderRadiusLG, 
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: config.borderRadiusLG, // Use larger radius for buttons
            boxShadow: 'none',
            padding: '10px 22px',
            transition: 'background-color 0.3s ease, transform 0.2s ease',
            '&:hover': {
                transform: 'translateY(-1px)',
                boxShadow: 'none',
            }
          },
          containedPrimary: {
            color: '#FFFFFF',
            '&:hover': {
              backgroundColor: alpha(config.primary, 0.9),
            },
          },
          containedSecondary: {
            color: '#FFFFFF',
             '&:hover': {
              backgroundColor: alpha(config.secondary, 0.9),
            },
          },
        },
      },
      MuiPaper: { 
        styleOverrides: {
          root: { backgroundImage: 'none' }, // Remove default gradient if any
          elevation: {
            borderRadius: config.borderRadiusLG
          },
          elevation12: {
            boxShadow: mode === 'dark'
              ? `0px 20px 25px -5px rgba(0, 0, 0, 0.1), 0px 10px 10px -5px rgba(0, 0, 0, 0.2)`
              : `0px 20px 25px -5px rgba(0, 0, 0, 0.05), 0px 10px 10px -5px rgba(0, 0, 0, 0.04)`,
          }
        }
      },
      MuiTextField: {
        defaultProps: { variant: 'outlined' },
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: config.borderRadiusLG,
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: config.primary,
              },
            },
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
            root: {
                height: 10,
                borderRadius: 5,
            }
        }
      }
    },
  });
};

// Export a default theme instance for convenience
const defaultTheme = createAppTheme('dark'); 
export default defaultTheme;