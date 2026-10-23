import { extendTheme } from '@chakra-ui/react';

// Chakra components (forms, admin tables, toasts) follow the store's
// monochrome look: colorScheme='brand' is black on white.
const theme = extendTheme({
  fonts: {
    heading: "'Inter', -apple-system, 'Helvetica Neue', Arial, sans-serif",
    body: "'Inter', -apple-system, 'Helvetica Neue', Arial, sans-serif",
  },
  colors: {
    brand: {
      50: '#f5f5f5',
      100: '#e7e7e7',
      200: '#cfcfcf',
      300: '#a8a8a8',
      400: '#6b6b6b',
      500: '#0d0d0d',
      600: '#000000',
      700: '#000000',
      800: '#000000',
      900: '#000000',
    },
  },
  radii: { md: '10px' },
  styles: {
    global: {
      body: { color: '#0d0d0d', bg: 'white' },
    },
  },
  components: {
    Button: {
      baseStyle: { borderRadius: 'full', fontWeight: 600 },
    },
  },
});

export default theme;
