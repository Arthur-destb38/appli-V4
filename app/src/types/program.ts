export type ProgramSet = {
  id?: number;
  exercise_slug: string;
  reps: string | number | null;
  weight: number | null;
  rpe: number | null;
  order_index: number;
  notes?: string | null;
};

export type ProgramSession = {
  id?: number;
  day_index: number;
  title: string;
  focus: string;
  estimated_minutes: number | null;
  sets: ProgramSet[];
};

export type Program = {
  id?: number;
  title: string;
  objective?: string | null;
  duration_weeks: number;
  user_id?: string | null;
  sessions: ProgramSession[];
};
