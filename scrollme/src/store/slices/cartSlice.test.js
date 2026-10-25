import reducer, { addToCart, resetCart } from './cartSlice';

const serverCart = {
  items: [{ productId: 'p1', name: 'Shirt', size: 'M', quantity: 2, price: 10, lineTotal: 20 }],
  totalQuantity: 2,
  summary: { subtotal: 20, tax: 2, shipping: 20, total: 42, currency: 'usd' },
  deliveryOptions: [],
  issues: [],
};

describe('cart slice', () => {
  it('stores exactly what the server returns (no client-side money maths)', () => {
    const state = reducer(undefined, { type: addToCart.fulfilled.type, payload: serverCart });
    expect(state.items).toEqual(serverCart.items);
    expect(state.summary.total).toBe(42);
    expect(state.totalQuantity).toBe(2);
  });

  it('keeps the error message when the server rejects', () => {
    const state = reducer(undefined, { type: addToCart.rejected.type, payload: 'Only 1 left in stock' });
    expect(state.status).toBe('failed');
    expect(state.error).toBe('Only 1 left in stock');
  });

  it('clears on logout', () => {
    const filled = reducer(undefined, { type: addToCart.fulfilled.type, payload: serverCart });
    expect(reducer(filled, resetCart()).items).toEqual([]);
  });
});
