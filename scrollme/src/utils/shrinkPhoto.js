// Hosting limits uploads (Vercel Functions take at most 4.5 MB per request) and
// the server scales photos to 1600 px anyway, so big photos are scaled down in
// the browser before they are sent. Small photos are sent as they are.
const MAX_BYTES = 3.5 * 1024 * 1024;
const MAX_SIDE = 2400;

export const shrinkPhoto = async (file) => {
  if (file.size <= MAX_BYTES || typeof createImageBitmap !== 'function') return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    // JPEG has no transparency: put see-through PNGs on white.
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    if (!blob) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.jpg`, { type: 'image/jpeg' });
  } catch {
    return file;
  }
};
