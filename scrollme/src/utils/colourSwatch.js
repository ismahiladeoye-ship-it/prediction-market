// The colour to paint a swatch for a colour name. Shop colour names are often
// not CSS colours (Midnight, Starlight, Chestnut) or are much brighter in CSS
// than the product (Blue, Orange), so common ones are listed here.
const NAMED = {
  midnight: '#232a35',
  starlight: '#e6dfd3',
  'space grey': '#5f6166',
  'space gray': '#5f6166',
  graphite: '#4a4b4d',
  charcoal: '#36393d',
  black: '#111111',
  white: '#f7f7f7',
  'off white': '#f2eee6',
  cream: '#f1e8d5',
  oatmeal: '#d8ccb6',
  stone: '#cfc6b8',
  sand: '#d9c8a9',
  beige: '#d8c7a8',
  chestnut: '#9a5b34',
  brown: '#6b4a32',
  tan: '#c19a6b',
  khaki: '#a59a6f',
  olive: '#6b6b3a',
  green: '#4f7a52',
  navy: '#1f2a44',
  blue: '#5b86b0',
  'sky blue': '#9cc3e0',
  purple: '#a28fc6',
  lilac: '#c8b6dc',
  pink: '#efb7c3',
  red: '#b3282d',
  burgundy: '#6d1f2c',
  orange: '#e8843c',
  yellow: '#efcf4f',
  grey: '#9a9a9a',
  gray: '#9a9a9a',
  silver: '#c9cacc',
  gold: '#cfae63',
};

const FALLBACK = '#d0d0d0';

export const swatchColour = (name) => {
  const key = String(name || '')
    .trim()
    .toLowerCase();
  if (NAMED[key]) return NAMED[key];
  // Any other valid CSS colour name or code ("teal", "#ff6600").
  const probe = document.createElement('span').style;
  probe.color = key;
  return probe.color ? key : FALLBACK;
};
