import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useTranslations } from '@/hooks/usePreferences';
import { generateProgram, saveProgram } from '@/services/programsApi';
import { Program } from '@/types/program';
import { useWorkouts } from '@/hooks/useWorkouts';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useRouter } from 'expo-router';

import { useUserProfile } from '@/hooks/useUserProfile';

const CreateProgramScreen: React.FC = () => {
  const { theme, mode } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { createDraft, addExercise, addSet, refresh, pullFromServer } = useWorkouts();
  const { isAuthenticated } = useAuth();
  const { isPremium, aiProgramsRemaining, showPaywall, refreshStatus } = useSubscription();
  const { profile } = useUserProfile();
  const { t } = useTranslations();

  // États principaux
  const [objective, setObjective] = useState('Hypertrophie');
  const [frequency, setFrequency] = useState(3);
  const [exercisesPerSession, setExercisesPerSession] = useState(4);
  const [durationWeeks, setDurationWeeks] = useState(4);
  const [loading, setLoading] = useState(false);
  const [program, setProgram] = useState<Program | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [launchingSession, setLaunchingSession] = useState<number | null>(null);
  const [savingSessions, setSavingSessions] = useState(false);
  const [programSaved, setProgramSaved] = useState(false);
  const [showProfileSuggestions, setShowProfileSuggestions] = useState(true);
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  // États avancés
  const [niveau, setNiveau] = useState('Intermédiaire');
  const [dureeSeance, setDureeSeance] = useState('45');
  const [blessures, setBlessures] = useState('');
  const [equipmentAvailable, setEquipmentAvailable] = useState<string[]>(['barbell', 'dumbbell']);
  const [methodePreferee, setMethodePreferee] = useState<string>('');

  // Suggestions intelligentes basées sur le profil
  const profileSuggestions = useMemo(() => {
    if (!profile) return null;

    const suggestions = [];

    // Suggestion d'objectif
    if (profile.objective && profile.objective !== objective) {
      const objectiveMap: Record<string, string> = {
        'muscle_gain': t('hypertrophyLabel'),
        'weight_loss': t('fitnessLabel'),
        'strength': t('forceOptionLabel'),
        'endurance': t('enduranceLabel'),
        'general_fitness': t('fitnessLabel')
      };
      const suggestedObjective = objectiveMap[profile.objective] || profile.objective;
      suggestions.push({
        type: 'objective',
        message: `${t('suggestedObjective')}: ${suggestedObjective}`,
        action: () => setObjective(suggestedObjective),
        icon: 'flag-outline'
      });
    }

    // Suggestion de niveau
    if (profile.experience_level && profile.experience_level !== niveau.toLowerCase()) {
      const levelMap: Record<string, string> = {
        'beginner': t('beginnerLevel'),
        'intermediate': t('intermediateLevel'),
        'advanced': t('advancedLevel')
      };
      const suggestedLevel = levelMap[profile.experience_level] || profile.experience_level;
      suggestions.push({
        type: 'level',
        message: `${t('suggestedLevel')}: ${suggestedLevel}`,
        action: () => setNiveau(suggestedLevel),
        icon: 'trophy-outline'
      });
    }

    // Suggestion de fréquence
    if (profile.training_frequency && profile.training_frequency !== frequency) {
      suggestions.push({
        type: 'frequency',
        message: `${t('suggestedFrequency')}: ${profile.training_frequency}x/${t('weeks')}`,
        action: () => setFrequency(profile.training_frequency!),
        icon: 'calendar-outline'
      });
    }

    return suggestions.length > 0 ? suggestions : null;
  }, [profile, objective, niveau, frequency, t]);

  // Animation du header
  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [headerAnim]);

  const equipmentOptions = useMemo(
    () => [
      { id: 'barbell', label: t('barreLabel'), icon: 'barbell-outline' as const },
      { id: 'dumbbell', label: t('dumbbellsLabel'), icon: 'fitness-outline' as const },
      { id: 'bodyweight', label: t('bodyweightLabel'), icon: 'body-outline' as const },
      { id: 'machine', label: t('machinesLabel'), icon: 'cog-outline' as const },
      { id: 'cable', label: t('cablesLabel'), icon: 'git-branch-outline' as const },
      { id: 'kettlebell', label: t('kettlebellLabel'), icon: 'disc-outline' as const },
    ],
    [t]
  );

  const objectiveOptions = useMemo(
    () => [
      { id: 'Hypertrophie', label: t('hypertrophyLabel'), icon: 'trending-up-outline' as const, desc: t('massGainDesc') },
      { id: 'Force', label: t('forceOptionLabel'), icon: 'flash-outline' as const, desc: t('maxPowerDesc') },
      { id: 'Endurance', label: t('enduranceLabel'), icon: 'pulse-outline' as const, desc: t('muscularCardioDesc') },
      { id: 'Remise en forme', label: t('fitnessLabel'), icon: 'heart-outline' as const, desc: t('fitnessDesc') },
    ],
    [t]
  );

  const niveauOptions = useMemo(
    () => [
      { id: 'Débutant', label: t('beginnerLevel'), icon: 'leaf-outline' as const },
      { id: 'Intermédiaire', label: t('intermediateLevel'), icon: 'flame-outline' as const },
      { id: 'Avancé', label: t('advancedLevel'), icon: 'rocket-outline' as const },
    ],
    [t]
  );

  const methodeOptions = useMemo(
    () => [
      { id: '', label: t('autoMethod'), desc: t('optimalChoice') },
      { id: 'fullbody', label: t('fullBody'), desc: t('wholeBody') },
      { id: 'upperlower', label: t('upperLower'), desc: t('upperLowerDesc') },
      { id: 'ppl', label: t('pplMethod'), desc: t('pplDesc') },
    ],
    [t]
  );

  const toggleEquipment = (equipmentId: string) => {
    Haptics.selectionAsync().catch(() => {});
    setEquipmentAvailable((prev) =>
      prev.includes(equipmentId)
        ? prev.filter((id) => id !== equipmentId)
        : [...prev, equipmentId]
    );
  };

  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

  const updateValue = (
    setter: React.Dispatch<React.SetStateAction<number>>,
    delta: number,
    min: number,
    max: number
  ) => {
    Haptics.selectionAsync().catch(() => {});
    setter((prev) => clamp(prev + delta, min, max));
  };

  const handleGenerate = async () => {
    // Vérifier la limite de programmes AI pour les utilisateurs gratuits
    if (!isPremium && aiProgramsRemaining <= 0) {
      showPaywall();
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setLoading(true);
    setError(null);
    setProgramSaved(false);
    try {
      const result = await generateProgram({
        objective,
        frequency,
        exercises_per_session: exercisesPerSession,
        duration_weeks: durationWeeks,
        niveau,
        duree_seance: dureeSeance,
        has_blessure: blessures.length > 0,
        blessure_first: blessures || undefined,
        equipment_available: equipmentAvailable.length > 0 ? equipmentAvailable : undefined,
        methode_preferee: methodePreferee || undefined,
      });
      setProgram(result);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : t('generationImpossible');
      // Si le backend retourne une limite atteinte, afficher le paywall
      if (errorMessage.includes('ai_program_limit_reached') || errorMessage.includes('403')) {
        showPaywall();
        setLoading(false);
        return;
      }
      setError(errorMessage);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setLoading(false);
      // Rafraîchir le statut après génération
      refreshStatus();
    }
  };

  const parseReps = (value: string | number | null | undefined) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const match = value.match(/(\d+)/);
      if (match && match[1]) return Number(match[1]);
    }
    return 10;
  };

  const handleSaveAllSessions = async () => {
    if (!program?.id) {
      Alert.alert(t('error'), t('programNotFound'));
      return;
    }
    if (!isAuthenticated) {
      Alert.alert(t('connectionRequired'), t('loginRequiredToSave'));
      return;
    }

    Haptics.selectionAsync().catch(() => {});
    setSavingSessions(true);
    try {
      const result = await saveProgram(String(program.id));

      for (const workoutData of result.workouts) {
        const session = program.sessions.find((s) => s.day_index === workoutData.day_index);
        if (!session) continue;

        const draft = await createDraft(workoutData.title);
        if (!draft) continue;

        const grouped = session.sets.reduce<Record<string, typeof session.sets>>((acc, set) => {
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
      }

      if (pullFromServer) await pullFromServer();

      setProgramSaved(true);
      await refresh();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert(
        t('sessionsRegistered'),
        result.workouts_created > 1 ? t('sessionsRegisteredCount', { count: result.workouts_created }) : t('sessionRegisteredCount', { count: result.workouts_created })
      );
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t('cannotSave');
      Alert.alert(t('error'), errorMessage);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setSavingSessions(false);
    }
  };

  const handleStartSession = async (sess: Program['sessions'][number], modeSport = false) => {
    if (!sess.sets?.length) {
      Alert.alert(t('emptySession'), t('sessionHasNoSets'));
      return;
    }
    Haptics.selectionAsync().catch(() => {});
    try {
      setLaunchingSession(sess.day_index);
      const draft = await createDraft(sess.title || `${t('sessionLabel')} ${sess.day_index + 1}`);
      if (!draft) throw new Error(t('cannotCreateSession'));

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

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.push(`/track/${draft.workout.id}${modeSport ? '?mode=1' : ''}`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t('cannotStart');
      Alert.alert(t('error'), errorMessage);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setLaunchingSession(null);
    }
  };

  // Composant Counter réutilisable
  const Counter: React.FC<{
    value: number;
    unit: string;
    onDecrement: () => void;
    onIncrement: () => void;
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
  }> = ({ value, unit, onDecrement, onIncrement, icon, label }) => (
    <View style={[styles.counterCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={styles.counterHeader}>
        <Ionicons name={icon} size={16} color={theme.colors.accent} />
        <Text style={[styles.counterLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
      </View>
      <View style={styles.counterBody}>
        <Pressable
          style={({ pressed }) => [
            styles.counterBtn,
            { backgroundColor: theme.colors.surfaceMuted, opacity: pressed ? 0.6 : 1 },
          ]}
          onPress={onDecrement}
        >
          <Ionicons name="remove" size={18} color={theme.colors.textPrimary} />
        </Pressable>
        <View style={styles.counterValueContainer}>
          <Text style={[styles.counterValue, { color: theme.colors.textPrimary }]}>{value}</Text>
          <Text style={[styles.counterUnit, { color: theme.colors.textSecondary }]}>{unit}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.counterBtn,
            { backgroundColor: theme.colors.surfaceMuted, opacity: pressed ? 0.6 : 1 },
          ]}
          onPress={onIncrement}
        >
          <Ionicons name="add" size={18} color={theme.colors.textPrimary} />
        </Pressable>
      </View>
    </View>
  );

  // Composant SessionCard
  const SessionCard: React.FC<{ session: Program['sessions'][number]; index: number }> = ({
    session,
    index,
  }) => {
    const cardAnim = useRef(new Animated.Value(0)).current;
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
      Animated.spring(cardAnim, {
        toValue: 1,
        delay: index * 80,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    }, [cardAnim, index]);

    const displayedSets = expanded ? session.sets : session.sets.slice(0, 4);

    return (
      <Animated.View
        style={{
          opacity: cardAnim,
          transform: [
            { translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) },
            { scale: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) },
          ],
        }}
      >
        <View style={[styles.sessionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.sessionHeader}>
            <View style={[styles.sessionBadge, { backgroundColor: theme.colors.accent }]}>
              <Text style={styles.sessionBadgeText}>{index + 1}</Text>
            </View>
            <View style={styles.sessionInfo}>
              <Text style={[styles.sessionTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                {session.title}
              </Text>
              <View style={styles.sessionMeta}>
                <Ionicons name="barbell-outline" size={12} color={theme.colors.textSecondary} />
                <Text style={[styles.sessionFocus, { color: theme.colors.textSecondary }]}>
                  {session.focus}
                </Text>
                {(session.estimated_minutes ?? 0) > 0 && (
                  <>
                    <Ionicons name="time-outline" size={12} color={theme.colors.textSecondary} style={{ marginLeft: 8 }} />
                    <Text style={[styles.sessionFocus, { color: theme.colors.textSecondary }]}>
                      ~{session.estimated_minutes} min
                    </Text>
                  </>
                )}
              </View>
            </View>
          </View>

          <Pressable
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setExpanded((v) => !v);
            }}
          >
            <View style={styles.exerciseList}>
              {displayedSets.map((s, idx) => (
                <View
                  key={`${session.day_index}-${s.order_index}-${idx}`}
                  style={[styles.exerciseRow, { borderBottomColor: theme.colors.border }]}
                >
                  <View style={[styles.exerciseDot, { backgroundColor: theme.colors.accent }]} />
                  <Text
                    style={[styles.exerciseName, { color: theme.colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {s.exercise_slug.replace(/-/g, ' ')}
                  </Text>
                  {expanded ? (
                    <View style={styles.exerciseDetails}>
                      {s.notes ? (
                        <View style={[styles.detailBadge, { backgroundColor: theme.colors.surfaceMuted }]}>
                          <Text style={[styles.detailBadgeText, { color: theme.colors.textPrimary }]}>
                            {s.notes}
                          </Text>
                        </View>
                      ) : null}
                      <View style={[styles.detailBadge, { backgroundColor: theme.colors.surfaceMuted }]}>
                        <Text style={[styles.detailBadgeText, { color: theme.colors.textPrimary }]}>
                          {typeof s.reps === 'number' ? `${s.reps}` : s.reps} reps
                        </Text>
                      </View>
                      {s.rpe != null && (
                        <View style={[styles.detailBadge, { backgroundColor: theme.colors.accent + '20' }]}>
                          <Text style={[styles.detailBadgeText, { color: theme.colors.accent }]}>
                            RPE {s.rpe}
                          </Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    <Text style={[styles.exerciseReps, { color: theme.colors.textSecondary }]}>
                      {typeof s.reps === 'number' ? `${s.reps}` : s.reps}
                    </Text>
                  )}
                </View>
              ))}
              {!expanded && session.sets.length > 4 && (
                <Text style={[styles.moreText, { color: theme.colors.textSecondary }]}>
                  +{session.sets.length - 4} {session.sets.length - 4 > 1 ? t('exercisesMore') : t('exerciseMore')}
                </Text>
              )}
            </View>

            <View style={styles.expandToggle}>
              <Ionicons
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={theme.colors.accent}
              />
              <Text style={[styles.expandToggleText, { color: theme.colors.accent }]}>
                {expanded ? t('hideDetails') : t('seeDetails')}
              </Text>
            </View>
          </Pressable>

          <View style={styles.sessionActions}>
            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                styles.actionBtnSecondary,
                { borderColor: theme.colors.border, opacity: pressed ? 0.7 : 1 },
              ]}
              onPress={() => handleStartSession(session, true)}
              disabled={launchingSession !== null}
            >
              <Ionicons name="play-circle-outline" size={18} color={theme.colors.textPrimary} />
              <Text style={[styles.actionBtnText, { color: theme.colors.textPrimary }]}>{t('sportMode')}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: theme.colors.accent, opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={() => handleStartSession(session, false)}
              disabled={launchingSession !== null}
            >
              <Ionicons name="play" size={18} color="#FFFFFF" />
              <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>{t('startSession')}</Text>
            </Pressable>
          </View>
        </View>
      </Animated.View>
    );
  };

  const isDark = mode === 'dark';
  const gradientColors = isDark
    ? ['#1a1f2e', '#0f1218', '#0f1218']
    : ['#fef2f2', '#fce7e7', '#F7F8FA'];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Header */}
        <LinearGradient colors={gradientColors as [string, string, ...string[]]} style={[styles.heroGradient, { paddingTop: insets.top + 16 }]}>
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
            <View style={[styles.heroIconContainer, { backgroundColor: theme.colors.accent + '20' }]}>
              <Ionicons name="create-outline" size={32} color={theme.colors.accent} />
            </View>
            <Text style={[styles.heroTitle, { color: theme.colors.textPrimary }]}>
              {t('createProgramTitle')}
            </Text>
            <Text style={[styles.heroSubtitle, { color: theme.colors.textSecondary }]}>
              {t('customizeTraining')}
            </Text>
          </Animated.View>
        </LinearGradient>

        <View style={styles.content}>
          {/* Section Comment ça marche */}
          <Pressable
            style={[styles.howItWorksToggle, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              setShowHowItWorks((v) => !v);
            }}
          >
            <View style={styles.howItWorksToggleLeft}>
              <Ionicons name="school-outline" size={20} color={theme.colors.accent} />
              <Text style={[styles.howItWorksToggleText, { color: theme.colors.textPrimary }]}>
                {t('howItWorksTitle')}
              </Text>
            </View>
            <Ionicons
              name={showHowItWorks ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={theme.colors.textSecondary}
            />
          </Pressable>

          {showHowItWorks && (
            <View style={[styles.howItWorksCard, { backgroundColor: theme.colors.accent + '08', borderColor: theme.colors.accent + '25' }]}>
              <Text style={[styles.howItWorksIntro, { color: theme.colors.textSecondary }]}>
                {t('howItWorksSubtitle')}
              </Text>
              {[
                { icon: 'analytics-outline' as const, title: t('howItWorks1Title'), desc: t('howItWorks1Desc') },
                { icon: 'barbell-outline' as const, title: t('howItWorks2Title'), desc: t('howItWorks2Desc') },
                { icon: 'trending-up-outline' as const, title: t('howItWorks3Title'), desc: t('howItWorks3Desc') },
                { icon: 'options-outline' as const, title: t('howItWorks4Title'), desc: t('howItWorks4Desc') },
              ].map((item, idx) => (
                <View key={idx} style={styles.howItWorksItem}>
                  <View style={[styles.howItWorksIconBg, { backgroundColor: theme.colors.accent + '15' }]}>
                    <Ionicons name={item.icon} size={18} color={theme.colors.accent} />
                  </View>
                  <View style={styles.howItWorksItemText}>
                    <Text style={[styles.howItWorksItemTitle, { color: theme.colors.textPrimary }]}>
                      {item.title}
                    </Text>
                    <Text style={[styles.howItWorksItemDesc, { color: theme.colors.textSecondary }]}>
                      {item.desc}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Section Objectif */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="flag" size={20} color={theme.colors.accent} />
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>{t('objectiveSection')}</Text>
            </View>
            <View style={styles.objectiveGrid}>
              {objectiveOptions.map((opt) => {
                const isActive = opt.id === objective;
                return (
                  <Pressable
                    key={opt.id}
                    style={({ pressed }) => [
                      styles.objectiveCard,
                      {
                        backgroundColor: isActive ? theme.colors.accent : theme.colors.surface,
                        borderColor: isActive ? theme.colors.accent : theme.colors.border,
                        transform: [{ scale: pressed ? 0.96 : 1 }],
                      },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setObjective(opt.id);
                    }}
                  >
                    <Ionicons
                      name={opt.icon}
                      size={24}
                      color={isActive ? '#FFFFFF' : theme.colors.textPrimary}
                    />
                    <Text
                      style={[
                        styles.objectiveLabel,
                        { color: isActive ? '#FFFFFF' : theme.colors.textPrimary },
                      ]}
                    >
                      {opt.label}
                    </Text>
                    <Text
                      style={[
                        styles.objectiveDesc,
                        { color: isActive ? 'rgba(255,255,255,0.8)' : theme.colors.textSecondary },
                      ]}
                    >
                      {opt.desc}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Section Suggestions Intelligentes */}
          {profileSuggestions && showProfileSuggestions && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="bulb" size={20} color="#f59e0b" />
                <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                  {t('suggestionsBasedOnProfile')}
                </Text>
                <Pressable
                  onPress={() => setShowProfileSuggestions(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={16} color={theme.colors.textSecondary} />
                </Pressable>
              </View>
              <View style={[styles.suggestionsContainer, { backgroundColor: '#f59e0b' + '10', borderColor: '#f59e0b' + '30' }]}>
                <View style={styles.suggestionHeader}>
                  <Ionicons name="sparkles" size={16} color="#f59e0b" />
                  <Text style={[styles.suggestionHeaderText, { color: '#f59e0b' }]}>
                    {t('smartPersonalization')}
                  </Text>
                </View>
                {profileSuggestions.map((suggestion, index) => (
                  <Pressable
                    key={index}
                    style={({ pressed }) => [
                      styles.suggestionItem,
                      { backgroundColor: theme.colors.surface, opacity: pressed ? 0.8 : 1 }
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      suggestion.action();
                    }}
                  >
                    <View style={styles.suggestionLeft}>
                      <Ionicons name={suggestion.icon as any} size={16} color={theme.colors.accent} />
                      <Text style={[styles.suggestionText, { color: theme.colors.textPrimary }]}>
                        {suggestion.message}
                      </Text>
                    </View>
                    <View style={[styles.suggestionButton, { backgroundColor: theme.colors.accent }]}>
                      <Text style={styles.suggestionButtonText}>{t('applyLabel')}</Text>
                    </View>
                  </Pressable>
                ))}
                <Text style={[styles.suggestionNote, { color: theme.colors.textSecondary }]}>
                  {t('suggestionsNote')}
                </Text>
              </View>
            </View>
          )}

          {/* Section Paramètres */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="settings" size={20} color={theme.colors.accent} />
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>{t('parametersSection')}</Text>
            </View>
            <View style={styles.countersGrid}>
              <Counter
                value={frequency}
                unit={t('timesPerWeek')}
                label={t('frequencyLabel')}
                icon="calendar-outline"
                onDecrement={() => updateValue(setFrequency, -1, 2, 6)}
                onIncrement={() => updateValue(setFrequency, 1, 2, 6)}
              />
              <Counter
                value={exercisesPerSession}
                unit={t('exercisesPerSession')}
                label={t('perSessionLabel')}
                icon="barbell-outline"
                onDecrement={() => updateValue(setExercisesPerSession, -1, 3, 8)}
                onIncrement={() => updateValue(setExercisesPerSession, 1, 3, 8)}
              />
              <Counter
                value={durationWeeks}
                unit={t('weeks')}
                label={t('durationLabel')}
                icon="time-outline"
                onDecrement={() => updateValue(setDurationWeeks, -1, 2, 16)}
                onIncrement={() => updateValue(setDurationWeeks, 1, 2, 16)}
              />
              <Counter
                value={parseInt(dureeSeance)}
                unit="min"
                label={t('sessionLabel')}
                icon="hourglass-outline"
                onDecrement={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setDureeSeance(String(Math.max(30, parseInt(dureeSeance) - 15)));
                }}
                onIncrement={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setDureeSeance(String(Math.min(90, parseInt(dureeSeance) + 15)));
                }}
              />
            </View>
            <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}>
              {t('frequencyHelper')} {durationWeeks >= 5 ? t('durationHelper') : ''}
            </Text>
          </View>

          {/* Section Niveau */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="trophy" size={20} color={theme.colors.accent} />
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>{t('levelSection')}</Text>
            </View>
            <View style={styles.pillsRow}>
              {niveauOptions.map((opt) => {
                const isActive = opt.id === niveau;
                return (
                  <Pressable
                    key={opt.id}
                    style={({ pressed }) => [
                      styles.pill,
                      {
                        backgroundColor: isActive ? theme.colors.accent : theme.colors.surface,
                        borderColor: isActive ? theme.colors.accent : theme.colors.border,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setNiveau(opt.id);
                    }}
                  >
                    <Ionicons
                      name={opt.icon}
                      size={16}
                      color={isActive ? '#FFFFFF' : theme.colors.textPrimary}
                    />
                    <Text
                      style={[styles.pillText, { color: isActive ? '#FFFFFF' : theme.colors.textPrimary }]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}>
              {t('levelHelper')}
            </Text>
          </View>

          {/* Section Méthode */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="git-network" size={20} color={theme.colors.accent} />
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>{t('methodSection')}</Text>
            </View>
            <View style={styles.methodeGrid}>
              {methodeOptions.map((opt) => {
                const isActive = opt.id === methodePreferee;
                return (
                  <Pressable
                    key={opt.id}
                    style={({ pressed }) => [
                      styles.methodeCard,
                      {
                        backgroundColor: isActive ? theme.colors.accent : theme.colors.surface,
                        borderColor: isActive ? theme.colors.accent : theme.colors.border,
                        transform: [{ scale: pressed ? 0.97 : 1 }],
                      },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setMethodePreferee(opt.id);
                    }}
                  >
                    <Text
                      style={[
                        styles.methodeLabel,
                        { color: isActive ? '#FFFFFF' : theme.colors.textPrimary },
                      ]}
                    >
                      {opt.label}
                    </Text>
                    <Text
                      style={[
                        styles.methodeDesc,
                        { color: isActive ? 'rgba(255,255,255,0.8)' : theme.colors.textSecondary },
                      ]}
                    >
                      {opt.desc}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={[styles.helperText, { color: theme.colors.textSecondary }]}>
              {t('methodHelper')}
            </Text>
          </View>

          {/* Section Équipement */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="construct" size={20} color={theme.colors.accent} />
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>{t('equipmentSection')}</Text>
              <View style={[styles.badge, { backgroundColor: theme.colors.surfaceMuted }]}>
                <Text style={[styles.badgeText, { color: theme.colors.textSecondary }]}>
                  {equipmentAvailable.length} {equipmentAvailable.length > 1 ? t('selectedPluralCount') : t('selectedCount')}
                </Text>
              </View>
            </View>
            <View style={styles.equipmentGrid}>
              {equipmentOptions.map((eq) => {
                const isSelected = equipmentAvailable.includes(eq.id);
                return (
                  <Pressable
                    key={eq.id}
                    style={({ pressed }) => [
                      styles.equipmentChip,
                      {
                        backgroundColor: isSelected ? theme.colors.accent : theme.colors.surface,
                        borderColor: isSelected ? theme.colors.accent : theme.colors.border,
                        transform: [{ scale: pressed ? 0.95 : 1 }],
                      },
                    ]}
                    onPress={() => toggleEquipment(eq.id)}
                  >
                    <Ionicons
                      name={eq.icon}
                      size={20}
                      color={isSelected ? '#FFFFFF' : theme.colors.textPrimary}
                    />
                    <Text
                      style={[
                        styles.equipmentLabel,
                        { color: isSelected ? '#FFFFFF' : theme.colors.textPrimary },
                      ]}
                    >
                      {eq.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Section Contraintes */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="medical" size={20} color={theme.colors.accent} />
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>{t('constraintsSection')}</Text>
            </View>
            <TextInput
              value={blessures}
              onChangeText={setBlessures}
              placeholder={t('constraintsPlaceholder')}
              placeholderTextColor={theme.colors.textSecondary}
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.textPrimary,
                },
              ]}
              multiline
              numberOfLines={2}
            />
          </View>

          {/* Bouton Générer */}
          <AppButton
            title={loading ? t('generationInProgress') : t('generateMyProgram')}
            onPress={handleGenerate}
            loading={loading}
            disabled={loading}
            style={styles.generateBtn}
          />

          {error && (
            <View
              style={[
                styles.errorBox,
                { backgroundColor: theme.colors.error + '15', borderColor: theme.colors.error + '40' },
              ]}
            >
              <Ionicons name="alert-circle" size={20} color={theme.colors.error} />
              <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
            </View>
          )}

          {/* Programme généré */}
          {program && (
            <View style={styles.programSection}>
              <View style={[styles.programHeader, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <View style={styles.programHeaderLeft}>
                  <View style={[styles.programIcon, { backgroundColor: theme.colors.accent + '20' }]}>
                    <Ionicons name="fitness" size={28} color={theme.colors.accent} />
                  </View>
                  <View style={styles.programInfo}>
                    <Text style={[styles.programTitle, { color: theme.colors.textPrimary }]}>
                      {program.title}
                    </Text>
                    <View style={styles.programTags}>
                      <View style={[styles.programTag, { backgroundColor: theme.colors.surfaceMuted }]}>
                        <Ionicons name="flag-outline" size={12} color={theme.colors.accent} />
                        <Text style={[styles.programTagText, { color: theme.colors.textPrimary }]}>
                          {program.objective}
                        </Text>
                      </View>
                      <View style={[styles.programTag, { backgroundColor: theme.colors.surfaceMuted }]}>
                        <Ionicons name="calendar-outline" size={12} color={theme.colors.accent} />
                        <Text style={[styles.programTagText, { color: theme.colors.textPrimary }]}>
                          {program.duration_weeks} {t('weeks')}
                        </Text>
                      </View>
                      <View style={[styles.programTag, { backgroundColor: theme.colors.surfaceMuted }]}>
                        <Ionicons name="layers-outline" size={12} color={theme.colors.accent} />
                        <Text style={[styles.programTagText, { color: theme.colors.textPrimary }]}>
                          {program.sessions.length} {t('sessionsCountLabel')}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
                {programSaved && (
                  <View style={[styles.savedBadge, { backgroundColor: theme.colors.primaryMuted + '20' }]}>
                    <Ionicons name="checkmark-circle" size={16} color={theme.colors.primaryMuted} />
                    <Text style={[styles.savedBadgeText, { color: theme.colors.primaryMuted }]}>{t('savedBadge')}</Text>
                  </View>
                )}
              </View>

              {isAuthenticated && !programSaved && (
                <AppButton
                  title={savingSessions ? t('savingInProgress') : t('saveAllSessions')}
                  onPress={handleSaveAllSessions}
                  loading={savingSessions}
                  disabled={savingSessions}
                  variant="secondary"
                  style={styles.saveBtn}
                />
              )}

              <View style={styles.sessionsContainer}>
                {program.sessions.map((sess, idx) => (
                  <SessionCard key={sess.day_index} session={sess} index={idx} />
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default CreateProgramScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  heroGradient: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  heroContent: {
    alignItems: 'center',
  },
  heroIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  howItWorksToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  howItWorksToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  howItWorksToggleText: {
    fontSize: 15,
    fontWeight: '700',
  },
  howItWorksCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 14,
    marginBottom: 24,
  },
  howItWorksIntro: {
    fontSize: 13,
    lineHeight: 19,
    fontStyle: 'italic',
  },
  howItWorksItem: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  howItWorksIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  howItWorksItemText: {
    flex: 1,
    gap: 3,
  },
  howItWorksItemTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  howItWorksItemDesc: {
    fontSize: 12,
    lineHeight: 18,
  },
  helperText: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
    paddingHorizontal: 4,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
  },
  objectiveGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  objectiveCard: {
    width: '48%',
    flexGrow: 1,
    minWidth: 150,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: 6,
  },
  objectiveLabel: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
  },
  objectiveDesc: {
    fontSize: 12,
    fontWeight: '500',
  },
  countersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  counterCard: {
    width: '48%',
    flexGrow: 1,
    minWidth: 150,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  counterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  counterLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  counterBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  counterBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterValueContainer: {
    alignItems: 'center',
  },
  counterValue: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  counterUnit: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '600',
  },
  methodeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  methodeCard: {
    width: '48%',
    flexGrow: 1,
    minWidth: 150,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 2,
  },
  methodeLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  methodeDesc: {
    fontSize: 11,
    fontWeight: '500',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  equipmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  equipmentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  equipmentLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  textInput: {
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  generateBtn: {
    marginTop: 8,
    marginBottom: 16,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  programSection: {
    marginTop: 8,
  },
  programHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  programHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
  },
  programIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  programInfo: {
    flex: 1,
    gap: 8,
  },
  programTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  programTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  programTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  programTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  suggestionsContainer: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  suggestionHeaderText: {
    fontSize: 14,
    fontWeight: '700',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  suggestionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  suggestionText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  suggestionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  suggestionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  suggestionNote: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 4,
  },
  closeButton: {
    padding: 4,
  },
  savedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  savedBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  saveBtn: {
    marginBottom: 16,
  },
  sessionsContainer: {
    gap: 12,
  },
  sessionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  sessionBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  sessionInfo: {
    flex: 1,
    gap: 4,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sessionFocus: {
    fontSize: 12,
    fontWeight: '500',
  },
  exerciseList: {
    gap: 6,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  exerciseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  exerciseName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  exerciseReps: {
    fontSize: 12,
    fontWeight: '600',
  },
  moreText: {
    fontSize: 12,
    fontWeight: '600',
    fontStyle: 'italic',
    marginTop: 4,
    marginLeft: 16,
  },
  exerciseDetails: {
    flexDirection: 'row',
    gap: 6,
    flexShrink: 0,
  },
  detailBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  detailBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  expandToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 8,
  },
  expandToggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sessionActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
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
    fontWeight: '700',
  },
});
