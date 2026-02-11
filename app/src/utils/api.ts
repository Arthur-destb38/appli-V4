import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// URL de l'API cloud (Render)
const CLOUD_API_URL = 'https://appli-v2.onrender.com';

// Pour le dev local
const LOCAL_API_IP = 'http://192.168.1.175:8000';        
const LOCAL_API_WEB = 'http://localhost:8000';       

// Toggle pour basculer entre local et cloud
// ⚠️ Pour APK/Production: mettre à false
// ⚠️ Pour Expo Go local: mettre à true
const USE_LOCAL_API = __DEV__ ? true : false;

export const getApiBaseUrl = () => {
  // Mode dev local activé (seulement en développement)
  if (USE_LOCAL_API && __DEV__) {
    // Utiliser localhost pour web et mobile
    return LOCAL_API_IP;
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
  } catch (error) {
    console.error('Erreur lors de la récupération du token:', error);
  }
  
  return headers;
};

// Fonction utilitaire pour les appels API authentifiés
export const apiCall = async (
  endpoint: string, 
  options: RequestInit = {}
): Promise<Response> => {
  const url = buildApiUrl(endpoint);
  const headers = await getAuthHeaders();
  
  const config: RequestInit = {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  };
  
  const response = await fetch(url, config);
  
  // Si le token est expiré (401), essayer de le rafraîchir
  if (response.status === 401 && endpoint !== '/auth/refresh' && endpoint !== '/auth/login') {
    try {
      const refreshToken = await AsyncStorage.getItem('@gorillax_refresh_token');
      if (refreshToken) {
        const refreshResponse = await fetch(buildApiUrl('/auth/refresh'), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${refreshToken}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (refreshResponse.ok) {
          const newTokens = await refreshResponse.json();
          await AsyncStorage.setItem('@gorillax_access_token', newTokens.access_token);
          await AsyncStorage.setItem('@gorillax_refresh_token', newTokens.refresh_token);
          
          // Refaire l'appel original avec le nouveau token
          const newHeaders = await getAuthHeaders();
          return fetch(url, {
            ...config,
            headers: {
              ...newHeaders,
              ...options.headers,
            },
          });
        }
      }
    } catch (error) {
      console.error('Erreur lors du refresh du token:', error);
    }
  }
  
  return response;
};
