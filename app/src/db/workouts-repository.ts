import { SQLTransaction } from 'expo-sqlite';

import {
  Workout,
  WorkoutExercise,
  WorkoutSet,
  WorkoutStatus,
} from '@/types/workout';

import {
  WorkoutExerciseRow,
  WorkoutRow,
  WorkoutSetRow,
  getFallbackStore,
  isUsingFallbackDatabase,
} from './database';
import { execute, runSql, withTransaction } from './sqlite';

const generateClientId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `cid_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

export type WorkoutWithRelations = {
  workout: Workout;
  exercises: WorkoutExercise[];
  sets: WorkoutSet[];
};

const mapWorkoutRow = (row: WorkoutRow): Workout => ({
  id: row.id,
  client_id: row.client_id,
  server_id: row.server_id,
  title: row.title,
  status: row.status as WorkoutStatus,
  created_at: row.created_at,
  updated_at: row.updated_at,
  deleted_at: row.deleted_at,
});

const mapExerciseRow = (row: WorkoutExerciseRow): WorkoutExercise => ({
  id: row.id,
  client_id: row.client_id,
  server_id: row.server_id,
  workout_id: row.workout_id,
  exercise_id: row.exercise_id,
  order_index: row.order_index,
  planned_sets: row.planned_sets ?? null,
  deleted_at: row.deleted_at,
});

const mapSetRow = (row: WorkoutSetRow): WorkoutSet => ({
  id: row.id,
  client_id: row.client_id,
  server_id: row.server_id,
  workout_exercise_id: row.workout_exercise_id,
  reps: row.reps,
  weight: row.weight ?? undefined,
  rpe: row.rpe ?? undefined,
  done_at: row.done_at ?? undefined,
  deleted_at: row.deleted_at,
});

const mapFallbackData = (): WorkoutWithRelations[] => {
  const store = getFallbackStore();
  const workouts = [...store.workouts]
    .filter((workout) => workout.deleted_at == null)
    .sort((a, b) => b.updated_at - a.updated_at)
    .map((workout) => ({ ...workout }));

  return workouts.map((workout) => {
    const exercises = store.workoutExercises
      .filter((ex) => ex.workout_id === workout.id)
      .filter((ex) => ex.deleted_at == null)
      .sort((a, b) => a.order_index - b.order_index)
      .map((exercise) => ({ ...exercise, planned_sets: exercise.planned_sets ?? null }));

    const exerciseIds = new Set(exercises.map((ex) => ex.id));

    const sets = store.workoutSets
      .filter((set) => exerciseIds.has(set.workout_exercise_id))
      .filter((set) => set.deleted_at == null)
      .sort((a, b) => a.id - b.id)
      .map((set) => ({ ...set }));

    return {
      workout,
      exercises,
      sets,
    };
  });
};

export const fetchWorkouts = async (): Promise<WorkoutWithRelations[]> => {
  if (isUsingFallbackDatabase()) {
    return mapFallbackData();
  }

  const workoutsResult = await runSql(
    'SELECT * FROM workouts WHERE deleted_at IS NULL ORDER BY updated_at DESC'
  );
  const exercisesResult = await runSql(
    'SELECT * FROM workout_exercises WHERE deleted_at IS NULL ORDER BY order_index ASC'
  );
  const setsResult = await runSql(
    'SELECT * FROM workout_sets WHERE deleted_at IS NULL ORDER BY id ASC'
  );

  const workouts = workoutsResult.rows._array.map(mapWorkoutRow);
  const exercises = exercisesResult.rows._array.map(mapExerciseRow);
  const sets = setsResult.rows._array.map(mapSetRow);

  return workouts.map((workout) => ({
    workout,
    exercises: exercises.filter((ex) => ex.workout_id === workout.id),
    sets: sets.filter((set) =>
      exercises.some((ex) => ex.id === set.workout_exercise_id && ex.workout_id === workout.id)
    ),
  }));
};

export const createWorkout = async (
  title: string
): Promise<{ id: number; client_id: string | null; created_at: number; updated_at: number }> => {
  if (isUsingFallbackDatabase()) {
    const store = getFallbackStore();
    const now = Date.now();
    const id = ++store.counters.workout;
    const clientId = generateClientId();
    const workoutRow: WorkoutRow = {
      id,
      client_id: clientId,
      server_id: null,
      title,
      status: 'draft',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };
    store.workouts.push(workoutRow);
    return { id, client_id: clientId, created_at: now, updated_at: now };
  }

  const now = Date.now();
  const clientId = generateClientId();
  const result = await runSql(
    'INSERT INTO workouts (client_id, server_id, title, status, created_at, updated_at) VALUES (?, NULL, ?, ?, ?, ?)',
    [clientId, title, 'draft', now, now]
  );
  const insertedId = result.insertId ?? 0;
  return { id: insertedId, client_id: clientId, created_at: now, updated_at: now };
};

export const createWorkoutWithServerId = async (
  title: string,
  serverId: string | number
): Promise<{ id: number; client_id: string | null; created_at: number; updated_at: number }> => {
  if (isUsingFallbackDatabase()) {
    const store = getFallbackStore();
    const now = Date.now();
    const id = ++store.counters.workout;
    const clientId = generateClientId();
    const serverIdNum = typeof serverId === 'string' ? parseInt(serverId, 10) : serverId;
    const workoutRow: WorkoutRow = {
      id,
      client_id: clientId,
      server_id: serverIdNum,
      title,
      status: 'draft',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };
    store.workouts.push(workoutRow);
    return { id, client_id: clientId, created_at: now, updated_at: now };
  }

  const now = Date.now();
  const clientId = generateClientId();
  const serverIdNum = typeof serverId === 'string' ? parseInt(serverId, 10) : serverId;
  const result = await runSql(
    'INSERT INTO workouts (client_id, server_id, title, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    [clientId, serverIdNum, title, 'draft', now, now]
  );
  const insertedId = result.insertId ?? 0;
  return { id: insertedId, client_id: clientId, created_at: now, updated_at: now };
};

export const updateWorkoutTitle = async (id: number, title: string): Promise<void> => {
  if (isUsingFallbackDatabase()) {
    const store = getFallbackStore();
    const now = Date.now();
    const workout = store.workouts.find((item) => item.id === id);
    if (workout) {
      workout.title = title;
      workout.updated_at = now;
    }
    return;
  }

  const now = Date.now();
  await runSql('UPDATE workouts SET title = ?, updated_at = ? WHERE id = ?', [title, now, id]);
};

export const updateWorkoutStatus = async (id: number, status: WorkoutStatus): Promise<void> => {
  if (isUsingFallbackDatabase()) {
    const store = getFallbackStore();
    const now = Date.now();
    const workout = store.workouts.find((item) => item.id === id);
    if (workout) {
      workout.status = status;
      workout.updated_at = now;
    }
    return;
  }

  const now = Date.now();
  await runSql('UPDATE workouts SET status = ?, updated_at = ? WHERE id = ?', [status, now, id]);
};

export const addWorkoutExercise = async (
  workoutId: number,
  exerciseId: string,
  orderIndex: number,
  plannedSets: number | null = null
): Promise<{ id: number; client_id: string | null }> => {
  if (isUsingFallbackDatabase()) {
    const store = getFallbackStore();
    const id = ++store.counters.workoutExercise;
    const clientId = generateClientId();
    store.workoutExercises.push({
      id,
      client_id: clientId,
      server_id: null,
      workout_id: workoutId,
      exercise_id: exerciseId,
      order_index: orderIndex,
      planned_sets: plannedSets,
      deleted_at: null,
    });
    return { id, client_id: clientId };
  }

  const clientId = generateClientId();
  const result = await runSql(
    'INSERT INTO workout_exercises (client_id, server_id, workout_id, exercise_id, order_index, planned_sets) VALUES (?, NULL, ?, ?, ?, ?)',
    [clientId, workoutId, exerciseId, orderIndex, plannedSets]
  );
  return { id: result.insertId ?? 0, client_id: clientId };
};

export const updateWorkoutExercisePlan = async (
  workoutExerciseId: number,
  plannedSets: number | null
): Promise<void> => {
  if (isUsingFallbackDatabase()) {
    const store = getFallbackStore();
    const exercise = store.workoutExercises.find((item) => item.id === workoutExerciseId);
    if (exercise) {
      exercise.planned_sets = plannedSets;
    }
    return;
  }

  await runSql('UPDATE workout_exercises SET planned_sets = ? WHERE id = ?', [
    plannedSets,
    workoutExerciseId,
  ]);
};

export const removeWorkoutExercise = async (id: number): Promise<void> => {
  if (isUsingFallbackDatabase()) {
    const store = getFallbackStore();
    store.workoutExercises = store.workoutExercises.filter((exercise) => exercise.id !== id);
    store.workoutSets = store.workoutSets.filter((set) => set.workout_exercise_id !== id);
    return;
  }

  await runSql('DELETE FROM workout_exercises WHERE id = ?', [id]);
};

export const addWorkoutSet = async (
  workoutExerciseId: number,
  reps: number,
  weight?: number | null,
  rpe?: number | null
): Promise<{ id: number; client_id: string | null }> => {
  if (isUsingFallbackDatabase()) {
    const store = getFallbackStore();
    const id = ++store.counters.workoutSet;
    const clientId = generateClientId();
    store.workoutSets.push({
      id,
      client_id: clientId,
      server_id: null,
      workout_exercise_id: workoutExerciseId,
      reps,
      weight: weight ?? null,
      rpe: rpe ?? null,
      done_at: null,
      deleted_at: null,
    });
    return { id, client_id: clientId };
  }

  const clientId = generateClientId();
  const result = await runSql(
    `INSERT INTO workout_sets (client_id, server_id, workout_exercise_id, reps, weight, rpe, done_at)
     VALUES (?, NULL, ?, ?, ?, ?, ?)`,
    [clientId, workoutExerciseId, reps, weight ?? null, rpe ?? null, null]
  );
  return { id: result.insertId ?? 0, client_id: clientId };
};

export const updateWorkoutSet = async (
  id: number,
  updates: Partial<Pick<WorkoutSet, 'reps' | 'weight' | 'rpe' | 'done_at'>>
): Promise<void> => {
  if (isUsingFallbackDatabase()) {
    const store = getFallbackStore();
    const target = store.workoutSets.find((set) => set.id === id);
    if (!target) {
      return;
    }

    if (updates.reps !== undefined) {
      target.reps = updates.reps;
    }
    if (updates.weight !== undefined) {
      target.weight = updates.weight ?? null;
    }
    if (updates.rpe !== undefined) {
      target.rpe = updates.rpe ?? null;
    }
    if (updates.done_at !== undefined) {
      target.done_at = updates.done_at ?? null;
    }
    return;
  }

  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.reps !== undefined) {
    fields.push('reps = ?');
    values.push(updates.reps);
  }
  if (updates.weight !== undefined) {
    fields.push('weight = ?');
    values.push(updates.weight);
  }
  if (updates.rpe !== undefined) {
    fields.push('rpe = ?');
    values.push(updates.rpe);
  }
  if (updates.done_at !== undefined) {
    fields.push('done_at = ?');
    values.push(updates.done_at);
  }

  if (!fields.length) {
    return;
  }

  values.push(id);
  await runSql(`UPDATE workout_sets SET ${fields.join(', ')} WHERE id = ?`, values);
};

export const removeWorkoutSet = async (id: number): Promise<void> => {
  if (isUsingFallbackDatabase()) {
    const store = getFallbackStore();
    store.workoutSets = store.workoutSets.filter((set) => set.id !== id);
    return;
  }

  await runSql('DELETE FROM workout_sets WHERE id = ?', [id]);
};

export const setWorkoutExerciseServerId = async (
  clientId: string,
  serverId: number
): Promise<void> => {
  if (isUsingFallbackDatabase()) {
    const store = getFallbackStore();
    store.workoutExercises = store.workoutExercises.map((exercise) =>
      exercise.client_id === clientId ? { ...exercise, server_id: serverId } : exercise
    );
    return;
  }

  await runSql('UPDATE workout_exercises SET server_id = ? WHERE client_id = ?', [
    serverId,
    clientId,
  ]);
};

export const setWorkoutSetServerId = async (
  clientId: string,
  serverId: number
): Promise<void> => {
  if (isUsingFallbackDatabase()) {
    const store = getFallbackStore();
    store.workoutSets = store.workoutSets.map((set) =>
      set.client_id === clientId ? { ...set, server_id: serverId } : set
    );
    return;
  }

  await runSql('UPDATE workout_sets SET server_id = ? WHERE client_id = ?', [serverId, clientId]);
};

export const setWorkoutServerId = async (
  clientId: string,
  serverId: number
): Promise<void> => {
  if (!clientId) {
    return;
  }

  if (isUsingFallbackDatabase()) {
    const store = getFallbackStore();
    store.workouts = store.workouts.map((workout) =>
      workout.client_id === clientId ? { ...workout, server_id: serverId } : workout
    );
    return;
  }

  await runSql('UPDATE workouts SET server_id = ? WHERE client_id = ?', [serverId, clientId]);
};

export const deleteWorkout = async (id: number): Promise<void> => {
  if (isUsingFallbackDatabase()) {
    const store = getFallbackStore();
    store.workouts = store.workouts.filter((workout) => workout.id !== id);
    const exerciseIds = store.workoutExercises
      .filter((exercise) => exercise.workout_id === id)
      .map((exercise) => exercise.id);

    store.workoutExercises = store.workoutExercises.filter(
      (exercise) => exercise.workout_id !== id
    );

    store.workoutSets = store.workoutSets.filter(
      (set) => !exerciseIds.includes(set.workout_exercise_id)
    );
    return;
  }

  await runSql('DELETE FROM workouts WHERE id = ?', [id]);
};

export const clearAll = async (): Promise<void> => {
  if (isUsingFallbackDatabase()) {
    const store = getFallbackStore();
    store.workouts = [];
    store.workoutExercises = [];
    store.workoutSets = [];
    store.counters = {
      workout: 0,
      workoutExercise: 0,
      workoutSet: 0,
    };
    return;
  }

  await withTransaction(async (tx: SQLTransaction) => {
    await execute(tx, 'DELETE FROM workout_sets');
    await execute(tx, 'DELETE FROM workout_exercises');
    await execute(tx, 'DELETE FROM workouts');
  });
};
