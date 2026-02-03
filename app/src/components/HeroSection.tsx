import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Easing,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useTranslations } from '@/hooks/usePreferences';
import * as Haptics from 'expo-haptics';

interface HeroSectionProps {
  username?: string;
  streak: number;
  nextWorkoutTitle?: string;
  onStartWorkout: () => void;
  onOpenMenu: () => void;
  // 🎯 NOUVEAU: Stats pour message motivationnel
  completedThisWeek: number;
  goalSessions: number;
  // 🎯 NOUVEAU: Système XP
  level?: number;
  xp?: number;
  nextLevelXp?: number;
}

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'goodMorning';
  if (hour < 18) return 'goodAfternoon';
  return 'goodEvening';
};

const getMotivationalMessage = (streak: number, hasNextWorkout: boolean, completedThisWeek: number, goalSessions: number) => {
  if (completedThisWeek >= goalSessions) return { key: 'goalReached', params: { completed: completedThisWeek, goal: goalSessions } };
  if (streak >= 7) return { key: 'consecutiveDaysStreak', params: { days: streak } };
  if (streak >= 3) return { key: 'daysInARowStreak', params: { days: streak } };
  if (hasNextWorkout) return { key: 'readyForWorkout' };
  if (completedThisWeek > 0) return { key: 'weekProgress', params: { completed: completedThisWeek, goal: goalSessions } };
  return { key: 'letsGo' };
};

export const HeroSection: React.FC<HeroSectionProps> = ({
  username = 'Champion',
  streak,
  nextWorkoutTitle,
  onStartWorkout,
  onOpenMenu,
  completedThisWeek,
  goalSessions,
  // 🎯 NOUVEAU: Valeurs par défaut pour XP
  level = 1,
  xp = 0,
  nextLevelXp = 100,
}) => {
  const { theme } = useAppTheme();
  const { t, isLoading } = useTranslations();
  const fireAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // Fonction de traduction sécurisée
  const safeT = (key: string, fallback: string = key) => {
    try {
      return isLoading ? fallback : t(key as any);
    } catch (error) {
      console.warn('Translation error:', error);
      return fallback;
    }
  };

  useEffect(() => {
    // Animation d'entrée
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.back(1.1)),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Animation du feu en boucle
    if (streak > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(fireAnim, {
            toValue: 1.12,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(fireAnim, {
            toValue: 1,
            duration: 700,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }

    // Animation shimmer subtile
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Pulse pour le bouton CTA
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.02,
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
  }, [streak]);

  const greeting = getGreeting();
  const motivationalMessageData = getMotivationalMessage(streak, !!nextWorkoutTitle, completedThisWeek, goalSessions);
  
  const motivationalMessage = (() => {
    if (typeof motivationalMessageData === 'object') {
      if (motivationalMessageData.key === 'goalReached') {
        return `${motivationalMessageData.params.completed}/${motivationalMessageData.params.goal} ${safeT('sessions', 'séances')} 🎯`;
      }
      if (motivationalMessageData.key === 'consecutiveDaysStreak') {
        return `${motivationalMessageData.params.days} ${safeT('consecutiveDays', 'jours consécutifs')} 💪`;
      }
      if (motivationalMessageData.key === 'daysInARowStreak') {
        return `${motivationalMessageData.params.days} ${safeT('daysInARow', 'jours de suite')} 🔥`;
      }
      if (motivationalMessageData.key === 'weekProgress') {
        return `${motivationalMessageData.params.completed}/${motivationalMessageData.params.goal} ${safeT('thisWeek', 'cette semaine')}`;
      }
      return safeT(motivationalMessageData.key, 'C\'est parti !');
    }
    return motivationalMessageData;
  })();

  const handleStartWorkout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onStartWorkout();
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-30, 0],
              }),
            },
          ],
        },
      ]}
    >
      <LinearGradient
        colors={theme.colors.heroGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Shimmer overlay */}
        <Animated.View
          style={[
            styles.shimmerOverlay,
            {
              transform: [
                {
                  translateX: shimmerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-400, 400],
                  }),
                },
              ],
            },
          ]}
          pointerEvents="none"
        >
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.05)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.shimmerGradient}
          />
        </Animated.View>

        {/* Header row */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            {streak > 0 && (
              <Animated.View
                style={[
                  styles.streakBadge,
                  { transform: [{ scale: fireAnim }] },
                ]}
              >
                <Text style={styles.streakFire}>🔥</Text>
                <Text style={styles.streakNumber}>{streak}</Text>
              </Animated.View>
            )}
          </View>
          <TouchableOpacity onPress={onOpenMenu} style={styles.menuButton} activeOpacity={0.7}>
            <Ionicons name="menu" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Main content */}
        <View style={styles.content}>
          <Text style={styles.username}>{username}</Text>
          <Text style={styles.motivational}>{motivationalMessage}</Text>
        </View>

        {/* XP Progress Section */}
        <View style={styles.xpProgressSection}>
          <View style={styles.xpProgressHeader}>
            <View style={styles.xpProgressInfo}>
              <Text style={styles.xpProgressTitle}>{safeT('progression', 'Progression')}</Text>
              <Text style={styles.xpProgressSubtitle}>
                {safeT('level', 'Niveau')} {level} • {xp}/{nextLevelXp} XP
              </Text>
            </View>
            <View style={styles.xpLevelBadge}>
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text style={styles.xpLevelText}>{level}</Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.xpProgressBar} 
            onPress={nextWorkoutTitle ? handleStartWorkout : undefined}
            activeOpacity={nextWorkoutTitle ? 0.8 : 1}
          >
            <View style={styles.xpProgressTrack}>
              <Animated.View 
                style={[
                  styles.xpProgressFill, 
                  { 
                    width: `${(xp / nextLevelXp) * 100}%`,
                    transform: [{ scale: nextWorkoutTitle ? pulseAnim : 1 }]
                  }
                ]} 
              />
              {nextWorkoutTitle && (
                <View style={styles.xpProgressOverlay}>
                  <View style={styles.xpProgressIcon}>
                    <Ionicons name="play" size={14} color="#fff" />
                  </View>
                  <Text style={styles.xpProgressText} numberOfLines={1}>
                    {nextWorkoutTitle}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.8)" />
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Decorative elements */}
        <View style={styles.decorCircle1} pointerEvents="none" />
        <View style={styles.decorCircle2} pointerEvents="none" />
        <View style={styles.decorCircle3} pointerEvents="none" />
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  gradient: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 22,
    borderRadius: 28,
    overflow: 'hidden',
    position: 'relative',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  shimmerGradient: {
    width: 200,
    height: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    backdropFilter: 'blur(10px)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  streakFire: {
    fontSize: 18,
  },
  streakNumber: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
  },
  menuButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  content: {
    marginBottom: 20,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  greeting: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  username: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '800',
    marginBottom: 6,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  motivational: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.2,
    fontWeight: '500',
  },
  newWorkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  newWorkoutText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  // 🎯 NOUVEAU: Section XP Progress
  xpProgressSection: {
    gap: 12,
  },
  xpProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  xpProgressInfo: {
    flex: 1,
  },
  xpProgressTitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  xpProgressSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  xpLevelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  xpLevelText: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '800',
  },
  xpProgressBar: {
    width: '100%',
  },
  xpProgressTrack: {
    height: 48,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  xpProgressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 24,
    minWidth: 48,
  },
  xpProgressOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
  },
  xpProgressIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  xpProgressText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    letterSpacing: 0.2,
  },
  decorCircle1: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -40,
    left: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  decorCircle3: {
    position: 'absolute',
    top: 40,
    right: 60,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
});

