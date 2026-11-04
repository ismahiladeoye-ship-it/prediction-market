import { productArt } from './productArt';

// Neutral placeholder shown when there is no product to draw.
export const PLACEHOLDER_IMAGE =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400"><rect width="300" height="400" fill="#f0f0f0"/><text x="150" y="205" font-family="Inter, Arial, sans-serif" font-size="18" fill="#999" text-anchor="middle">Image unavailable</text></svg>'
  );

// The product's photo, or a drawing of it in its colour when it has none yet.
export const imageSrc = (url, item) => url || (item ? productArt(item) : PLACEHOLDER_IMAGE);

// When a photo fails to load, show the product's drawing instead.
export const fallbackTo = (item) => (event) => {
  const art = item ? productArt(item) : PLACEHOLDER_IMAGE;
  if (event.currentTarget.src !== art) event.currentTarget.src = art;
};

export const onImageError = fallbackTo(null);
