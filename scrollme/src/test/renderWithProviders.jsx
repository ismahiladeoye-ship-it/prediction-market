import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { ChakraProvider } from '@chakra-ui/react';
import { makeStore } from '../store/store';

// Renders a component with the real store, a router and Chakra.
export const renderWithProviders = (ui, { preloadedState, route = '/', store = makeStore(preloadedState) } = {}) => ({
  store,
  ...render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[route]}>
        <ChakraProvider>{ui}</ChakraProvider>
      </MemoryRouter>
    </Provider>
  ),
});
