import React, { createContext, useContext, useState, useCallback, useEffect, PropsWithChildren } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearAllUserDataForLogout } from '@/db/clearUserData';
import { buildApiUrl } from '@/utils/api';
import { useTranslations } from '@/hooks/usePreferences';

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
  subscription_tier?: string;
  ai_programs_generated?: number;
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
  const { t } = useTranslations();

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
        let userData: User;
        try {
          userData = JSON.parse(storedUser);
        } catch {
          // Corrupted user data — clear and bail
          await Promise.all([
            AsyncStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN),
            AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN),
            AsyncStorage.removeItem(STORAGE_KEYS.USER),
          ]);
          setIsLoading(false);
          return;
        }

        // Charger les tokens en mémoire immédiatement (offline-first)
        setTokens({
          access_token: storedAccessToken,
          refresh_token: storedRefreshToken,
          token_type: 'bearer',
        });
        setUser(userData);

        // Tenter un refresh en arrière-plan (non bloquant)
        try {
          const testResponse = await fetch(buildApiUrl('/auth/me'), {
            headers: {
              'Authorization': `Bearer ${storedAccessToken}`,
              'Content-Type': 'application/json',
            },
          }).catch(() => null);

          if (testResponse && testResponse.status === 401) {
            // Token expiré (pas une erreur réseau), tenter un refresh
            const refreshResponse = await fetch(buildApiUrl('/auth/refresh'), {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${storedRefreshToken}`,
                'Content-Type': 'application/json',
              },
            }).catch(() => null);

            if (refreshResponse?.ok) {
              const newTokens = await refreshResponse.json();
              await Promise.all([
                AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, newTokens.access_token),
                AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newTokens.refresh_token),
              ]);
              setTokens({
                access_token: newTokens.access_token,
                refresh_token: newTokens.refresh_token,
                token_type: 'bearer',
              });
            } else if (refreshResponse && refreshResponse.status === 401) {
              // Refresh token aussi expiré — déconnecter
              await Promise.all([
                AsyncStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN),
                AsyncStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN),
                AsyncStorage.removeItem(STORAGE_KEYS.USER),
              ]);
              setTokens(null);
              setUser(null);
            }
            // Si refreshResponse est null (erreur réseau/serveur qui dort),
            // on garde les tokens existants — apiCall gérera le refresh plus tard
          }
          // Si testResponse est null (erreur réseau), on garde les tokens
        } catch {
          // Erreur réseau — garder les tokens existants
        }
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
      throw new Error(t('errorFetchProfile'));
    }

    return await response.json();
  };

  const handleLogin = useCallback(async (credentials: LoginRequest) => {
    setIsLoading(true);
    try {
      // Ne vider les données locales que si c'est un utilisateur différent
      const previousUser = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      let previousUsername: string | null = null;
      try { previousUsername = previousUser ? JSON.parse(previousUser).username : null; } catch { /* ignore */ }
      if (previousUsername && previousUsername !== credentials.username) {
        await clearAllUserDataForLogout();
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      const response = await fetch(buildApiUrl('/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: t('errorConnection') }));
        throw new Error(error.detail || t('errorWrongCredentials'));
      }

      const authTokens: AuthTokens = await response.json();
      const userData = await fetchUserProfile(authTokens.access_token);

      await saveAuth(authTokens, userData);
      
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(t('errorServerTimeout'));
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
      const previousUser = await AsyncStorage.getItem(STORAGE_KEYS.USER);
      let previousUsername: string | null = null;
      try { previousUsername = previousUser ? JSON.parse(previousUser).username : null; } catch { /* ignore */ }
      if (previousUsername && previousUsername !== 'demo') {
        await clearAllUserDataForLogout();
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      const response = await fetch(buildApiUrl('/auth/demo-login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(t('errorDemoConnection'));
      }

      const authTokens: AuthTokens = await response.json();
      const userData = await fetchUserProfile(authTokens.access_token);
      await saveAuth(authTokens, userData);
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(t('errorServerTimeoutShort'));
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
      // Nouveau compte → toujours vider les données de l'ancien utilisateur
      await clearAllUserDataForLogout();

      const response = await fetch(buildApiUrl('/auth/register-v2'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: t('errorRegistration') }));
        throw new Error(error.detail || t('errorRegistrationGeneric'));
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

