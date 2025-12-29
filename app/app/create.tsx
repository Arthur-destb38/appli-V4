import { useLocalSearchParams } from 'expo-router';

import { CreateWorkoutScreen } from '@/src/screens/CreateWorkoutScreen';

export default function CreateRoute() {
  const params = useLocalSearchParams<{ id?: string }>();
  const workoutId = params?.id ? Number(params.id) : undefined;

  return <CreateWorkoutScreen workoutId={workoutId} />;
}
