import { artType, coloursFor, colourName, productArt } from './productArt';
import { imageSrc, PLACEHOLDER_IMAGE } from './imageFallback';

const svg = (url) => decodeURIComponent(url.replace('data:image/svg+xml;charset=UTF-8,', ''));

test('draws the right kind of item from its menu, then its name', () => {
  const cases = [
    [{ category: 'clothing', subcategory: 'hoodies-sweatshirts', name: 'Nike Club Hoodie – Black' }, 'hoodie'],
    [{ category: 'clothing', subcategory: 'hoodies-sweatshirts', name: 'BOSS Full Zip Hoodie – Navy' }, 'zip-hoodie'],
    [{ category: 'clothing', subcategory: 'hoodies-sweatshirts', name: 'Emporio Armani Sweatshirt – Navy' }, 'sweatshirt'],
    [{ category: 'clothing', subcategory: 't-shirts', name: 'Comme des Garcons PLAY Heart Short-Sleeve T-Shirt – Navy' }, 'tshirt'],
    [{ category: 'clothing', subcategory: 'tops', name: 'Barbour Rugby Polo Shirt – Pink' }, 'polo'],
    [{ category: 'clothing', subcategory: 'trousers', name: "Levi's 501 Original Shorts – Blue" }, 'shorts'],
    [{ category: 'clothing', subcategory: 'trousers', name: 'Ted Baker Wide Leg Trousers – Black' }, 'trousers'],
    [{ category: 'activewear', subcategory: 'joggers', name: 'Nike Fleece Joggers – Grey' }, 'joggers'],
    [{ category: 'clothing', subcategory: 'tracksuits', name: 'Nike Air Tracksuit – Black/White' }, 'tracksuit'],
    [{ category: 'shoes-boots', subcategory: 'trainers', name: 'Nike Air Force 1 – White' }, 'trainer'],
    [{ category: 'shoes-boots', subcategory: 'boots', name: 'Nike Superfly 11 Firm Ground Football Boots – Multi' }, 'trainer'],
    [{ category: 'shoes-boots', subcategory: 'boots', name: 'Timberland 6 Inch Boots – Wheat' }, 'boot'],
    [{ category: 'shoes-boots', subcategory: 'heels', name: 'Coach Slingbacks – Dark Indigo' }, 'heel'],
    [{ category: 'fragrance', subcategory: 'perfume', name: 'Chanel Coco Mademoiselle 100ml' }, 'bottle'],
    [{ category: 'audio', subcategory: 'headphones', name: 'Apple AirPods Max 2' }, 'headphones'],
    // Cart and order lines may not carry the sub-menu: the name decides.
    [{ category: 'clothing', name: 'HUGO 734 Extra Slim Fit Jeans – Black' }, 'jeans'],
    [{ name: 'Something Else' }, 'tag'],
  ];
  for (const [item, type] of cases) expect([item.name, artType(item)]).toEqual([item.name, type]);
});

test('paints the product in its colour, with light and dark shades and a second colour for trims', () => {
  expect(colourName({ name: 'Nike Air Force 1 – Black/White' })).toBe('Black/White');
  expect(colourName({ name: 'Plain', color: 'Navy' })).toBe('Navy');
  expect(coloursFor({ color: 'Black/White' })).toEqual({ main: '#1f1f22', trim: '#f8f8f6', last: '#f8f8f6' });
  expect(coloursFor({ color: 'Grey Marl' }).main).toBe('#a3a6aa');
  expect(coloursFor({ color: 'Dark Night Navy' }).main).toBe('#18213a');
  // Unknown words fall back to the next colour, or a neutral grey.
  expect(coloursFor({ color: 'Steam/White' }).main).toBe('#f8f8f6');
  expect(coloursFor({ color: 'Total Eclipse' }).main).toBe('#9a9da2');
});

test('labels the drawing with the brand and "Illustration", safely escaped', () => {
  const art = svg(productArt({ name: "Levi's Original Hoodie – Black", brand: "Levi's", subcategory: 'hoodies-sweatshirts' }));
  expect(art).toContain('LEVI&#39;S');
  expect(art).toContain('ILLUSTRATION');
  expect(art).toContain('#1f1f22');
  const nasty = svg(productArt({ name: 'X', brand: '<script>"&' }));
  expect(nasty).not.toContain('<script>');
  expect(nasty).toContain('&lt;SCRIPT&gt;&quot;&amp;');
});

test('uses a real photo when there is one and the drawing otherwise', () => {
  expect(imageSrc('https://img.example/a.jpg', { name: 'A' })).toBe('https://img.example/a.jpg');
  expect(imageSrc('', { name: 'Nike Hoodie – Red' })).toMatch(/^data:image\/svg\+xml/);
  expect(imageSrc(undefined)).toBe(PLACEHOLDER_IMAGE);
});
