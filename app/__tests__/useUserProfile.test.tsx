import { act, renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';

import { useUserProfile, UserProfileProvider } from '@/hooks/useUserProfile';

jest.mock('@/db/user-profile', () => ({
  fetchUserProfile: jest.fn(),
  upsertUserProfile: jest.fn(),
}));

jest.mock('@/services/userProfileApi', () => ({
  fetchRemoteProfile: jest.fn(),
  upsertRemoteProfile: jest.fn(),
}));

const mockFetchLocal = require('@/db/user-profile').fetchUserProfile as jest.Mock;
const mockUpsertLocal = require('@/db/user-profile').upsertUserProfile as jest.Mock;
const mockFetchRemote = require('@/services/userProfileApi').fetchRemoteProfile as jest.Mock;
const mockUpsertRemote = require('@/services/userProfileApi').upsertRemoteProfile as jest.Mock;

describe('useUserProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('crée un profil local par défaut et le synchronise', async () => {
    mockFetchLocal.mockResolvedValueOnce(null);
    mockUpsertLocal.mockImplementation(async ({ id, username, consent_to_public_share }) => ({
      id,
      username,
      consent_to_public_share,
      created_at: Date.now(),
    }));
    mockUpsertRemote.mockResolvedValue({});
    mockFetchRemote.mockResolvedValue(null);

    const wrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
      <UserProfileProvider>{children}</UserProfileProvider>
    );

    const { result } = renderHook(() => useUserProfile(), { wrapper });

    await waitFor(() => {
      expect(result.current.profile).not.toBeNull();
    });
    expect(mockUpsertLocal).toHaveBeenCalled();
    expect(mockUpsertRemote).toHaveBeenCalled();
  });

  it('met à jour le pseudo et le consentement', async () => {
    const profile = {
      id: 'user-123',
      username: 'athlete-aaaa',
      consent_to_public_share: false,
      created_at: Date.now(),
    };
    mockFetchLocal.mockResolvedValue(profile);
    mockUpsertLocal.mockResolvedValue({ ...profile, username: 'newname', consent_to_public_share: true });
    mockUpsertRemote.mockResolvedValue({});
    mockFetchRemote.mockResolvedValue(null);

    const wrapper: React.FC<React.PropsWithChildren> = ({ children }) => (
      <UserProfileProvider>{children}</UserProfileProvider>
    );

    const { result } = renderHook(() => useUserProfile(), { wrapper });

    await waitFor(() => {
      expect(result.current.profile).not.toBeNull();
    });

    await act(async () => {
      await result.current.updateProfile({
        username: 'newname',
        consent_to_public_share: true,
      });
    });

    expect(mockUpsertLocal).toHaveBeenLastCalledWith({
      id: 'user-123',
      username: 'newname',
      consent_to_public_share: true,
    });
    expect(mockUpsertRemote).toHaveBeenLastCalledWith({
      id: 'user-123',
      username: 'newname',
      consent_to_public_share: true,
    });
  });
});
