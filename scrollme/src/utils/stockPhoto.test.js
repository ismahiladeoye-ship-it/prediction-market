import { colourFamily, stockPhotoFor } from './stockPhoto';

const photo = (n) => ({
  url: `https://images.example/${n}.jpg`,
  photographer: `P${n}`,
  source: 'Pexels',
  link: `https://www.pexels.com/photo/${n}/`,
});
const library = {
  hoodie: { black: [photo(1), photo(2)], navy: [photo(3)] },
  sweatshirt: { grey: [photo(4)] },
  bottle: { any: [photo(5)] },
};

test('sorts product colours into the colour groups the photos are filed under', () => {
  expect(colourFamily('#1f1f22')).toBe('black');
  expect(colourFamily('#f8f8f6')).toBe('white');
  expect(colourFamily('#a3a6aa')).toBe('grey');
  expect(colourFamily('#18213a')).toBe('navy');
  expect(colourFamily('#2f7d4a')).toBe('green');
  expect(colourFamily('#c19a6b')).toBe('beige');
  expect(colourFamily('#6d1f2b')).toBe('red');
});

test('picks a look-alike photo of the same kind and colour, the same one each time', () => {
  const hoodie = { _id: 'a1', subcategory: 'hoodies-sweatshirts', name: 'BOSS Hoodie – Black' };
  const first = stockPhotoFor(hoodie, library);
  expect([photo(1).url, photo(2).url]).toContain(first.url);
  expect(stockPhotoFor(hoodie, library)).toBe(first);
  expect(stockPhotoFor({ subcategory: 'hoodies-sweatshirts', name: 'Nike Hoodie – Dark Night Navy' }, library).url).toBe(photo(3).url);
  // Zip hoodies borrow hoodie photos; perfumes use any bottle photo.
  expect(stockPhotoFor({ subcategory: 'hoodies-sweatshirts', name: 'HUGO Zip Hoodie – Navy' }, library).url).toBe(photo(3).url);
  expect(stockPhotoFor({ category: 'fragrance', name: 'Dior Sauvage 100ml' }, library).url).toBe(photo(5).url);
});

test('has no photo when the library has none for that kind or colour', () => {
  expect(stockPhotoFor({ subcategory: 'hoodies-sweatshirts', name: 'Nike Hoodie – Pink' }, library)).toBeNull();
  expect(stockPhotoFor({ subcategory: 'jeans', name: 'Levis 501 – Blue' }, library)).toBeNull();
  expect(stockPhotoFor(null, library)).toBeNull();
});
