import rawExercises from './exercises_enriched.json';

const toYoutubeSearchUrl = (query: string) =>
  `https://www.youtube.com/results?search_query=${encodeURIComponent(`${query} exercise tutorial`)}`;

const VIDEO_OVERRIDE_MAP: Record<string, string> = {
  // Vidéo CC0 de démonstration directe.
  'push-up-pectorals': 'https://isorepublic.com/wp-content/uploads/2019/01/iso-republic-free-video-065.mp4',
};

export interface ExerciseCatalogEntry {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string[];
  difficulty: string | null;
  cues: string | null;
  commonErrors: string | null;
  videoUrl: string | null;
  imageUrl: string | null;
  sourceUrl: string | null;
  descriptionFr: string | null;
  muscleGroupFr: string | null;
  equipmentFr: string | null;
}

type RawExercise = typeof rawExercises[number];

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

const toCatalogEntry = (exercise: RawExercise): ExerciseCatalogEntry => {
  const muscleGroup =
    exercise.primary_muscle?.trim() || exercise.group?.trim() || exercise.category?.trim() || 'Autre';

  const equipment = Array.isArray(exercise.equipment)
    ? exercise.equipment.filter(Boolean).map((item: string) => item.trim())
    : [];

  const id = slugify(`${exercise.name}-${muscleGroup}`);

  return {
    id,
    name: exercise.name.trim(),
    muscleGroup,
    equipment,
    difficulty: exercise.difficulty?.trim() ?? null,
    cues: exercise.cues?.trim() ?? null,
    commonErrors: exercise.common_errors?.trim() ?? null,
    videoUrl: VIDEO_OVERRIDE_MAP[id] ?? toYoutubeSearchUrl(`${exercise.name} ${muscleGroup}`),
    imageUrl: typeof exercise.image_url === 'string' ? exercise.image_url : null,
    sourceUrl: typeof exercise.source_url === 'string' ? exercise.source_url : null,
    descriptionFr: typeof exercise.description_fr === 'string' ? exercise.description_fr : null,
    muscleGroupFr: typeof exercise.muscle_group_fr === 'string' ? exercise.muscle_group_fr : null,
    equipmentFr: typeof exercise.equipment_fr === 'string' ? exercise.equipment_fr : null,
  };
};

export const EXERCISE_CATALOG: ExerciseCatalogEntry[] = rawExercises
  .filter((exercise): exercise is RawExercise => Boolean(exercise?.name))
  .map(toCatalogEntry);

export const findExerciseById = (id: string) =>
  EXERCISE_CATALOG.find((exercise) => exercise.id === id);
