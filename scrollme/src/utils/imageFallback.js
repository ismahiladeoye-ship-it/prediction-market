import { productArt } from './productArt';
import { stockPhotoFor } from './stockPhoto';

// Neutral placeholder shown when there is no product to draw.
export const PLACEHOLDER_IMAGE =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400"><rect width="300" height="400" fill="#f0f0f0"/><text x="150" y="205" font-family="Inter, Arial, sans-serif" font-size="18" fill="#999" text-anchor="middle">Image unavailable</text></svg>'
  );

// The product's own photo; failing that, a look-alike photo of a similar item
// (labelled "Illustrative photo" where it shows); failing that, a drawing of it.
export const imageSrc = (url, item) => {
  if (url) return url;
  if (!item) return PLACEHOLDER_IMAGE;
  return stockPhotoFor(item)?.url || productArt(item);
};

// The look-alike photo shown for this product, if that is what is showing.
export const illustrativePhoto = (url, item) => (url || !item ? null : stockPhotoFor(item));

// When a photo fails to load, show the product's drawing instead.
export const fallbackTo = (item) => (event) => {
  const art = item ? productArt(item) : PLACEHOLDER_IMAGE;
  if (event.currentTarget.src !== art) event.currentTarget.src = art;
};

export const onImageError = fallbackTo(null);
