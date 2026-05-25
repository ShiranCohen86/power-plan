import { createContext, useContext, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  bootstrapAuth, loginUser, logoutUser, signupUser,
  selectCurrentUser, selectIsBootstrapped,
} from '../store/slices/authSlice.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const dispatch        = useDispatch();
  const currentUser     = useSelector(selectCurrentUser);
  const isBootstrapped  = useSelector(selectIsBootstrapped);

  useEffect(() => { dispatch(bootstrapAuth()); }, [dispatch]);

  const contextValue = useMemo(
    () => ({
      user:    currentUser,
      loading: !isBootstrapped,

      async login(email, password) {
        const result = await dispatch(loginUser({ email, password }));
        if (result.error) throw new Error(result.payload || 'Login failed');
        return result.payload;
      },

      async signup(name, email, password) {
        const result = await dispatch(signupUser({ name, email, password }));
        if (result.error) throw new Error(result.payload || 'Signup failed');
        return result.payload;
      },

      async logout() { await dispatch(logoutUser()); },

      async refresh() { await dispatch(bootstrapAuth()); },

      hasRole(...allowedRoles) {
        return !!currentUser && allowedRoles.includes(currentUser.role);
      },
    }),
    [dispatch, currentUser, isBootstrapped],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth() { return useContext(AuthContext); }
