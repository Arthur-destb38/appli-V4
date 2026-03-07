import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/theme/ThemeProvider';

import { TrackWorkoutScreen } from '@/src/screens/TrackWorkoutScreen';

export default function TrackRoute() {
  const { id, mode } = useLocalSearchParams<{ id: string; mode?: string }>();
  const workoutId = Number(id);
  const router = useRouter();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>Suivi séance</Text>
        <View style={{ width: 32 }} />
      </View>
      <TrackWorkoutScreen
        workoutId={Number.isFinite(workoutId) ? workoutId : -1}
        modeSport={mode === '1'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600' },
});
