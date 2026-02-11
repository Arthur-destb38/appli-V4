import { openDatabaseSync, openDatabase, SQLiteDatabase } from 'expo-sqlite';

const DB_NAME = 'gorillax.db';

export type DatabaseConnection = SQLiteDatabase;

export type WorkoutRow = {
  id: number;
  client_id: string | null;
  server_id: number | null;
  user_id: string | null;
  title: string;
  status: string;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
};

export type WorkoutExerciseRow = {
  id: number;
  client_id: string | null;
  server_id: number | null;
  workout_id: number;
  exercise_id: string;
  order_index: number;
  planned_sets: number | null;
  deleted_at: number | null;
};

export type WorkoutSetRow = {
  id: number;
  client_id: string | null;
  server_id: number | null;
  workout_exercise_id: number;
  reps: number;
  weight: number | null;
  rpe: number | null;
  done_at: number | null;
  deleted_at: number | null;
};

export type QueuedMutationRow = {
  id: number;
  action: string;
  payload: string;
  status: 'pending' | 'completed' | 'failed';
  attempts: number;
  created_at: number;
  last_error: string | null;
};

type FallbackStore = {
  workouts: WorkoutRow[];
  workoutExercises: WorkoutExerciseRow[];
  workoutSets: WorkoutSetRow[];
  mutationQueue: QueuedMutationRow[];
  syncState: Record<string, string>;
  userProfile: {
    id: string;
    username: string;
    consent_to_public_share: number;
    created_at: number;
  } | null;
  counters: {
    workout: number;
    workoutExercise: number;
    workoutSet: number;
    mutation: number;
  };
};

const fallbackStore: FallbackStore = {
  workouts: [],
  workoutExercises: [],
  workoutSets: [],
  mutationQueue: [],
  syncState: {},
  userProfile: null,
  counters: {
    workout: 0,
    workoutExercise: 0,
    workoutSet: 0,
    mutation: 0,
  },
};

let usingFallback = false;

const createFallbackDatabase = (): DatabaseConnection => {
  usingFallback = true;

  return {
    transaction: (callback: (tx: any) => void) => {
      const tx = {
        executeSql: (
          _sql: string,
          _params: unknown[] = [],
          success?: (tx: any, result: any) => void,
          error?: (tx: any, err: Error) => void
        ) => {
          try {
            success?.(tx, {
              insertId: undefined,
              rowsAffected: 0,
              rows: {
                length: 0,
                item: () => null,
                _array: [],
              },
            });
          } catch (err) {
            error?.(tx, err as Error);
          }

          return false;
        },
      };

      callback(tx);
    },
  } as DatabaseConnection;
};

export const runMigrations = (db: DatabaseConnection) => {
  db.transaction((tx) => {
    const ensureColumn = (table: string, column: string, definition: string) => {
      tx.executeSql(
        `PRAGMA table_info(${table})`,
        [],
        (_innerTx, result) => {
          const rows = result?.rows?._array ?? [];
          const exists = rows.some((row: any) => row.name === column);
          if (!exists) {
            tx.executeSql(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
          }
        }
      );
    };

    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS workouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id TEXT,
        server_id INTEGER,
        user_id TEXT,
        title TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER
      );`
    );
    ensureColumn('workouts', 'client_id', 'TEXT');
    ensureColumn('workouts', 'server_id', 'INTEGER');
    ensureColumn('workouts', 'user_id', 'TEXT');
    ensureColumn('workouts', 'deleted_at', 'INTEGER');
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS workout_exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id TEXT,
        server_id INTEGER,
        workout_id INTEGER NOT NULL,
        exercise_id TEXT NOT NULL,
        order_index INTEGER NOT NULL,
        deleted_at INTEGER,
        FOREIGN KEY(workout_id) REFERENCES workouts(id) ON DELETE CASCADE
      );`
    );
    ensureColumn('workout_exercises', 'client_id', 'TEXT');
    ensureColumn('workout_exercises', 'server_id', 'INTEGER');
    ensureColumn('workout_exercises', 'deleted_at', 'INTEGER');
    ensureColumn('workout_exercises', 'planned_sets', 'INTEGER');
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS workout_sets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id TEXT,
        server_id INTEGER,
        workout_exercise_id INTEGER NOT NULL,
        reps INTEGER NOT NULL,
        weight REAL,
        rpe REAL,
        done_at INTEGER,
        deleted_at INTEGER,
        FOREIGN KEY(workout_exercise_id) REFERENCES workout_exercises(id) ON DELETE CASCADE
      );`
    );
    ensureColumn('workout_sets', 'client_id', 'TEXT');
    ensureColumn('workout_sets', 'server_id', 'INTEGER');
    ensureColumn('workout_sets', 'deleted_at', 'INTEGER');
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS mutation_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        payload TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        attempts INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        last_error TEXT
      );`
    );
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS sync_state (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );`
    );
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS user_profile (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        consent_to_public_share INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );`
    );
  });
};

let connection: DatabaseConnection | null = null;
let fallbackConnection: DatabaseConnection | null = null;
let fallbackInitialized = false;

const getFallbackConnection = (): DatabaseConnection => {
  if (!fallbackConnection) {
    fallbackConnection = createFallbackDatabase();
  }

  return fallbackConnection;
};

export const isUsingFallbackDatabase = () => usingFallback;

export const getFallbackStore = () => fallbackStore;

export const resetFallbackStore = () => {
  fallbackStore.workouts = [];
  fallbackStore.workoutExercises = [];
  fallbackStore.workoutSets = [];
  fallbackStore.mutationQueue = [];
  fallbackStore.syncState = {};
  fallbackStore.userProfile = null;
  fallbackStore.counters = {
    workout: 0,
    workoutExercise: 0,
    workoutSet: 0,
    mutation: 0,
  };
  usingFallback = false;
  fallbackConnection = null;
  fallbackInitialized = false;
};

export const getDatabase = (): DatabaseConnection => {
  if (connection) {
    return connection;
  }

  if (typeof window === 'undefined') {
    if (!fallbackInitialized) {
      resetFallbackStore();
      fallbackInitialized = true;
    }
    return getFallbackConnection();
  }

  if (typeof openDatabaseSync !== 'function') {
    if (!fallbackInitialized) {
      resetFallbackStore();
      fallbackInitialized = true;
    }
    return getFallbackConnection();
  }

  try {
    let dbCandidate: SQLiteDatabase | null = null;
    try {
      dbCandidate = openDatabaseSync(DB_NAME);
    } catch {
      // ignore, will try async API
    }

    if (!dbCandidate || typeof (dbCandidate as any).transaction !== 'function') {
      // tenter l'API openDatabase (async) si l'API sync n'est pas dispo
      try {
        const asyncDb: any = openDatabase(DB_NAME);
        if (asyncDb && typeof asyncDb.transaction === 'function') {
          dbCandidate = asyncDb as SQLiteDatabase;
        }
      } catch {
        dbCandidate = null;
      }
    }

    if (!dbCandidate) {
      throw new Error('SQLite transaction API unavailable');
    }

    connection = dbCandidate;
    runMigrations(connection);
  } catch (error) {
    console.warn('Failed to open SQLite database, falling back to in-memory store.', error);
    if (!fallbackInitialized) {
      resetFallbackStore();
      fallbackInitialized = true;
    }
    connection = getFallbackConnection();
  }

  return connection;
};
