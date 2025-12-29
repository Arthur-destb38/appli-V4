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
import * as Haptics from 'expo-haptics';

interface HeroSectionProps {
  username?: string;
  streak: number;
  nextWorkoutTitle?: string;
  onStartWorkout: () => void;
  onOpenMenu: () => void;
  onNewWorkout?: () => void;
}

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bonjour';
  if (hour < 18) return 'Bon après-midi';
  return 'Bonsoir';
};

const getMotivationalMessage = (streak: number, hasNextWorkout: boolean) => {
  if (streak >= 7) return "Tu es en feu ! Continue comme ça 💪";
  if (streak >= 3) return "Belle série ! Ne lâche rien 🔥";
  if (hasNextWorkout) return "Ta séance t'attend !";
  return "Prêt à te dépasser ?";
};

export const HeroSection: React.FC<HeroSectionProps> = ({
  username = 'Champion',
  streak,
  nextWorkoutTitle,
  onStartWorkout,
  onOpenMenu,
  onNewWorkout,
}) => {
  const { theme } = useAppTheme();
  const fireAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

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
  const motivationalMessage = getMotivationalMessage(streak, !!nextWorkoutTitle);

  const handleNewWorkout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onNewWorkout?.();
  };

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
        colors={
          theme.dark
            ? ['#1e1b4b', '#312e81', '#1e1b4b']
            : ['#6366f1', '#8b5cf6', '#a855f7']
        }
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
          <View style={styles.greetingRow}>
            <Text style={styles.greeting}>{greeting},</Text>
          </View>
          <Text style={styles.username}>{username} !</Text>
          <Text style={styles.motivational}>{motivationalMessage}</Text>

          {onNewWorkout && (
            <Pressable 
              onPress={handleNewWorkout} 
              style={({ pressed }) => [
                styles.newWorkoutButton,
                { opacity: pressed ? 0.8 : 1 }
              ]}
            >
              <Ionicons name="add" size={16} color="#fff" />
              <Text style={styles.newWorkoutText}>Nouvelle séance</Text>
            </Pressable>
          )}
        </View>

        {/* CTA Button */}
        {nextWorkoutTitle && (
          <View style={styles.ctaSection}>
            <View style={styles.nextWorkoutInfo}>
              <View style={styles.nextWorkoutIcon}>
                <Ionicons name="barbell" size={16} color="rgba(255,255,255,0.9)" />
              </View>
              <Text style={styles.nextWorkoutLabel} numberOfLines={1}>
                {nextWorkoutTitle}
              </Text>
            </View>
            
            <Animated.View style={{ transform: [{ scale: pulseAnim }], width: '100%' }}>
              <TouchableOpacity style={styles.ctaButton} onPress={handleStartWorkout} activeOpacity={0.85}>
                <LinearGradient
                  colors={['#f97316', '#ea580c']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.ctaGradient}
                >
                  <View style={styles.ctaIconCircle}>
                    <Ionicons name="play" size={18} color="#fff" />
                  </View>
                  <Text style={styles.ctaText}>Démarrer</Text>
                  <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" />
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </View>
        )}

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
    fontSize: 30,
    color: '#fff',
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  motivational: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 6,
    letterSpacing: 0.2,
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
  ctaSection: {
    gap: 12,
  },
  nextWorkoutInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  nextWorkoutIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextWorkoutLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  ctaButton: {
    alignSelf: 'stretch',
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
  },
  ctaIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
    letterSpacing: 0.3,
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

