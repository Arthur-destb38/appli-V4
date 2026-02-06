import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
  Pressable,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { useAppTheme } from '@/theme/ThemeProvider';

// Données des défis (à terme, récupérées depuis le backend)
const CHALLENGES_DATA: Record<string, {
  id: string;
  title: string;
  description: string;
  icon: string;
  gradient: [string, string];
  participants: number;
  duration: string;
  difficulty: 'Facile' | 'Moyen' | 'Difficile';
  rules: string[];
  rewards: string[];
}> = {
  '1': {
    id: '1',
    title: '100 pompes',
    description: 'Réalise 100 pompes en une seule journée. Tu peux les répartir en plusieurs séries tout au long de la journée.',
    icon: '💪',
    gradient: ['#f093fb', '#f5576c'],
    participants: 234,
    duration: '1 jour',
    difficulty: 'Moyen',
    rules: [
      'Complète 100 pompes en 24h',
      'Tu peux faire autant de séries que tu veux',
      'Enregistre chaque série dans l\'app',
      'Les pompes sur les genoux comptent',
    ],
    rewards: [
      '🏅 Badge "Centurion"',
      '50 points XP',
      'Apparition dans le classement',
    ],
  },
  '2': {
    id: '2',
    title: 'Défi 7 jours',
    description: 'Enchaîne 7 séances sur 7 jours consécutifs. Peu importe la durée, l\'important c\'est la régularité !',
    icon: '🔥',
    gradient: ['#667eea', '#764ba2'],
    participants: 156,
    duration: '7 jours',
    difficulty: 'Difficile',
    rules: [
      '7 séances sur 7 jours consécutifs',
      'Minimum 15 minutes par séance',
      'N\'importe quel type d\'entraînement',
      'Pas de jour de repos pendant le défi',
    ],
    rewards: [
      '🔥 Badge "Flamme Ardente"',
      '100 points XP',
      'Streak bonus x2',
    ],
  },
  '3': {
    id: '3',
    title: 'PR Squad',
    description: 'Bats ton record personnel au squat ! Pousse tes limites et montre ce que tu vaux.',
    icon: '🏆',
    gradient: ['#4facfe', '#00f2fe'],
    participants: 89,
    duration: '30 jours',
    difficulty: 'Difficile',
    rules: [
      'Bats ton PR actuel au squat',
      'Enregistre ta série de PR dans l\'app',
      'Vidéo recommandée pour validation',
      'Forme correcte obligatoire',
    ],
    rewards: [
      '🏆 Badge "PR Hunter"',
      '150 points XP',
      'Place dans le Hall of Fame',
    ],
  },
};

