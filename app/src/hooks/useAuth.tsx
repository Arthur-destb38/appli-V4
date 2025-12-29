import React, { createContext, useContext, useState, useEffect, useCallback, PropsWithChildren } from 'react';
import * as SecureStore from 'expo-secure-store';
import { login, register, refreshToken, getMe, logout as logoutApi, type LoginRequest, type RegisterRequest, type User } from '@/services/authApi';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (credentials: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export const AuthProvider: React.FC<PropsWithChildren> = ({ children }) => {
  // AUTH DÉSACTIVÉE TEMPORAIREMENT
  const [user, setUser] = useState<User | null>({ id: 'guest', username: 'Guest', created_at: new Date().toISOString(), consent_to_public_share: false });
  const [isLoading, setIsLoading] = useState(false);

  const loadTokens = useCallback(async () => {
    // AUTH DÉSACTIVÉE - Ne rien faire
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadTokens();
  }, [loadTokens]);

  const handleLogin = useCallback(async (credentials: LoginRequest) => {
    // AUTH DÉSACTIVÉE - Simuler une connexion réussie
    setUser({ id: 'guest', username: 'Guest', created_at: new Date().toISOString(), consent_to_public_share: false });
  }, []);

  const handleRegister = useCallback(async (credentials: RegisterRequest) => {
    // AUTH DÉSACTIVÉE - Simuler une inscription réussie
    setUser({ id: 'guest', username: 'Guest', created_at: new Date().toISOString(), consent_to_public_share: false });
  }, []);

  const handleLogout = useCallback(async () => {
    // AUTH DÉSACTIVÉE - Ne rien faire
    setUser({ id: 'guest', username: 'Guest', created_at: new Date().toISOString(), consent_to_public_share: false });
  }, []);

  const handleRefresh = useCallback(async () => {
    const refreshTokenValue = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    if (!refreshTokenValue) {
      throw new Error('No refresh token available');
    }
    const tokens = await refreshToken(refreshTokenValue);
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.access_token);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refresh_token);
    const userData = await getMe(tokens.access_token);
    setUser(userData);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: true, // AUTH DÉSACTIVÉE - Toujours authentifié
        login: handleLogin,
        register: handleRegister,
        logout: handleLogout,
        refreshAuth: handleRefresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

