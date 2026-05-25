import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { loginRequest, logoutRequest, fetchCurrentUser, signupRequest } from '../../api/auth.api.js';
import { logError, logInfo } from '../../api/logger.js';

const initialState = {
  currentUser:    null,
  status:         'idle',
  errorMessage:   null,
  isBootstrapped: false,
};

export const bootstrapAuth = createAsyncThunk('auth/bootstrap', async (_arg, { rejectWithValue }) => {
  const storedToken = localStorage.getItem('token');
  if (!storedToken) return null;
  try {
    return await fetchCurrentUser();
  } catch (err) {
    logError('auth', 'bootstrap failed', err.message);
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    return rejectWithValue(err.message);
  }
});

export const loginUser = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const result = await loginRequest(credentials);
    localStorage.setItem('token', result.accessToken);
    localStorage.setItem('refreshToken', result.refreshToken);
    logInfo('auth', 'logged in as', result.user.email);
    return result.user;
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const signupUser = createAsyncThunk('auth/signup', async (formData, { rejectWithValue }) => {
  try {
    const result = await signupRequest(formData);
    localStorage.setItem('token', result.accessToken);
    localStorage.setItem('refreshToken', result.refreshToken);
    logInfo('auth', 'signed up as', result.user.email);
    return result.user;
  } catch (err) {
    return rejectWithValue(err.message || 'Registration failed');
  }
});

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  try { await logoutRequest(); } catch { /* ignore network failure on logout */ }
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthError(state) { state.errorMessage = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(bootstrapAuth.fulfilled, (state, action) => {
        state.currentUser    = action.payload;
        state.isBootstrapped = true;
        state.status         = 'succeeded';
      })
      .addCase(bootstrapAuth.rejected, (state) => {
        state.currentUser    = null;
        state.isBootstrapped = true;
        state.status         = 'idle';
      })
      .addCase(loginUser.pending,   (state) => { state.status = 'loading'; state.errorMessage = null; })
      .addCase(loginUser.fulfilled, (state, action) => { state.status = 'succeeded'; state.currentUser = action.payload; })
      .addCase(loginUser.rejected,  (state, action) => { state.status = 'failed'; state.errorMessage = action.payload || 'Login failed'; })
      .addCase(signupUser.pending,   (state) => { state.status = 'loading'; state.errorMessage = null; })
      .addCase(signupUser.fulfilled, (state, action) => { state.status = 'succeeded'; state.currentUser = action.payload; })
      .addCase(signupUser.rejected,  (state, action) => { state.status = 'failed'; state.errorMessage = action.payload || 'Signup failed'; })
      .addCase(logoutUser.fulfilled, (state) => { state.currentUser = null; state.status = 'idle'; });
  },
});

export const { clearAuthError } = authSlice.actions;

export const selectCurrentUser    = (state) => state.auth.currentUser;
export const selectAuthStatus     = (state) => state.auth.status;
export const selectAuthError      = (state) => state.auth.errorMessage;
export const selectIsBootstrapped = (state) => state.auth.isBootstrapped;
export const selectIsAuthenticated = (state) => !!state.auth.currentUser;
export const selectHasRole = (...roles) => (state) =>
  !!state.auth.currentUser && roles.includes(state.auth.currentUser.role);

export default authSlice.reducer;