export default function ChallengeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [isJoined, setIsJoined] = useState(false);

  const challenge = CHALLENGES_DATA[id || '1'];

  if (!challenge) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.textPrimary }}>Défi introuvable</Text>
      </View>
    );
  }

  const handleJoin = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setIsJoined(true);
    Alert.alert(
      '🎉 Inscrit !',
      `Tu participes maintenant au défi "${challenge.title}". Bonne chance !`,
      [{ text: 'C\'est parti !' }]
    );
  };

  const handleLeave = () => {
    const doLeave = () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      setIsJoined(false);
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Quitter le défi ? Tu perdras ta progression si tu quittes maintenant.')) {
        doLeave();
      }
    } else {
      Alert.alert(
        'Quitter le défi ?',
        'Tu perdras ta progression si tu quittes maintenant.',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Quitter', style: 'destructive', onPress: doLeave },
        ]
      );
    }
  };

  const difficultyConfig = {
    Facile: { bg: '#10B981', label: 'Facile' },
    Moyen: { bg: '#F59E0B', label: 'Moyen' },
    Difficile: { bg: '#EF4444', label: 'Difficile' },
  }[challenge.difficulty];

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Défi',
          headerBackTitle: 'Retour',
          headerTransparent: true,
          headerTintColor: '#fff',
        }}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <LinearGradient
          colors={challenge.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + 56 }]}
        >
          <View style={styles.heroIconWrap}>
            <Text style={styles.heroIcon}>{challenge.icon}</Text>
          </View>
          <Text style={styles.heroTitle}>{challenge.title}</Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Ionicons name="people-outline" size={18} color="rgba(255,255,255,0.95)" />
              <Text style={styles.heroStatText}>{challenge.participants} participants</Text>
            </View>
            <View style={styles.heroStat}>
              <Ionicons name="time-outline" size={18} color="rgba(255,255,255,0.95)" />
              <Text style={styles.heroStatText}>{challenge.duration}</Text>
            </View>
          </View>
          <View style={[styles.difficultyBadge, { backgroundColor: difficultyConfig.bg }]}>
            <Text style={styles.difficultyText}>{difficultyConfig.label}</Text>
          </View>
        </LinearGradient>

        {/* Carte de contenu (chevauche le hero) */}
        <View style={[styles.contentCard, { backgroundColor: theme.colors.background }]}>
          {/* Description */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconWrap, { backgroundColor: theme.colors.surfaceMuted }]}>
                <Ionicons name="document-text-outline" size={18} color={theme.colors.accent} />
              </View>
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                Description
              </Text>
            </View>
            <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
              {challenge.description}
            </Text>
          </View>

          {/* Règles */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconWrap, { backgroundColor: theme.colors.surfaceMuted }]}>
                <Ionicons name="list-outline" size={18} color={theme.colors.accent} />
              </View>
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                Règles
              </Text>
            </View>
            {challenge.rules.map((rule, index) => (
              <View key={index} style={styles.ruleRow}>
                <LinearGradient
                  colors={challenge.gradient}
                  style={styles.ruleBullet}
                >
                  <Text style={styles.ruleBulletText}>{index + 1}</Text>
                </LinearGradient>
                <Text style={[styles.ruleText, { color: theme.colors.textPrimary }]}>
                  {rule}
                </Text>
              </View>
            ))}
          </View>

          {/* Récompenses */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconWrap, { backgroundColor: theme.colors.surfaceMuted }]}>
                <Ionicons name="gift-outline" size={18} color={theme.colors.accent} />
              </View>
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                Récompenses
              </Text>
            </View>
            <View style={styles.rewardsGrid}>
              {challenge.rewards.map((reward, index) => (
                <View
                  key={index}
                  style={[
                    styles.rewardCard,
                    { backgroundColor: theme.colors.surface },
                    index === challenge.rewards.length - 1 && { marginBottom: 0 },
                  ]}
                >
                  <Ionicons
                    name={index === 0 ? 'medal-outline' : index === 1 ? 'flash-outline' : 'podium-outline'}
                    size={20}
                    color={theme.colors.accent}
                  />
                  <Text style={[styles.rewardText, { color: theme.colors.textPrimary }]} numberOfLines={2}>
                    {reward}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Bouton d'action */}
          <View style={[styles.actionContainer, { paddingBottom: insets.bottom + 24 }]}>
            {isJoined ? (
              <>
                <View style={[styles.joinedBadge, { backgroundColor: theme.colors.accent + '18' }]}>
                  <Ionicons name="checkmark-circle" size={22} color={theme.colors.accent} />
                  <Text style={[styles.joinedText, { color: theme.colors.accent }]}>
                    Tu participes à ce défi
                  </Text>
                </View>
                <Pressable
                  style={({ pressed }) => [
                    styles.leaveBtn,
                    { borderColor: theme.colors.error, opacity: pressed ? 0.8 : 1 },
                  ]}
                  onPress={handleLeave}
                >
                  <Text style={[styles.leaveBtnText, { color: theme.colors.error }]}>
                    Quitter le défi
                  </Text>
                </Pressable>
              </>
            ) : (
              <Pressable onPress={handleJoin} style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}>
                <LinearGradient
                  colors={challenge.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.joinBtn}
                >
                  <Ionicons name="flash" size={22} color="#fff" />
                  <Text style={styles.joinBtnText}>Rejoindre le défi</Text>
                </LinearGradient>
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  hero: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  heroIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroIcon: {
    fontSize: 44,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  heroStats: {
    flexDirection: 'row',
    gap: 28,
    marginTop: 10,
  },
  heroStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroStatText: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 14,
    fontWeight: '600',
  },
  difficultyBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 14,
  },
  difficultyText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  contentCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    paddingTop: 28,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  sectionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 14,
  },
  ruleBullet: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruleBulletText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  ruleText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  rewardsGrid: {
    gap: 10,
  },
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
  },
  rewardText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  actionContainer: {
    paddingTop: 8,
    gap: 12,
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 18,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  joinBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  joinedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
  },
  joinedText: {
    fontSize: 16,
    fontWeight: '600',
  },
  leaveBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  leaveBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});



