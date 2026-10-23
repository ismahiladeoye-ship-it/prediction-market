import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { addToCartAPI, viewCartAPI, updateCartItemAPI, deleteCartItemAPI, clearCartAPI } from '../../services/cart/cartService';
import { getErrorMessage } from '../../api/client';

// The server owns the cart: every thunk stores the cart it returns, including
// prices and totals, so the browser never computes money itself.
const initialState = {
  items: [],
  totalQuantity: 0,
  summary: { subtotal: 0, tax: 0, shipping: 0, total: 0 },
  deliveryOptions: [],
  deliveryMethod: 'standard',
  issues: [],
  status: 'idle',
  error: null,
};

const thunk = (type, call) =>
  createAsyncThunk(type, async (arg, { rejectWithValue }) => {
    try {
      return await call(arg);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  });

export const viewCart = thunk('cart/viewCart', (delivery) => viewCartAPI(delivery));
export const addToCart = thunk('cart/addToCart', ({ productId, quantity = 1, size = '' }) => addToCartAPI({ productId, quantity, size }));
export const updateCartItem = thunk('cart/updateCartItem', ({ productId, quantity, size }) => updateCartItemAPI({ productId, quantity, size }));
export const deleteCartItem = thunk('cart/deleteCartItem', (arg) => deleteCartItemAPI(typeof arg === 'string' ? { productId: arg } : arg));
export const clearCart = thunk('cart/clearCart', () => clearCartAPI());

const applyCart = (state, cart) => {
  state.items = cart.items || [];
  state.totalQuantity = cart.totalQuantity || 0;
  state.summary = cart.summary || initialState.summary;
  state.deliveryOptions = cart.deliveryOptions || [];
  state.deliveryMethod = cart.deliveryMethod || 'standard';
  state.issues = cart.issues || [];
  state.status = 'succeeded';
  state.error = null;
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    resetCart: () => initialState,
  },
  extraReducers: (builder) => {
    for (const t of [viewCart, addToCart, updateCartItem, deleteCartItem, clearCart]) {
      builder
        .addCase(t.pending, (state) => {
          state.status = 'loading';
        })
        .addCase(t.fulfilled, (state, action) => applyCart(state, action.payload))
        .addCase(t.rejected, (state, action) => {
          state.status = 'failed';
          state.error = action.payload;
        });
    }
  },
});

export const { resetCart } = cartSlice.actions;
export default cartSlice.reducer;
