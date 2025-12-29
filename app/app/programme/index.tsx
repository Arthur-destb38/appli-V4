import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { useAppTheme } from '@/theme/ThemeProvider';
import { listPrograms } from '@/services/programsApi';
import { Program, ProgramSession } from '@/types/program';
import { useWorkouts } from '@/hooks/useWorkouts';

// Couleurs par objectif
const OBJECTIVE_COLORS: Record<string, { gradient: [string, string]; accent: string }> = {
  hypertrophie: { gradient: ['#6366f1', '#8b5cf6'], accent: '#6366f1' },
  force: { gradient: ['#ef4444', '#f97316'], accent: '#ef4444' },
  endurance: { gradient: ['#10b981', '#14b8a6'], accent: '#10b981' },
  perte_poids: { gradient: ['#f59e0b', '#eab308'], accent: '#f59e0b' },
  general: { gradient: ['#6366f1', '#8b5cf6'], accent: '#6366f1' },
};

const getObjectiveColors = (objective?: string) => {
  const key = objective?.toLowerCase().replace(/\s/g, '_') || 'general';
  return OBJECTIVE_COLORS[key] || OBJECTIVE_COLORS.general;
};

const ProgramsScreen: React.FC = () => {
  const { theme } = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedProgramId, setExpandedProgramId] = useState<number | null>(null);
  const [launchingSession, setLaunchingSession] = useState<string | null>(null);
  const { createDraft, addExercise, addSet } = useWorkouts();

  const headerAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!loading) {
      Animated.stagger(150, [
        Animated.timing(headerAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.back(1.1)),
          useNativeDriver: true,
        }),
        Animated.timing(contentAnim, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading]);

  const fetchPrograms = useCallback(async () => {
    try {
      setError(null);
      const data = await listPrograms();
      setPrograms(data);
    } catch (e: any) {
      setError(e?.message || 'Impossible de charger les programmes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPrograms();
  }, [fetchPrograms]);

  const parseReps = (value: string | number | null | undefined) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const match = value.match(/(\d+)/);
      if (match && match[1]) {
        return Number(match[1]);
      }
    }
    return 10;
  };

  const handleStartSession = async (program: Program, sess: ProgramSession) => {
    if (!sess.sets?.length) {
      Alert.alert('Séance vide', 'Cette séance ne contient pas de séries.');
      return;
    }
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      setLaunchingSession(`${program.id}-${sess.day_index}`);
      const draft = await createDraft(sess.title || `Séance ${sess.day_index + 1}`);
      if (!draft) {
        throw new Error('Impossible de créer la séance');
      }

      const grouped = sess.sets.reduce<Record<string, typeof sess.sets>>((acc, set) => {
        const key = set.exercise_slug || 'exercice';
        acc[key] = acc[key] ? [...acc[key], set] : [set];
        return acc;
      }, {});

      for (const [slug, sets] of Object.entries(grouped)) {
        const exerciseId = await addExercise(draft.workout.id, slug, sets.length);
        if (!exerciseId) continue;
        for (const s of sets) {
          await addSet(exerciseId, {
            reps: parseReps(s.reps),
            weight: typeof s.weight === 'number' ? s.weight : null,
            rpe: typeof s.rpe === 'number' ? s.rpe : null,
          });
        }
      }

      router.push(`/track/${draft.workout.id}`);
    } catch (err: any) {
      Alert.alert('Erreur', err?.message || 'Impossible de démarrer la séance');
    } finally {
      setLaunchingSession(null);
    }
  };

  const toggleExpanded = (programId: number | undefined) => {
    if (programId === undefined) return;
    Haptics.selectionAsync().catch(() => {});
    setExpandedProgramId(expandedProgramId === programId ? null : programId);
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.loadingSpinner, { backgroundColor: theme.colors.surface }]}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Chargement des programmes...
          </Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.errorIconCircle, { backgroundColor: theme.colors.error + '20' }]}>
          <Ionicons name="warning-outline" size={48} color={theme.colors.error} />
        </View>
        <Text style={[styles.errorTitle, { color: theme.colors.textPrimary }]}>Erreur</Text>
        <Text style={[styles.errorText, { color: theme.colors.textSecondary }]}>{error}</Text>
        <TouchableOpacity 
          style={[styles.retryButton, { backgroundColor: theme.colors.accent }]}
          onPress={fetchPrograms}
        >
          <Ionicons name="refresh" size={18} color="#fff" />
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.accent}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header avec gradient */}
        <Animated.View
          style={[
            styles.headerWrapper,
            {
              opacity: headerAnim,
              transform: [
                {
                  translateY: headerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-30, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={theme.dark ? ['#1e1b4b', '#312e81', '#1e1b4b'] : ['#6366f1', '#8b5cf6', '#a855f7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.headerGradient, { paddingTop: insets.top + 12 }]}
          >
            <View style={styles.decorCircle1} pointerEvents="none" />
            <View style={styles.decorCircle2} pointerEvents="none" />

            <View style={styles.navBar}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.navButton}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={22} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.navTitle}>Mes Programmes</Text>
              <View style={{ width: 40 }} />
            </View>

            <View style={styles.headerContent}>
              <View style={styles.headerIcon}>
                <Ionicons name="calendar" size={28} color="#fff" />
              </View>
              <Text style={styles.headerSubtitle}>
                {programs.length === 0 
                  ? 'Crée ton premier programme'
                  : `${programs.length} programme${programs.length > 1 ? 's' : ''} • ${programs.reduce((acc, p) => acc + p.sessions.length, 0)} séances`
                }
              </Text>
            </View>

            {/* Bouton créer */}
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                router.push('/programme/create');
              }}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#f97316', '#ea580c']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.createButtonGradient}
              >
                <Ionicons name="add-circle" size={20} color="#fff" />
                <Text style={styles.createButtonText}>Créer un programme</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>

        {/* Liste des programmes */}
        <Animated.View
          style={[
            styles.programsContainer,
            {
              opacity: contentAnim,
              transform: [
                {
                  translateY: contentAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {programs.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={[styles.emptyIconCircle, { backgroundColor: theme.colors.accent + '20' }]}>
                <Ionicons name="fitness-outline" size={40} color={theme.colors.accent} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
                Aucun programme
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                Crée ton premier programme personnalisé pour organiser tes séances d'entraînement
              </Text>
            </View>
          ) : (
            programs.map((program, index) => {
              const isExpanded = expandedProgramId === program.id;
              const colors = getObjectiveColors(program.objective);

              return (
                <View
                  key={program.id}
                  style={[
                    styles.programCard,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                  ]}
                >
                  {/* Header du programme */}
                  <Pressable
                    onPress={() => toggleExpanded(program.id)}
                    style={styles.programHeader}
                  >
                    <View style={styles.programHeaderLeft}>
                      <LinearGradient
                        colors={colors.gradient}
                        style={styles.programIcon}
                      >
                        <Ionicons name="barbell" size={20} color="#fff" />
                      </LinearGradient>
                      <View style={styles.programInfo}>
                        <View style={styles.programTitleRow}>
                          <Text style={[styles.programTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                            {program.title}
                          </Text>
                        </View>
                        <View style={styles.programMeta}>
                          <View style={[styles.metaBadge, { backgroundColor: colors.accent + '20' }]}>
                            <Text style={[styles.metaBadgeText, { color: colors.accent }]}>
                              {program.objective || 'Général'}
                            </Text>
                          </View>
                          <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                            {program.duration_weeks} sem.
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.programHeaderRight}>
                      <View style={[styles.sessionsBadge, { backgroundColor: theme.colors.surfaceMuted }]}>
                        <Text style={[styles.sessionsBadgeText, { color: theme.colors.textPrimary }]}>
                          {program.sessions.length}
                        </Text>
                        <Text style={[styles.sessionsBadgeLabel, { color: theme.colors.textSecondary }]}>
                          séances
                        </Text>
                      </View>
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={22}
                        color={theme.colors.textSecondary}
                      />
                    </View>
                  </Pressable>

                  {/* Séances expandables */}
                  {isExpanded && (
                    <View style={[styles.sessionsContainer, { borderTopColor: theme.colors.border }]}>
                      {program.sessions.map((sess, sessIndex) => {
                        const isLaunching = launchingSession === `${program.id}-${sess.day_index}`;
                        return (
                          <View
                            key={sess.day_index}
                            style={[
                              styles.sessionCard,
                              { backgroundColor: theme.colors.surfaceMuted },
                              sessIndex !== program.sessions.length - 1 && { marginBottom: 10 },
                            ]}
                          >
                            <View style={styles.sessionLeft}>
                              <View style={[styles.sessionNumber, { backgroundColor: colors.accent }]}>
                                <Text style={styles.sessionNumberText}>{sessIndex + 1}</Text>
                              </View>
                              <View style={styles.sessionInfo}>
                                <Text style={[styles.sessionTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                                  {sess.title}
                                </Text>
                                <View style={styles.sessionMeta}>
                                  <View style={styles.sessionMetaItem}>
                                    <Ionicons name="fitness" size={12} color={theme.colors.textSecondary} />
                                    <Text style={[styles.sessionMetaText, { color: theme.colors.textSecondary }]}>
                                      {sess.focus}
                                    </Text>
                                  </View>
                                  {sess.estimated_minutes && (
                                    <View style={styles.sessionMetaItem}>
                                      <Ionicons name="time" size={12} color={theme.colors.textSecondary} />
                                      <Text style={[styles.sessionMetaText, { color: theme.colors.textSecondary }]}>
                                        {sess.estimated_minutes} min
                                      </Text>
                                    </View>
                                  )}
                                </View>
                              </View>
                            </View>
                            <TouchableOpacity
                              style={[styles.startButton, { backgroundColor: colors.accent }]}
                              onPress={() => handleStartSession(program, sess)}
                              disabled={launchingSession !== null}
                              activeOpacity={0.8}
                            >
                              {isLaunching ? (
                                <ActivityIndicator size="small" color="#fff" />
                              ) : (
                                <>
                                  <Ionicons name="play" size={14} color="#fff" />
                                  <Text style={styles.startButtonText}>Go</Text>
                                </>
                              )}
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
};

export default ProgramsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingSpinner: {
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  errorIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  errorText: {
    fontSize: 15,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  headerWrapper: {},
  headerGradient: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    position: 'relative',
  },
  decorCircle1: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: 40,
    left: -40,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  headerContent: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  createButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  programsContainer: {
    padding: 16,
    gap: 12,
  },
  emptyState: {
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  programCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  programHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  programHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  programIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  programInfo: {
    flex: 1,
  },
  programTitleRow: {
    marginBottom: 6,
  },
  programTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  programMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  metaBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  metaBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  metaText: {
    fontSize: 13,
  },
  programHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sessionsBadge: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  sessionsBadgeText: {
    fontSize: 18,
    fontWeight: '800',
  },
  sessionsBadgeLabel: {
    fontSize: 10,
  },
  sessionsContainer: {
    borderTopWidth: 1,
    padding: 16,
    paddingTop: 16,
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
  },
  sessionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  sessionNumber: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionNumberText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sessionMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sessionMetaText: {
    fontSize: 12,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
