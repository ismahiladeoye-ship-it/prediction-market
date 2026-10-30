import { swatchColour } from './colourSwatch';

test('paints shop colour names, other CSS colours, and a neutral grey otherwise', () => {
  expect(swatchColour('Midnight')).toBe('#232a35');
  expect(swatchColour(' Starlight ')).toBe('#e6dfd3');
  expect(swatchColour('Blue')).toBe('#5b86b0');
  expect(swatchColour('teal')).toBe('teal');
  expect(swatchColour('Rainbow Sparkle')).toBe('#d0d0d0');
  expect(swatchColour('')).toBe('#d0d0d0');
});
