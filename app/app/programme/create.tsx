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
import { generateProgram, saveProgram } from '@/services/programsApi';
import { Program } from '@/types/program';
import { useWorkouts } from '@/hooks/useWorkouts';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'expo-router';

import { useUserProfile } from '@/hooks/useUserProfile';

const CreateProgramScreen: React.FC = () => {
  const { theme, mode } = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { createDraft, addExercise, addSet, refresh, pullFromServer } = useWorkouts();
  const { isAuthenticated } = useAuth();
  const { profile } = useUserProfile(); // 🎯 NOUVEAU: Récupérer le profil utilisateur

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
  const [showProfileSuggestions, setShowProfileSuggestions] = useState(true); // 🎯 NOUVEAU

  // États avancés
  const [niveau, setNiveau] = useState('Intermédiaire');
  const [dureeSeance, setDureeSeance] = useState('45');
  const [blessures, setBlessures] = useState('');
  const [equipmentAvailable, setEquipmentAvailable] = useState<string[]>(['barbell', 'dumbbell']);
  const [methodePreferee, setMethodePreferee] = useState<string>('');

  // 🎯 NOUVEAU: Suggestions intelligentes basées sur le profil
  const profileSuggestions = useMemo(() => {
    if (!profile) return null;
    
    const suggestions = [];
    
    // Suggestion d'objectif
    if (profile.objective && profile.objective !== objective) {
      const objectiveMap: Record<string, string> = {
        'muscle_gain': 'Hypertrophie',
        'weight_loss': 'Perte de poids',
        'strength': 'Force', 
        'endurance': 'Endurance',
        'general_fitness': 'Remise en forme'
      };
      const suggestedObjective = objectiveMap[profile.objective] || profile.objective;
      suggestions.push({
        type: 'objective',
        message: `Objectif suggéré: ${suggestedObjective}`,
        action: () => setObjective(suggestedObjective),
        icon: 'flag-outline'
      });
    }
    
    // Suggestion de niveau
    if (profile.experience_level && profile.experience_level !== niveau.toLowerCase()) {
      const levelMap: Record<string, string> = {
        'beginner': 'Débutant',
        'intermediate': 'Intermédiaire',
        'advanced': 'Avancé'
      };
      const suggestedLevel = levelMap[profile.experience_level] || profile.experience_level;
      suggestions.push({
        type: 'level',
        message: `Niveau suggéré: ${suggestedLevel}`,
        action: () => setNiveau(suggestedLevel),
        icon: 'trophy-outline'
      });
    }
    
    // Suggestion de fréquence
    if (profile.training_frequency && profile.training_frequency !== frequency) {
      suggestions.push({
        type: 'frequency',
        message: `Fréquence suggérée: ${profile.training_frequency}x/semaine`,
        action: () => setFrequency(profile.training_frequency),
        icon: 'calendar-outline'
      });
    }
    
    return suggestions.length > 0 ? suggestions : null;
  }, [profile, objective, niveau, frequency]);

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
      { id: 'barbell', label: 'Barre', icon: 'barbell-outline' as const },
      { id: 'dumbbell', label: 'Haltères', icon: 'fitness-outline' as const },
      { id: 'bodyweight', label: 'Poids du corps', icon: 'body-outline' as const },
      { id: 'machine', label: 'Machines', icon: 'cog-outline' as const },
      { id: 'cable', label: 'Câbles', icon: 'git-branch-outline' as const },
      { id: 'kettlebell', label: 'Kettlebell', icon: 'disc-outline' as const },
    ],
    []
  );

  const objectiveOptions = useMemo(
    () => [
      { id: 'Hypertrophie', label: 'Hypertrophie', icon: 'trending-up-outline' as const, desc: 'Prise de masse' },
      { id: 'Force', label: 'Force', icon: 'flash-outline' as const, desc: 'Puissance max' },
      { id: 'Endurance', label: 'Endurance', icon: 'pulse-outline' as const, desc: 'Cardio musculaire' },
      { id: 'Remise en forme', label: 'Fitness', icon: 'heart-outline' as const, desc: 'Remise en forme' },
    ],
    []
  );

  const niveauOptions = useMemo(
    () => [
      { id: 'Débutant', icon: 'leaf-outline' as const },
      { id: 'Intermédiaire', icon: 'flame-outline' as const },
      { id: 'Avancé', icon: 'rocket-outline' as const },
    ],
    []
  );

  const methodeOptions = useMemo(
    () => [
      { id: '', label: 'Auto', desc: 'Choix optimal' },
      { id: 'fullbody', label: 'Full Body', desc: 'Corps entier' },
      { id: 'upperlower', label: 'Upper/Lower', desc: 'Haut/Bas' },
      { id: 'ppl', label: 'PPL', desc: 'Push/Pull/Legs' },
    ],
    []
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
      const errorMessage = e instanceof Error ? e.message : 'Génération impossible';
      setError(errorMessage);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setLoading(false);
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
      Alert.alert('Erreur', 'Programme introuvable');
      return;
    }
    if (!isAuthenticated) {
      Alert.alert('Connexion requise', 'Tu dois être connecté pour enregistrer les séances.');
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
        'Séances enregistrées !',
        `${result.workouts_created} séance${result.workouts_created > 1 ? 's' : ''} enregistrée${result.workouts_created > 1 ? 's' : ''}.`
      );
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Impossible d'enregistrer";
      Alert.alert('Erreur', errorMessage);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setSavingSessions(false);
    }
  };

  const handleStartSession = async (sess: Program['sessions'][number], modeSport = false) => {
    if (!sess.sets?.length) {
      Alert.alert('Séance vide', 'Cette séance ne contient pas de séries.');
      return;
    }
    Haptics.selectionAsync().catch(() => {});
    try {
      setLaunchingSession(sess.day_index);
      const draft = await createDraft(sess.title || `Séance ${sess.day_index + 1}`);
      if (!draft) throw new Error('Impossible de créer la séance');

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
      const errorMessage = err instanceof Error ? err.message : 'Impossible de démarrer';
      Alert.alert('Erreur', errorMessage);
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

    useEffect(() => {
      Animated.spring(cardAnim, {
        toValue: 1,
        delay: index * 80,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    }, [cardAnim, index]);

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
              </View>
            </View>
          </View>

          <View style={styles.exerciseList}>
            {session.sets.slice(0, 4).map((s, idx) => (
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
                <Text style={[styles.exerciseReps, { color: theme.colors.textSecondary }]}>
                  {typeof s.reps === 'number' ? `${s.reps}` : s.reps}
                </Text>
              </View>
            ))}
            {session.sets.length > 4 && (
              <Text style={[styles.moreText, { color: theme.colors.textSecondary }]}>
                +{session.sets.length - 4} exercice{session.sets.length - 4 > 1 ? 's' : ''}
              </Text>
            )}
          </View>

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
              <Text style={[styles.actionBtnText, { color: theme.colors.textPrimary }]}>Sport</Text>
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
              <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>Démarrer</Text>
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
              Créer un programme
            </Text>
            <Text style={[styles.heroSubtitle, { color: theme.colors.textSecondary }]}>
              Personnalise ton entraînement selon tes objectifs
            </Text>
          </Animated.View>
        </LinearGradient>

        <View style={styles.content}>
          {/* Section Objectif */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="flag" size={20} color={theme.colors.accent} />
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Objectif</Text>
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

          {/* 🎯 NOUVEAU: Section Suggestions Intelligentes */}
          {profileSuggestions && showProfileSuggestions && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="bulb" size={20} color="#f59e0b" />
                <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                  Suggestions basées sur ton profil
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
                    Personnalisation intelligente
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
                      <Text style={styles.suggestionButtonText}>Appliquer</Text>
                    </View>
                  </Pressable>
                ))}
                <Text style={[styles.suggestionNote, { color: theme.colors.textSecondary }]}>
                  💡 Ces suggestions sont basées sur les informations de ton profil
                </Text>
              </View>
            </View>
          )}

          {/* Section Paramètres */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="settings" size={20} color={theme.colors.accent} />
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Paramètres</Text>
            </View>
            <View style={styles.countersGrid}>
              <Counter
                value={frequency}
                unit="/ sem"
                label="Fréquence"
                icon="calendar-outline"
                onDecrement={() => updateValue(setFrequency, -1, 2, 6)}
                onIncrement={() => updateValue(setFrequency, 1, 2, 6)}
              />
              <Counter
                value={exercisesPerSession}
                unit="exos"
                label="Par séance"
                icon="barbell-outline"
                onDecrement={() => updateValue(setExercisesPerSession, -1, 3, 8)}
                onIncrement={() => updateValue(setExercisesPerSession, 1, 3, 8)}
              />
              <Counter
                value={durationWeeks}
                unit="sem"
                label="Durée"
                icon="time-outline"
                onDecrement={() => updateValue(setDurationWeeks, -1, 2, 16)}
                onIncrement={() => updateValue(setDurationWeeks, 1, 2, 16)}
              />
              <Counter
                value={parseInt(dureeSeance)}
                unit="min"
                label="Séance"
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
          </View>

          {/* Section Niveau */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="trophy" size={20} color={theme.colors.accent} />
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Niveau</Text>
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
                      {opt.id}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Section Méthode */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="git-network" size={20} color={theme.colors.accent} />
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Méthode</Text>
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
          </View>

          {/* Section Équipement */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="construct" size={20} color={theme.colors.accent} />
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Équipement</Text>
              <View style={[styles.badge, { backgroundColor: theme.colors.surfaceMuted }]}>
                <Text style={[styles.badgeText, { color: theme.colors.textSecondary }]}>
                  {equipmentAvailable.length} sélectionné{equipmentAvailable.length > 1 ? 's' : ''}
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
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Contraintes</Text>
            </View>
            <TextInput
              value={blessures}
              onChangeText={setBlessures}
              placeholder="Ex: Genou fragile, dos sensible..."
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
            title={loading ? 'Génération en cours...' : '✨ Générer mon programme'}
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
                          {program.duration_weeks} sem
                        </Text>
                      </View>
                      <View style={[styles.programTag, { backgroundColor: theme.colors.surfaceMuted }]}>
                        <Ionicons name="layers-outline" size={12} color={theme.colors.accent} />
                        <Text style={[styles.programTagText, { color: theme.colors.textPrimary }]}>
                          {program.sessions.length} séances
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
                {programSaved && (
                  <View style={[styles.savedBadge, { backgroundColor: theme.colors.primaryMuted + '20' }]}>
                    <Ionicons name="checkmark-circle" size={16} color={theme.colors.primaryMuted} />
                    <Text style={[styles.savedBadgeText, { color: theme.colors.primaryMuted }]}>Sauvé</Text>
                  </View>
                )}
              </View>

              {isAuthenticated && !programSaved && (
                <AppButton
                  title={savingSessions ? 'Enregistrement...' : '💾 Enregistrer toutes les séances'}
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
  // 🎯 NOUVEAU: Styles pour les suggestions intelligentes
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
