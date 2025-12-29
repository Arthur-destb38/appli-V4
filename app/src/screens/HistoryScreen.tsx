import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { fetchWorkouts, WorkoutWithRelations } from '@/db/workouts-repository';
import { useAppTheme } from '@/theme/ThemeProvider';
import { LoadingState, ErrorState, EmptyState } from '@/components/StateView';
import { HistoryProgressChart } from '@/components/HistoryProgressChart';
import { ExerciseChargesChart } from '@/components/ExerciseChargesChart';

type HistoryItem = {
  id: number;
  client_id?: string | null;
  title: string;
  date: number;
  dateLabel: string;
  status: string;
  exerciseCount: number;
  setCount: number;
  volume: number;
  synced: boolean;
  exercises: string[];
};

type PeriodFilter = 'all' | 'month' | 'week';

const formatDate = (timestamp: number) => {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(timestamp));
};

const computeVolume = (workout: WorkoutWithRelations) => {
  return workout.sets.reduce((acc, set) => {
    const weight = set.weight ?? 0;
    return acc + weight * set.reps;
  }, 0);
};

const mapToHistoryItem = (workout: WorkoutWithRelations): HistoryItem => {
  return {
    id: workout.workout.id,
    client_id: workout.workout.client_id,
    title: workout.workout.title,
    date: workout.workout.updated_at,
    dateLabel: formatDate(workout.workout.updated_at),
    status: workout.workout.status,
    exerciseCount: workout.exercises.length,
    setCount: workout.sets.length,
    volume: computeVolume(workout),
    synced: Boolean(workout.workout.server_id),
    exercises: workout.exercises.map((exercise) => exercise.exercise_id.toString()),
  };
};

