import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { addWishlistAPI, getWishlistAPI, mergeWishlistAPI, removeWishlistAPI } from '../../services/wishlist/wishlistService';
import { getErrorMessage } from '../../api/client';

// Guests keep a wishlist in this browser; once signed in, the account's
// server-side wishlist is the source of truth (guest items are merged into it).
const initialState = {
  items: [],
};

const toItem = (product) => ({
  _id: product._id,
  name: product.name,
  imageUrl: product.imageUrl,
  price: product.price,
  color: product.color,
  category: product.category,
  sizes: product.sizes || [],
  stock: product.stock,
  isActive: product.isActive !== false,
});

const withRollback = (type, call) =>
  createAsyncThunk(type, async (arg, { rejectWithValue }) => {
    try {
      return await call(arg);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  });

export const fetchWishlist = withRollback('wishlist/fetch', () => getWishlistAPI());
export const syncWishlistAfterLogin = withRollback('wishlist/sync', (localIds) => (localIds.length ? mergeWishlistAPI(localIds) : getWishlistAPI()));
const addRemote = withRollback('wishlist/addRemote', (productId) => addWishlistAPI(productId));
const removeRemote = withRollback('wishlist/removeRemote', (productId) => removeWishlistAPI(productId));

// Optimistic toggle used by product tiles and the product page.
export const toggleWishlist = (product) => (dispatch, getState) => {
  const state = getState();
  const inList = state.wishlist.items.some((i) => i._id === product._id);
  dispatch(inList ? removeFromWishlist(product._id) : addToWishlist(product));
  if (state.user.isAuthenticated) {
    return dispatch(inList ? removeRemote(product._id) : addRemote(product._id));
  }
  return Promise.resolve();
};

export const removeWishlistItem = (productId) => (dispatch, getState) => {
  dispatch(removeFromWishlist(productId));
  if (getState().user.isAuthenticated) return dispatch(removeRemote(productId));
  return Promise.resolve();
};

const setFromServer = (state, action) => {
  state.items = (action.payload || []).map(toItem);
};

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    addToWishlist: (state, action) => {
      const product = action.payload;
      if (!state.items.some((item) => item._id === product._id)) state.items.push(toItem(product));
    },
    removeFromWishlist: (state, action) => {
      state.items = state.items.filter((item) => item._id !== action.payload);
    },
    clearWishlist: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWishlist.fulfilled, setFromServer)
      .addCase(syncWishlistAfterLogin.fulfilled, setFromServer)
      .addCase(addRemote.fulfilled, setFromServer)
      .addCase(removeRemote.fulfilled, setFromServer);
  },
});

export const { addToWishlist, removeFromWishlist, clearWishlist } = wishlistSlice.actions;
export default wishlistSlice.reducer;
