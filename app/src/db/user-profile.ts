import { getFallbackStore, isUsingFallbackDatabase } from './database';
import { runSql } from './sqlite';

export type UserProfile = {
  id: string;
  username: string;
  consent_to_public_share: boolean;
  created_at: number;
  bio?: string;
  objective?: string;
  avatar_url?: string;
};

const mapRow = (row: any): UserProfile => ({
  id: row.id,
  username: row.username,
  consent_to_public_share: Boolean(row.consent_to_public_share),
  created_at: typeof row.created_at === 'number' ? row.created_at : Number(row.created_at) || Date.now(),
  bio: row.bio || undefined,
  objective: row.objective || undefined,
  avatar_url: row.avatar_url || undefined,
});

export const fetchUserProfile = async (): Promise<UserProfile | null> => {
  if (isUsingFallbackDatabase()) {
    const store = getFallbackStore();
    if (!store.userProfile) {
      return null;
    }
    return {
      id: store.userProfile.id,
      username: store.userProfile.username,
      consent_to_public_share: Boolean(store.userProfile.consent_to_public_share),
      created_at: store.userProfile.created_at,
      bio: store.userProfile.bio || undefined,
      objective: store.userProfile.objective || undefined,
      avatar_url: store.userProfile.avatar_url || undefined,
    };
  }

  const result = await runSql('SELECT * FROM user_profile LIMIT 1');
  const row = result.rows._array[0];
  return row ? mapRow(row) : null;
};

export const upsertUserProfile = async (profile: {
  id: string;
  username: string;
  consent_to_public_share: boolean;
}): Promise<UserProfile> => {
  const now = Date.now();

  if (isUsingFallbackDatabase()) {
    const store = getFallbackStore();
    const createdAt = store.userProfile?.created_at ?? now;
    store.userProfile = {
      id: profile.id,
      username: profile.username,
      consent_to_public_share: profile.consent_to_public_share ? 1 : 0,
      created_at: createdAt,
    };
    return {
      id: store.userProfile.id,
      username: store.userProfile.username,
      consent_to_public_share: Boolean(store.userProfile.consent_to_public_share),
      created_at: createdAt,
    };
  }

  const existing = await runSql('SELECT created_at FROM user_profile WHERE id = ?', [profile.id]);
  const createdAt = existing.rows._array[0]?.created_at ?? now;

  await runSql(
    `INSERT INTO user_profile (id, username, consent_to_public_share, created_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       username=excluded.username,
       consent_to_public_share=excluded.consent_to_public_share`,
    [profile.id, profile.username, profile.consent_to_public_share ? 1 : 0, createdAt]
  );

  return {
    id: profile.id,
    username: profile.username,
    consent_to_public_share: profile.consent_to_public_share,
    created_at: createdAt,
  };
};
