import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  Animated,
  Easing,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useAppTheme } from '@/theme/ThemeProvider';
import { useTranslations } from '@/hooks/usePreferences';
import { generateProgram, saveProgram } from '@/services/programsApi';
import { Program } from '@/types/program';
import { useWorkouts } from '@/hooks/useWorkouts';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useUserProfile } from '@/hooks/useUserProfile';
import { AppButton } from '@/components/AppButton';

const TOTAL_STEPS = 8;

// ─── SessionCard ──────────────────────────────────────────────────────────────
const SessionCard: React.FC<{
  session: Program['sessions'][number];
  index: number;
  theme: any;
  t: any;
  onStart: (sess: Program['sessions'][number], sport?: boolean) => void;
  launching: boolean;
}> = ({ session, index, theme, t, onStart, launching }) => {
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
              <Text style={[styles.sessionFocus, { color: theme.colors.textSecondary }]}>{session.focus}</Text>
              {(session.estimated_minutes ?? 0) > 0 && (
                <>
                  <Ionicons name="time-outline" size={12} color={theme.colors.textSecondary} style={{ marginLeft: 8 }} />
                  <Text style={[styles.sessionFocus, { color: theme.colors.textSecondary }]}>~{session.estimated_minutes} min</Text>
                </>
              )}
            </View>
          </View>
        </View>

        <Pressable onPress={() => { Haptics.selectionAsync().catch(() => {}); setExpanded(v => !v); }}>
          <View style={styles.exerciseList}>
            {displayedSets.map((s, idx) => (
              <View key={`${session.day_index}-${s.order_index}-${idx}`} style={[styles.exerciseRow, { borderBottomColor: theme.colors.border }]}>
                <View style={[styles.exerciseDot, { backgroundColor: theme.colors.accent }]} />
                <Text style={[styles.exerciseName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                  {s.exercise_slug.replace(/-/g, ' ')}
                </Text>
                {expanded ? (
                  <View style={styles.exerciseDetails}>
                    {s.notes ? (
                      <View style={[styles.detailBadge, { backgroundColor: theme.colors.surfaceMuted }]}>
                        <Text style={[styles.detailBadgeText, { color: theme.colors.textPrimary }]}>{s.notes}</Text>
                      </View>
                    ) : null}
                    <View style={[styles.detailBadge, { backgroundColor: theme.colors.surfaceMuted }]}>
                      <Text style={[styles.detailBadgeText, { color: theme.colors.textPrimary }]}>
                        {typeof s.reps === 'number' ? `${s.reps}` : s.reps} reps
                      </Text>
                    </View>
                    {s.rpe != null && (
                      <View style={[styles.detailBadge, { backgroundColor: theme.colors.accent + '20' }]}>
                        <Text style={[styles.detailBadgeText, { color: theme.colors.accent }]}>RPE {s.rpe}</Text>
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
            <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={theme.colors.accent} />
            <Text style={[styles.expandToggleText, { color: theme.colors.accent }]}>
              {expanded ? t('hideDetails') : t('seeDetails')}
            </Text>
          </View>
        </Pressable>

        <View style={styles.sessionActions}>
          <Pressable
            style={({ pressed }) => [styles.actionBtn, styles.actionBtnSecondary, { borderColor: theme.colors.border, opacity: pressed ? 0.7 : 1 }]}
            onPress={() => onStart(session, true)}
            disabled={launching}
          >
            <Ionicons name="play-circle-outline" size={18} color={theme.colors.textPrimary} />
            <Text style={[styles.actionBtnText, { color: theme.colors.textPrimary }]}>{t('sportMode')}</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.actionBtn, { backgroundColor: theme.colors.accent, opacity: pressed ? 0.8 : 1 }]}
            onPress={() => onStart(session, false)}
            disabled={launching}
          >
            <Ionicons name="play" size={18} color="#FFFFFF" />
            <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>{t('startSession')}</Text>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CreateProgramScreen() {
  const { theme, mode } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { createDraft, addExercise, addSet, refresh, pullFromServer } = useWorkouts();
  const { isAuthenticated } = useAuth();
  const { isPremium, aiProgramsRemaining, showPaywall, refreshStatus } = useSubscription();
  const { profile } = useUserProfile();
  const { t } = useTranslations();

  // Wizard step: -1 = paywall gate, 1-7 = questions, 8 = results
  const [step, setStep] = useState(1);
  const [showGate, setShowGate] = useState(false);

  // Form state
  const [objective, setObjective] = useState('Hypertrophie');
  const [frequency, setFrequency] = useState(3);
  const [niveau, setNiveau] = useState('Intermédiaire');
  const [equipmentAvailable, setEquipmentAvailable] = useState<string[]>(['barbell', 'dumbbell']);
  const [dureeSeance, setDureeSeance] = useState(60);
  const [durationWeeks, setDurationWeeks] = useState(4);
  const [exercisesPerSession] = useState(4);
  const [methodePreferee, setMethodePreferee] = useState('');
  const [blessures, setBlessures] = useState('');

  // Result state
  const [program, setProgram] = useState<Program | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingSessions, setSavingSessions] = useState(false);
  const [programSaved, setProgramSaved] = useState(false);
  const [launchingSession, setLaunchingSession] = useState<number | null>(null);

  // Animation
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Refresh status on mount to get up-to-date remaining count
  useEffect(() => {
    refreshStatus();
  }, []);

  // Check freemium gate
  useEffect(() => {
    if (!isPremium && aiProgramsRemaining <= 0) {
      setShowGate(true);
    }
  }, [isPremium, aiProgramsRemaining]);

  const animateStep = (nextStep: number, direction: 1 | -1 = 1) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -direction * 40, duration: 120, useNativeDriver: true }),
    ]).start(() => {
      setStep(nextStep);
      slideAnim.setValue(direction * 40);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    });
  };

  const goNext = () => {
    Haptics.selectionAsync().catch(() => {});
    if (step < TOTAL_STEPS) {
      animateStep(step + 1, 1);
    } else {
      handleGenerate();
    }
  };

  const goBack = () => {
    Haptics.selectionAsync().catch(() => {});
    if (step > 1) {
      animateStep(step - 1, -1);
    } else {
      router.back();
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

  const handleGenerate = async () => {
    if (!isPremium && aiProgramsRemaining <= 0) {
      showPaywall();
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setLoading(true);
    setError(null);
    setProgramSaved(false);
    animateStep(8, 1);
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
      const msg = e instanceof Error ? e.message : t('generationImpossible');
      if (msg.includes('ai_program_limit_reached') || msg.includes('403')) {
        setShowGate(true);
        setLoading(false);
        return;
      }
      setError(msg);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setLoading(false);
      refreshStatus();
    }
  };

  const handleSaveAllSessions = async () => {
    if (!program?.id) { Alert.alert(t('error'), t('programNotFound')); return; }
    if (!isAuthenticated) { Alert.alert(t('connectionRequired'), t('loginRequiredToSave')); return; }
    Haptics.selectionAsync().catch(() => {});
    setSavingSessions(true);
    try {
      const result = await saveProgram(String(program.id));
      for (const workoutData of result.workouts) {
        const session = program.sessions.find(s => s.day_index === workoutData.day_index);
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
        result.workouts_created > 1
          ? t('sessionsRegisteredCount', { count: result.workouts_created })
          : t('sessionRegisteredCount', { count: result.workouts_created })
      );
    } catch (err: unknown) {
      Alert.alert(t('error'), err instanceof Error ? err.message : t('cannotSave'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setSavingSessions(false);
    }
  };

  const handleStartSession = async (sess: Program['sessions'][number], modeSport = false) => {
    if (!sess.sets?.length) { Alert.alert(t('emptySession'), t('sessionHasNoSets')); return; }
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
      Alert.alert(t('error'), err instanceof Error ? err.message : t('cannotStart'));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setLaunchingSession(null);
    }
  };

  const toggleEquipment = (id: string) => {
    Haptics.selectionAsync().catch(() => {});
    setEquipmentAvailable(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  const equipmentOptions = [
    { id: 'barbell', label: t('barreLabel'), icon: 'barbell-outline' as const },
    { id: 'dumbbell', label: t('dumbbellsLabel'), icon: 'fitness-outline' as const },
    { id: 'bodyweight', label: t('bodyweightLabel'), icon: 'body-outline' as const },
    { id: 'machine', label: t('machinesLabel'), icon: 'cog-outline' as const },
    { id: 'cable', label: t('cablesLabel'), icon: 'git-branch-outline' as const },
    { id: 'kettlebell', label: t('kettlebellLabel'), icon: 'disc-outline' as const },
  ];

  const objectiveOptions = [
    { id: 'Hypertrophie', label: t('hypertrophyLabel'), icon: 'trending-up-outline' as const, color: '#6366f1', desc: t('massGainDesc') },
    { id: 'Force', label: t('forceOptionLabel'), icon: 'flash-outline' as const, color: '#ef4444', desc: t('maxPowerDesc') },
    { id: 'Endurance', label: t('enduranceLabel'), icon: 'pulse-outline' as const, color: '#10b981', desc: t('muscularCardioDesc') },
    { id: 'Remise en forme', label: t('fitnessLabel'), icon: 'heart-outline' as const, color: '#f59e0b', desc: t('fitnessDesc') },
  ];

  const niveauOptions = [
    { id: 'Débutant', label: t('beginnerLevel'), icon: 'leaf-outline' as const, color: '#10b981', desc: 'Moins de 1 an de pratique régulière' },
    { id: 'Intermédiaire', label: t('intermediateLevel'), icon: 'flame-outline' as const, color: '#f59e0b', desc: '1 à 3 ans de pratique régulière' },
    { id: 'Avancé', label: t('advancedLevel'), icon: 'rocket-outline' as const, color: '#ef4444', desc: 'Plus de 3 ans de pratique régulière' },
  ];

  const methodeOptions = [
    { id: '', label: t('autoMethod'), icon: 'sparkles-outline' as const, color: '#6366f1', desc: 'IA choisit la meilleure organisation pour toi' },
    { id: 'fullbody', label: t('fullBody'), icon: 'body-outline' as const, color: '#10b981', desc: 'Corps entier à chaque séance — idéal 2-3x/sem' },
    { id: 'upperlower', label: t('upperLower'), icon: 'git-branch-outline' as const, color: '#f59e0b', desc: 'Haut/Bas alternés — idéal 4x/sem' },
    { id: 'ppl', label: t('pplMethod'), icon: 'layers-outline' as const, color: '#ef4444', desc: 'Push/Pull/Legs — idéal 5-6x/sem' },
  ];

  // ─── Step config (1 question per step) ──────────────────────────────────
  const stepConfig = [
    null, // index 0 unused
    { q: 'Quel est ton objectif ?',           why: 'Définit les volumes, les intensités et les exercices de tout ton programme.' },
    { q: 'Combien de séances par semaine ?',  why: 'La fréquence détermine le volume et le temps de récupération musculaire.' },
    { q: 'Quel est ton niveau ?',             why: 'Adapte la complexité des exercices et la progression attendue.' },
    { q: 'Quel équipement as-tu ?',           why: 'Seuls les exercices réalisables avec ton matériel seront inclus.' },
    { q: 'Combien de temps par séance ?',     why: 'Détermine le nombre d\'exercices et l\'organisation des temps de repos.' },
    { q: 'Sur combien de semaines ?',         why: '4 semaines = cycle court. 8-12 semaines = progression solide sur la durée.' },
    { q: 'Comment organiser tes séances ?',   why: 'La méthode détermine quels muscles sont travaillés ensemble à chaque séance.' },
    { q: 'As-tu des blessures ou limitations ?', why: 'Permet d\'exclure les exercices contre-indiqués et d\'adapter le programme.' },
  ];

  // ─── Freemium Gate ─────────────────────────────────────────────────────────
  if (showGate) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.gateContainer, { paddingTop: insets.top + 20 }]}>
          <Pressable style={styles.gateBackBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={theme.colors.textPrimary} />
          </Pressable>

          <View style={styles.gateContent}>
            <LinearGradient colors={['#6366f120', '#6366f108']} style={styles.gateIconWrapper}>
              <Ionicons name="lock-closed" size={40} color="#6366f1" />
            </LinearGradient>

            <Text style={[styles.gateTitle, { color: theme.colors.textPrimary }]}>
              Programme du mois utilisé
            </Text>
            <Text style={[styles.gateSubtitle, { color: theme.colors.textSecondary }]}>
              Avec le plan gratuit, tu peux générer{'\n'}
              <Text style={{ fontWeight: '700', color: theme.colors.textPrimary }}>1 programme IA par mois.</Text>
              {'\n\n'}Passe à Premium pour des programmes illimités, une personnalisation avancée et l'accès à toutes les fonctionnalités.
            </Text>

            <View style={styles.gateFeatures}>
              {[
                { icon: 'infinite-outline', text: 'Programmes IA illimités' },
                { icon: 'stats-chart-outline', text: 'Personnalisation avancée' },
                { icon: 'trophy-outline', text: 'Suivi de progression détaillé' },
              ].map((f, i) => (
                <View key={i} style={[styles.gateFeatureRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <View style={[styles.gateFeatureIcon, { backgroundColor: '#6366f120' }]}>
                    <Ionicons name={f.icon as any} size={18} color="#6366f1" />
                  </View>
                  <Text style={[styles.gateFeatureText, { color: theme.colors.textPrimary }]}>{f.text}</Text>
                </View>
              ))}
            </View>

            <Pressable
              style={({ pressed }) => [styles.gatePrimaryBtn, { opacity: pressed ? 0.9 : 1 }]}
              onPress={() => showPaywall()}
            >
              <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.gatePrimaryBtnGradient}>
                <Ionicons name="star" size={20} color="#fff" />
                <Text style={styles.gatePrimaryBtnText}>Passer à Premium</Text>
              </LinearGradient>
            </Pressable>

            <Text style={[styles.gateReset, { color: theme.colors.textSecondary }]}>
              Ton programme gratuit se renouvelle le 1er du mois prochain.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // ─── Results Screen (step 8) ───────────────────────────────────────────────
  if (step === 8) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={[styles.resultsHeader, { paddingTop: insets.top + 8, borderBottomColor: theme.colors.border }]}>
          <Pressable
            style={[styles.backBtn, { backgroundColor: theme.colors.surfaceMuted, width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }]}
            onPress={() => { animateStep(TOTAL_STEPS, -1); setProgram(null); setError(null); }}
          >
            <Ionicons name="arrow-back" size={20} color={theme.colors.textPrimary} />
          </Pressable>
          <Text style={[styles.resultsHeaderTitle, { color: theme.colors.textPrimary }]}>
            {loading ? 'Génération en cours…' : program ? 'Ton programme' : 'Erreur'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: insets.bottom + 40, paddingHorizontal: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {loading && (
            <View style={styles.loadingContainer}>
              <LinearGradient colors={['#6366f120', '#6366f108']} style={styles.loadingIconWrapper}>
                <Ionicons name="sparkles-outline" size={40} color="#6366f1" />
              </LinearGradient>
              <Text style={[styles.loadingTitle, { color: theme.colors.textPrimary }]}>
                L'IA crée ton programme…
              </Text>
              <Text style={[styles.loadingSubtitle, { color: theme.colors.textSecondary }]}>
                Analyse de tes paramètres et sélection des exercices optimaux
              </Text>
            </View>
          )}

          {error && !loading && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={40} color="#ef4444" />
              <Text style={[styles.errorTitle, { color: theme.colors.textPrimary }]}>Erreur de génération</Text>
              <Text style={[styles.errorText, { color: theme.colors.textSecondary }]}>{error}</Text>
              <Pressable
                style={({ pressed }) => [styles.retryBtn, { backgroundColor: theme.colors.accent, opacity: pressed ? 0.8 : 1 }]}
                onPress={handleGenerate}
              >
                <Text style={styles.retryBtnText}>Réessayer</Text>
              </Pressable>
            </View>
          )}

          {program && !loading && (
            <>
              {/* Program summary */}
              <View style={[styles.programSummary, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Text style={[styles.programTitle, { color: theme.colors.textPrimary }]}>{program.title}</Text>
                <View style={styles.programMeta}>
                  <View style={[styles.metaChip, { backgroundColor: theme.colors.accent + '20' }]}>
                    <Ionicons name="calendar-outline" size={14} color={theme.colors.accent} />
                    <Text style={[styles.metaChipText, { color: theme.colors.accent }]}>{program.duration_weeks} semaines</Text>
                  </View>
                  <View style={[styles.metaChip, { backgroundColor: theme.colors.accent + '20' }]}>
                    <Ionicons name="barbell-outline" size={14} color={theme.colors.accent} />
                    <Text style={[styles.metaChipText, { color: theme.colors.accent }]}>{program.sessions?.length} séances</Text>
                  </View>
                  <View style={[styles.metaChip, { backgroundColor: theme.colors.accent + '20' }]}>
                    <Ionicons name="trophy-outline" size={14} color={theme.colors.accent} />
                    <Text style={[styles.metaChipText, { color: theme.colors.accent }]}>{objective}</Text>
                  </View>
                </View>
              </View>

              {/* Sessions */}
              {program.sessions?.map((session, i) => (
                <SessionCard
                  key={session.day_index}
                  session={session}
                  index={i}
                  theme={theme}
                  t={t}
                  onStart={handleStartSession}
                  launching={launchingSession !== null}
                />
              ))}

              {/* Save all */}
              {!programSaved && (
                <AppButton
                  label={savingSessions ? t('saving') : t('saveAllSessions')}
                  onPress={handleSaveAllSessions}
                  loading={savingSessions}
                  style={{ marginTop: 8 }}
                />
              )}
              {programSaved && (
                <View style={[styles.savedBadge, { backgroundColor: '#10b98115', borderColor: '#10b98130' }]}>
                  <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                  <Text style={[styles.savedBadgeText, { color: '#10b981' }]}>Programme sauvegardé</Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>
    );
  }

  // ─── Wizard (1 question = 1 full page) ────────────────────────────────────
  const config = stepConfig[step];
  const isLastStep = step === TOTAL_STEPS;

  const selectAndAdvance = (setter: (v: any) => void, value: any) => {
    Haptics.selectionAsync().catch(() => {});
    setter(value);
    setTimeout(() => animateStep(step + 1, 1), 350);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>

      {/* ── Top bar: back + dots ── */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.backBtn} onPress={goBack} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={theme.colors.textPrimary} />
        </Pressable>

        <View style={styles.dotsRow}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i < step ? theme.colors.accent : theme.colors.border,
                  width: i === step - 1 ? 22 : 8,
                },
              ]}
            />
          ))}
        </View>

        {step === TOTAL_STEPS ? (
          <Pressable onPress={goNext} hitSlop={8}>
            <Text style={[styles.skipText, { color: theme.colors.textSecondary }]}>Passer</Text>
          </Pressable>
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>

      {/* ── Full-page animated content ── */}
      <Animated.View
        style={[styles.pageContent, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}
      >
        {/* Question */}
        <View style={styles.questionBlock}>
          <Text style={[styles.stepQuestion, { color: theme.colors.textPrimary }]}>{config?.q}</Text>
          <Text style={[styles.whyText, { color: theme.colors.textSecondary }]}>{config?.why}</Text>
        </View>

        {/* Options fill all remaining height */}
        <View style={styles.optionsArea}>

          {/* Step 1 — Objectif: 4 full-height cards */}
          {step === 1 && objectiveOptions.map(opt => (
            <Pressable
              key={opt.id}
              style={({ pressed }) => [
                styles.fullCard,
                {
                  backgroundColor: objective === opt.id ? opt.color + '18' : theme.colors.surface,
                  borderColor: objective === opt.id ? opt.color : theme.colors.border,
                  borderWidth: objective === opt.id ? 2 : 1,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              onPress={() => selectAndAdvance(setObjective, opt.id)}
            >
              <View style={[styles.cardIcon, { backgroundColor: opt.color + '20' }]}>
                <Ionicons name={opt.icon} size={22} color={opt.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardLabel, { color: theme.colors.textPrimary }]}>{opt.label}</Text>
                <Text style={[styles.cardDesc, { color: theme.colors.textSecondary }]}>{opt.desc}</Text>
              </View>
              {objective === opt.id && <Ionicons name="checkmark-circle" size={24} color={opt.color} />}
            </Pressable>
          ))}

          {/* Step 2 — Fréquence: counter centered */}
          {step === 2 && (
            <View style={styles.centeredBlock}>
              <View style={[styles.bigCounter, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Pressable
                  style={({ pressed }) => [styles.cntBtn, { backgroundColor: theme.colors.surfaceMuted, opacity: pressed ? 0.6 : 1 }]}
                  onPress={() => { Haptics.selectionAsync().catch(() => {}); setFrequency(f => Math.max(2, f - 1)); }}
                >
                  <Ionicons name="remove" size={32} color={theme.colors.textPrimary} />
                </Pressable>
                <View style={styles.cntValue}>
                  <Text style={[styles.cntNumber, { color: theme.colors.accent }]}>{frequency}</Text>
                  <Text style={[styles.cntUnit, { color: theme.colors.textSecondary }]}>séances / semaine</Text>
                </View>
                <Pressable
                  style={({ pressed }) => [styles.cntBtn, { backgroundColor: theme.colors.surfaceMuted, opacity: pressed ? 0.6 : 1 }]}
                  onPress={() => { Haptics.selectionAsync().catch(() => {}); setFrequency(f => Math.min(6, f + 1)); }}
                >
                  <Ionicons name="add" size={32} color={theme.colors.textPrimary} />
                </Pressable>
              </View>
              <View style={{ gap: 10, marginTop: 8 }}>
                {[
                  { range: '2-3', label: 'Débutant · Entretien', active: frequency <= 3, val: 3 },
                  { range: '4',   label: 'Optimal pour la masse', active: frequency === 4, val: 4 },
                  { range: '5-6', label: 'Avancé · Haute fréquence', active: frequency >= 5, val: 5 },
                ].map(h => (
                  <Pressable
                    key={h.range}
                    style={[
                      styles.hintRow,
                      {
                        backgroundColor: h.active ? theme.colors.accent + '15' : theme.colors.surface,
                        borderColor: h.active ? theme.colors.accent + '50' : theme.colors.border,
                      },
                    ]}
                    onPress={() => { Haptics.selectionAsync().catch(() => {}); setFrequency(h.val); }}
                  >
                    <Text style={[styles.hintRange, { color: h.active ? theme.colors.accent : theme.colors.textSecondary }]}>{h.range}×</Text>
                    <Text style={[styles.hintLabel, { color: h.active ? theme.colors.textPrimary : theme.colors.textSecondary }]}>{h.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Step 3 — Niveau: 3 full-height cards */}
          {step === 3 && niveauOptions.map(opt => (
            <Pressable
              key={opt.id}
              style={({ pressed }) => [
                styles.fullCard,
                {
                  backgroundColor: niveau === opt.id ? opt.color + '18' : theme.colors.surface,
                  borderColor: niveau === opt.id ? opt.color : theme.colors.border,
                  borderWidth: niveau === opt.id ? 2 : 1,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              onPress={() => selectAndAdvance(setNiveau, opt.id)}
            >
              <View style={[styles.cardIcon, { backgroundColor: opt.color + '20' }]}>
                <Ionicons name={opt.icon} size={22} color={opt.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardLabel, { color: theme.colors.textPrimary }]}>{opt.label}</Text>
                <Text style={[styles.cardDesc, { color: theme.colors.textSecondary }]}>{opt.desc}</Text>
              </View>
              {niveau === opt.id && <Ionicons name="checkmark-circle" size={24} color={opt.color} />}
            </Pressable>
          ))}

          {/* Step 4 — Équipement: 2-col grid, rows fill height */}
          {step === 4 && (
            <View style={styles.equipGrid}>
              {Array.from({ length: Math.ceil(equipmentOptions.length / 2) }, (_, row) => (
                <View key={row} style={styles.equipRow}>
                  {equipmentOptions.slice(row * 2, row * 2 + 2).map(opt => {
                    const selected = equipmentAvailable.includes(opt.id);
                    return (
                      <Pressable
                        key={opt.id}
                        style={({ pressed }) => [
                          styles.equipTile,
                          {
                            backgroundColor: selected ? theme.colors.accent + '18' : theme.colors.surface,
                            borderColor: selected ? theme.colors.accent : theme.colors.border,
                            borderWidth: selected ? 2 : 1,
                            opacity: pressed ? 0.8 : 1,
                          },
                        ]}
                        onPress={() => toggleEquipment(opt.id)}
                      >
                        <Ionicons name={opt.icon} size={28} color={selected ? theme.colors.accent : theme.colors.textSecondary} />
                        <Text style={[styles.equipLabel, { color: selected ? theme.colors.accent : theme.colors.textPrimary }]}>{opt.label}</Text>
                        {selected && <Ionicons name="checkmark-circle" size={18} color={theme.colors.accent} />}
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
          )}

          {/* Step 5 — Durée séance: counter centered */}
          {step === 5 && (
            <View style={styles.centeredBlock}>
              <View style={[styles.bigCounter, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Pressable
                  style={({ pressed }) => [styles.cntBtn, { backgroundColor: theme.colors.surfaceMuted, opacity: pressed ? 0.6 : 1 }]}
                  onPress={() => { Haptics.selectionAsync().catch(() => {}); setDureeSeance(d => Math.max(30, d - 15)); }}
                >
                  <Ionicons name="remove" size={32} color={theme.colors.textPrimary} />
                </Pressable>
                <View style={styles.cntValue}>
                  <Text style={[styles.cntNumber, { color: theme.colors.accent }]}>{dureeSeance}</Text>
                  <Text style={[styles.cntUnit, { color: theme.colors.textSecondary }]}>minutes</Text>
                </View>
                <Pressable
                  style={({ pressed }) => [styles.cntBtn, { backgroundColor: theme.colors.surfaceMuted, opacity: pressed ? 0.6 : 1 }]}
                  onPress={() => { Haptics.selectionAsync().catch(() => {}); setDureeSeance(d => Math.min(120, d + 15)); }}
                >
                  <Ionicons name="add" size={32} color={theme.colors.textPrimary} />
                </Pressable>
              </View>
            </View>
          )}

          {/* Step 6 — Durée programme: counter centered */}
          {step === 6 && (
            <View style={styles.centeredBlock}>
              <View style={[styles.bigCounter, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <Pressable
                  style={({ pressed }) => [styles.cntBtn, { backgroundColor: theme.colors.surfaceMuted, opacity: pressed ? 0.6 : 1 }]}
                  onPress={() => { Haptics.selectionAsync().catch(() => {}); setDurationWeeks(w => Math.max(2, w - 1)); }}
                >
                  <Ionicons name="remove" size={32} color={theme.colors.textPrimary} />
                </Pressable>
                <View style={styles.cntValue}>
                  <Text style={[styles.cntNumber, { color: theme.colors.accent }]}>{durationWeeks}</Text>
                  <Text style={[styles.cntUnit, { color: theme.colors.textSecondary }]}>semaines</Text>
                </View>
                <Pressable
                  style={({ pressed }) => [styles.cntBtn, { backgroundColor: theme.colors.surfaceMuted, opacity: pressed ? 0.6 : 1 }]}
                  onPress={() => { Haptics.selectionAsync().catch(() => {}); setDurationWeeks(w => Math.min(16, w + 1)); }}
                >
                  <Ionicons name="add" size={32} color={theme.colors.textPrimary} />
                </Pressable>
              </View>
            </View>
          )}

          {/* Step 7 — Méthode: 4 full-height cards */}
          {step === 7 && methodeOptions.map(opt => (
            <Pressable
              key={opt.id}
              style={({ pressed }) => [
                styles.fullCard,
                {
                  backgroundColor: methodePreferee === opt.id ? opt.color + '18' : theme.colors.surface,
                  borderColor: methodePreferee === opt.id ? opt.color : theme.colors.border,
                  borderWidth: methodePreferee === opt.id ? 2 : 1,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              onPress={() => selectAndAdvance(setMethodePreferee, opt.id)}
            >
              <View style={[styles.cardIcon, { backgroundColor: opt.color + '20' }]}>
                <Ionicons name={opt.icon} size={22} color={opt.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardLabel, { color: theme.colors.textPrimary }]}>{opt.label}</Text>
                <Text style={[styles.cardDesc, { color: theme.colors.textSecondary }]}>{opt.desc}</Text>
              </View>
              {methodePreferee === opt.id && <Ionicons name="checkmark-circle" size={24} color={opt.color} />}
            </Pressable>
          ))}

          {/* Step 8 — Contraintes */}
          {step === 8 && (
            <View style={{ flex: 1, gap: 12 }}>
              <TextInput
                style={[
                  styles.constraintsInput,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.textPrimary,
                    flex: 1,
                  },
                ]}
                placeholder="Ex: douleur au genou gauche, épaule fragile, pas de sauts..."
                placeholderTextColor={theme.colors.textSecondary}
                value={blessures}
                onChangeText={setBlessures}
                multiline
                textAlignVertical="top"
              />
              <Text style={[styles.constraintsHint, { color: theme.colors.textSecondary }]}>
                Optionnel · Passe cette étape si tu n'as aucune limitation.
              </Text>
            </View>
          )}

        </View>
      </Animated.View>

      {/* ── Bottom: Suivant button ── */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          style={({ pressed }) => [styles.nextBtn, { opacity: pressed ? 0.9 : 1 }]}
          onPress={goNext}
        >
          <LinearGradient
            colors={isLastStep ? ['#10b981', '#0d9488'] : [theme.colors.accent, theme.colors.accent]}
            style={styles.nextBtnGradient}
          >
            <Text style={styles.nextBtnText}>{isLastStep ? 'Générer mon programme' : 'Suivant'}</Text>
            <Ionicons name={isLastStep ? 'sparkles' : 'arrow-forward'} size={20} color="#fff" />
          </LinearGradient>
        </Pressable>
        {!isPremium && (
          <Text style={[styles.remainingText, { color: theme.colors.textSecondary }]}>
            {aiProgramsRemaining > 0
              ? `${aiProgramsRemaining} programme${aiProgramsRemaining > 1 ? 's' : ''} gratuit${aiProgramsRemaining > 1 ? 's' : ''} restant ce mois`
              : 'Aucun programme gratuit restant ce mois'}
          </Text>
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },

  // Gate
  gateContainer: { flex: 1, paddingHorizontal: 20 },
  gateBackBtn: { marginBottom: 24 },
  gateContent: { flex: 1, alignItems: 'center' },
  gateIconWrapper: { width: 88, height: 88, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  gateTitle: { fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 16 },
  gateSubtitle: { fontSize: 15, lineHeight: 24, textAlign: 'center', marginBottom: 32 },
  gateFeatures: { width: '100%', gap: 10, marginBottom: 32 },
  gateFeatureRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, gap: 12 },
  gateFeatureIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  gateFeatureText: { fontSize: 15, fontWeight: '600' },
  gatePrimaryBtn: { width: '100%', borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  gatePrimaryBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 10 },
  gatePrimaryBtnText: { fontSize: 17, fontWeight: '700', color: '#fff' },
  gateReset: { fontSize: 13, textAlign: 'center' },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
    gap: 12,
  },
  backBtn: { padding: 4 },
  dotsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dot: { height: 8, borderRadius: 4 },
  skipText: { fontSize: 14, fontWeight: '600' },

  // Full-page layout
  pageContent: { flex: 1, paddingHorizontal: 20 },
  questionBlock: { paddingTop: 16, marginBottom: 20 },
  stepQuestion: { fontSize: 28, fontWeight: '800', lineHeight: 36, marginBottom: 6 },
  whyText: { fontSize: 13, lineHeight: 19 },

  // Options area fills all remaining height
  optionsArea: { flex: 1, gap: 10, paddingBottom: 8 },

  // Full-height cards (steps 1, 3, 7)
  fullCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    borderRadius: 18,
    gap: 16,
  },
  cardIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardLabel: { fontSize: 16, fontWeight: '700', marginBottom: 3 },
  cardDesc: { fontSize: 12, lineHeight: 17 },

  // Counter (steps 2, 5, 6)
  centeredBlock: { flex: 1, justifyContent: 'center', gap: 20 },
  bigCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
  },
  cntBtn: { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  cntValue: { alignItems: 'center' },
  cntNumber: { fontSize: 56, fontWeight: '800', lineHeight: 64 },
  cntUnit: { fontSize: 14, fontWeight: '500' },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 14,
  },
  hintRange: { fontSize: 18, fontWeight: '800', width: 42 },
  hintLabel: { fontSize: 14, fontWeight: '500' },

  // Equipment grid (step 4): 2 cols, rows fill height
  equipGrid: { flex: 1, gap: 10 },
  equipRow: { flex: 1, flexDirection: 'row', gap: 10 },
  equipTile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    gap: 8,
  },
  equipLabel: { fontSize: 14, fontWeight: '600', textAlign: 'center' },

  // Constraints (step 8)
  constraintsInput: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    lineHeight: 22,
  },
  constraintsHint: { fontSize: 13, lineHeight: 20 },

  // Bottom bar
  bottomBar: { paddingHorizontal: 20, paddingTop: 12, gap: 8 },
  nextBtn: { borderRadius: 18, overflow: 'hidden' },
  nextBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 17,
    gap: 10,
  },
  nextBtnText: { fontSize: 17, fontWeight: '700', color: '#fff' },
  remainingText: { fontSize: 12, textAlign: 'center' },

  // Results
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  resultsHeaderTitle: { fontSize: 17, fontWeight: '700' },

  loadingContainer: { alignItems: 'center', paddingTop: 60, gap: 16 },
  loadingIconWrapper: { width: 96, height: 96, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  loadingTitle: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  loadingSubtitle: { fontSize: 14, lineHeight: 22, textAlign: 'center', paddingHorizontal: 20 },

  errorContainer: { alignItems: 'center', paddingTop: 60, gap: 16, paddingHorizontal: 20 },
  errorTitle: { fontSize: 20, fontWeight: '700' },
  errorText: { fontSize: 14, lineHeight: 22, textAlign: 'center' },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  programSummary: {
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
    marginTop: 16,
  },
  programTitle: { fontSize: 20, fontWeight: '800', marginBottom: 12 },
  programMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  metaChipText: { fontSize: 13, fontWeight: '600' },

  savedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    marginTop: 8,
  },
  savedBadgeText: { fontSize: 15, fontWeight: '600' },

  // Session card
  sessionCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  sessionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  sessionBadge: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sessionBadgeText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  sessionInfo: { flex: 1 },
  sessionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  sessionMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sessionFocus: { fontSize: 12 },
  exerciseList: { gap: 6, marginBottom: 8 },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    gap: 8,
  },
  exerciseDot: { width: 6, height: 6, borderRadius: 3 },
  exerciseName: { flex: 1, fontSize: 14, fontWeight: '500' },
  exerciseReps: { fontSize: 13 },
  exerciseDetails: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  detailBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  detailBadgeText: { fontSize: 12, fontWeight: '600' },
  moreText: { fontSize: 13, paddingVertical: 4 },
  expandToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8 },
  expandToggleText: { fontSize: 13, fontWeight: '600' },
  sessionActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  actionBtnSecondary: { borderWidth: 1 },
  actionBtnText: { fontSize: 14, fontWeight: '600' },
});
