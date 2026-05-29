import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  loginRequest, logoutRequest, fetchCurrentUser, signupRequest, silentRefresh,
  googleLoginRequest, webAuthnLoginStart, webAuthnLoginFinish,
} from '../../api/auth.api.js';
import { logError, logInfo } from '../../api/logger.js';

const initialState = {
  currentUser:    null,
  accessToken:    null,  // kept in memory only — never written to localStorage
  status:         'idle',
  errorMessage:   null,
  isBootstrapped: false,
};

export const bootstrapAuth = createAsyncThunk('auth/bootstrap', async (_arg, { rejectWithValue }) => {
  // Always try silent refresh via httpOnly cookie — no localStorage check needed
  try {
    const refreshData = await silentRefresh();
    const user = await fetchCurrentUser();
    return { user, accessToken: refreshData.accessToken };
  } catch {
    logError('auth', 'silent refresh failed — user must log in');
    return { user: null, accessToken: null };
  }
});

export const loginUser = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const result = await loginRequest(credentials);
    logInfo('auth', 'logged in as', result.user.email);
    return { user: result.user, accessToken: result.accessToken };
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const signupUser = createAsyncThunk('auth/signup', async (formData, { rejectWithValue }) => {
  try {
    const result = await signupRequest(formData);
    logInfo('auth', 'signed up as', result.user.email);
    return { user: result.user, accessToken: result.accessToken };
  } catch (err) {
    return rejectWithValue(err.message || 'Registration failed');
  }
});

export const loginWithGoogle = createAsyncThunk('auth/loginWithGoogle', async (idToken, { rejectWithValue }) => {
  try {
    const result = await googleLoginRequest(idToken);
    logInfo('auth', 'signed in with Google as', result.user.email);
    return { user: result.user, accessToken: result.accessToken };
  } catch (err) {
    return rejectWithValue(err.message || 'Google sign-in failed');
  }
});

export const loginWithBiometric = createAsyncThunk('auth/loginWithBiometric', async (email, { rejectWithValue }) => {
  try {
    const { startAuthentication } = await import('@simplewebauthn/browser');
    const options  = await webAuthnLoginStart(email);
    const response = await startAuthentication({ optionsJSON: options });
    const result   = await webAuthnLoginFinish(email, response);
    logInfo('auth', 'signed in with biometric as', result.user.email);
    return { user: result.user, accessToken: result.accessToken };
  } catch (err) {
    return rejectWithValue(err.message || 'Biometric sign-in failed');
  }
});

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  try { await logoutRequest(); } catch { /* ignore network failure on logout */ }
  // No localStorage cleanup needed — token was never stored there
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthError(state) { state.errorMessage = null; },
    setAccessToken(state, action) { state.accessToken = action.payload; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(bootstrapAuth.fulfilled, (state, action) => {
        state.currentUser    = action.payload.user;
        state.accessToken    = action.payload.accessToken;
        state.isBootstrapped = true;
        state.status         = 'succeeded';
      })
      .addCase(bootstrapAuth.rejected, (state) => {
        state.currentUser    = null;
        state.accessToken    = null;
        state.isBootstrapped = true;
        state.status         = 'idle';
      })
      .addCase(loginUser.pending,   (state) => { state.status = 'loading'; state.errorMessage = null; })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.currentUser = action.payload.user;
        state.accessToken = action.payload.accessToken;
      })
      .addCase(loginUser.rejected,  (state, action) => { state.status = 'failed'; state.errorMessage = action.payload || 'Login failed'; })
      .addCase(signupUser.pending,   (state) => { state.status = 'loading'; state.errorMessage = null; })
      .addCase(signupUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.currentUser = action.payload.user;
        state.accessToken = action.payload.accessToken;
      })
      .addCase(signupUser.rejected,  (state, action) => { state.status = 'failed'; state.errorMessage = action.payload || 'Signup failed'; })
      .addCase(loginWithGoogle.pending,   (state) => { state.status = 'loading'; state.errorMessage = null; })
      .addCase(loginWithGoogle.fulfilled, (state, action) => { state.status = 'succeeded'; state.currentUser = action.payload.user; state.accessToken = action.payload.accessToken; })
      .addCase(loginWithGoogle.rejected,  (state, action) => { state.status = 'failed'; state.errorMessage = action.payload || 'Google sign-in failed'; })
      .addCase(loginWithBiometric.pending,   (state) => { state.status = 'loading'; state.errorMessage = null; })
      .addCase(loginWithBiometric.fulfilled, (state, action) => { state.status = 'succeeded'; state.currentUser = action.payload.user; state.accessToken = action.payload.accessToken; })
      .addCase(loginWithBiometric.rejected,  (state, action) => { state.status = 'failed'; state.errorMessage = action.payload || 'Biometric sign-in failed'; })
      .addCase(logoutUser.fulfilled, (state) => {
        state.currentUser = null;
        state.accessToken = null;
        state.status = 'idle';
      });
  },
});

export const { clearAuthError, setAccessToken } = authSlice.actions;

export const selectCurrentUser    = (state) => state.auth.currentUser;
export const selectAccessToken    = (state) => state.auth.accessToken;
export const selectAuthStatus     = (state) => state.auth.status;
export const selectAuthError      = (state) => state.auth.errorMessage;
export const selectIsBootstrapped = (state) => state.auth.isBootstrapped;
export const selectIsAuthenticated = (state) => !!state.auth.currentUser;
export const selectHasRole = (...roles) => (state) =>
  !!state.auth.currentUser && roles.includes(state.auth.currentUser.role);

export default authSlice.reducer;
