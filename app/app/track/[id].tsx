import { useLocalSearchParams } from 'expo-router';

import { TrackWorkoutScreen } from '@/src/screens/TrackWorkoutScreen';

export default function TrackRoute() {
  const { id, mode } = useLocalSearchParams<{ id: string; mode?: string }>();
  const workoutId = Number(id);

  return (
    <TrackWorkoutScreen
      workoutId={Number.isFinite(workoutId) ? workoutId : -1}
      modeSport={mode === '1'}
    />
  );
}
