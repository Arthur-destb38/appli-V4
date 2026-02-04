import { useRouter } from 'expo-router';
import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  Animated,
  Easing,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

import { EXERCISE_CATALOG } from '@/src/data/exercises';
import { useWorkouts } from '@/hooks/useWorkouts';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { formatDate } from '@/utils/formatting';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useTranslations } from '@/hooks/usePreferences';

import { HeroSection } from '@/components/HeroSection';
import { QuickStatsRow } from '@/components/QuickStatsRow';

import { PersonalStats } from '@/components/PersonalStats';
import { WorkoutCard } from '@/components/WorkoutCard';
import { AppButton } from '@/components/AppButton';

export default function HomeScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { profile } = useUserProfile();
  const { workouts, isLoading, refresh, createDraft, deleteWorkout } = useWorkouts();
  const { theme } = useAppTheme();
  const { t } = useTranslations();
  const [menuOpen, setMenuOpen] = useState(false);
  const [goalSessions, setGoalSessions] = useState(3);
  const [editGoalModal, setEditGoalModal] = useState(false);
  const [goalInput, setGoalInput] = useState('3');
  const drawerAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  // Données par défaut si pas connecté
  const displayWorkouts = workouts || [];
  const displayProfile = profile || { username: 'Utilisateur' };
  const displayUser = user || { username: 'Utilisateur' };

  // Charger l'objectif sauvegardé
  useEffect(() => {
    const loadGoal = async () => {
      try {
        const saved = await AsyncStorage.getItem('goal_sessions_per_week');
        if (saved) {
          const parsed = parseInt(saved, 10);
          if (!isNaN(parsed) && parsed > 0) {
            setGoalSessions(parsed);
          }
        }
      } catch (error) {
        console.warn('Failed to load goal', error);
      }
    };
    loadGoal();
  }, []);

  const handleEditGoal = () => {
    setGoalInput(String(goalSessions));
    setEditGoalModal(true);
  };

  const handleSaveGoal = async () => {
    const parsed = parseInt(goalInput, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 14) {
      Alert.alert(t('error'), t('goalError'));
      return;
    }
    try {
      await AsyncStorage.setItem('goal_sessions_per_week', String(parsed));
      setGoalSessions(parsed);
      setEditGoalModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (error) {
      Alert.alert(t('error'), t('cannotSaveGoal'));
    }
  };

  // Calcul des statistiques
  const stats = useMemo(() => {
    if (!displayWorkouts.length) {
      return {
        total: 0,
        completed: 0,
        drafts: 0,
        completionRate: 0,
        completedThisWeek: 0,
        liftedThisWeek: 0,
        volume7d: 0,
        sessions7d: 0,
        avgVolumeSession: 0,
        prevVolume7d: 0,
        prevSessions7d: 0,
        streak: 0,
      };
    }

    const total = displayWorkouts.length;
    const completed = displayWorkouts.filter((item) => item.workout.status === 'completed');
    const drafts = displayWorkouts.filter((item) => item.workout.status === 'draft');
    const completedThisWeek = completed.filter((item) => {
      const diff = Date.now() - item.workout.updated_at;
      return diff <= 7 * 24 * 60 * 60 * 1000;
    }).length;

    const liftedThisWeek = displayWorkouts.reduce((sum, record) => {
      const isThisWeek = Date.now() - record.workout.updated_at <= 7 * 24 * 60 * 60 * 1000;
      if (!isThisWeek) return sum;
      const sets = record.exercises.flatMap((exercise) => exercise.sets);
      const weeklyWeight = sets.reduce((setSum, set) => {
        if (set && typeof set.weight === 'number' && typeof set.reps === 'number') {
          return setSum + (set.weight ?? 0) * (set.reps ?? 0);
        }
        return setSum;
      }, 0);
      return sum + weeklyWeight;
    }, 0);

    const now = Date.now();
    const last7d = displayWorkouts.filter((w) => now - w.workout.updated_at <= 7 * 24 * 60 * 60 * 1000);
    const prev7d = displayWorkouts.filter(
      (w) =>
        now - w.workout.updated_at > 7 * 24 * 60 * 60 * 1000 &&
        now - w.workout.updated_at <= 14 * 24 * 60 * 60 * 1000
    );

    const calcVolume = (records: typeof displayWorkouts) =>
      records.reduce((sum, record) => {
        const sets = record.exercises.flatMap((ex) => ex.sets || []);
        const vol = sets.reduce((acc, set) => {
          if (!set) return acc;
          const weight = typeof set.weight === 'number' ? set.weight : 0;
          const reps = typeof set.reps === 'number' ? set.reps : 0;
          return acc + weight * reps;
        }, 0);
        return sum + vol;
      }, 0);

    const volume7d = calcVolume(last7d);
    const prevVolume7d = calcVolume(prev7d);
    const sessions7d = last7d.length;
    const prevSessions7d = prev7d.length;
    const avgVolumeSession = sessions7d ? Math.round(volume7d / sessions7d) : 0;

    // Streak calculation
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dayStart = checkDate.getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      
      const hasWorkout = displayWorkouts.some(
        (w) => w.workout.updated_at >= dayStart && w.workout.updated_at < dayEnd
      );
      
      if (hasWorkout) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    return {
      total,
      completed: completed.length,
      drafts: drafts.length,
      completionRate: total ? Math.round((completed.length / total) * 100) : 0,
      completedThisWeek,
      liftedThisWeek,
      volume7d,
      sessions7d,
      avgVolumeSession,
      prevVolume7d,
      prevSessions7d,
      streak,
    };
  }, [displayWorkouts]);



  // Séparer les séances en deux catégories (1 seule sur l'accueil, le reste en historique)
  const latestDraft = useMemo(
    () => workouts
      .filter((item) => item.workout.status !== 'completed')
      .sort((a, b) => b.workout.updated_at - a.workout.updated_at)
      .slice(0, 1),
    [workouts]
  );

  const latestCompleted = useMemo(
    () => workouts
      .filter((item) => item.workout.status === 'completed')
      .sort((a, b) => b.workout.updated_at - a.workout.updated_at)
      .slice(0, 1),
    [workouts]
  );

  // Compteurs pour le drawer
  const totalDrafts = useMemo(
    () => displayWorkouts.filter((item) => item.workout.status !== 'completed').length,
    [displayWorkouts]
  );

  const totalCompleted = useMemo(
    () => displayWorkouts.filter((item) => item.workout.status === 'completed').length,
    [displayWorkouts]
  );

  const quickStats = useMemo(() => {
    const volumeChange = stats.prevVolume7d > 0
      ? Math.round(((stats.volume7d - stats.prevVolume7d) / stats.prevVolume7d) * 100)
      : 0;

    return [
      {
        id: 'objective',
        value: `${stats.completedThisWeek}/${goalSessions}`,
        label: 'Objectif',
        icon: 'checkmark-circle' as const,
        trend: stats.completedThisWeek >= goalSessions ? 'up' : 'neutral' as const,
        color: '#10B981',
        explanation: `Nombre de séances terminées cette semaine par rapport à ton objectif de ${goalSessions} séances par semaine.`,
        editable: true,
        onEdit: handleEditGoal,
      },
      {
        id: 'volume',
        value: stats.volume7d > 1000 ? `${(stats.volume7d / 1000).toFixed(1)}k` : stats.volume7d,
        label: 'Volume (kg)',
        icon: 'barbell' as const,
        trend: volumeChange > 0 ? 'up' : volumeChange < 0 ? 'down' : 'neutral' as const,
        trendValue: volumeChange !== 0 ? `${volumeChange > 0 ? '+' : ''}${volumeChange}%` : undefined,
        color: '#8B5CF6',
        explanation: 'Volume total soulevé cette semaine (poids × répétitions). Compare avec la semaine précédente.',
      },
      {
        id: 'streak',
        value: stats.streak,
        label: 'Streak 🔥',
        icon: 'flame' as const,
        trend: stats.streak >= 7 ? 'up' : 'neutral' as const,
        color: '#F59E0B',
        explanation: 'Nombre de jours consécutifs avec au moins une séance terminée. Continue pour maintenir ta série !',
      },
      {
        id: 'drafts',
        value: stats.drafts,
        label: 'Brouillons',
        icon: 'create-outline' as const,
        color: '#F97316',
        explanation: 'Séances en cours de création ou en attente.',
      },
      {
        id: 'completed',
        value: stats.completed,
        label: 'Terminées',
        icon: 'trophy' as const,
        color: '#22C55E',
        explanation: 'Séances complètement terminées et enregistrées.',
      },
    ];
  }, [stats, goalSessions]);

  const handleCreate = async () => {
    const draft = await createDraft();
    if (draft) {
      router.push(`/create?id=${draft.workout.id}`);
    }
  };

  const handleLaunchNext = async () => {
    const nextWorkout = displayWorkouts.find((item) => item.workout.status !== 'completed');
    if (nextWorkout) {
      router.push(`/track/${nextWorkout.workout.id}`);
    } else {
      await handleCreate();
    }
  };

  const openMenu = () => {
    setMenuOpen(true);
    Animated.timing(drawerAnim, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const closeMenu = () => {
    Animated.timing(drawerAnim, {
      toValue: 0,
      duration: 200,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => setMenuOpen(false));
  };

  const drawerStyle = {
    transform: [
      {
        translateX: drawerAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [280, 0],
        }),
      },
    ],
  };

  const menuItems = [
    { label: 'Progression', route: '/history', icon: 'trending-up-outline' as const },
    { label: 'Mon Programme', route: '/programme', icon: 'calendar-outline' as const },
    { label: 'Paramètres', route: '/settings', icon: 'settings-outline' as const },
  ];

  const actionItems = [
    { label: 'Créer une séance', action: () => handleCreate(), icon: 'add-circle-outline' as const },
    { label: 'Créer un programme', action: () => router.push('/programme/create' as never), icon: 'clipboard-outline' as const },
  ];

  const goTo = (route: string) => {
    closeMenu();
    router.push(route as never);
  };

  const username = displayProfile?.username || 'Champion';
  const volumeTrend = stats.prevVolume7d > 0
    ? {
        direction: (stats.volume7d > stats.prevVolume7d ? 'up' : stats.volume7d < stats.prevVolume7d ? 'down' : 'neutral') as 'up' | 'down' | 'neutral',
        value: `${stats.volume7d > stats.prevVolume7d ? '+' : ''}${Math.round(((stats.volume7d - stats.prevVolume7d) / stats.prevVolume7d) * 100)}%`,
      }
    : undefined;

  // 🎯 NOUVEAU: Calcul du système XP
  const xpData = useMemo(() => {
    // Base XP: 10 XP par séance terminée + 5 XP par jour de streak + volume/100
    const baseXP = stats.completed * 10 + stats.streak * 5 + Math.floor(stats.volume7d / 100);
    
    // Calcul du niveau (100 XP par niveau)
    const level = Math.floor(baseXP / 100) + 1;
    const currentLevelXP = baseXP % 100;
    const nextLevelXP = 100;
    
    return {
      level,
      xp: currentLevelXP,
      nextLevelXp: nextLevelXP,
    };
  }, [stats.completed, stats.streak, stats.volume7d]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 120, paddingTop: insets.top + 20, gap: 8 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} />}
        showsVerticalScrollIndicator={false}
      >
          <HeroSection
            username={username}
            streak={stats.streak}
            nextWorkoutTitle={displayWorkouts.find((item) => item.workout.status !== 'completed')?.workout.title}
            onStartWorkout={handleLaunchNext}
            onOpenMenu={openMenu}
            completedThisWeek={stats.completedThisWeek}
            goalSessions={goalSessions}
            level={xpData.level}
            xp={xpData.xp}
            nextLevelXp={xpData.nextLevelXp}
          />

        <PersonalStats
          lastWorkoutDays={(() => {
            if (!displayWorkouts.length) return 999;
            const lastCompleted = displayWorkouts
              .filter(w => w.workout.status === 'completed')
              .sort((a, b) => b.workout.updated_at - a.workout.updated_at)[0];
            if (!lastCompleted) return 999;
            return Math.floor((Date.now() - lastCompleted.workout.updated_at) / (24 * 60 * 60 * 1000));
          })()}
          weekProgress={{
            completed: stats.completedThisWeek,
            goal: goalSessions,
          }}
          nextMilestone={(() => {
            if (stats.completed < 10) return {
              type: 'sessions' as const,
              current: stats.completed,
              target: 10,
              label: '10 séances'
            };
            if (stats.streak < 7) return {
              type: 'streak' as const,
              current: stats.streak,
              target: 7,
              label: '7 jours de suite'
            };
            if (stats.completed < 25) return {
              type: 'sessions' as const,
              current: stats.completed,
              target: 25,
              label: '25 séances'
            };
            return {
              type: 'sessions' as const,
              current: stats.completed,
              target: Math.ceil(stats.completed / 50) * 50,
              label: `${Math.ceil(stats.completed / 50) * 50} séances`
            };
          })()}
          personalRecord={stats.volume7d > 0 ? {
            label: 'Volume cette semaine',
            value: stats.volume7d > 1000 ? `${(stats.volume7d / 1000).toFixed(1)}k kg` : `${stats.volume7d} kg`,
            isNew: stats.volume7d > stats.prevVolume7d
          } : undefined}
        />

        {/* Dernière séance créée */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconContainer, { backgroundColor: '#F9731620' }]}>
                <Ionicons name="create-outline" size={18} color="#F97316" />
              </View>
              <View>
                <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                  {t('lastCreatedWorkout')}
                </Text>
                <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
                  {t('draftInProgress')}
                </Text>
              </View>
            </View>
            {totalDrafts > 1 && (
              <Pressable
                onPress={() => router.push('/library?filter=draft')}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
              >
                <Text style={[styles.seeAllLink, { color: '#F97316' }]}>
                  {t('seeAll')} {totalDrafts}
                </Text>
              </Pressable>
            )}
          </View>

          {!latestDraft.length ? (
            <View style={[styles.emptyState, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={[styles.emptyIconContainer, { backgroundColor: '#F9731620' }]}>
                <Ionicons name="document-text-outline" size={32} color="#F97316" />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
                {t('noWorkoutInProgress')}
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                {t('createFirstWorkout')}
              </Text>
              <AppButton
                title={t('createWorkout')}
                onPress={handleCreate}
                style={styles.emptyButton}
              />
            </View>
          ) : (
            latestDraft.map((item) => (
              <WorkoutCard
                key={item.workout.id}
                title={item.workout.title}
                date={formatDate(item.workout.updated_at)}
                status={item.workout.status as 'draft' | 'completed' | 'in_progress'}
                exerciseCount={item.exercises?.length}
                onPress={() => router.push(`/track/${item.workout.id}`)}
                onDelete={() => deleteWorkout(item.workout.id)}
              />
            ))
          )}
        </View>

        {/* Dernière séance terminée */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconContainer, { backgroundColor: '#22C55E20' }]}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#22C55E" />
              </View>
              <View>
                <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                  {t('lastCompletedWorkout')}
                </Text>
                <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>
                  {t('completedSession')}
                </Text>
              </View>
            </View>
            {totalCompleted > 1 && (
              <Pressable
                onPress={() => router.push('/library?filter=completed')}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
              >
                <Text style={[styles.seeAllLink, { color: '#22C55E' }]}>
                  {t('seeAll')} {totalCompleted}
                </Text>
              </Pressable>
            )}
          </View>

          {!latestCompleted.length ? (
            <View style={[styles.emptyState, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={[styles.emptyIconContainer, { backgroundColor: '#22C55E20' }]}>
                <Ionicons name="trophy-outline" size={32} color="#22C55E" />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
                {t('noCompletedWorkout')}
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                {t('completeWorkoutToSee')}
              </Text>
            </View>
          ) : (
            latestCompleted.map((item) => (
              <WorkoutCard
                key={item.workout.id}
                title={item.workout.title}
                date={formatDate(item.workout.updated_at)}
                status={item.workout.status as 'draft' | 'completed' | 'in_progress'}
                exerciseCount={item.exercises?.length}
                onPress={() => router.push(`/history/${item.workout.id}`)}
                onDelete={() => deleteWorkout(item.workout.id)}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Modal pour éditer l'objectif */}
      <Modal
        visible={editGoalModal}
        transparent
        animationType="fade"
        onRequestClose={() => setEditGoalModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setEditGoalModal(false)}
        >
          <Pressable
            style={[styles.goalModalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.goalModalHeader}>
              <Text style={[styles.goalModalTitle, { color: theme.colors.textPrimary }]}>
                {t('weeklyGoal')}
              </Text>
              <Pressable
                onPress={() => setEditGoalModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
              </Pressable>
            </View>
            <Text style={[styles.goalModalDescription, { color: theme.colors.textSecondary }]}>
              {t('howManySessionsPerWeek')}
            </Text>
            <TextInput
              style={[styles.goalInput, {
                backgroundColor: theme.colors.surfaceMuted,
                borderColor: theme.colors.border,
                color: theme.colors.textPrimary,
              }]}
              value={goalInput}
              onChangeText={setGoalInput}
              keyboardType="number-pad"
              placeholder="3"
              placeholderTextColor={theme.colors.textSecondary}
              autoFocus
            />
            <View style={styles.goalModalActions}>
              <Pressable
                style={[styles.goalModalButton, styles.goalModalButtonSecondary, {
                  backgroundColor: theme.colors.surfaceMuted,
                  borderColor: theme.colors.border,
                }]}
                onPress={() => setEditGoalModal(false)}
              >
                <Text style={[styles.goalModalButtonText, { color: theme.colors.textPrimary }]}>
                  {t('cancel')}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.goalModalButton, { backgroundColor: theme.colors.accent }]}
                onPress={handleSaveGoal}
              >
                <Text style={[styles.goalModalButtonText, { color: '#FFFFFF' }]}>
                  {t('save')}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Drawer Menu */}
      {menuOpen && (
        <Pressable style={styles.overlay} onPress={closeMenu}>
          <Animated.View
            style={[
              styles.drawer,
              drawerStyle,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.drawerContent}>
              {/* Section Profil élégante */}
              <View style={styles.drawerProfileSection}>
                <View style={styles.drawerProfileHeader}>
                  <Text style={styles.drawerMenuTitle}>
                    {t('menu')}
                  </Text>
                  <Pressable
                    onPress={closeMenu}
                    style={({ pressed }) => [
                      styles.drawerCloseBtn,
                      { backgroundColor: theme.colors.surfaceMuted, opacity: pressed ? 0.6 : 1 },
                    ]}
                  >
                    <Ionicons name="close" size={20} color={theme.colors.textPrimary} />
                  </Pressable>
                </View>
              </View>
            
              {/* Navigation principale */}
            <View style={styles.drawerSection}>
                <Pressable
                  style={({ pressed }) => [
                    styles.drawerItem,
                    { backgroundColor: pressed ? theme.colors.surfaceMuted : 'transparent' },
                  ]}
                  onPress={() => goTo('/history')}
                >
                  <View style={[styles.drawerItemIcon, { backgroundColor: '#6366f120' }]}>
                    <Ionicons name="time" size={22} color="#6366f1" />
                  </View>
                  <Text style={[styles.drawerItemText, { color: theme.colors.textPrimary }]}>{t('history')}</Text>
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
                </Pressable>
                
                <Pressable
                  style={({ pressed }) => [
                    styles.drawerItem,
                    { backgroundColor: pressed ? '#f59e0b15' : 'transparent' },
                  ]}
                  onPress={() => goTo('/objectives')}
                >
                  <View style={[styles.drawerItemIcon, { backgroundColor: '#f59e0b20' }]}>
                    <Ionicons name="flag" size={22} color="#f59e0b" />
                  </View>
                  <Text style={[styles.drawerItemText, { color: theme.colors.textPrimary }]}>{t('objectives')}</Text>
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.drawerItem,
                    { backgroundColor: pressed ? theme.colors.surfaceMuted : 'transparent' },
                  ]}
                  onPress={() => goTo('/settings')}
                >
                  <View style={[styles.drawerItemIcon, { backgroundColor: theme.colors.surfaceMuted }]}>
                    <Ionicons name="settings" size={22} color={theme.colors.textSecondary} />
                  </View>
                  <Text style={[styles.drawerItemText, { color: theme.colors.textPrimary }]}>{t('parameters')}</Text>
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
                </Pressable>
            </View>

              {/* Actions rapides */}
            <View style={styles.drawerSection}>
              <Text style={[styles.drawerSectionTitle, { color: theme.colors.textSecondary }]}>
                {t('quickActions')}
              </Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.drawerItem,
                    { backgroundColor: pressed ? '#f9731615' : 'transparent' },
                  ]}
                  onPress={() => {
                    handleCreate();
                    closeMenu();
                  }}
                >
                  <View style={[styles.drawerItemIcon, { backgroundColor: '#f9731620' }]}>
                    <Ionicons name="add-circle" size={22} color="#f97316" />
                  </View>
                  <Text style={[styles.drawerItemText, { color: theme.colors.textPrimary }]}>{t('newWorkout')}</Text>
                </Pressable>
                
                <Pressable
                  style={({ pressed }) => [
                    styles.drawerItem,
                    { backgroundColor: pressed ? '#f9731615' : 'transparent' },
                  ]}
                  onPress={() => {
                    router.push('/programme/create' as never);
                    closeMenu();
                  }}
                >
                  <View style={[styles.drawerItemIcon, { backgroundColor: '#f9731620' }]}>
                    <Ionicons name="document-text" size={22} color="#f97316" />
                  </View>
                  <Text style={[styles.drawerItemText, { color: theme.colors.textPrimary }]}>{t('newProgram')}</Text>
                </Pressable>
              </View>

              {/* Mes séances */}
              <View style={styles.drawerSection}>
                <Text style={[styles.drawerSectionTitle, { color: theme.colors.textSecondary }]}>
                  {t('myWorkouts')}
                </Text>
                
                <Pressable
                  style={({ pressed }) => [
                    styles.drawerItem,
                    { backgroundColor: pressed ? '#f59e0b15' : 'transparent' },
                  ]}
                  onPress={() => {
                    closeMenu();
                    router.push('/library?filter=draft' as never);
                  }}
                >
                  <View style={[styles.drawerItemIcon, { backgroundColor: '#f59e0b20' }]}>
                    <Ionicons name="document-text" size={22} color="#f59e0b" />
                  </View>
                  <Text style={[styles.drawerItemText, { color: theme.colors.textPrimary }]}>{t('drafts')}</Text>
                  {totalDrafts > 0 && (
                    <View style={[styles.drawerCountBadge, { backgroundColor: '#f59e0b' }]}>
                      <Text style={styles.drawerCountText}>{totalDrafts}</Text>
                    </View>
                  )}
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.drawerItem,
                    { backgroundColor: pressed ? '#10b98115' : 'transparent' },
                  ]}
                  onPress={() => {
                    closeMenu();
                    router.push('/library?filter=completed' as never);
                  }}
                >
                  <View style={[styles.drawerItemIcon, { backgroundColor: '#10b98120' }]}>
                    <Ionicons name="checkmark-circle" size={22} color="#10b981" />
                  </View>
                  <Text style={[styles.drawerItemText, { color: theme.colors.textPrimary }]}>{t('completed')}</Text>
                  {totalCompleted > 0 && (
                    <View style={[styles.drawerCountBadge, { backgroundColor: '#10b981' }]}>
                      <Text style={styles.drawerCountText}>{totalCompleted}</Text>
                    </View>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </Animated.View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  sectionContainer: {
    marginHorizontal: 16,
    marginBottom: 32,
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  sectionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  seeAllLink: {
    fontSize: 14,
    fontWeight: '600',
  },

  emptyState: {
    padding: 24,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    gap: 12,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyIcon: {
    fontSize: 28,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyButton: {
    marginTop: 12,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  drawer: {
    width: 300,
    height: '100%',
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
    shadowOpacity: 0.25,
    shadowOffset: { width: -4, height: 0 },
    shadowRadius: 20,
    elevation: 10,
  },
  drawerContent: {
    paddingTop: 50,
    paddingBottom: 40,
  },
  drawerProfileSection: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    marginBottom: 8,
  },
  drawerProfileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  drawerMenuTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: '#6366F1', // Couleur accent pour le branding
  },



  drawerCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  drawerCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  drawerSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 16,
    opacity: 0.6,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 4,
  },
  drawerItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerItemText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  drawerItemSubtext: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
    opacity: 0.7,
  },
  drawerCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerCountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  drawerSubSection: {
    marginBottom: 16,
  },
  drawerSubHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  drawerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  drawerSubTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  drawerWorkoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    marginBottom: 6,
  },
  drawerWorkoutTitle: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  drawerCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  drawerCountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  drawerEmptyText: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  goalModalCard: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    maxWidth: 400,
    width: '100%',
  },
  goalModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  goalModalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  goalModalDescription: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  goalInput: {
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    fontWeight: '600',
    borderWidth: 1,
    textAlign: 'center',
    marginBottom: 20,
  },
  goalModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  goalModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalModalButtonSecondary: {
    borderWidth: 1,
  },
  goalModalButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
