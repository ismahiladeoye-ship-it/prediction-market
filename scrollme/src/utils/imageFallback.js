import { productArt } from './productArt';
import { stockPhotoFor } from './stockPhoto';
import { modelPhotoFor } from './modelPhoto';

// Neutral placeholder shown when there is no product to draw.
export const PLACEHOLDER_IMAGE =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400"><rect width="300" height="400" fill="#f0f0f0"/><text x="150" y="205" font-family="Inter, Arial, sans-serif" font-size="18" fill="#999" text-anchor="middle">Image unavailable</text></svg>'
  );

// The product's own photo; failing that, a free photo of the same model; then a
// look-alike photo of a similar item (both labelled "Illustrative photo" where
// they show); failing those, a drawing of it.
export const imageSrc = (url, item) => {
  if (url) return url;
  if (!item) return PLACEHOLDER_IMAGE;
  return modelPhotoFor(item)?.url || stockPhotoFor(item)?.url || productArt(item);
};

// The borrowed photo shown for this product, if that is what is showing:
// { kind: 'model' | 'lookalike', ...credit }.
export const illustrativePhoto = (url, item) => {
  if (url || !item) return null;
  const model = modelPhotoFor(item);
  if (model) return { kind: 'model', ...model };
  const lookAlike = stockPhotoFor(item);
  return lookAlike ? { kind: 'lookalike', ...lookAlike } : null;
};

// When a photo fails to load, show the product's drawing instead.
export const fallbackTo = (item) => (event) => {
  const art = item ? productArt(item) : PLACEHOLDER_IMAGE;
  if (event.currentTarget.src !== art) event.currentTarget.src = art;
};

export const onImageError = fallbackTo(null);
