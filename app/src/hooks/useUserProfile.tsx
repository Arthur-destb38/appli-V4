import React, {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { fetchRemoteProfile, upsertRemoteProfile } from '@/services/userProfileApi';
import { fetchUserProfile, upsertUserProfile, UserProfile } from '@/db/user-profile';
import { useAuth } from '@/hooks/useAuth';

const generateUserId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `user-${Math.random().toString(16).slice(2, 10)}`;
};

const generateUsername = () => {
  const suffix = Math.random().toString(16).slice(2, 6).toUpperCase();
  return `athlete-${suffix}`;
};

export type UserProfileContextValue = {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<UserProfile | null>;
  updateProfile: (updates: { username?: string; consent_to_public_share?: boolean }) => Promise<UserProfile>;
};

const UserProfileContext = createContext<UserProfileContextValue | undefined>(undefined);

const normalizeUsername = (value: string | undefined, fallback: string): string => {
  const trimmed = (value ?? '').trim();
  if (!trimmed) {
    return fallback;
  }
  return trimmed;
};

export const UserProfileProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const { user: authUser, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pushLocal = useCallback(async (): Promise<UserProfile> => {
    // Use auth user's data when authenticated, otherwise generate random
    const id = authUser?.id ?? generateUserId();
    const username = authUser?.username ?? generateUsername();
    const newProfile = await upsertUserProfile({
      id,
      username,
      consent_to_public_share: false,
    });
    setProfile(newProfile);
    return newProfile;
  }, [authUser]);

  const syncRemote = useCallback(async (localProfile: UserProfile) => {
    // Don't overwrite server username with local profile data
    // The server already has the correct username from auth registration
    if (!isAuthenticated) return;
    try {
      await upsertRemoteProfile({
        id: localProfile.id,
        username: localProfile.username,
        consent_to_public_share: localProfile.consent_to_public_share,
      });
    } catch (err) {
      // Silent failure: stay functional offline.
      console.warn('Failed to sync user profile with server', err);
    }
  }, [isAuthenticated]);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const local = await fetchUserProfile();

      // If authenticated, ensure local profile matches auth user
      if (authUser) {
        const needsUpdate = !local || local.id !== authUser.id || local.username !== authUser.username;
        if (needsUpdate) {
          const corrected = await upsertUserProfile({
            id: authUser.id,
            username: authUser.username,
            consent_to_public_share: local?.consent_to_public_share ?? false,
          });
          setProfile(corrected);
          return corrected;
        }
        setProfile(local);
        return local;
      }

      if (local) {
        setProfile(local);
        try {
          const remote = await fetchRemoteProfile(local.id);
          if (remote && remote.username !== local.username) {
            const reconciled = await upsertUserProfile({
              id: local.id,
              username: remote.username,
              consent_to_public_share: remote.consent_to_public_share,
            });
            setProfile(reconciled);
            return reconciled;
          }
        } catch (err) {
          console.warn('Failed to fetch remote profile', err);
        }
        return local;
      }
      const created = await pushLocal();
      return created;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Profil indisponible');
      const existing = await fetchUserProfile();
      if (existing) {
        setProfile(existing);
        return existing;
      }
      const created = await pushLocal();
      return created;
    } finally {
      setIsLoading(false);
    }
  }, [pushLocal, authUser]);

  useEffect(() => {
    loadProfile().catch((err) => console.warn('Failed to bootstrap user profile', err));
  }, [loadProfile]);

  const refresh = useCallback(async () => {
    const local = await fetchUserProfile();
    const userId = authUser?.id ?? local?.id ?? profile?.id;

    if (userId) {
      try {
        const remote = await fetchRemoteProfile(userId);
        if (remote) {
          // Always prefer auth username over remote/local
          const username = authUser?.username ?? remote.username;
          const merged = {
            id: remote.id,
            username,
            consent_to_public_share: (remote as any).consent_to_public_share ?? local?.consent_to_public_share ?? false,
            created_at: local?.created_at ?? Date.now(),
            bio: (remote as any).bio,
            objective: (remote as any).objective,
            avatar_url: (remote as any).avatar_url,
          };
          setProfile(merged);
          return merged;
        }
      } catch (err) {
        console.warn('Failed to fetch remote profile during refresh', err);
      }
    }

    if (local) {
      setProfile(local);
      return local;
    }
    const created = await pushLocal();
    return created;
  }, [pushLocal, authUser, profile?.id]);

  const updateProfile = useCallback(
    async (updates: { username?: string; consent_to_public_share?: boolean }) => {
      const current = profile ?? (await fetchUserProfile());
      const base = current ?? (await pushLocal());
      const nextUsername = normalizeUsername(updates.username, base.username);
      const nextConsent =
        updates.consent_to_public_share !== undefined
          ? updates.consent_to_public_share
          : base.consent_to_public_share;

      const updated = await upsertUserProfile({
        id: base.id,
        username: nextUsername,
        consent_to_public_share: nextConsent,
      });
      setProfile(updated);
      try {
        await upsertRemoteProfile({
          id: updated.id,
          username: updated.username,
          consent_to_public_share: updated.consent_to_public_share,
        });
      } catch (err) {
        console.warn('Failed to sync updated profile', err);
      }
      return updated;
    },
    [profile, pushLocal]
  );

  const value = useMemo<UserProfileContextValue>(
    () => ({
      profile,
      isLoading,
      error,
      refresh,
      updateProfile,
    }),
    [profile, isLoading, error, refresh, updateProfile]
  );

  return <UserProfileContext.Provider value={value}>{children}</UserProfileContext.Provider>;
};

export const useUserProfile = () => {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error('useUserProfile must be used within UserProfileProvider');
  }
  return context;
};
