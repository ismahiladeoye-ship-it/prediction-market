import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { renderWithProviders } from '../test/renderWithProviders';

const user = (overrides) => ({ user: { isAuthenticated: true, authChecked: true, roles: ['user'], ...overrides } });

const renderAt = (route, preloadedState) =>
  renderWithProviders(
    <Routes>
      <Route path='/' element={<p>home</p>} />
      <Route path='/login' element={<p>login page</p>} />
      <Route
        path='/cart'
        element={
          <ProtectedRoute>
            <p>cart page</p>
          </ProtectedRoute>
        }
      />
      <Route
        path='/admin'
        element={
          <ProtectedRoute adminOnly>
            <p>admin page</p>
          </ProtectedRoute>
        }
      />
    </Routes>,
    { route, preloadedState }
  );

describe('ProtectedRoute', () => {
  it('sends guests to the login page', () => {
    renderAt('/cart');
    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('shows the page to signed-in users', () => {
    renderAt('/cart', user());
    expect(screen.getByText('cart page')).toBeInTheDocument();
  });

  it('keeps customers out of admin pages', () => {
    renderAt('/admin', user());
    expect(screen.getByText('home')).toBeInTheDocument();
  });

  it('lets admins in', () => {
    renderAt('/admin', user({ roles: ['admin'] }));
    expect(screen.getByText('admin page')).toBeInTheDocument();
  });

  it('waits for the session check before deciding', () => {
    renderAt('/cart', user({ authChecked: false }));
    expect(screen.queryByText('cart page')).not.toBeInTheDocument();
    expect(screen.queryByText('login page')).not.toBeInTheDocument();
  });
});
