import { useLocalSearchParams } from 'expo-router';

import HistoryDetailScreen from '../../src/screens/HistoryDetailScreen';

export default function HistoryDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const workoutId = Number(id);

  return <HistoryDetailScreen workoutId={Number.isFinite(workoutId) ? workoutId : -1} />;
}
