import { makeStore } from '../store';
import { toggleWishlist } from './wishlistSlice';

describe('wishlist for guests', () => {
  it('toggles locally without calling the API', async () => {
    const store = makeStore();
    const product = { _id: 'p1', name: 'Shirt', price: 10, imageUrl: 'x', category: 'shirts', sizes: ['M'] };
    await store.dispatch(toggleWishlist(product));
    expect(store.getState().wishlist.items).toEqual([expect.objectContaining({ _id: 'p1', name: 'Shirt', sizes: ['M'] })]);
    await store.dispatch(toggleWishlist(product));
    expect(store.getState().wishlist.items).toEqual([]);
  });
});
