// Browser-side checks for the test-mode card form. Card data never leaves the page.
export const digitsOnly = (v) => v.replace(/\D/g, '');

export const luhnValid = (number) => {
  const digits = digitsOnly(number);
  if (digits.length < 12 || digits.length > 19) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let d = Number(digits[i]);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
};

export const cardBrand = (number) => {
  const d = digitsOnly(number);
  if (/^4/.test(d)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(d)) return 'mastercard';
  if (/^3[47]/.test(d)) return 'amex';
  if (/^3(0[0-5]|[68])/.test(d)) return 'diners';
  if (/^6(011|5)/.test(d)) return 'discover';
  if (/^62/.test(d)) return 'unionpay';
  if (/^35/.test(d)) return 'jcb';
  return '';
};

export const formatCardNumber = (value) => {
  const d = digitsOnly(value).slice(0, 19);
  if (cardBrand(d) === 'amex') return [d.slice(0, 4), d.slice(4, 10), d.slice(10, 15)].filter(Boolean).join(' ');
  return d.replace(/(.{4})/g, '$1 ').trim();
};

export const formatExpiry = (value) => {
  const d = digitsOnly(value).slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};

export const expiryValid = (value, now = new Date()) => {
  const m = /^(\d{2})\/(\d{2})$/.exec(value);
  if (!m) return false;
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) return false;
  return year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1);
};

export const cvcValid = (value, brand) => (brand === 'amex' ? /^\d{4}$/ : /^\d{3}$/).test(value);

// Stripe's published test number that always declines.
export const DECLINE_TEST_CARD = '4000000000000002';

export const validateCard = ({ number, expiry, cvc, name }) => {
  const errors = {};
  const brand = cardBrand(number);
  if (!luhnValid(number)) errors.number = 'Enter a valid card number';
  if (!expiryValid(expiry)) errors.expiry = 'Enter a future expiry date (MM/YY)';
  if (!cvcValid(cvc, brand)) errors.cvc = brand === 'amex' ? 'Enter the 4-digit security code' : 'Enter the 3-digit security code';
  if (name.trim().length < 2) errors.name = 'Enter the name on the card';
  return errors;
};
