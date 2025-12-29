import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
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
    Alert.alert(
      'Quitter le défi ?',
      'Tu perdras ta progression si tu quittes maintenant.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Quitter',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
            setIsJoined(false);
          },
        },
      ]
    );
  };

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
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Hero */}
        <LinearGradient
          colors={challenge.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + 60 }]}
        >
          <Text style={styles.heroIcon}>{challenge.icon}</Text>
          <Text style={styles.heroTitle}>{challenge.title}</Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Ionicons name="people" size={18} color="rgba(255,255,255,0.9)" />
              <Text style={styles.heroStatText}>{challenge.participants} participants</Text>
            </View>
            <View style={styles.heroStat}>
              <Ionicons name="time" size={18} color="rgba(255,255,255,0.9)" />
              <Text style={styles.heroStatText}>{challenge.duration}</Text>
            </View>
          </View>
          <View style={[styles.difficultyBadge, { 
            backgroundColor: challenge.difficulty === 'Facile' ? '#10B981' 
              : challenge.difficulty === 'Moyen' ? '#F59E0B' : '#EF4444' 
          }]}>
            <Text style={styles.difficultyText}>{challenge.difficulty}</Text>
          </View>
        </LinearGradient>

        {/* Description */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Description
          </Text>
          <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
            {challenge.description}
          </Text>
        </View>

        {/* Règles */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            📋 Règles
          </Text>
          {challenge.rules.map((rule, index) => (
            <View key={index} style={styles.ruleItem}>
              <View style={[styles.ruleBullet, { backgroundColor: theme.colors.accent }]}>
                <Text style={styles.ruleBulletText}>{index + 1}</Text>
              </View>
              <Text style={[styles.ruleText, { color: theme.colors.textPrimary }]}>
                {rule}
              </Text>
            </View>
          ))}
        </View>

        {/* Récompenses */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            🎁 Récompenses
          </Text>
          {challenge.rewards.map((reward, index) => (
            <View key={index} style={[styles.rewardItem, { backgroundColor: theme.colors.surface }]}>
              <Text style={[styles.rewardText, { color: theme.colors.textPrimary }]}>
                {reward}
              </Text>
            </View>
          ))}
        </View>

        {/* Bouton d'action */}
        <View style={styles.actionContainer}>
          {isJoined ? (
            <>
              <View style={[styles.joinedBadge, { backgroundColor: theme.colors.accent + '20' }]}>
                <Ionicons name="checkmark-circle" size={24} color={theme.colors.accent} />
                <Text style={[styles.joinedText, { color: theme.colors.accent }]}>
                  Tu participes à ce défi !
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.leaveBtn, { borderColor: theme.colors.error }]}
                onPress={handleLeave}
              >
                <Text style={[styles.leaveBtnText, { color: theme.colors.error }]}>
                  Quitter le défi
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity onPress={handleJoin} activeOpacity={0.9}>
              <LinearGradient
                colors={challenge.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.joinBtn}
              >
                <Ionicons name="flash" size={20} color="#fff" />
                <Text style={styles.joinBtnText}>Rejoindre le défi</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
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
    paddingBottom: 32,
    alignItems: 'center',
    gap: 12,
  },
  heroIcon: {
    fontSize: 64,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
  heroStats: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 8,
  },
  heroStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroStatText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '500',
  },
  difficultyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 8,
  },
  difficultyText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  ruleBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruleBulletText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  ruleText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  rewardItem: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
  },
  rewardText: {
    fontSize: 15,
    fontWeight: '500',
  },
  actionContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
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
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  leaveBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});



