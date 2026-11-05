// Freely licensed photos of the same model, in the same colour, as a product
// (from Wikimedia Commons and Flickr), shown when the product has no photo of
// its own. Each one is labelled "Photo of this model – not the actual item" and
// carries the credit its licence asks for: author, licence, where it is from,
// and that it was resized. Keyed by the product's exact name.
import library from '../modelPhotos.json';

export const modelPhotoFor = (item, photos = library) => {
  const list = item?.name ? photos[item.name] : null;
  return list && list.length ? list[0] : null;
};
