import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import userReducer from './slices/userSlice';
import cartReducer from './slices/cartSlice';
import wishlistReducer from './slices/wishlistSlice';

// Only non-sensitive profile fields are kept in localStorage (tokens live in
// httpOnly cookies). The cart is always loaded from the server.
const persistedUserReducer = persistReducer(
  { key: 'root', version: 2, storage, whitelist: ['id', 'firstName', 'lastName', 'email', 'username', 'name', 'roles', 'isAuthenticated'] },
  userReducer
);
const persistedWishlistReducer = persistReducer({ key: 'wishlist', version: 2, storage }, wishlistReducer);

export const rootReducer = combineReducers({
  user: persistedUserReducer,
  cart: cartReducer,
  wishlist: persistedWishlistReducer,
});

export const makeStore = (preloadedState) =>
  configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        },
      }),
  });

export const store = makeStore();
export let persistor = persistStore(store);
export default store;
