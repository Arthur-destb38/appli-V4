import { buildApiUrl, getAuthHeaders } from '@/utils/api';
import { Program } from '@/types/program';

const PROGRAMS_BASE = buildApiUrl('/programs');

/**
 * Récupère la liste de tous les programmes enregistrés
 */
export const listPrograms = async (): Promise<Program[]> => {
  const headers = await getAuthHeaders();
  const response = await fetch(PROGRAMS_BASE, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Impossible de récupérer les programmes');
  }

  return (await response.json()) as Program[];
};

/**
 * Récupère un programme par son ID
 */
export const getProgram = async (programId: string): Promise<Program> => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${PROGRAMS_BASE}/${programId}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Programme introuvable');
  }

  return (await response.json()) as Program;
};

export type GenerateProgramPayload = {
  title?: string;
  objective?: string;
  duration_weeks?: number;
  frequency?: number;
  user_id?: string | null;
  exercises_per_session?: number;
  // Nouveaux paramètres de la V1
  niveau?: string; // Débutant, Intermédiaire, Avancé
  duree_seance?: string; // "45", "60", etc.
  priorite?: string; // "haut", "bas", "specifique"
  priorite_first?: string;
  priorite_second?: string;
  has_blessure?: boolean;
  blessure_first?: string;
  blessure_second?: string;
  equipment_available?: string[];
  cardio?: string; // "oui" ou "non"
  methode_preferee?: string; // "fullbody", "upperlower", "split", "ppl"
};

export const generateProgram = async (payload: GenerateProgramPayload): Promise<Program> => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${PROGRAMS_BASE}/generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title: payload.title || 'Programme personnalisé',
      objective: payload.objective,
      duration_weeks: payload.duration_weeks ?? 4,
      frequency: payload.frequency ?? 3,
      user_id: payload.user_id,
      exercises_per_session: payload.exercises_per_session ?? 4,
      niveau: payload.niveau,
      duree_seance: payload.duree_seance,
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

/**
 * Sauvegarde un programme et crée les séances associées
 */
export const saveProgram = async (programId: string): Promise<{ program_id: string; workouts_created: number; workouts: Array<{ id: string; title: string; day_index: number }> }> => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${PROGRAMS_BASE}/${programId}/save`, {
    method: 'POST',
    headers,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Impossible d\'enregistrer le programme');
  }

  return (await response.json()) as { program_id: string; workouts_created: number; workouts: Array<{ id: string; title: string; day_index: number }> };
};
