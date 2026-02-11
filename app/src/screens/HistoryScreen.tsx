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
  TextInput,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { fetchWorkouts, WorkoutWithRelations } from '@/db/workouts-repository';
import { useAppTheme } from '@/theme/ThemeProvider';
import { LoadingState, ErrorState, EmptyState } from '@/components/StateView';
import { HistoryProgressChart } from '@/components/HistoryProgressChart';
import { ExerciseChargesChart } from '@/components/ExerciseChargesChart';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

// Grouper par période
const getTimePeriod = (timestamp: number): string => {
  const today = new Date();
  const date = new Date(timestamp);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
  const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  if (date.toDateString() === today.toDateString()) return 'Aujourd\'hui';
  if (date.toDateString() === yesterday.toDateString()) return 'Hier';
  if (date >= thisWeekStart) return 'Cette semaine';
  if (date >= thisMonthStart) return 'Ce mois-ci';
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
};

export const HistoryScreen: React.FC = () => {
  const navigation = useNavigation();
  const router = useRouter();
  const { theme, mode } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<HistoryItem[]>([]);
  const [filtered, setFiltered] = useState<HistoryItem[]>([]);
  const [rawWorkouts, setRawWorkouts] = useState<WorkoutWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<PeriodFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCharts, setShowCharts] = useState(true);

  // Animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;
  const searchFocusAnim = useRef(new Animated.Value(0)).current;

  const isDark = mode === 'dark';

  useEffect(() => {
    Animated.stagger(100, [
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(contentAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [headerAnim, contentAnim]);

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

  const handleSearchFocus = useCallback((focused: boolean) => {
    Animated.spring(searchFocusAnim, {
      toValue: focused ? 1 : 0,
      useNativeDriver: false,
      tension: 50,
      friction: 8,
    }).start();
  }, [searchFocusAnim]);

  // Stats calculées
  const stats = useMemo(() => {
    const completed = data.filter((d) => d.status === 'completed').length;
    const totalVolume = data.reduce((acc, d) => acc + d.volume, 0);
    const totalSets = data.reduce((acc, d) => acc + d.setCount, 0);
    const totalExercises = data.reduce((acc, d) => acc + d.exerciseCount, 0);
    return { completed, totalVolume, totalSets, totalExercises };
  }, [data]);

  // Grouper par période
  const groupedData = useMemo(() => {
    const groups: { [key: string]: HistoryItem[] } = {};
    filtered.forEach((item) => {
      const period = getTimePeriod(item.date);
      if (!groups[period]) groups[period] = [];
      groups[period].push(item);
    });
    return groups;
  }, [filtered]);

  const HistoryCard: React.FC<{ item: HistoryItem; index: number }> = ({ item, index }) => {
    const cardAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;
    
    useEffect(() => {
      Animated.spring(cardAnim, {
        toValue: 1,
        delay: index * 60,
        useNativeDriver: true,
        tension: 40,
        friction: 7,
      }).start();
    }, [cardAnim, index]);

    const isCompleted = item.status === 'completed';
    const statusColor = isCompleted ? '#10b981' : '#f59e0b';
    const statusGradient: [string, string] = isCompleted 
      ? ['#10b981', '#059669'] 
      : ['#f59e0b', '#d97706'];

    const handlePressIn = () => {
      Animated.spring(scaleAnim, {
        toValue: 0.97,
        useNativeDriver: true,
        tension: 100,
        friction: 10,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 10,
      }).start();
    };

    // Time ago
    const getTimeAgo = (timestamp: number) => {
      const diff = Date.now() - timestamp;
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);
      if (minutes < 60) return `il y a ${minutes}min`;
      if (hours < 24) return `il y a ${hours}h`;
      if (days < 7) return `il y a ${days}j`;
      return item.dateLabel;
    };
    
    return (
      <Animated.View
        style={{
          opacity: cardAnim,
          transform: [
            { translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) },
            { scale: Animated.multiply(cardAnim, scaleAnim) },
          ],
        }}
      >
        <Pressable
          style={[styles.card, { backgroundColor: theme.colors.surface }]}
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            navigation.navigate('history/[id]' as never, { id: item.id } as never);
          }}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          {/* Gradient accent */}
          <LinearGradient
            colors={statusGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.cardAccent}
          />

          <View style={styles.cardContent}>
            {/* Header */}
            <View style={styles.cardHeaderRow}>
              <LinearGradient
                colors={[statusColor + '30', statusColor + '15']}
                style={styles.cardIconBox}
              >
                <Ionicons
                  name={isCompleted ? 'trophy' : 'flash'}
                  size={22}
                  color={statusColor}
                />
              </LinearGradient>

              <View style={styles.cardTitleBlock}>
                <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={[styles.cardTimeAgo, { color: theme.colors.textSecondary }]}>
                  {getTimeAgo(item.date)}
                </Text>
              </View>

              <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {isCompleted ? 'Terminée' : 'Brouillon'}
                </Text>
              </View>
            </View>

            {/* Stats */}
            <View style={styles.cardStatsGrid}>
              <View style={[styles.cardStatItem, { backgroundColor: theme.colors.surfaceMuted }]}>
                <LinearGradient
                  colors={['#8b5cf6', '#7c3aed']}
                  style={styles.cardStatIcon}
                >
                  <Ionicons name="barbell" size={14} color="#FFFFFF" />
                </LinearGradient>
                <View>
                  <Text style={[styles.cardStatValue, { color: theme.colors.textPrimary }]}>
                    {item.exerciseCount}
                  </Text>
                  <Text style={[styles.cardStatLabel, { color: theme.colors.textSecondary }]}>
                    Exercices
                  </Text>
                </View>
              </View>

              <View style={[styles.cardStatItem, { backgroundColor: theme.colors.surfaceMuted }]}>
                <LinearGradient
                  colors={['#ec4899', '#db2777']}
                  style={styles.cardStatIcon}
                >
                  <Ionicons name="layers" size={14} color="#FFFFFF" />
                </LinearGradient>
                <View>
                  <Text style={[styles.cardStatValue, { color: theme.colors.textPrimary }]}>
                    {item.setCount}
                  </Text>
                  <Text style={[styles.cardStatLabel, { color: theme.colors.textSecondary }]}>
                    Séries
                  </Text>
                </View>
              </View>

              <View style={[styles.cardStatItem, { backgroundColor: theme.colors.surfaceMuted }]}>
                <LinearGradient
                  colors={['#06b6d4', '#0891b2']}
                  style={styles.cardStatIcon}
                >
                  <Ionicons name="fitness" size={14} color="#FFFFFF" />
                </LinearGradient>
                <View>
                  <Text style={[styles.cardStatValue, { color: theme.colors.textPrimary }]}>
                    {Math.round(item.volume)}
                  </Text>
                  <Text style={[styles.cardStatLabel, { color: theme.colors.textSecondary }]}>
                    kg
                  </Text>
                </View>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.cardFooter}>
              {item.synced && (
                <View style={styles.syncBadge}>
                  <Ionicons name="cloud-done" size={12} color="#10b981" />
                  <Text style={[styles.syncText, { color: '#10b981' }]}>Sync</Text>
                </View>
              )}
              <View style={{ flex: 1 }} />
              <Pressable
                style={({ pressed }) => [
                  styles.viewBtn,
                  { opacity: pressed ? 0.8 : 1 }
                ]}
              >
                <LinearGradient
                  colors={statusGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.viewBtnGradient}
                >
                  <Text style={styles.viewBtnText}>Voir détails</Text>
                  <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Animated.View>
    );
  };

  // Section header component
  const SectionHeader: React.FC<{ title: string; count: number }> = ({ title, count }) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        <View style={[styles.sectionDot, { backgroundColor: '#10b981' }]} />
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>{title}</Text>
      </View>
      <View style={[styles.sectionBadge, { backgroundColor: '#10b98120' }]}>
        <Text style={[styles.sectionBadgeText, { color: '#10b981' }]}>{count}</Text>
      </View>
    </View>
  );

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
    const searchFilter = searchQuery.trim().toLowerCase();

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

      if (!searchFilter) {
        return true;
      }

      // Search in title and exercises
      const titleMatch = item.title.toLowerCase().includes(searchFilter);
      const exerciseMatch = item.exercises.some((exerciseId) =>
        exerciseId.toLowerCase().includes(searchFilter)
      );

      return titleMatch || exerciseMatch;
    });

    setFiltered(filteredItems);
  }, [data, period, searchQuery]);

  const content = useMemo(() => {
    if (isLoading) {
      return <LoadingState message="Chargement de l'historique..." />;
    }

    if (error) {
      return <ErrorState message={error} onRetry={load} />;
    }

    if (!filtered.length) {
      return (
        <View style={styles.emptyState}>
          <LinearGradient
            colors={['#10b981', '#059669']}
            style={styles.emptyIcon}
          >
            <Ionicons name="calendar-outline" size={48} color="#FFFFFF" />
          </LinearGradient>
          <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
            Aucune séance trouvée
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
            {searchQuery ? 'Essaie une autre recherche' : 'Crée ta première séance pour commencer'}
          </Text>
          {!searchQuery && (
            <Pressable
              style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
              onPress={() => router.push('/create')}
            >
              <LinearGradient
                colors={['#10b981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.emptyBtn}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
                <Text style={styles.emptyBtnText}>Nouvelle séance</Text>
              </LinearGradient>
            </Pressable>
          )}
        </View>
      );
    }

    return (
      <FlatList
        data={filtered}
        keyExtractor={(item) => `${item.id}-${item.client_id ?? 'local'}`}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#10b981"
          />
        }
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 24 }]}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListHeaderComponent={
          <>
            {showCharts && weeklyData.length > 0 && (
              <Pressable 
                style={[styles.chartCard, { backgroundColor: theme.colors.surface }]}
                onPress={() => setShowCharts(!showCharts)}
              >
                <View style={styles.chartHeader}>
                  <View style={styles.chartTitleRow}>
                    <LinearGradient
                      colors={['#10b981', '#059669']}
                      style={styles.chartIcon}
                    >
                      <Ionicons name="trending-up" size={16} color="#FFFFFF" />
                    </LinearGradient>
                    <Text style={[styles.chartTitle, { color: theme.colors.textPrimary }]}>
                      Progression hebdomadaire
                    </Text>
                  </View>
                  <View style={[styles.chartBadge, { backgroundColor: '#10b98120' }]}>
                    <Ionicons name="stats-chart" size={12} color="#10b981" />
                    <Text style={[styles.chartBadgeText, { color: '#10b981' }]}>Stable</Text>
                  </View>
                </View>
                <HistoryProgressChart
                  data={weeklyData}
                  title=""
                  unit="kg"
                  type="volume"
                />
              </Pressable>
            )}
            {showCharts && rawWorkouts.length > 0 && (
              <View style={[styles.chartCard, { backgroundColor: theme.colors.surface }]}>
                <View style={styles.chartHeader}>
                  <View style={styles.chartTitleRow}>
                    <LinearGradient
                      colors={['#8b5cf6', '#7c3aed']}
                      style={styles.chartIcon}
                    >
                      <Ionicons name="barbell" size={16} color="#FFFFFF" />
                    </LinearGradient>
                    <Text style={[styles.chartTitle, { color: theme.colors.textPrimary }]}>
                      Charges par exercice
                    </Text>
                  </View>
                </View>
                <ExerciseChargesChart
                  workouts={rawWorkouts}
                  title=""
                />
              </View>
            )}

            {/* Section headers with grouped data */}
            {Object.entries(groupedData).length > 0 && (
              <Text style={[styles.resultsCount, { color: theme.colors.textSecondary }]}>
                {filtered.length} séance{filtered.length > 1 ? 's' : ''} trouvée{filtered.length > 1 ? 's' : ''}
              </Text>
            )}
          </>
        }
      />
    );
  }, [error, filtered, isLoading, onRefresh, renderItem, refreshing, load, weeklyData, rawWorkouts, showCharts, theme, searchQuery, insets.bottom, groupedData, router]);

  const gradientColors: [string, string, string] = isDark 
    ? ['#0d1a14', '#0d1510', '#0f1218'] 
    : ['#ecfdf5', '#d1fae5', '#F7F8FA'];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Modern Header */}
      <LinearGradient
        colors={gradientColors}
        style={[styles.heroGradient, { paddingTop: insets.top }]}
      >
        {/* Decorative circles */}
        <View style={[styles.decorCircle1, { backgroundColor: '#10b98110' }]} />
        <View style={[styles.decorCircle2, { backgroundColor: '#10b98108' }]} />

        <Animated.View
          style={[
            styles.heroContent,
            {
              opacity: headerAnim,
              transform: [
                { translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) },
              ],
            },
          ]}
        >
          {/* Top bar */}
          <View style={styles.topBar}>
            <Pressable
              style={({ pressed }) => [
                styles.backBtn,
                { backgroundColor: theme.colors.surface, opacity: pressed ? 0.6 : 1 },
              ]}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={20} color={theme.colors.textPrimary} />
            </Pressable>

            <View style={styles.titleBlock}>
              <Text style={[styles.screenTitle, { color: theme.colors.textPrimary }]}>
                Historique
              </Text>
              <Text style={[styles.screenSubtitle, { color: theme.colors.textSecondary }]}>
                {stats.completed} séances terminées
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.chartToggleBtn,
                { 
                  backgroundColor: showCharts ? '#10b98120' : theme.colors.surface,
                  opacity: pressed ? 0.6 : 1,
                },
              ]}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setShowCharts(!showCharts);
              }}
            >
              <Ionicons 
                name={showCharts ? 'stats-chart' : 'stats-chart-outline'} 
                size={18} 
                color={showCharts ? '#10b981' : theme.colors.textSecondary} 
              />
            </Pressable>
          </View>

          {/* Search bar */}
          <Animated.View
            style={[
              styles.searchContainer,
              {
                backgroundColor: theme.colors.surface,
                borderColor: searchFocusAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [theme.colors.border, '#10b981'],
                }),
              },
            ]}
          >
            <Ionicons name="search-outline" size={18} color={theme.colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.textPrimary }]}
              placeholder="Rechercher une séance..."
              placeholderTextColor={theme.colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => handleSearchFocus(true)}
              onBlur={() => handleSearchFocus(false)}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color={theme.colors.textSecondary} />
              </Pressable>
            )}
          </Animated.View>

          {/* Stats row */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statsScrollContent}
          >
            <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
              <LinearGradient colors={['#10b981', '#059669']} style={styles.statIcon}>
                <Ionicons name="trophy" size={16} color="#FFFFFF" />
              </LinearGradient>
              <View>
                <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
                  {stats.completed}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Terminées
                </Text>
              </View>
            </View>

            <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
              <LinearGradient colors={['#06b6d4', '#0891b2']} style={styles.statIcon}>
                <Ionicons name="fitness" size={16} color="#FFFFFF" />
              </LinearGradient>
              <View>
                <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
                  {Math.round(stats.totalVolume / 1000)}k
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  kg total
                </Text>
              </View>
            </View>

            <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
              <LinearGradient colors={['#8b5cf6', '#7c3aed']} style={styles.statIcon}>
                <Ionicons name="barbell" size={16} color="#FFFFFF" />
              </LinearGradient>
              <View>
                <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
                  {stats.totalExercises}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Exercices
                </Text>
              </View>
            </View>

            <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
              <LinearGradient colors={['#ec4899', '#db2777']} style={styles.statIcon}>
                <Ionicons name="layers" size={16} color="#FFFFFF" />
              </LinearGradient>
              <View>
                <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
                  {stats.totalSets}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Séries
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Period filters */}
          <View style={[styles.periodFilters, { backgroundColor: theme.colors.surface }]}>
            {(['all', 'month', 'week'] as const).map((p) => {
              const isActive = period === p;
              const label = p === 'all' ? 'Tout' : p === 'month' ? '30 jours' : '7 jours';
              
              return (
                <Pressable
                  key={p}
                  style={[
                    styles.periodTab,
                    isActive && { backgroundColor: '#10b981' },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setPeriod(p);
                  }}
                >
                  <Text
                    style={[
                      styles.periodTabText,
                      { color: isActive ? '#FFFFFF' : theme.colors.textSecondary },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </LinearGradient>

      {/* Content */}
      <Animated.View
        style={[
          styles.contentContainer,
          {
            opacity: contentAnim,
            transform: [
              { translateY: contentAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
            ],
          },
        ]}
      >
        {content}
      </Animated.View>
    </View>
  );
};

export default HistoryScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroGradient: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    overflow: 'hidden',
  },
  decorCircle1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  heroContent: {
    gap: 14,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  titleBlock: {
    flex: 1,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  chartToggleBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    padding: 0,
  },
  statsScrollContent: {
    gap: 10,
    paddingRight: 4,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    minWidth: 110,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  periodFilters: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 14,
    gap: 4,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  periodTabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  contentContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  resultsCount: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chartCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  chartTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  chartIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  chartBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  chartBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  sectionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sectionBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardAccent: {
    height: 4,
    width: '100%',
  },
  cardContent: {
    padding: 16,
    gap: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleBlock: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  cardTimeAgo: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  cardStatsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  cardStatItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  cardStatIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardStatValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  cardStatLabel: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#10b98115',
  },
  syncText: {
    fontSize: 11,
    fontWeight: '700',
  },
  viewBtn: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  viewBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  viewBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
    gap: 16,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  emptyBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
