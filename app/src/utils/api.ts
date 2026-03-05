import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Téléphone = Render (recommandé). Ne pas mettre EXPO_PUBLIC_API_URL en prod.
const CLOUD_API_URL = 'https://appli-v2.onrender.com';

// Pour le dev local (téléphone sur le même Wi‑Fi que la machine)
// Option 1 : définir EXPO_PUBLIC_API_URL dans app/.env (ex: http://192.168.1.45:8000)
// Option 2 : USE_LOCAL_API = true et mettre l’IP de ta machine ci‑dessous
const LOCAL_API_IP = 'http://192.168.1.45:8000';
const LOCAL_API_WEB = 'http://localhost:8000';

// Toggle pour basculer entre local et cloud
// ⚠️ false = le téléphone utilise Render (prod). true = utilise LOCAL_API_IP (même Wi‑Fi que le Mac).
const USE_LOCAL_API = false;

export const getApiBaseUrl = () => {
  // Mode dev local activé (seulement en développement)
  if (USE_LOCAL_API && __DEV__) {
    return Platform.OS === 'web' ? LOCAL_API_WEB : LOCAL_API_IP;
  }
  
  // 1. Variable d'environnement (pour développement local si besoin)
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  
  // 2. Config app.json
  const extraApi = (Constants.expoConfig as any)?.extra?.apiUrl;
  if (extraApi) {
    return extraApi;
  }
  
  // 3. Par défaut: API cloud
  return CLOUD_API_URL;
};

export const buildApiUrl = (path: string) => {
  const base = getApiBaseUrl();
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
};

export const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  try {
    const accessToken = await AsyncStorage.getItem('@gorillax_access_token');
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
  } catch (_) {
    // Token unavailable
  }
  
  return headers;
};

const DEFAULT_REQUEST_TIMEOUT_MS = 25000;

// Fonction utilitaire pour les appels API authentifiés (avec timeout pour éviter blocages sur mobile)
export const apiCall = async (
  endpoint: string,
  options: RequestInit = {},
  timeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS
): Promise<Response> => {
  const url = buildApiUrl(endpoint);
  const headers = await getAuthHeaders();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const config: RequestInit = {
    ...options,
    signal: options.signal ?? controller.signal,
    headers: {
      ...headers,
      ...options.headers,
    },
  };

  try {
    let response = await fetch(url, config);
    clearTimeout(timeoutId);

    if (response.status === 401 && endpoint !== '/auth/refresh' && endpoint !== '/auth/login') {
      try {
        const refreshToken = await AsyncStorage.getItem('@gorillax_refresh_token');
        if (refreshToken) {
          const refreshController = new AbortController();
          const refreshTimeoutId = setTimeout(() => refreshController.abort(), 10000);
          const refreshResponse = await fetch(buildApiUrl('/auth/refresh'), {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${refreshToken}`,
              'Content-Type': 'application/json',
            },
            signal: refreshController.signal,
          });
          clearTimeout(refreshTimeoutId);

          if (refreshResponse.ok) {
            const newTokens = await refreshResponse.json();
            await AsyncStorage.setItem('@gorillax_access_token', newTokens.access_token);
            await AsyncStorage.setItem('@gorillax_refresh_token', newTokens.refresh_token);

            const newHeaders = await getAuthHeaders();
            const retryController = new AbortController();
            const retryTimeoutId = setTimeout(() => retryController.abort(), timeoutMs);
            response = await fetch(url, {
              ...config,
              signal: retryController.signal,
              headers: {
                ...newHeaders,
                ...options.headers,
              },
            });
            clearTimeout(retryTimeoutId);
          } else {
            await AsyncStorage.multiRemove([
              '@gorillax_access_token',
              '@gorillax_refresh_token',
              '@gorillax_user',
            ]);
          }
        }
      } catch (_) {
        await AsyncStorage.multiRemove([
          '@gorillax_access_token',
          '@gorillax_refresh_token',
          '@gorillax_user',
        ]).catch(() => {});
      }
    }

    return response;
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('La requête a pris trop de temps. Vérifie ta connexion et réessaie.');
    }
    throw err;
  }
};
