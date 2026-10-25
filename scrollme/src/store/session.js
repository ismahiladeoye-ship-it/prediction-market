import { getMeAPI } from '../services/auth/authService';
import { UserSingOutAPI } from '../services/userAPI/userService';
import { logOut, setAuthChecked, setUser } from './slices/userSlice';
import { resetCart, viewCart } from './slices/cartSlice';
import { clearWishlist, syncWishlistAfterLogin } from './slices/wishlistSlice';

// Loads everything that belongs to a signed-in account.
export const startSession = (user) => async (dispatch, getState) => {
  dispatch(setUser(user));
  const guestWishlist = getState().wishlist.items.map((i) => i._id);
  await Promise.allSettled([dispatch(viewCart()), dispatch(syncWishlistAfterLogin(guestWishlist))]);
};

// Clears account data from this browser (also used when the session expires).
export const endSession = () => (dispatch) => {
  dispatch(logOut());
  dispatch(resetCart());
  dispatch(clearWishlist());
};

// Confirms the session with the server on page load. Guests are not checked
// (they have no session cookie), which also keeps their local wishlist intact.
export const restoreSession = () => async (dispatch, getState) => {
  if (!getState().user.isAuthenticated) {
    dispatch(setAuthChecked(true));
    return;
  }
  try {
    const user = await getMeAPI();
    await dispatch(startSession(user));
  } catch (error) {
    if (error.response?.status === 401) dispatch(endSession());
    else dispatch(setAuthChecked(true)); // offline: keep what we know
  }
};

export const signOut = () => async (dispatch) => {
  try {
    await UserSingOutAPI();
  } finally {
    dispatch(endSession());
  }
};
