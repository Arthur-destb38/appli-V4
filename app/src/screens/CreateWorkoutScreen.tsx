import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Animated,
  Easing,
  GestureResponderEvent,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EXERCISE_CATALOG } from '@/data/exercises';
import { useWorkouts } from '@/hooks/useWorkouts';
import { useAppTheme } from '@/theme/ThemeProvider';
import { MuscleDiagram } from '@/components/MuscleDiagram';

interface Props {
  workoutId?: number;
}

export const CreateWorkoutScreen: React.FC<Props> = ({ workoutId }) => {
  const { findWorkout, updateTitle, addExercise, removeExercise, updateExercisePlan } = useWorkouts();
  const { theme, mode } = useAppTheme();
  const insets = useSafeAreaInsets();
  const workout = workoutId ? findWorkout(workoutId) : undefined;

  const sortedExercises = useMemo(() => {
    return workout?.exercises.slice().sort((a, b) => a.order_index - b.order_index) ?? [];
  }, [workout?.exercises]);

  const [planDrafts, setPlanDrafts] = React.useState<Record<number, string>>({});
  const [searchTerm, setSearchTerm] = React.useState('');
  const [muscleFilter, setMuscleFilter] = React.useState<string | null>(null);
  const [infoExercise, setInfoExercise] = React.useState<(typeof EXERCISE_CATALOG)[number] | null>(null);

  // Animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(150, [
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

  const catalogById = useMemo(() => {
    const map = new Map<string, (typeof EXERCISE_CATALOG)[number]>();
    for (const item of EXERCISE_CATALOG) {
      map.set(item.id, item);
    }
    return map;
  }, []);

  const muscleGroups = useMemo(() => {
    const groups = Array.from(new Set(EXERCISE_CATALOG.map((item) => item.muscleGroup)));
    groups.sort();
    return groups;
  }, []);

  const filteredCatalog = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    return EXERCISE_CATALOG.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(normalized);
      const matchesMuscle = muscleFilter ? item.muscleGroup === muscleFilter : true;
      return matchesSearch && matchesMuscle;
    });
  }, [searchTerm, muscleFilter]);

  useEffect(() => {
    setPlanDrafts((prev) => {
      const ids = new Set(sortedExercises.map((ex) => ex.id));
      const next: Record<number, string> = {};
      for (const id of ids) {
        if (prev[id] !== undefined) {
          next[id] = prev[id];
        }
      }
      return next;
    });
  }, [sortedExercises]);

  const handleTitleChange = useCallback(
    (text: string) => {
      if (workout) updateTitle(workout.workout.id, text);
    },
    [workout, updateTitle]
  );

  const handleAddExercise = useCallback(
    async (exerciseId: string) => {
      if (!workout) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      await addExercise(workout.workout.id, exerciseId);
    },
    [workout, addExercise]
  );

  const handleRemoveExercise = useCallback(
    async (exerciseId: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      await removeExercise(exerciseId);
    },
    [removeExercise]
  );

  const handlePlanChange = useCallback((exerciseId: number, text: string) => {
    setPlanDrafts((prev) => ({ ...prev, [exerciseId]: text }));
  }, []);

  const handlePlanSubmit = useCallback(
    (exerciseId: number, raw: string) => {
      const trimmed = raw.trim();
      if (!trimmed) {
        setPlanDrafts((prev) => ({ ...prev, [exerciseId]: '' }));
        updateExercisePlan(exerciseId, null);
        return;
      }
      const value = Number(trimmed);
      if (Number.isNaN(value)) return;
      const normalized = Math.max(0, Math.floor(value));
      setPlanDrafts((prev) => ({ ...prev, [exerciseId]: String(normalized) }));
      updateExercisePlan(exerciseId, normalized);
    },
    [updateExercisePlan]
  );

  const handleSave = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    // Pas de navigation particulière, la séance est déjà enregistrée
  }, []);

  const handleOpenInfo = useCallback(
    (exerciseId: string, event?: GestureResponderEvent) => {
      event?.stopPropagation();
      const meta = catalogById.get(exerciseId);
      if (meta) {
        Haptics.selectionAsync().catch(() => {});
        setInfoExercise(meta);
      }
    },
    [catalogById]
  );

  const handleCloseInfo = useCallback(() => setInfoExercise(null), []);

  const handleOpenExternalVideo = useCallback(() => {
    if (infoExercise?.videoUrl) {
      Linking.openURL(infoExercise.videoUrl).catch(() => null);
    }
  }, [infoExercise]);

  const isDark = mode === 'dark';
  const gradientColors = isDark
    ? ['#1a1f2e', '#0f1218', '#0f1218']
    : ['#fef2f2', '#fce7e7', '#F7F8FA'];

  // État vide
  if (!workout) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: theme.colors.background }]}>
        <LinearGradient
          colors={gradientColors as [string, string, ...string[]]}
          style={[styles.emptyGradient, { paddingTop: insets.top + 40 }]}
        >
          <View style={[styles.emptyIconContainer, { backgroundColor: theme.colors.accent + '20' }]}>
            <Ionicons name="barbell-outline" size={48} color={theme.colors.accent} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
            Aucune séance sélectionnée
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
            Crée une nouvelle séance depuis l&apos;accueil pour commencer ton entraînement.
          </Text>
        </LinearGradient>
      </View>
    );
  }

  // Composant ExerciseCard
  const ExerciseCard: React.FC<{
    item: (typeof sortedExercises)[number];
    index: number;
  }> = ({ item, index }) => {
    const meta = catalogById.get(item.exercise_id);
    const displayName = meta?.name ?? item.exercise_id;
    const cardAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.spring(cardAnim, {
        toValue: 1,
        delay: index * 50,
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
            { translateX: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) },
            { scale: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) },
          ],
        }}
      >
        <View style={[styles.exerciseCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.exerciseCardHeader}>
            <View style={[styles.exerciseNumber, { backgroundColor: theme.colors.accent }]}>
              <Text style={styles.exerciseNumberText}>{index + 1}</Text>
            </View>
            <View style={styles.exerciseInfo}>
              <Text style={[styles.exerciseName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                {displayName}
              </Text>
              {meta?.muscleGroup || meta?.muscleGroupFr ? (
                <View style={styles.exerciseMeta}>
                  <Ionicons name="body-outline" size={12} color={theme.colors.textSecondary} />
                  <Text style={[styles.exerciseMetaText, { color: theme.colors.textSecondary }]}>
                    {meta?.muscleGroupFr ?? meta?.muscleGroup}
                  </Text>
                </View>
              ) : null}
            </View>
            <Pressable
              style={({ pressed }) => [styles.removeBtn, { opacity: pressed ? 0.6 : 1 }]}
              onPress={() => handleRemoveExercise(item.id)}
            >
              <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
            </Pressable>
          </View>
          <View style={[styles.setsRow, { borderTopColor: theme.colors.border }]}>
            <View style={styles.setsLabel}>
              <Ionicons name="layers-outline" size={14} color={theme.colors.textSecondary} />
              <Text style={[styles.setsLabelText, { color: theme.colors.textSecondary }]}>Séries prévues</Text>
            </View>
            <TextInput
              value={planDrafts[item.id] ?? ''}
              onChangeText={(text) => handlePlanChange(item.id, text)}
              onBlur={() => handlePlanSubmit(item.id, planDrafts[item.id] ?? '')}
              keyboardType="number-pad"
              placeholder="—"
              placeholderTextColor={theme.colors.textSecondary}
              style={[
                styles.setsInput,
                {
                  borderColor: theme.colors.border,
                  color: theme.colors.textPrimary,
                  backgroundColor: theme.colors.surfaceMuted,
                },
              ]}
            />
          </View>
        </View>
      </Animated.View>
    );
  };

  // Composant CatalogCard
  const CatalogCard: React.FC<{ item: (typeof EXERCISE_CATALOG)[number] }> = ({ item }) => {
    const isAdded = sortedExercises.some((ex) => ex.exercise_id === item.id);

    return (
      <Pressable
        style={({ pressed }) => [
          styles.catalogCard,
          {
            backgroundColor: isAdded ? theme.colors.accent + '10' : theme.colors.surface,
            borderColor: isAdded ? theme.colors.accent : theme.colors.border,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}
        onPress={() => handleAddExercise(item.id)}
      >
        <View style={styles.catalogCardContent}>
          <View style={styles.catalogCardLeft}>
            <Text style={[styles.catalogName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.catalogMeta}>
              <Ionicons name="body-outline" size={12} color={theme.colors.textSecondary} />
              <Text style={[styles.catalogMetaText, { color: theme.colors.textSecondary }]}>
                {item.muscleGroupFr ?? item.muscleGroup}
              </Text>
            </View>
          </View>
          <View style={styles.catalogCardRight}>
            {isAdded ? (
              <View style={[styles.addedBadge, { backgroundColor: theme.colors.accent }]}>
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              </View>
            ) : (
              <Pressable
                style={({ pressed }) => [styles.addBtn, { backgroundColor: theme.colors.surfaceMuted, opacity: pressed ? 0.6 : 1 }]}
                onPress={() => handleAddExercise(item.id)}
              >
                <Ionicons name="add" size={18} color={theme.colors.textPrimary} />
              </Pressable>
            )}
            <Pressable
              style={({ pressed }) => [styles.infoBtn, { opacity: pressed ? 0.6 : 1 }]}
              onPress={(event) => handleOpenInfo(item.id, event)}
            >
              <Ionicons name="information-circle-outline" size={20} color={theme.colors.textSecondary} />
            </Pressable>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Header */}
        <LinearGradient colors={gradientColors as [string, string, ...string[]]} style={styles.heroGradient}>
          <Animated.View
            style={[
              styles.heroContent,
              {
                opacity: headerAnim,
                transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
              },
            ]}
          >
            <View style={styles.heroTitleRow}>
              <View style={[styles.heroIcon, { backgroundColor: theme.colors.accent + '20' }]}>
                <Ionicons name="create-outline" size={24} color={theme.colors.accent} />
              </View>
              <Text style={[styles.heroTitle, { color: theme.colors.textPrimary }]}>Créer ta séance</Text>
            </View>
            <Text style={[styles.heroSubtitle, { color: theme.colors.textSecondary }]}>
              Compose ton entraînement sur mesure
            </Text>
          </Animated.View>
        </LinearGradient>

        <Animated.View
          style={[
            styles.content,
            {
              opacity: contentAnim,
              transform: [{ translateY: contentAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
            },
          ]}
        >
          {/* Section Nom de la séance */}
          <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: theme.colors.accent + '15' }]}>
                <Ionicons name="text-outline" size={18} color={theme.colors.accent} />
              </View>
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Nom de la séance</Text>
            </View>
            <TextInput
              defaultValue={workout.workout.title}
              onChangeText={handleTitleChange}
              placeholder="Ex: Push Day, Jambes..."
              placeholderTextColor={theme.colors.textSecondary}
              style={[
                styles.titleInput,
                {
                  backgroundColor: theme.colors.surfaceMuted,
                  color: theme.colors.textPrimary,
                  borderColor: theme.colors.border,
                },
              ]}
            />
          </View>

          {/* Section Exercices sélectionnés */}
          <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: theme.colors.accent + '15' }]}>
                <Ionicons name="list-outline" size={18} color={theme.colors.accent} />
              </View>
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                Exercices sélectionnés
              </Text>
              <View style={[styles.countBadge, { backgroundColor: theme.colors.accent }]}>
                <Text style={styles.countBadgeText}>{sortedExercises.length}</Text>
              </View>
            </View>

            {sortedExercises.length === 0 ? (
              <View style={[styles.emptyExercises, { backgroundColor: theme.colors.surfaceMuted }]}>
                <Ionicons name="add-circle-outline" size={32} color={theme.colors.textSecondary} />
                <Text style={[styles.emptyExercisesText, { color: theme.colors.textSecondary }]}>
                  Ajoute des exercices depuis le catalogue
                </Text>
              </View>
            ) : (
              <View style={styles.exercisesList}>
                {sortedExercises.map((item, index) => (
                  <ExerciseCard key={item.id} item={item} index={index} />
                ))}
              </View>
            )}
          </View>

          {/* Section Catalogue */}
          <View style={[styles.section, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: theme.colors.accent + '15' }]}>
                <Ionicons name="library-outline" size={18} color={theme.colors.accent} />
              </View>
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>Catalogue</Text>
              <View style={[styles.countBadge, { backgroundColor: theme.colors.surfaceMuted }]}>
                <Text style={[styles.countBadgeTextMuted, { color: theme.colors.textSecondary }]}>
                  {filteredCatalog.length}
                </Text>
              </View>
            </View>

            {/* Recherche */}
            <View style={[styles.searchContainer, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border }]}>
              <Ionicons name="search-outline" size={18} color={theme.colors.textSecondary} />
              <TextInput
                value={searchTerm}
                onChangeText={setSearchTerm}
                placeholder="Rechercher un exercice..."
                placeholderTextColor={theme.colors.textSecondary}
                style={[styles.searchInput, { color: theme.colors.textPrimary }]}
              />
              {searchTerm.length > 0 && (
                <Pressable onPress={() => setSearchTerm('')}>
                  <Ionicons name="close-circle" size={18} color={theme.colors.textSecondary} />
                </Pressable>
              )}
            </View>

            {/* Filtres muscles */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.muscleFilters}
            >
              <Pressable
                style={({ pressed }) => [
                  styles.muscleChip,
                  {
                    backgroundColor: !muscleFilter ? theme.colors.accent : theme.colors.surfaceMuted,
                    borderColor: !muscleFilter ? theme.colors.accent : theme.colors.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setMuscleFilter(null);
                }}
              >
                <Text style={[styles.muscleChipText, { color: !muscleFilter ? '#FFFFFF' : theme.colors.textPrimary }]}>
                  Tous
                </Text>
              </Pressable>
              {muscleGroups.map((group) => {
                const isActive = muscleFilter === group;
                return (
                  <Pressable
                    key={group}
                    style={({ pressed }) => [
                      styles.muscleChip,
                      {
                        backgroundColor: isActive ? theme.colors.accent : theme.colors.surfaceMuted,
                        borderColor: isActive ? theme.colors.accent : theme.colors.border,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setMuscleFilter(isActive ? null : group);
                    }}
                  >
                    <Text style={[styles.muscleChipText, { color: isActive ? '#FFFFFF' : theme.colors.textPrimary }]}>
                      {group}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Liste du catalogue */}
            <View style={styles.catalogList}>
              {filteredCatalog.length === 0 ? (
                <View style={styles.noResults}>
                  <Ionicons name="search-outline" size={24} color={theme.colors.textSecondary} />
                  <Text style={[styles.noResultsText, { color: theme.colors.textSecondary }]}>
                    Aucun exercice trouvé
                  </Text>
                </View>
              ) : (
                filteredCatalog.map((item) => <CatalogCard key={item.id} item={item} />)
              )}
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Footer fixe */}
      <View style={[styles.footer, { backgroundColor: theme.colors.background, borderTopColor: theme.colors.border }]}>
        <Pressable
          style={({ pressed }) => [
            styles.saveButton,
            {
              backgroundColor: theme.colors.accent,
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}
          onPress={handleSave}
        >
          <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
          <View style={styles.saveButtonText}>
            <Text style={styles.saveButtonTitle}>Séance prête !</Text>
            <Text style={styles.saveButtonSubtitle}>{sortedExercises.length} exercice{sortedExercises.length > 1 ? 's' : ''} • Sauvegarde auto</Text>
          </View>
        </Pressable>
      </View>

      {/* Modal Info Exercice */}
      <Modal visible={Boolean(infoExercise)} transparent animationType="fade" onRequestClose={handleCloseInfo}>
        <Pressable style={styles.modalOverlay} onPress={handleCloseInfo}>
          <Pressable
            style={[styles.modalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            onPress={() => {}}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={[styles.modalIcon, { backgroundColor: theme.colors.accent + '20' }]}>
                  <Ionicons name="barbell" size={24} color={theme.colors.accent} />
                </View>
                <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]} numberOfLines={2}>
                  {infoExercise?.name}
                </Text>
              </View>
              <Pressable
                style={[styles.modalCloseBtn, { backgroundColor: theme.colors.surfaceMuted }]}
                onPress={handleCloseInfo}
              >
                <Ionicons name="close" size={20} color={theme.colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.modalChips}>
                <View style={[styles.modalChip, { backgroundColor: theme.colors.surfaceMuted }]}>
                  <Ionicons name="body-outline" size={14} color={theme.colors.accent} />
                  <Text style={[styles.modalChipText, { color: theme.colors.textPrimary }]}>
                    {infoExercise?.muscleGroupFr ?? infoExercise?.muscleGroup ?? 'Muscles variés'}
                  </Text>
                </View>
                <View style={[styles.modalChip, { backgroundColor: theme.colors.surfaceMuted }]}>
                  <Ionicons name="construct-outline" size={14} color={theme.colors.accent} />
                  <Text style={[styles.modalChipText, { color: theme.colors.textPrimary }]}>
                    {infoExercise?.equipmentFr ?? infoExercise?.equipment?.join(', ') ?? 'Matériel libre'}
                  </Text>
                </View>
              </View>

              <View style={styles.diagramWrapper}>
                <MuscleDiagram
                  muscleGroup={infoExercise?.muscleGroupFr ?? infoExercise?.muscleGroup}
                  accentColor={theme.colors.accent}
                />
              </View>

              {infoExercise?.imageUrl ? (
                <Image source={{ uri: infoExercise.imageUrl }} style={styles.modalImage} />
              ) : null}

              <View style={[styles.descriptionCard, { backgroundColor: theme.colors.surfaceMuted }]}>
                <Text style={[styles.descriptionTitle, { color: theme.colors.textPrimary }]}>Description</Text>
                <Text style={[styles.descriptionText, { color: theme.colors.textSecondary }]}>
                  {infoExercise?.descriptionFr ??
                    infoExercise?.cues ??
                    infoExercise?.commonErrors ??
                    'Pas encore de description enregistrée.'}
                </Text>
              </View>

              {infoExercise?.videoUrl ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.videoButton,
                    { backgroundColor: theme.colors.accent, opacity: pressed ? 0.8 : 1 },
                  ]}
                  onPress={handleOpenExternalVideo}
                >
                  <Ionicons name="play-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.videoButtonText}>Voir la vidéo</Text>
                </Pressable>
              ) : null}

              {infoExercise?.sourceUrl ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.sourceButton,
                    { borderColor: theme.colors.border, opacity: pressed ? 0.7 : 1 },
                  ]}
                  onPress={() => infoExercise.sourceUrl && Linking.openURL(infoExercise.sourceUrl)}
                >
                  <Ionicons name="open-outline" size={18} color={theme.colors.textPrimary} />
                  <Text style={[styles.sourceButtonText, { color: theme.colors.textPrimary }]}>
                    Fiche détaillée
                  </Text>
                </Pressable>
              ) : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  heroGradient: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  heroContent: {
    gap: 8,
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 14,
    marginLeft: 56,
  },
  content: {
    paddingHorizontal: 16,
    gap: 16,
    paddingTop: 8,
  },
  section: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  countBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  countBadgeTextMuted: {
    fontSize: 13,
    fontWeight: '600',
  },
  titleInput: {
    fontSize: 17,
    fontWeight: '600',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  emptyExercises: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderRadius: 14,
    gap: 12,
  },
  emptyExercisesText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  exercisesList: {
    gap: 10,
  },
  exerciseCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  exerciseCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  exerciseNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseNumberText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  exerciseInfo: {
    flex: 1,
    gap: 2,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: '600',
  },
  exerciseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  exerciseMetaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  removeBtn: {
    padding: 8,
  },
  setsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  setsLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  setsLabelText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  setsInput: {
    width: 60,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  muscleFilters: {
    gap: 8,
    paddingVertical: 4,
  },
  muscleChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  muscleChipText: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  catalogList: {
    gap: 8,
  },
  catalogCard: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 14,
  },
  catalogCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  catalogCardLeft: {
    flex: 1,
    gap: 2,
  },
  catalogName: {
    fontSize: 15,
    fontWeight: '600',
  },
  catalogMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  catalogMetaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  catalogCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addedBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBtn: {
    padding: 4,
  },
  noResults: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  noResultsText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  saveButtonText: {
    alignItems: 'flex-start',
  },
  saveButtonTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  saveButtonSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
  },
  emptyGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxHeight: '85%',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 20,
    gap: 12,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modalIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  modalChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  modalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  modalChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  diagramWrapper: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 16,
    marginBottom: 16,
  },
  descriptionCard: {
    padding: 16,
    borderRadius: 14,
    marginBottom: 16,
    gap: 8,
  },
  descriptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 22,
  },
  videoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  videoButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  sourceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  sourceButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
