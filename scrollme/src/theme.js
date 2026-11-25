import { extendTheme } from '@chakra-ui/react';

// Chakra components (forms, admin tables, toasts) follow the store's
// monochrome look. The shop is black; admin pages (.admin-scope) stay light,
// so colorScheme='brand' there is black on white.
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
      // The store's own colours (styles/global.css): black page, white text.
      body: { color: 'var(--ink)', bg: 'var(--paper)' },
    },
  },
  components: {
    Button: {
      baseStyle: { borderRadius: 'full', fontWeight: 600 },
    },
    // Pop-ups open outside the page, so they take the store's colours directly.
    Modal: { baseStyle: { dialog: { bg: 'var(--surface)', color: 'var(--ink)' } } },
    Drawer: { baseStyle: { dialog: { bg: 'var(--surface)', color: 'var(--ink)' } } },
    Popover: { baseStyle: { content: { bg: 'var(--surface)', color: 'var(--ink)', borderColor: 'var(--line)' } } },
    Menu: {
      baseStyle: {
        list: { bg: 'var(--surface)', color: 'var(--ink)', borderColor: 'var(--line)' },
        item: { bg: 'transparent', _hover: { bg: 'var(--soft)' } },
      },
    },
  },
});

export default theme;
