import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  Easing,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useAppTheme } from '@/theme/ThemeProvider';
import { useWorkouts } from '@/hooks/useWorkouts';
import { formatDate } from '@/utils/formatting';
import { EXERCISE_CATALOG } from '@/src/data/exercises';

export default function LibraryScreen() {
  const { theme, mode } = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ filter?: string }>();
  const { workouts, deleteWorkout } = useWorkouts();

  const [activeFilter, setActiveFilter] = useState<'draft' | 'completed'>(
    params.filter === 'completed' ? 'completed' : 'draft'
  );

  // Animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;

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

  const filteredWorkouts = useMemo(() => {
    if (activeFilter === 'draft') {
      return workouts
        .filter((item) => item.workout.status !== 'completed')
        .sort((a, b) => b.workout.updated_at - a.workout.updated_at);
    }
    return workouts
      .filter((item) => item.workout.status === 'completed')
      .sort((a, b) => b.workout.updated_at - a.workout.updated_at);
  }, [workouts, activeFilter]);

  const stats = useMemo(() => {
    const drafts = workouts.filter((w) => w.workout.status !== 'completed').length;
    const completed = workouts.filter((w) => w.workout.status === 'completed').length;
    return { drafts, completed };
  }, [workouts]);

  const handleFilterChange = (filter: 'draft' | 'completed') => {
    Haptics.selectionAsync().catch(() => {});
    setActiveFilter(filter);
  };

  const handleWorkoutPress = (workoutId: number) => {
    Haptics.selectionAsync().catch(() => {});
    if (activeFilter === 'draft') {
      router.push(`/track/${workoutId}`);
    } else {
      router.push(`/history/${workoutId}`);
    }
  };

  const handleDelete = (workoutId: number, title: string) => {
    Alert.alert(
      'Supprimer la séance',
      `Veux-tu vraiment supprimer "${title || 'Sans titre'}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            deleteWorkout(workoutId);
          },
        },
      ]
    );
  };

  const isDark = mode === 'dark';
  
  // Couleurs différentes selon le filtre actif
  const filterColors = {
    draft: {
      gradient: isDark ? ['#1f1a0d', '#0f1218', '#0f1218'] : ['#fef3c7', '#fde68a', '#F7F8FA'],
      accent: '#f59e0b', // Orange/Amber
      accentLight: '#f59e0b20',
    },
    completed: {
      gradient: isDark ? ['#0d1f0d', '#0f1218', '#0f1218'] : ['#d1fae5', '#a7f3d0', '#F7F8FA'],
      accent: '#10b981', // Vert/Emerald
      accentLight: '#10b98120',
    },
  };
  
  const currentColors = filterColors[activeFilter];
  const gradientColors = currentColors.gradient;

  // Composant WorkoutCard
  const WorkoutCard: React.FC<{
    item: (typeof workouts)[number];
    index: number;
  }> = ({ item, index }) => {
    const cardAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.spring(cardAnim, {
        toValue: 1,
        delay: index * 60,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    }, [cardAnim, index]);

    const exercises = item.exercises.slice(0, 4).map((ex) => {
      const catalog = EXERCISE_CATALOG.find((c) => c.id === ex.exercise_id);
      return {
        name: catalog?.name || ex.exercise_id.replace(/-/g, ' '),
        muscle: catalog?.muscleGroupFr || catalog?.muscleGroup || '',
      };
    });

    const totalSets = item.exercises.reduce((sum, ex) => sum + (ex.sets?.length || 0), 0);
    const isCompleted = item.workout.status === 'completed';
    const cardColor = isCompleted ? filterColors.completed.accent : filterColors.draft.accent;
    const cardColorLight = isCompleted ? filterColors.completed.accentLight : filterColors.draft.accentLight;

    return (
      <Animated.View
        style={{
          opacity: cardAnim,
          transform: [
            { translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) },
            { scale: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) },
          ],
        }}
      >
        <Pressable
          style={({ pressed }) => [
            styles.workoutCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: cardColor + '30',
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}
          onPress={() => handleWorkoutPress(item.workout.id)}
        >
          {/* Barre de couleur en haut */}
          <View style={[styles.cardColorBar, { backgroundColor: cardColor }]} />
          
          {/* Header de la carte */}
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.cardIcon,
                { backgroundColor: cardColorLight },
              ]}
            >
              <Ionicons
                name={isCompleted ? 'checkmark-circle' : 'document-text'}
                size={24}
                color={cardColor}
              />
            </View>
            <View style={styles.cardTitleContainer}>
              <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                {item.workout.title || 'Sans titre'}
              </Text>
              <View style={styles.cardMetaRow}>
                <View style={[styles.cardMetaChip, { backgroundColor: theme.colors.surfaceMuted }]}>
                  <Ionicons name="calendar-outline" size={12} color={theme.colors.textSecondary} />
                  <Text style={[styles.cardMetaText, { color: theme.colors.textSecondary }]}>
                    {formatDate(item.workout.updated_at)}
                  </Text>
                </View>
                <View style={[styles.cardMetaChip, { backgroundColor: theme.colors.surfaceMuted }]}>
                  <Ionicons name="barbell-outline" size={12} color={theme.colors.textSecondary} />
                  <Text style={[styles.cardMetaText, { color: theme.colors.textSecondary }]}>
                    {item.exercises.length} exo{item.exercises.length > 1 ? 's' : ''}
                  </Text>
                </View>
                <View style={[styles.cardMetaChip, { backgroundColor: theme.colors.surfaceMuted }]}>
                  <Ionicons name="layers-outline" size={12} color={theme.colors.textSecondary} />
                  <Text style={[styles.cardMetaText, { color: theme.colors.textSecondary }]}>
                    {totalSets} série{totalSets > 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Liste des exercices */}
          {exercises.length > 0 && (
            <View style={styles.exercisesList}>
              {exercises.map((ex, idx) => (
                <View key={idx} style={styles.exerciseRow}>
                  <View style={[styles.exerciseDot, { backgroundColor: cardColor }]} />
                  <Text
                    style={[styles.exerciseName, { color: theme.colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {ex.name}
                  </Text>
                  {ex.muscle && (
                    <Text style={[styles.exerciseMuscle, { color: theme.colors.textSecondary }]}>
                      {ex.muscle}
                    </Text>
                  )}
                </View>
              ))}
              {item.exercises.length > 4 && (
                <Text style={[styles.moreExercises, { color: theme.colors.textSecondary }]}>
                  +{item.exercises.length - 4} exercice{item.exercises.length - 4 > 1 ? 's' : ''}
                </Text>
              )}
            </View>
          )}

          {/* Actions */}
          <View style={[styles.cardActions, { borderTopColor: cardColor + '20' }]}>
            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                styles.actionBtnSecondary,
                { borderColor: theme.colors.border, opacity: pressed ? 0.6 : 1 },
              ]}
              onPress={() => handleDelete(item.workout.id, item.workout.title)}
            >
              <Ionicons name="trash-outline" size={16} color={theme.colors.error} />
              <Text style={[styles.actionBtnText, { color: theme.colors.error }]}>Supprimer</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: cardColor, opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={() => handleWorkoutPress(item.workout.id)}
            >
              <Ionicons name={isCompleted ? 'eye' : 'play'} size={16} color="#FFFFFF" />
              <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>
                {isCompleted ? 'Consulter' : 'Démarrer'}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Hero Header */}
      <LinearGradient
        colors={gradientColors as [string, string, ...string[]]}
        style={[styles.heroGradient, { paddingTop: insets.top }]}
      >
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
            <View style={styles.topBarTitle}>
              <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
                Bibliothèque
              </Text>
            </View>
            <View style={{ width: 44 }} />
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
              <View style={[styles.statIcon, { backgroundColor: theme.colors.warning + '20' }]}>
                <Ionicons name="document-text" size={20} color={theme.colors.warning} />
              </View>
              <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>{stats.drafts}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Brouillons</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
              <View style={[styles.statIcon, { backgroundColor: theme.colors.primaryMuted + '20' }]}>
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.primaryMuted} />
              </View>
              <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>{stats.completed}</Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Terminées</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
              <View style={[styles.statIcon, { backgroundColor: theme.colors.accent + '20' }]}>
                <Ionicons name="library" size={20} color={theme.colors.accent} />
              </View>
              <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
                {stats.drafts + stats.completed}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Total</Text>
            </View>
          </View>

          {/* Filtres */}
          <View style={[styles.filters, { backgroundColor: theme.colors.surface }]}>
            <Pressable
              style={({ pressed }) => [
                styles.filterTab,
                activeFilter === 'draft' && styles.filterTabActive,
                {
                  backgroundColor: activeFilter === 'draft' ? filterColors.draft.accent : 'transparent',
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              onPress={() => handleFilterChange('draft')}
            >
              <Ionicons
                name="document-text-outline"
                size={18}
                color={activeFilter === 'draft' ? '#FFFFFF' : theme.colors.textSecondary}
              />
              <Text
                style={[
                  styles.filterTabText,
                  { color: activeFilter === 'draft' ? '#FFFFFF' : theme.colors.textPrimary },
                ]}
              >
                Brouillons
              </Text>
              {stats.drafts > 0 && (
                <View
                  style={[
                    styles.filterBadge,
                    {
                      backgroundColor: activeFilter === 'draft' ? 'rgba(255,255,255,0.25)' : filterColors.draft.accentLight,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterBadgeText,
                      { color: activeFilter === 'draft' ? '#FFFFFF' : filterColors.draft.accent },
                    ]}
                  >
                    {stats.drafts}
                  </Text>
                </View>
              )}
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.filterTab,
                activeFilter === 'completed' && styles.filterTabActive,
                {
                  backgroundColor: activeFilter === 'completed' ? filterColors.completed.accent : 'transparent',
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              onPress={() => handleFilterChange('completed')}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={18}
                color={activeFilter === 'completed' ? '#FFFFFF' : theme.colors.textSecondary}
              />
              <Text
                style={[
                  styles.filterTabText,
                  { color: activeFilter === 'completed' ? '#FFFFFF' : theme.colors.textPrimary },
                ]}
              >
                Terminées
              </Text>
              {stats.completed > 0 && (
                <View
                  style={[
                    styles.filterBadge,
                    {
                      backgroundColor: activeFilter === 'completed' ? 'rgba(255,255,255,0.25)' : filterColors.completed.accentLight,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterBadgeText,
                      { color: activeFilter === 'completed' ? '#FFFFFF' : filterColors.completed.accent },
                    ]}
                  >
                    {stats.completed}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
        </Animated.View>
      </LinearGradient>

      {/* Liste */}
      <Animated.View
        style={[
          styles.listContainer,
          {
            opacity: contentAnim,
            transform: [{ translateY: contentAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
          },
        ]}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {filteredWorkouts.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: currentColors.accentLight }]}>
                <Ionicons
                  name={activeFilter === 'draft' ? 'document-text-outline' : 'trophy-outline'}
                  size={48}
                  color={currentColors.accent}
                />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
                {activeFilter === 'draft' ? 'Aucun brouillon' : 'Aucune séance terminée'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                {activeFilter === 'draft'
                  ? 'Crée une nouvelle séance depuis l\'accueil'
                  : 'Termine une séance pour la voir apparaître ici'}
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.emptyBtn,
                  { backgroundColor: currentColors.accent, opacity: pressed ? 0.8 : 1 },
                ]}
                onPress={() => router.back()}
              >
                <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
                <Text style={styles.emptyBtnText}>Retour à l&apos;accueil</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Text style={[styles.listHeader, { color: theme.colors.textSecondary }]}>
                {filteredWorkouts.length} séance{filteredWorkouts.length > 1 ? 's' : ''}{' '}
                {activeFilter === 'draft' ? 'en cours' : 'terminée' + (filteredWorkouts.length > 1 ? 's' : '')}
              </Text>
              {filteredWorkouts.map((item, index) => (
                <WorkoutCard key={item.workout.id} item={item} index={index} />
              ))}
            </>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroGradient: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  heroContent: {
    gap: 16,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    gap: 6,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filters: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 16,
    gap: 4,
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  filterTabActive: {},
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  filterBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  listContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  listHeader: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  workoutCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  cardColorBar: {
    height: 4,
    width: '100%',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    gap: 14,
  },
  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleContainer: {
    flex: 1,
    gap: 8,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  cardMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  cardMetaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cardMetaText: {
    fontSize: 11,
    fontWeight: '600',
  },
  exercisesList: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  exerciseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  exerciseName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  exerciseMuscle: {
    fontSize: 12,
    fontWeight: '500',
  },
  moreExercises: {
    fontSize: 12,
    fontWeight: '600',
    fontStyle: 'italic',
    marginLeft: 16,
    marginTop: 4,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionBtnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
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
    fontWeight: '700',
    textAlign: 'center',
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
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  emptyBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
