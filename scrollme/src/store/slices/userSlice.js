import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { UserSignInAPI } from '../../services/userAPI/signInAPI';
import { getErrorMessage } from '../../api/client';

const initialState = {
  id: null,
  firstName: '',
  lastName: '',
  email: '',
  username: '',
  name: '',
  isAuthenticated: false,
  roles: [],
  isFetching: false,
  error: null,
  // True once the session has been checked with the server on this page load.
  authChecked: false,
};

// Thunk for userSignIn
export const userSignIn = createAsyncThunk('user/signIn', async (loginData, { rejectWithValue }) => {
  try {
    return await UserSignInAPI(loginData);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error, 'Invalid credentials, please try again.'));
  }
});

const applyUser = (state, user) => {
  state.id = user.id;
  state.firstName = user.firstName;
  state.lastName = user.lastName;
  state.email = user.email;
  state.username = user.username;
  state.name = `${user.firstName} ${user.lastName}`;
  state.roles = user.roles || [];
  state.isAuthenticated = true;
  state.lastLogin = new Date().toISOString();
};

const UserSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action) => {
      applyUser(state, action.payload);
      state.authChecked = true;
    },
    logOut: () => ({ ...initialState, authChecked: true }),
    setAuthChecked: (state, action) => {
      state.authChecked = action.payload;
    },
    // Set the fetching state
    setFetching: (state, action) => {
      state.isFetching = action.payload;
    },
    // Set an error message
    setError: (state, action) => {
      state.error = action.payload;
    },
    changeAuthenticated: (state, action) => {
      state.isAuthenticated = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(userSignIn.pending, (state) => {
        state.isFetching = true;
        state.error = null;
      })
      .addCase(userSignIn.fulfilled, (state, action) => {
        // Accounts with two-factor are not signed in until the code is checked.
        if (action.payload.user) applyUser(state, action.payload.user);
        state.isFetching = false;
        state.authChecked = true;
      })
      .addCase(userSignIn.rejected, (state, action) => ({ ...initialState, authChecked: true, error: action.payload }));
  },
});

export const selectIsAdmin = (state) => state.user.roles?.some((r) => r === 'admin' || r === 'super_admin');

export const { setUser, logOut, setAuthChecked, setFetching, setError, changeAuthenticated } = UserSlice.actions;

export default UserSlice.reducer;
