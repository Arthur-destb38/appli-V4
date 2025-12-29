import { getFallbackStore, isUsingFallbackDatabase } from './database';
import { runSql } from './sqlite';

const LAST_PULL_KEY = 'last_pull_timestamp';

export const getLastPullTimestamp = async (): Promise<number> => {
  if (isUsingFallbackDatabase()) {
    const store = getFallbackStore();
    const value = store.syncState[LAST_PULL_KEY];
    return value ? Number(value) : 0;
  }

  const result = await runSql(`SELECT value FROM sync_state WHERE key = ?`, [LAST_PULL_KEY]);
  if (result.rows.length === 0) {
    return 0;
  }

  const record = result.rows.item(0) as { value: string };
  return Number(record.value) || 0;
};

export const setLastPullTimestamp = async (timestamp: number): Promise<void> => {
  if (isNaN(timestamp)) {
    return;
  }

  if (isUsingFallbackDatabase()) {
    const store = getFallbackStore();
    store.syncState[LAST_PULL_KEY] = String(timestamp);
    return;
  }

  await runSql(
    `INSERT INTO sync_state (key, value)
     VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [LAST_PULL_KEY, String(timestamp)]
  );
};
