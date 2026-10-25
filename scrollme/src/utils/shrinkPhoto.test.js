import { shrinkPhoto } from './shrinkPhoto';

it('sends small photos unchanged', async () => {
  const file = new File([new Uint8Array(1000)], 'front.jpg', { type: 'image/jpeg' });
  expect(await shrinkPhoto(file)).toBe(file);
});

it('falls back to the original photo when the browser cannot resize it', async () => {
  const file = new File([new Uint8Array(4 * 1024 * 1024)], 'big.heic', { type: 'image/heic' });
  const original = global.createImageBitmap;
  global.createImageBitmap = jest.fn().mockRejectedValue(new Error('unsupported'));
  try {
    expect(await shrinkPhoto(file)).toBe(file);
  } finally {
    global.createImageBitmap = original;
  }
});
