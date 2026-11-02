import { swatchColour, swatchBackground } from './colourSwatch';

test('paints shop colour names, other CSS colours, and a neutral grey otherwise', () => {
  expect(swatchColour('Midnight')).toBe('#232a35');
  expect(swatchColour(' Starlight ')).toBe('#e6dfd3');
  expect(swatchColour('Blue')).toBe('#5b86b0');
  expect(swatchColour('teal')).toBe('teal');
  expect(swatchColour('Rainbow Sparkle')).toBe('#d0d0d0');
  expect(swatchColour('')).toBe('#d0d0d0');
});

test('finds the colour in names such as "Navy Suede" and splits two-tone colours', () => {
  expect(swatchColour('Navy Suede')).toBe('#1f2a44');
  expect(swatchColour('Tan Leather')).toBe('#c19a6b');
  expect(swatchBackground('Black')).toBe('#111111');
  expect(swatchBackground('Black/White')).toBe('linear-gradient(135deg, #111111 0 50%, #f7f7f7 50% 100%)');
  expect(swatchBackground('Grey/White/Navy')).toBe('linear-gradient(135deg, #9a9a9a 0 50%, #f7f7f7 50% 100%)');
  expect(swatchBackground('Black/Black')).toBe('#111111');
});
