import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

// Gritsa Portal Theme - Inspired by modern AI/tech aesthetics
// Purple-blue gradient with professional typography

const config: ThemeConfig = {
  initialColorMode: 'dark',
  useSystemColorMode: false,
};

const theme = extendTheme({
  config,
  fonts: {
    heading: `'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`,
    body: `'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`,
  },
  colors: {
    brand: {
      50: '#f5f3ff',
      100: '#ede9fe',
      200: '#ddd6fe',
      300: '#c4b5fd',
      400: '#a78bfa',
      500: '#8b5cf6', // Primary purple
      600: '#7c3aed',
      700: '#6d28d9',
      800: '#5b21b6',
      900: '#4c1d95',
    },
    accent: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6', // Primary blue
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
  },
  styles: {
    global: {
      body: {
        bg: '#0a0a0a',
        color: 'white',
      },
      '*::placeholder': {
        color: 'gray.400',
      },
    },
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: '600',
        borderRadius: 'lg',
      },
      variants: {
        solid: {
          bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          _hover: {
            bg: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
            transform: 'translateY(-2px)',
            boxShadow: 'lg',
          },
          _active: {
            transform: 'translateY(0)',
          },
        },
        gradient: {
          bgGradient: 'linear(to-r, brand.500, accent.500)',
          color: 'white',
          _hover: {
            bgGradient: 'linear(to-r, brand.600, accent.600)',
            transform: 'translateY(-2px)',
            boxShadow: 'xl',
          },
        },
      },
    },
    Card: {
      baseStyle: {
        container: {
          bg: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          borderRadius: 'xl',
          border: '1px solid',
          borderColor: 'rgba(255, 255, 255, 0.1)',
        },
      },
    },
    Input: {
      variants: {
        filled: {
          field: {
            bg: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 'lg',
            border: '1px solid',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            _hover: {
              bg: 'rgba(255, 255, 255, 0.08)',
            },
            _focus: {
              bg: 'rgba(255, 255, 255, 0.08)',
              borderColor: 'brand.500',
            },
          },
        },
      },
      defaultProps: {
        variant: 'filled',
      },
    },
    Textarea: {
      variants: {
        filled: {
          bg: 'rgba(255, 255, 255, 0.05)',
          borderRadius: 'lg',
          border: '1px solid',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          _hover: {
            bg: 'rgba(255, 255, 255, 0.08)',
          },
          _focus: {
            bg: 'rgba(255, 255, 255, 0.08)',
            borderColor: 'brand.500',
          },
        },
      },
      defaultProps: {
        variant: 'filled',
      },
    },
  },
});

export default theme;
