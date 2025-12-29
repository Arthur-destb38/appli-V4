export type WorkoutStatus = 'draft' | 'completed';

export interface Workout {
  client_id?: string | null;
  server_id?: number | null;
  id: number;
  title: string;
  status: WorkoutStatus;
  created_at: number;
  updated_at: number;
  deleted_at?: number | null;
}

export interface WorkoutExercise {
  client_id?: string | null;
  server_id?: number | null;
  id: number;
  workout_id: number;
  exercise_id: string;
  order_index: number;
  planned_sets?: number | null;
  deleted_at?: number | null;
}

export interface WorkoutSet {
  client_id?: string | null;
  server_id?: number | null;
  id: number;
  workout_exercise_id: number;
  reps: number;
  weight?: number | null;
  rpe?: number | null;
  done_at?: number | null;
  deleted_at?: number | null;
}
