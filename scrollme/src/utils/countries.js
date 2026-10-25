// ISO 3166-1 alpha-2 codes offered at checkout; names come from the browser.
const CODES = [
  'US',
  'GB',
  'CA',
  'AU',
  'NZ',
  'IE',
  'IN',
  'NG',
  'GH',
  'KE',
  'ZA',
  'EG',
  'AE',
  'SA',
  'SG',
  'MY',
  'PH',
  'ID',
  'JP',
  'KR',
  'CN',
  'HK',
  'DE',
  'FR',
  'ES',
  'IT',
  'NL',
  'BE',
  'PT',
  'SE',
  'NO',
  'DK',
  'FI',
  'PL',
  'AT',
  'CH',
  'GR',
  'TR',
  'BR',
  'MX',
  'AR',
  'CL',
  'CO',
];

let names;
try {
  names = new Intl.DisplayNames(undefined, { type: 'region' });
} catch {
  names = null;
}

export const countryName = (code) => names?.of(code) || code;

export const COUNTRIES = CODES.map((code) => ({ code, name: countryName(code) })).sort((a, b) => a.name.localeCompare(b.name));
