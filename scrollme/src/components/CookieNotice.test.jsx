import { fireEvent, screen } from '@testing-library/react';
import CookieNotice, { COOKIE_NOTICE_KEY } from './CookieNotice';
import { renderWithProviders } from '../test/renderWithProviders';

describe('CookieNotice', () => {
  beforeEach(() => localStorage.clear());

  it('shows on a first visit, links to the cookie details and stays hidden after OK', () => {
    const { unmount } = renderWithProviders(<CookieNotice />);
    expect(screen.getByRole('heading', { name: 'Cookies' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cookie details' })).toHaveAttribute('href', '/privacy#cookies');
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(screen.queryByRole('heading', { name: 'Cookies' })).not.toBeInTheDocument();
    expect(localStorage.getItem(COOKIE_NOTICE_KEY)).toBe('ok');
    unmount();
    renderWithProviders(<CookieNotice />);
    expect(screen.queryByRole('heading', { name: 'Cookies' })).not.toBeInTheDocument();
  });

  it('is not shown on admin pages', () => {
    renderWithProviders(<CookieNotice />, { route: '/admin/orders' });
    expect(screen.queryByRole('heading', { name: 'Cookies' })).not.toBeInTheDocument();
  });
});
