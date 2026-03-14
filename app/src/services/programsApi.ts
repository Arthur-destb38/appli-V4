import { apiCall } from '@/utils/api';
import { Program } from '@/types/program';

export type GenerateProgramPayload = {
  title?: string;
  objective?: string;
  duration_weeks?: number;
  frequency?: number;
  user_id?: string | null;
  exercises_per_session?: number;
  niveau?: string;
  duree_seance?: string;
  priorite?: string;
  priorite_first?: string;
  priorite_second?: string;
  has_blessure?: boolean;
  blessure_first?: string;
  blessure_second?: string;
  equipment_available?: string[];
  cardio?: string;
  methode_preferee?: string;
};

export const listPrograms = async (): Promise<Program[]> => {
  const response = await apiCall('/programs');
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Impossible de récupérer les programmes');
  }
  return (await response.json()) as Program[];
};

export const getProgram = async (programId: string): Promise<Program> => {
  const response = await apiCall(`/programs/${programId}`);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Programme introuvable');
  }
  return (await response.json()) as Program;
};

export const generateProgram = async (payload: GenerateProgramPayload): Promise<Program> => {
  const response = await apiCall('/programs/generate', {
    method: 'POST',
    body: JSON.stringify({
      title: payload.title || 'Programme personnalisé',
      objective: payload.objective,
      duration_weeks: payload.duration_weeks ?? 4,
      frequency: payload.frequency ?? 3,
      user_id: payload.user_id,
      exercises_per_session: payload.exercises_per_session ?? 4,
      niveau: payload.niveau,
      duree_seance: payload.duree_seance != null ? String(payload.duree_seance) : undefined,
      priorite: payload.priorite,
      priorite_first: payload.priorite_first,
      priorite_second: payload.priorite_second,
      has_blessure: payload.has_blessure ?? false,
      blessure_first: payload.blessure_first,
      blessure_second: payload.blessure_second,
      equipment_available: payload.equipment_available,
      cardio: payload.cardio,
      methode_preferee: payload.methode_preferee,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Impossible de générer le programme");
  }

  return (await response.json()) as Program;
};

export const saveProgram = async (programId: string): Promise<{ program_id: string; workouts_created: number; workouts: Array<{ id: string; title: string; day_index: number }> }> => {
  const response = await apiCall(`/programs/${programId}/save`, {
    method: 'POST',
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Impossible d\'enregistrer le programme');
  }

  return (await response.json()) as { program_id: string; workouts_created: number; workouts: Array<{ id: string; title: string; day_index: number }> };
};