export const HistoryScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<HistoryItem[]>([]);
  const [filtered, setFiltered] = useState<HistoryItem[]>([]);
  const [rawWorkouts, setRawWorkouts] = useState<WorkoutWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [period] = useState<PeriodFilter>('all');
  const [exerciseQuery] = useState('');

  const load = useCallback(async () => {
    try {
      setError(null);
      const workouts = await fetchWorkouts();
      setRawWorkouts(workouts);
      const items = workouts.map(mapToHistoryItem);
      setData(items);
      setFiltered(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const HistoryCard: React.FC<{ item: HistoryItem; index: number }> = ({ item, index }) => {
    const cardAnim = useRef(new Animated.Value(0)).current;
    
    useEffect(() => {
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 50,
        easing: Easing.out(Easing.back(1.1)),
        useNativeDriver: true,
      }).start();
    }, [cardAnim, index]);
    
    return (
      <Animated.View
        style={{
          opacity: cardAnim,
          transform: [
            {
              translateY: cardAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [30, 0],
              }),
            },
          ],
        }}
      >
        <Pressable
          style={({ pressed }) => [
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              shadowColor: theme.colors.border,
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            navigation.navigate('history/[id]' as never, { id: item.id } as never);
          }}
        >
        <View style={styles.cardHeader}>
          <View>
            <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>{item.dateLabel}</Text>
          </View>
          <View
            style={[
              styles.badge,
              {
                backgroundColor:
                  item.status === 'completed' ? theme.colors.primaryMuted : theme.colors.surfaceMuted,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text style={[styles.badgeText, { color: theme.colors.textPrimary }]}>
              {item.status === 'completed' ? 'Terminée' : 'Brouillon'}
            </Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={[styles.statPill, { backgroundColor: theme.colors.surfaceMuted }]}>
            <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>{item.exerciseCount}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Exos</Text>
          </View>
          <View style={[styles.statPill, { backgroundColor: theme.colors.surfaceMuted }]}>
            <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>{item.setCount}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Séries</Text>
          </View>
          <View style={[styles.statPill, { backgroundColor: theme.colors.surfaceMuted }]}>
            <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>{Math.round(item.volume)}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>kg</Text>
          </View>
        </View>
          {item.synced ? (
            <View style={styles.syncedRow}>
              <Ionicons name="checkmark-circle" size={14} color={theme.colors.accent} />
              <Text style={[styles.synced, { color: theme.colors.accent }]}>Synchronisée</Text>
            </View>
          ) : null}
        </Pressable>
      </Animated.View>
    );
  };

  const renderItem = useCallback(
    ({ item, index }: { item: HistoryItem; index: number }) => (
      <HistoryCard item={item} index={index} />
    ),
    [navigation, theme]
  );

  // Calculer les données hebdomadaires pour le graphique
  const weeklyData = useMemo(() => {
    const now = Date.now();
    const weeks: { [key: string]: { volume: number; count: number; label: string } } = {};
    
    // Grouper par semaine (8 dernières semaines)
    data.forEach((item) => {
      const date = new Date(item.date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // Dimanche de la semaine
      weekStart.setHours(0, 0, 0, 0);
      
      const weekKey = weekStart.getTime();
      const weekLabel = `${weekStart.getDate()}/${weekStart.getMonth() + 1}`;
      
      if (!weeks[weekKey]) {
        weeks[weekKey] = { volume: 0, count: 0, label: weekLabel };
      }
      
      weeks[weekKey].volume += item.volume;
      weeks[weekKey].count += 1;
    });
    
    // Convertir en tableau et trier par date
    const sortedWeeks = Object.entries(weeks)
      .map(([key, value]) => ({
        weekKey: Number(key),
        ...value,
      }))
      .sort((a, b) => a.weekKey - b.weekKey)
      .slice(-8); // Garder les 8 dernières semaines
    
    // Formater pour le graphique
    return sortedWeeks.map((week, index) => ({
      week: `Sem ${index + 1}`,
      value: week.volume,
      label: week.label,
    }));
  }, [data]);

  useEffect(() => {
    const now = Date.now();
    const exerciseFilter = exerciseQuery.trim().toLowerCase();

    const filteredItems = data.filter((item) => {
      let matchesPeriod = true;
      if (period === 'week') {
        const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
        matchesPeriod = item.date >= oneWeekAgo;
      } else if (period === 'month') {
        const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;
        matchesPeriod = item.date >= oneMonthAgo;
      }

      if (!matchesPeriod) {
        return false;
      }

      if (!exerciseFilter) {
        return true;
      }

      return item.exercises.some((exerciseId) =>
        exerciseId.toLowerCase().includes(exerciseFilter)
      );
    });

    setFiltered(filteredItems);
  }, [data, period, exerciseQuery]);

  const content = useMemo(() => {
    if (isLoading) {
      return <LoadingState message="Chargement de l'historique..." />;
    }

    if (error) {
      return <ErrorState message={error} onRetry={load} />;
    }

    if (!filtered.length) {
      return (
        <EmptyState
          title="Aucune séance encore"
          subtitle="Crée une séance pour voir ton historique apparaître ici"
        />
      );
    }

    return (
      <FlatList
        data={filtered}
        keyExtractor={(item) => `${item.id}-${item.client_id ?? 'local'}`}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListHeaderComponent={
          <>
            {weeklyData.length > 0 && (
              <View style={styles.chartWrapper}>
                <HistoryProgressChart
                  data={weeklyData}
                  title="Progression hebdomadaire"
                  unit="kg"
                  type="volume"
                />
              </View>
            )}
            {rawWorkouts.length > 0 && (
              <View style={styles.chartWrapper}>
                <ExerciseChargesChart
                  workouts={rawWorkouts}
                  title="Charges par exercice"
                />
              </View>
            )}
          </>
        }
      />
    );
  }, [error, filtered, isLoading, onRefresh, renderItem, refreshing, load, weeklyData, rawWorkouts]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }] }>
      <View style={[styles.screenHeader, { backgroundColor: theme.colors.surface }]}> 
        <Text style={[styles.screenTitle, { color: theme.colors.textPrimary }]}>Historique</Text>
        <Text style={[styles.screenSubtitle, { color: theme.colors.textSecondary }]}> 
          Surveille tes dernières séances
        </Text>
      </View>
      {content}
    </View>
  );
};

export default HistoryScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  chartWrapper: {
    marginBottom: 12,
  },
  screenHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  screenSubtitle: {
    fontSize: 14,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  syncedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  synced: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  statPill: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 4,
  },
});
