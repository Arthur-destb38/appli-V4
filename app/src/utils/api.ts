import Constants from 'expo-constants';
import { Platform } from 'react-native';

// URL de l'API cloud (Render)
const CLOUD_API_URL = 'https://appli-v2.onrender.com';

// Pour le dev local
const LOCAL_API_IP = 'http://192.168.1.175:8000';  // Pour mobile via Expo Go
const LOCAL_API_WEB = 'http://localhost:8000';     // Pour navigateur web

// Toggle pour basculer entre local et cloud
// ⚠️ Pour APK/Production: mettre à false
// ⚠️ Pour Expo Go local: mettre à true
const USE_LOCAL_API = __DEV__ ? false : false; // Désactivé pour utiliser l'API cloud

export const getApiBaseUrl = () => {
  // Mode dev local activé (seulement en développement)
  if (USE_LOCAL_API && __DEV__) {
    // Web utilise localhost, mobile utilise l'IP
    if (Platform.OS === 'web') {
      return LOCAL_API_WEB;
    }
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
  return headers;
};
