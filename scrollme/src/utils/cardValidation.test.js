import { cardBrand, cvcValid, expiryValid, formatCardNumber, formatExpiry, luhnValid, validateCard } from './cardValidation';

describe('card validation (test-mode payment page)', () => {
  it('checks card numbers with the Luhn algorithm', () => {
    expect(luhnValid('4242 4242 4242 4242')).toBe(true);
    expect(luhnValid('4242 4242 4242 4241')).toBe(false);
    expect(luhnValid('1234')).toBe(false);
  });

  it('detects brands and formats numbers', () => {
    expect(cardBrand('4242')).toBe('visa');
    expect(cardBrand('5555 5555')).toBe('mastercard');
    expect(cardBrand('3782')).toBe('amex');
    expect(formatCardNumber('4242424242424242')).toBe('4242 4242 4242 4242');
    expect(formatCardNumber('378282246310005')).toBe('3782 822463 10005');
  });

  it('validates expiry and CVC', () => {
    const now = new Date(2026, 9, 23);
    expect(formatExpiry('1230')).toBe('12/30');
    expect(expiryValid('12/30', now)).toBe(true);
    expect(expiryValid('10/26', now)).toBe(true);
    expect(expiryValid('09/26', now)).toBe(false);
    expect(expiryValid('13/30', now)).toBe(false);
    expect(cvcValid('123', 'visa')).toBe(true);
    expect(cvcValid('123', 'amex')).toBe(false);
  });

  it('reports every problem at once', () => {
    expect(Object.keys(validateCard({ number: '1', expiry: '', cvc: '', name: '' }))).toEqual(['number', 'expiry', 'cvc', 'name']);
    expect(validateCard({ number: '4242424242424242', expiry: '12/39', cvc: '123', name: 'Ada' })).toEqual({});
  });
});
