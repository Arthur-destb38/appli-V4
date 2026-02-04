import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  Easing,
  Alert,
  Platform,
  TextInput,
  Dimensions,
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Helper pour les alertes cross-platform
const showConfirm = (
  title: string,
  message: string,
  onConfirm: () => void
) => {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: onConfirm },
    ]);
  }
};

// Grouper les workouts par période
const getTimePeriod = (timestamp: number): string => {
  const now = Date.now();
  const date = new Date(timestamp);
  const today = new Date();
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

export default function LibraryScreen() {
  const { theme, mode } = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ filter?: string }>();
  const { workouts, deleteWorkout } = useWorkouts();

  const [activeFilter, setActiveFilter] = useState<'draft' | 'completed'>(
    params.filter === 'completed' ? 'completed' : 'draft'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');

  // Animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;
  const searchFocusAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

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

    // Pulse animation for FAB
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Shimmer animation for header
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [headerAnim, contentAnim, pulseAnim, shimmerAnim]);

  const filteredWorkouts = useMemo(() => {
    let filtered = activeFilter === 'draft'
      ? workouts.filter((item) => item.workout.status !== 'completed')
      : workouts.filter((item) => item.workout.status === 'completed');

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item) => {
        const title = (item.workout.title || '').toLowerCase();
        const exerciseNames = item.exercises.map((ex) => {
          const catalog = EXERCISE_CATALOG.find((c) => c.id === ex.exercise_id);
          return (catalog?.name || ex.exercise_id).toLowerCase();
        });
        return title.includes(query) || exerciseNames.some((name) => name.includes(query));
      });
    }

    // Sort
    if (sortBy === 'date') {
      filtered.sort((a, b) => b.workout.updated_at - a.workout.updated_at);
    } else {
      filtered.sort((a, b) => (a.workout.title || '').localeCompare(b.workout.title || ''));
    }

    return filtered;
  }, [workouts, activeFilter, searchQuery, sortBy]);

  // Group workouts by time period
  const groupedWorkouts = useMemo(() => {
    const groups: { [key: string]: typeof filteredWorkouts } = {};
    filteredWorkouts.forEach((item) => {
      const period = getTimePeriod(item.workout.updated_at);
      if (!groups[period]) groups[period] = [];
      groups[period].push(item);
    });
    return groups;
  }, [filteredWorkouts]);

  const stats = useMemo(() => {
    const drafts = workouts.filter((w) => w.workout.status !== 'completed').length;
    const completed = workouts.filter((w) => w.workout.status === 'completed').length;
    const totalExercises = workouts.reduce((sum, w) => sum + w.exercises.length, 0);
    const totalSets = workouts.reduce(
      (sum, w) => sum + w.exercises.reduce((s, ex) => s + (ex.sets?.length || 0), 0),
      0
    );
    return { drafts, completed, totalExercises, totalSets };
  }, [workouts]);

  const handleFilterChange = useCallback((filter: 'draft' | 'completed') => {
    Haptics.selectionAsync().catch(() => {});
    setActiveFilter(filter);
  }, []);

  const handleWorkoutPress = useCallback((workoutId: number) => {
    Haptics.selectionAsync().catch(() => {});
    if (activeFilter === 'draft') {
      router.push(`/track/${workoutId}`);
    } else {
      router.push(`/history/${workoutId}`);
    }
  }, [activeFilter, router]);

  const handleDelete = useCallback((workoutId: number, title: string) => {
    showConfirm(
      'Supprimer la séance',
      `Veux-tu vraiment supprimer "${title || 'Sans titre'}" ?`,
      () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        deleteWorkout(workoutId);
      }
    );
  }, [deleteWorkout]);

  const handleSearchFocus = useCallback((focused: boolean) => {
    Animated.spring(searchFocusAnim, {
      toValue: focused ? 1 : 0,
      useNativeDriver: false,
      tension: 50,
      friction: 8,
    }).start();
  }, [searchFocusAnim]);

  const isDark = mode === 'dark';
  
  // Couleurs différentes selon le filtre actif
  const filterColors = {
    draft: {
      gradient: isDark 
        ? ['#1a1510', '#15120d', '#0f1218'] 
        : ['#fef7ed', '#fef3c7', '#F7F8FA'],
      accent: '#f59e0b',
      accentLight: '#f59e0b20',
      accentGradient: ['#f59e0b', '#d97706'] as [string, string],
    },
    completed: {
      gradient: isDark 
        ? ['#0d1a14', '#0d1510', '#0f1218'] 
        : ['#ecfdf5', '#d1fae5', '#F7F8FA'],
      accent: '#10b981',
      accentLight: '#10b98120',
      accentGradient: ['#10b981', '#059669'] as [string, string],
    },
  };
  
  const currentColors = filterColors[activeFilter];
  const gradientColors = currentColors.gradient;

  // Composant WorkoutCard amélioré
  const WorkoutCard: React.FC<{
    item: (typeof workouts)[number];
    index: number;
  }> = ({ item, index }) => {
    const cardAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
      Animated.spring(cardAnim, {
        toValue: 1,
        delay: index * 80,
        useNativeDriver: true,
        tension: 40,
        friction: 7,
      }).start();
    }, [cardAnim, index]);

    const exercises = item.exercises.slice(0, 3).map((ex) => {
      const catalog = EXERCISE_CATALOG.find((c) => c.id === ex.exercise_id);
      return {
        name: catalog?.name || ex.exercise_id.replace(/-/g, ' '),
        muscle: catalog?.muscleGroupFr || catalog?.muscleGroup || '',
        sets: ex.sets?.length || 0,
      };
    });

    const totalSets = item.exercises.reduce((sum, ex) => sum + (ex.sets?.length || 0), 0);
    const completedSets = item.exercises.reduce(
      (sum, ex) => sum + (ex.sets?.filter((s: any) => s.completed).length || 0),
      0
    );
    const progress = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;
    const isCompleted = item.workout.status === 'completed';
    const cardColor = isCompleted ? filterColors.completed.accent : filterColors.draft.accent;
    const cardGradient = isCompleted ? filterColors.completed.accentGradient : filterColors.draft.accentGradient;

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

    // Formatted time ago
    const getTimeAgo = (timestamp: number) => {
      const diff = Date.now() - timestamp;
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);
      if (minutes < 60) return `il y a ${minutes}min`;
      if (hours < 24) return `il y a ${hours}h`;
      if (days < 7) return `il y a ${days}j`;
      return formatDate(timestamp);
    };

    return (
      <Animated.View
        style={{
          opacity: cardAnim,
          transform: [
            { translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) },
            { scale: Animated.multiply(cardAnim, scaleAnim) },
          ],
        }}
      >
        <Pressable
          style={[styles.workoutCard, { backgroundColor: theme.colors.surface }]}
          onPress={() => handleWorkoutPress(item.workout.id)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          {/* Gradient accent bar */}
          <LinearGradient
            colors={cardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.cardAccentBar}
          />
          
          {/* Main content */}
          <View style={styles.cardContent}>
            {/* Header row */}
            <View style={styles.cardHeaderRow}>
              <LinearGradient
                colors={[cardColor + '30', cardColor + '15']}
                style={styles.cardIconWrapper}
              >
                <Ionicons
                  name={isCompleted ? 'checkmark-done' : 'flash'}
                  size={22}
                  color={cardColor}
                />
              </LinearGradient>
              
              <View style={styles.cardTitleBlock}>
                <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                  {item.workout.title || 'Sans titre'}
                </Text>
                <Text style={[styles.cardTimeAgo, { color: theme.colors.textSecondary }]}>
                  {getTimeAgo(item.workout.updated_at)}
                </Text>
              </View>

              <View style={[styles.statusBadge, { backgroundColor: cardColor + '20' }]}>
                <View style={[styles.statusDot, { backgroundColor: cardColor }]} />
                <Text style={[styles.statusText, { color: cardColor }]}>
                  {isCompleted ? 'Terminé' : 'En cours'}
                </Text>
              </View>
            </View>

            {/* Progress bar for drafts */}
            {!isCompleted && totalSets > 0 && (
              <View style={styles.progressSection}>
                <View style={[styles.progressBarBg, { backgroundColor: theme.colors.surfaceMuted }]}>
                  <LinearGradient
                    colors={cardGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.progressBarFill, { width: `${progress}%` }]}
                  />
                </View>
                <Text style={[styles.progressText, { color: theme.colors.textSecondary }]}>
                  {completedSets}/{totalSets} séries
                </Text>
              </View>
            )}

            {/* Exercise pills */}
            {exercises.length > 0 && (
              <View style={styles.exercisePills}>
                {exercises.map((ex, idx) => (
                  <View
                    key={idx}
                    style={[styles.exercisePill, { backgroundColor: theme.colors.surfaceMuted }]}
                  >
                    <View style={[styles.exercisePillDot, { backgroundColor: cardColor }]} />
                    <Text
                      style={[styles.exercisePillText, { color: theme.colors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {ex.name}
                    </Text>
                    <Text style={[styles.exercisePillSets, { color: cardColor }]}>
                      {ex.sets}×
                    </Text>
                  </View>
                ))}
                {item.exercises.length > 3 && (
                  <View style={[styles.morePill, { backgroundColor: cardColor + '20' }]}>
                    <Text style={[styles.morePillText, { color: cardColor }]}>
                      +{item.exercises.length - 3}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Stats row */}
            <View style={styles.cardStatsRow}>
              <View style={styles.cardStat}>
                <Ionicons name="barbell-outline" size={14} color={theme.colors.textSecondary} />
                <Text style={[styles.cardStatText, { color: theme.colors.textSecondary }]}>
                  {item.exercises.length} exercice{item.exercises.length > 1 ? 's' : ''}
                </Text>
              </View>
              <View style={[styles.cardStatDivider, { backgroundColor: theme.colors.border }]} />
              <View style={styles.cardStat}>
                <Ionicons name="layers-outline" size={14} color={theme.colors.textSecondary} />
                <Text style={[styles.cardStatText, { color: theme.colors.textSecondary }]}>
                  {totalSets} série{totalSets > 1 ? 's' : ''}
                </Text>
              </View>
              {isCompleted && (
                <>
                  <View style={[styles.cardStatDivider, { backgroundColor: theme.colors.border }]} />
                  <View style={styles.cardStat}>
                    <Ionicons name="trophy-outline" size={14} color={cardColor} />
                    <Text style={[styles.cardStatText, { color: cardColor }]}>Complété</Text>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* Action buttons */}
          <View style={[styles.cardActionsNew, { borderTopColor: theme.colors.border }]}>
            <Pressable
              style={({ pressed }) => [
                styles.actionBtnNew,
                { opacity: pressed ? 0.6 : 1 },
              ]}
              onPress={() => handleDelete(item.workout.id, item.workout.title)}
            >
              <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
            </Pressable>
            
            <Pressable
              style={({ pressed }) => [styles.mainActionBtn, { opacity: pressed ? 0.9 : 1 }]}
              onPress={() => handleWorkoutPress(item.workout.id)}
            >
              <LinearGradient
                colors={cardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.mainActionGradient}
              >
                <Ionicons name={isCompleted ? 'eye' : 'play'} size={16} color="#FFFFFF" />
                <Text style={styles.mainActionText}>
                  {isCompleted ? 'Consulter' : 'Démarrer'}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
              </LinearGradient>
            </Pressable>
          </View>
        </Pressable>
      </Animated.View>
    );
  };

  // Composant SectionHeader
  const SectionHeader: React.FC<{ title: string; count: number }> = ({ title, count }) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        <View style={[styles.sectionDot, { backgroundColor: currentColors.accent }]} />
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>{title}</Text>
      </View>
      <View style={[styles.sectionBadge, { backgroundColor: currentColors.accentLight }]}>
        <Text style={[styles.sectionBadgeText, { color: currentColors.accent }]}>{count}</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Modern Hero Header */}
      <LinearGradient
        colors={gradientColors as [string, string, ...string[]]}
        style={[styles.heroGradient, { paddingTop: insets.top }]}
      >
        {/* Decorative elements */}
        <Animated.View 
          style={[
            styles.decorCircle1, 
            { 
              backgroundColor: currentColors.accent + '10',
              transform: [{
                translateX: shimmerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 20],
                }),
              }],
            }
          ]} 
        />
        <View style={[styles.decorCircle2, { backgroundColor: currentColors.accent + '08' }]} />

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
                { 
                  backgroundColor: theme.colors.surface,
                  opacity: pressed ? 0.6 : 1,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3,
                },
              ]}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={20} color={theme.colors.textPrimary} />
            </Pressable>
            
            <View style={styles.topBarTitleContainer}>
              <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
                Ma Bibliothèque
              </Text>
              <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
                {stats.drafts + stats.completed} séances au total
              </Text>
            </View>
            
            <Pressable
              style={({ pressed }) => [
                styles.sortBtn,
                { 
                  backgroundColor: theme.colors.surface,
                  opacity: pressed ? 0.6 : 1,
                },
              ]}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setSortBy(sortBy === 'date' ? 'name' : 'date');
              }}
            >
              <Ionicons 
                name={sortBy === 'date' ? 'time-outline' : 'text-outline'} 
                size={18} 
                color={theme.colors.textSecondary} 
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
                  outputRange: [theme.colors.border, currentColors.accent],
                }),
                shadowColor: currentColors.accent,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: searchFocusAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.15],
                }),
                shadowRadius: 12,
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

          {/* Stats cards - horizontal scroll */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statsScrollContent}
          >
            <View style={[styles.statCardNew, { backgroundColor: theme.colors.surface }]}>
              <LinearGradient
                colors={filterColors.draft.accentGradient}
                style={styles.statIconNew}
              >
                <Ionicons name="flash" size={18} color="#FFFFFF" />
              </LinearGradient>
              <View style={styles.statTextBlock}>
                <Text style={[styles.statValueNew, { color: theme.colors.textPrimary }]}>{stats.drafts}</Text>
                <Text style={[styles.statLabelNew, { color: theme.colors.textSecondary }]}>En cours</Text>
              </View>
            </View>
            
            <View style={[styles.statCardNew, { backgroundColor: theme.colors.surface }]}>
              <LinearGradient
                colors={filterColors.completed.accentGradient}
                style={styles.statIconNew}
              >
                <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
              </LinearGradient>
              <View style={styles.statTextBlock}>
                <Text style={[styles.statValueNew, { color: theme.colors.textPrimary }]}>{stats.completed}</Text>
                <Text style={[styles.statLabelNew, { color: theme.colors.textSecondary }]}>Terminées</Text>
              </View>
            </View>
            
            <View style={[styles.statCardNew, { backgroundColor: theme.colors.surface }]}>
              <LinearGradient
                colors={['#8b5cf6', '#7c3aed']}
                style={styles.statIconNew}
              >
                <Ionicons name="barbell" size={18} color="#FFFFFF" />
              </LinearGradient>
              <View style={styles.statTextBlock}>
                <Text style={[styles.statValueNew, { color: theme.colors.textPrimary }]}>{stats.totalExercises}</Text>
                <Text style={[styles.statLabelNew, { color: theme.colors.textSecondary }]}>Exercices</Text>
              </View>
            </View>
            
            <View style={[styles.statCardNew, { backgroundColor: theme.colors.surface }]}>
              <LinearGradient
                colors={['#ec4899', '#db2777']}
                style={styles.statIconNew}
              >
                <Ionicons name="layers" size={18} color="#FFFFFF" />
              </LinearGradient>
              <View style={styles.statTextBlock}>
                <Text style={[styles.statValueNew, { color: theme.colors.textPrimary }]}>{stats.totalSets}</Text>
                <Text style={[styles.statLabelNew, { color: theme.colors.textSecondary }]}>Séries</Text>
              </View>
            </View>
          </ScrollView>

          {/* Modern Filter tabs */}
          <View style={[styles.filtersNew, { backgroundColor: theme.colors.surface }]}>
            {(['draft', 'completed'] as const).map((filter) => {
              const isActive = activeFilter === filter;
              const colors = filterColors[filter];
              const count = filter === 'draft' ? stats.drafts : stats.completed;
              
              return (
                <Pressable
                  key={filter}
                  style={({ pressed }) => [
                    styles.filterTabNew,
                    { opacity: pressed ? 0.8 : 1 },
                  ]}
                  onPress={() => handleFilterChange(filter)}
                >
                  {isActive && (
                    <LinearGradient
                      colors={colors.accentGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={StyleSheet.absoluteFillObject}
                    />
                  )}
                  <View style={[
                    styles.filterIconCircle,
                    { backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : colors.accentLight }
                  ]}>
                    <Ionicons
                      name={filter === 'draft' ? 'flash' : 'checkmark-done'}
                      size={16}
                      color={isActive ? '#FFFFFF' : colors.accent}
                    />
                  </View>
                  <Text style={[
                    styles.filterTabTextNew,
                    { color: isActive ? '#FFFFFF' : theme.colors.textPrimary }
                  ]}>
                    {filter === 'draft' ? 'En cours' : 'Terminées'}
                  </Text>
                  <View style={[
                    styles.filterCountBadge,
                    { backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : colors.accentLight }
                  ]}>
                    <Text style={[
                      styles.filterCountText,
                      { color: isActive ? '#FFFFFF' : colors.accent }
                    ]}>
                      {count}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </LinearGradient>

      {/* Workout list */}
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
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {filteredWorkouts.length === 0 ? (
            <View style={styles.emptyState}>
              <LinearGradient
                colors={currentColors.accentGradient}
                style={styles.emptyIconGradient}
              >
                <Ionicons
                  name={activeFilter === 'draft' ? 'flash-outline' : 'trophy-outline'}
                  size={48}
                  color="#FFFFFF"
                />
              </LinearGradient>
              <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
                {activeFilter === 'draft' ? 'Aucune séance en cours' : 'Aucune séance terminée'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                {activeFilter === 'draft'
                  ? 'Crée une nouvelle séance pour commencer ton entraînement'
                  : 'Termine une séance pour la voir apparaître ici'}
              </Text>
              {activeFilter === 'draft' && (
                <Pressable
                  style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
                  onPress={() => router.push('/workout/create')}
                >
                  <LinearGradient
                    colors={currentColors.accentGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.emptyBtnGradient}
                  >
                    <Ionicons name="add" size={20} color="#FFFFFF" />
                    <Text style={styles.emptyBtnText}>Nouvelle séance</Text>
                  </LinearGradient>
                </Pressable>
              )}
            </View>
          ) : (
            <>
              {/* Grouped by time period */}
              {Object.entries(groupedWorkouts).map(([period, items]) => (
                <View key={period} style={styles.periodGroup}>
                  <SectionHeader title={period} count={items.length} />
                  {items.map((item, index) => (
                    <WorkoutCard key={item.workout.id} item={item} index={index} />
                  ))}
                </View>
              ))}
            </>
          )}
        </ScrollView>
      </Animated.View>

      {/* Floating Action Button */}
      <Animated.View
        style={[
          styles.fabContainer,
          {
            bottom: insets.bottom + 24,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <Pressable
          style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            router.push('/workout/create');
          }}
        >
          <LinearGradient
            colors={currentColors.accentGradient}
            style={styles.fab}
          >
            <Ionicons name="add" size={28} color="#FFFFFF" />
          </LinearGradient>
        </Pressable>
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
    paddingTop: 12,
    gap: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  sortBtn: {
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
  statCardNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    minWidth: 120,
  },
  statIconNew: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statTextBlock: {
    gap: 1,
  },
  statValueNew: {
    fontSize: 18,
    fontWeight: '800',
  },
  statLabelNew: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  filtersNew: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 16,
    gap: 6,
  },
  filterTabNew: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  filterIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterTabTextNew: {
    fontSize: 13,
    fontWeight: '700',
  },
  filterCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  filterCountText: {
    fontSize: 12,
    fontWeight: '800',
  },
  listContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 8,
  },
  periodGroup: {
    gap: 10,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
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
  workoutCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardAccentBar: {
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
  cardIconWrapper: {
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
  progressSection: {
    gap: 6,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'right',
  },
  exercisePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  exercisePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    maxWidth: '100%',
  },
  exercisePillDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  exercisePillText: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
    flexShrink: 1,
  },
  exercisePillSets: {
    fontSize: 12,
    fontWeight: '700',
  },
  morePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  morePillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cardStatText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardStatDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  cardActionsNew: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  actionBtnNew: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainActionBtn: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  mainActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  mainActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
    gap: 16,
  },
  emptyIconGradient: {
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
  emptyBtnGradient: {
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
  fabContainer: {
    position: 'absolute',
    right: 20,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
});
