import React, { createContext, useContext, useState, useCallback, useEffect, PropsWithChildren } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearAllUserDataForLogout } from '@/db/clearUserData';
import { buildApiUrl } from '@/utils/api';

interface LoginRequest {
  username: string;
  password: string;
}

interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

interface User {
  id: string;
  username: string;
  email: string;
  created_at?: string;
  consent_to_public_share?: boolean;
  profile_completed?: boolean;
  email_verified?: boolean;
  bio?: string;
  objective?: string;
  avatar_url?: string;
}

interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

interface AuthContextValue {
  user: User | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  demoLogin: () => Promise<void>;
  register: (credentials: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  updateProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEYS = {
  ACCESS_TOKEN: '@gorillax_access_token',
  REFRESH_TOKEN: '@gorillax_refresh_token',
  USER: '@gorillax_user',
};

export const AuthProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Charger les données sauvegardées au démarrage
  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const [storedAccessToken, storedRefreshToken, storedUser] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN),
        AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN),
        AsyncStorage.getItem(STORAGE_KEYS.USER),
      ]);

      if (storedAccessToken && storedRefreshToken && storedUser) {
        setTokens({
          access_token: storedAccessToken,
          refresh_token: storedRefreshToken,
          token_type: 'bearer',
        });
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.warn('[useAuth] Failed to load stored auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveAuth = async (authTokens: AuthTokens, userData: User) => {
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, authTokens.access_token),
        AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, authTokens.refresh_token),
        AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData)),
      ]);
      setTokens(authTokens);
      setUser(userData);
    } catch (error) {
      console.warn('[useAuth] Failed to save auth:', error);
    }
  };

  const clearAuth = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN),
        AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN),
        AsyncStorage.removeItem(STORAGE_KEYS.USER),
      ]);
      setTokens(null);
      setUser(null);
    } catch (error) {
      console.warn('[useAuth] Failed to clear auth:', error);
    }
  };

  const fetchUserProfile = async (accessToken: string): Promise<User> => {
    const response = await fetch(buildApiUrl('/auth/me'), {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Impossible de récupérer le profil utilisateur');
    }

    return await response.json();
  };

  const handleLogin = useCallback(async (credentials: LoginRequest) => {
    setIsLoading(true);
    try {
      await clearAllUserDataForLogout();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      const response = await fetch(buildApiUrl('/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Erreur de connexion' }));
        throw new Error(error.detail || 'Nom d\'utilisateur ou mot de passe incorrect');
      }

      const authTokens: AuthTokens = await response.json();
      const userData = await fetchUserProfile(authTokens.access_token);

      await saveAuth(authTokens, userData);
      
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Le serveur met trop de temps à répondre. Réessaie dans quelques secondes (serveur au réveil).');
        }
        throw error;
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleDemoLogin = useCallback(async () => {
    setIsLoading(true);
    try {
      await clearAllUserDataForLogout();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      const response = await fetch(buildApiUrl('/auth/demo-login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('Impossible de se connecter au compte demo');
      }

      const authTokens: AuthTokens = await response.json();
      const userData = await fetchUserProfile(authTokens.access_token);
      await saveAuth(authTokens, userData);
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Le serveur met trop de temps à répondre. Réessaie dans quelques secondes.');
        }
        throw error;
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRegister = useCallback(async (credentials: RegisterRequest) => {
    setIsLoading(true);
    try {
      await clearAllUserDataForLogout();

      const response = await fetch(buildApiUrl('/auth/register-v2'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Erreur d\'inscription' }));
        throw new Error(error.detail || 'Erreur lors de l\'inscription');
      }

      const authTokens: AuthTokens = await response.json();
      const userData = await fetchUserProfile(authTokens.access_token);
      await saveAuth(authTokens, userData);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    setIsLoading(true);
    try {
      // Appeler l'endpoint de déconnexion si on a un token
      if (tokens?.access_token) {
        await fetch(buildApiUrl('/auth/logout'), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tokens.access_token}`,
            'Content-Type': 'application/json',
          },
        }).catch(() => {
          // Ignorer les erreurs de déconnexion côté serveur
        });
      }

      await clearAllUserDataForLogout();
      await clearAuth();
    } catch (error) {
      console.warn('[useAuth] Failed to logout:', error);
    } finally {
      setIsLoading(false);
    }
  }, [tokens]);

  const handleRefresh = useCallback(async () => {
    if (!tokens?.refresh_token) {
      throw new Error('Aucun token de rafraîchissement disponible');
    }

    try {
      const response = await fetch(buildApiUrl('/auth/refresh'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens.refresh_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Impossible de rafraîchir le token');
      }

      const newTokens: AuthTokens = await response.json();
      
      // Garder l'utilisateur actuel, juste mettre à jour les tokens
      if (user) {
        await saveAuth(newTokens, user);
      }
    } catch (error) {
      // Si le refresh échoue, déconnecter l'utilisateur
      await clearAuth();
      throw error;
    }
  }, [tokens, user]);

  const handleUpdateProfile = useCallback(async () => {
    if (!tokens?.access_token) {
      throw new Error('Non authentifié');
    }

    try {
      const userData = await fetchUserProfile(tokens.access_token);
      setUser(userData);
      await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
    } catch (error) {
      throw error;
    }
  }, [tokens]);

  return (
    <AuthContext.Provider
      value={{
        user,
        tokens,
        isLoading,
        isAuthenticated: !!user && !!tokens,
        login: handleLogin,
        demoLogin: handleDemoLogin,
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

