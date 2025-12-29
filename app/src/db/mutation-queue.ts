import { getFallbackStore, isUsingFallbackDatabase, QueuedMutationRow } from './database';
import { runSql } from './sqlite';

export type MutationStatus = 'pending' | 'completed' | 'failed';

export type QueuedMutation = {
  id: number;
  action: string;
  payload: unknown;
  status: MutationStatus;
  attempts: number;
  created_at: number;
  last_error: string | null;
};

const parseRow = (row: QueuedMutationRow): QueuedMutation => ({
  ...row,
  payload: safeParsePayload(row.payload),
});

const safeParsePayload = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch (error) {
    console.warn('Failed to parse mutation payload', error);
    return null;
  }
};

export const enqueueMutation = async (action: string, payload: unknown): Promise<number> => {
  const payloadJson = JSON.stringify(payload ?? {});
  const now = Date.now();

  if (isUsingFallbackDatabase()) {
    const store = getFallbackStore();
    const id = ++store.counters.mutation;
    store.mutationQueue.push({
      id,
      action,
      payload: payloadJson,
      status: 'pending',
      attempts: 0,
      created_at: now,
      last_error: null,
    });
    return id;
  }

  const result = await runSql(
    `INSERT INTO mutation_queue (action, payload, status, attempts, created_at)
     VALUES (?, ?, 'pending', 0, ?)`,
    [action, payloadJson, now]
  );

  return result.insertId ?? 0;
};

export const countPendingMutations = async (): Promise<number> => {
  if (isUsingFallbackDatabase()) {
    const store = getFallbackStore();
    return store.mutationQueue.filter((item) => item.status !== 'completed').length;
  }

  const result = await runSql(
    `SELECT COUNT(*) as count FROM mutation_queue WHERE status != 'completed'`
  );
  const rows = result.rows._array as { count: number }[];
  return rows[0]?.count ?? 0;
};

export const getPendingMutations = async (limit = 20): Promise<QueuedMutation[]> => {
  if (isUsingFallbackDatabase()) {
    const store = getFallbackStore();
    return store.mutationQueue
      .filter((item) => item.status !== 'completed')
      .sort((a, b) => a.id - b.id)
      .slice(0, limit)
      .map(parseRow);
  }

  const result = await runSql(
    `SELECT * FROM mutation_queue WHERE status != 'completed' ORDER BY id ASC LIMIT ?`,
    [limit]
  );

  return result.rows._array.map(parseRow);
};

export const markMutationCompleted = async (id: number): Promise<void> => {
  if (isUsingFallbackDatabase()) {
    const store = getFallbackStore();
    store.mutationQueue = store.mutationQueue.map((item) =>
      item.id === id ? { ...item, status: 'completed', last_error: null } : item
    );
    return;
  }

  await runSql(`UPDATE mutation_queue SET status = 'completed', last_error = NULL WHERE id = ?`, [
    id,
  ]);
};

export const markMutationFailed = async (id: number, errorMessage?: string): Promise<void> => {
  if (isUsingFallbackDatabase()) {
    const store = getFallbackStore();
    store.mutationQueue = store.mutationQueue.map((item) =>
      item.id === id
        ? {
            ...item,
            status: 'failed',
            attempts: item.attempts + 1,
            last_error: errorMessage ?? null,
          }
        : item
    );
    return;
  }

  await runSql(
    `UPDATE mutation_queue
     SET status = 'failed',
         attempts = attempts + 1,
         last_error = ?
     WHERE id = ?`,
    [errorMessage ?? null, id]
  );
};

export const removeMutation = async (id: number): Promise<void> => {
  if (isUsingFallbackDatabase()) {
    const store = getFallbackStore();
    store.mutationQueue = store.mutationQueue.filter((item) => item.id !== id);
    return;
  }

  await runSql(`DELETE FROM mutation_queue WHERE id = ?`, [id]);
};
