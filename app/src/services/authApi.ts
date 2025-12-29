import { buildApiUrl } from '@/utils/api';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface User {
  id: string;
  username: string;
  created_at: string;
  consent_to_public_share: boolean;
}

export const login = async (payload: LoginRequest): Promise<TokenPair> => {
  const response = await fetch(buildApiUrl('/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur de connexion' }));
    throw new Error(error.detail || 'Erreur de connexion');
  }

  return response.json();
};

export const register = async (payload: RegisterRequest): Promise<TokenPair> => {
  const response = await fetch(buildApiUrl('/auth/register'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erreur d\'inscription' }));
    throw new Error(error.detail || 'Erreur d\'inscription');
  }

  return response.json();
};

export const refreshToken = async (refreshToken: string): Promise<TokenPair> => {
  const response = await fetch(buildApiUrl('/auth/refresh'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${refreshToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Token expiré');
  }

  return response.json();
};

export const getMe = async (accessToken: string): Promise<User> => {
  const response = await fetch(buildApiUrl('/auth/me'), {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Erreur de récupération du profil');
  }

  return response.json();
};

export const logout = async (refreshToken: string): Promise<void> => {
  await fetch(buildApiUrl('/auth/logout'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${refreshToken}`,
    },
  });
};



