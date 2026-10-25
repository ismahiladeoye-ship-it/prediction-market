import { fireEvent, render, screen } from '@testing-library/react';
import PaymentMethodSheet from './PaymentMethodSheet';

const methods = ['apple_pay', 'card', 'paypal', 'klarna', 'google_pay'];

const setup = (props = {}) => {
  const onSelect = jest.fn();
  const onConfirm = jest.fn();
  const onClose = jest.fn();
  render(
    <PaymentMethodSheet
      isOpen
      methods={methods}
      selected='card'
      onSelect={onSelect}
      onConfirm={onConfirm}
      onClose={onClose}
      total={95}
      {...props}
    />
  );
  return { onSelect, onConfirm, onClose };
};

describe('PaymentMethodSheet', () => {
  afterEach(() => {
    delete window.ApplePaySession;
  });

  it('lists methods with card brands and the total', () => {
    setup();
    expect(screen.getByRole('dialog', { name: 'Secure Payment' })).toBeInTheDocument();
    expect(screen.getByText('Your payment is 100% secure')).toBeInTheDocument();
    expect(screen.getByText('Add a new card')).toBeInTheDocument();
    expect(screen.getByText('PayPal')).toBeInTheDocument();
    expect(screen.getByLabelText(/Visa, Mastercard/)).toBeInTheDocument();
    expect(screen.getByText('£95.00')).toBeInTheDocument();
    // Google Pay is behind "View more".
    expect(screen.queryByText('Google Pay')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('View more'));
    expect(screen.getByText('Google Pay')).toBeInTheDocument();
  });

  it('disables Apple Pay where the device cannot use it', () => {
    setup();
    expect(screen.getByRole('radio', { name: /Apple Pay/ })).toBeDisabled();
    expect(screen.getByText('Not available on this device')).toBeInTheDocument();
  });

  it('enables Apple Pay on Apple devices', () => {
    window.ApplePaySession = { canMakePayments: () => true };
    const { onSelect } = setup();
    const radio = screen.getByRole('radio', { name: /Apple Pay/ });
    expect(radio).toBeEnabled();
    fireEvent.click(radio);
    expect(onSelect).toHaveBeenCalledWith('apple_pay');
  });

  it('confirms and closes', () => {
    const { onSelect, onConfirm, onClose } = setup();
    fireEvent.click(screen.getByRole('radio', { name: /PayPal/ }));
    expect(onSelect).toHaveBeenCalledWith('paypal');
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onConfirm).toHaveBeenCalled();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('shows a test-mode notice when payments are simulated', () => {
    setup({ testMode: true });
    expect(screen.getByText(/Test mode/)).toBeInTheDocument();
  });
});
