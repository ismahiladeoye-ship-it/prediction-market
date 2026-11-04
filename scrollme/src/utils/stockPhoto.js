// Look-alike photos from free photo libraries, shown for products that have no
// photo of their own: a similar item of the same kind and colour (a plain
// black hoodie for a black hoodie). They are labelled "Illustrative photo" and
// credit the photographer. A product's own photo always comes first.
import library from '../stockPhotos.json';
import { artType, coloursFor } from './productArt';

// Colour groups the photos are filed under: black, white, grey, navy, blue,
// green, red, pink, purple, yellow, orange, brown and beige. A product's colour
// is sorted by its hue, with greys, blacks and whites told apart by lightness.
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);

export const colourFamily = (hex) => {
  const [r, g, b] = rgb(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;
  const light = (max + min) / 2;
  if (chroma < 0.09) return light < 0.22 ? 'black' : light > 0.82 ? 'white' : 'grey';
  let hue;
  if (max === r) hue = ((g - b) / chroma) % 6;
  else if (max === g) hue = (b - r) / chroma + 2;
  else hue = (r - g) / chroma + 4;
  hue = (hue * 60 + 360) % 360;
  if (hue >= 345 || hue < 15) return light > 0.68 ? 'pink' : 'red';
  if (hue < 40) {
    if (light < 0.42) return 'brown';
    return chroma < 0.45 || light > 0.7 ? 'beige' : 'orange';
  }
  if (hue < 70) {
    if (light < 0.45) return hue >= 50 ? 'green' : 'brown';
    return chroma < 0.35 ? 'beige' : 'yellow';
  }
  if (hue < 195) return 'green';
  if (hue < 255) return light < 0.3 ? 'navy' : 'blue';
  if (hue < 290) return 'purple';
  return light > 0.6 ? 'pink' : 'purple';
};

// Kinds of item that can share another kind's photos when they have none.
const SHARES = { 'zip-hoodie': 'hoodie', 'zip-sweat': 'sweatshirt', 'tall-boot': 'boot' };

// Same product, same photo every time; different products of the same kind
// and colour are spread over the photos available.
const pick = (list, key) => {
  let h = 0;
  for (const ch of String(key)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return list[h % list.length];
};

export const stockPhotoFor = (item, photos = library) => {
  if (!item) return null;
  const type = artType(item);
  const family = colourFamily(coloursFor(item).main);
  const byType = photos[type] || photos[SHARES[type]];
  const list = byType && (byType[family] || byType.any);
  if (!list || !list.length) return null;
  return pick(list, item._id || item.productId || item.name || '');
};
