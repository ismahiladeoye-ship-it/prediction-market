// Neutral placeholder shown when a product image is missing or fails to load.
export const PLACEHOLDER_IMAGE =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400"><rect width="300" height="400" fill="#f0f0f0"/><text x="150" y="205" font-family="Urbanist, sans-serif" font-size="18" fill="#999" text-anchor="middle">Image unavailable</text></svg>'
  );

export const imageSrc = (url) => url || PLACEHOLDER_IMAGE;

export const onImageError = (event) => {
  if (event.currentTarget.src !== PLACEHOLDER_IMAGE) event.currentTarget.src = PLACEHOLDER_IMAGE;
};
