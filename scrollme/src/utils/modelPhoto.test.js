import { modelPhotoFor } from './modelPhoto';
import { illustrativePhoto, imageSrc } from './imageFallback';

const credit = {
  url: '/product-photos/free/air-force-1-white.webp',
  author: 'A. Photographer',
  authorUrl: 'https://www.flickr.com/photos/example/',
  licence: 'CC BY 2.0',
  licenceUrl: 'https://creativecommons.org/licenses/by/2.0/',
  source: 'Flickr',
  link: 'https://www.flickr.com/photos/example/1/',
  changes: 'resized',
};
const library = { 'Nike Air Force 1 07 Shoes – White': [credit] };

test('finds the free photo of the same model by the product name', () => {
  expect(modelPhotoFor({ name: 'Nike Air Force 1 07 Shoes – White' }, library)).toBe(credit);
  expect(modelPhotoFor({ name: 'Nike Air Force 1 07 Shoes – Black' }, library)).toBeNull();
  expect(modelPhotoFor({}, library)).toBeNull();
  expect(modelPhotoFor(null, library)).toBeNull();
});

test("the product's own photo always wins over a borrowed one", () => {
  const item = { name: 'Anything', subcategory: 'hoodies-sweatshirts' };
  expect(imageSrc('https://img.example/own.jpg', item)).toBe('https://img.example/own.jpg');
  expect(illustrativePhoto('https://img.example/own.jpg', item)).toBeNull();
  expect(illustrativePhoto('', null)).toBeNull();
});
