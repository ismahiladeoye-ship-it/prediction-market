import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { ChakraProvider } from '@chakra-ui/react';
import { makeStore } from '../store/store';
import theme from '../theme';

// Renders a component with the real store, a router and Chakra.
export const renderWithProviders = (ui, { preloadedState, route = '/', store = makeStore(preloadedState) } = {}) => ({
  store,
  ...render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[route]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ChakraProvider theme={theme}>{ui}</ChakraProvider>
      </MemoryRouter>
    </Provider>
  ),
});
