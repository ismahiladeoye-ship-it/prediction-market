import { fireEvent, screen, waitFor } from '@testing-library/react';
import ContactUs from './ContactUs';
import { renderWithProviders } from '../test/renderWithProviders';
import { sendContactMessageAPI } from '../services/site/siteService';

jest.mock('../services/site/siteService', () => ({
  sendContactMessageAPI: jest.fn(),
}));

describe('ContactUs price requests', () => {
  it('fills in the item from a price-on-request product and sends it as a price request', async () => {
    sendContactMessageAPI.mockResolvedValue({ message: 'Thanks, we will be in touch.' });
    renderWithProviders(<ContactUs />, { route: '/contact-us?type=price&item=Louis%20Vuitton%20Toiletry%20Pouch' });
    expect(screen.getByDisplayValue('Louis Vuitton Toiletry Pouch')).toBeInTheDocument();
    expect(screen.getByDisplayValue(/send me a price for the Louis Vuitton Toiletry Pouch/)).toBeInTheDocument();
    expect(screen.queryByText(/Order number/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Ada Lovelace' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ada@example.com' } });
    fireEvent.submit(screen.getByDisplayValue('Louis Vuitton Toiletry Pouch').closest('form'));
    await waitFor(() => expect(sendContactMessageAPI).toHaveBeenCalled());
    expect(sendContactMessageAPI.mock.calls[0][0]).toMatchObject({ kind: 'price', item: 'Louis Vuitton Toiletry Pouch', name: 'Ada Lovelace' });
  });
});
