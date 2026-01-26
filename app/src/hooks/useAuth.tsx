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
  updateProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export const AuthProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadTokens = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Vérifier si on a des tokens stockés
      const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      const refreshTokenValue = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      
      if (accessToken && refreshTokenValue) {
        try {
          // Essayer de récupérer le profil avec l'access token
          const userData = await getMe(accessToken);
          setUser(userData);
          console.log('✅ Utilisateur connecté automatiquement:', userData.username);
        } catch (error) {
          console.log('🔄 Access token expiré, tentative de refresh...');
          try {
            // Access token expiré, essayer le refresh
            const tokens = await refreshToken(refreshTokenValue);
            await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.access_token);
            await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refresh_token);
            
            const userData = await getMe(tokens.access_token);
            setUser(userData);
            console.log('✅ Tokens rafraîchis, utilisateur connecté:', userData.username);
          } catch (refreshError) {
            console.log('❌ Refresh token expiré, déconnexion');
            // Refresh token aussi expiré, nettoyer
            await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
            await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
            setUser(null);
          }
        }
      } else {
        console.log('ℹ️ Aucun token trouvé, utilisateur non connecté');
        setUser(null);
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des tokens:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTokens();
  }, [loadTokens]);

  const handleLogin = useCallback(async (credentials: LoginRequest) => {
    try {
      setIsLoading(true);
      const tokens = await login(credentials);
      
      // Stocker les tokens de manière sécurisée
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.access_token);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refresh_token);
      
      // Récupérer le profil utilisateur
      const userData = await getMe(tokens.access_token);
      setUser(userData);
      
      console.log('✅ Connexion réussie:', userData.username);
    } catch (error) {
      console.error('❌ Erreur de connexion:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRegister = useCallback(async (credentials: RegisterRequest) => {
    try {
      setIsLoading(true);
      const tokens = await register(credentials);
      
      // Stocker les tokens de manière sécurisée
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.access_token);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refresh_token);
      
      // Récupérer le profil utilisateur
      const userData = await getMe(tokens.access_token);
      setUser(userData);
      
      console.log('✅ Inscription réussie:', userData.username);
    } catch (error) {
      console.error('❌ Erreur d\'inscription:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Récupérer le refresh token pour le logout côté serveur
      const refreshTokenValue = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      if (refreshTokenValue) {
        try {
          await logoutApi(refreshTokenValue);
        } catch (error) {
          console.log('⚠️ Erreur logout serveur (pas grave):', error);
        }
      }
      
      // Nettoyer les tokens locaux
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      
      setUser(null);
      console.log('✅ Déconnexion réussie');
    } catch (error) {
      console.error('❌ Erreur de déconnexion:', error);
    } finally {
      setIsLoading(false);
    }
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

  const handleUpdateProfile = useCallback(async () => {
    try {
      const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
      if (!accessToken) {
        throw new Error('No access token available');
      }
      
      // Récupérer le profil mis à jour
      const userData = await getMe(accessToken);
      setUser(userData);
      console.log('✅ Profil mis à jour:', userData.username);
    } catch (error) {
      console.error('❌ Erreur mise à jour profil:', error);
      throw error;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user, // Authentifié si user existe
        login: handleLogin,
        register: handleRegister,
        logout: handleLogout,
        refreshAuth: handleRefresh,
        updateProfile: handleUpdateProfile,
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

