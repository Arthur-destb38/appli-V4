import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useTranslations } from '@/hooks/usePreferences';

interface PersonalStatsProps {
  lastWorkoutDays?: number;
  nextMilestone?: {
    type: 'sessions' | 'streak' | 'volume';
    current: number;
    target: number;
    label: string;
  };
  weekProgress?: {
    completed: number;
    goal: number;
  };
  personalRecord?: {
    label: string;
    value: string;
    isNew?: boolean;
  };
}

const StatCard: React.FC<{
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  value: string;
  subtitle?: string;
  progress?: number;
  isHighlight?: boolean;
  onPress?: () => void;
}> = ({ icon, iconColor, title, value, subtitle, progress, isHighlight, onPress }) => {
  const { theme } = useAppTheme();
  const scaleAnim = useRef(new Animated.Value(0.98)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 80,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(progressAnim, {
        toValue: progress ?? 0,
        duration: 800,
        delay: 150,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }),
    ]).start();
  }, [progress]);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.statCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: isHighlight ? `${iconColor}40` : theme.colors.border,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <Animated.View style={[styles.statContent, { transform: [{ scale: scaleAnim }] }]}>
        <View style={[styles.iconContainer, { backgroundColor: `${iconColor}18` }]}>
          <Ionicons name={icon} size={22} color={iconColor} />
        </View>
        <View style={styles.statInfo}>
          <Text style={[styles.statTitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
            {value}
          </Text>
          {subtitle ? (
            <Text style={[styles.statSubtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </Animated.View>
      {progress !== undefined && (
        <View style={[styles.progressWrap, { backgroundColor: theme.colors.surfaceMuted }]}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                backgroundColor: iconColor,
                width: progressAnim.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                  extrapolate: 'clamp',
                }),
              },
            ]}
          />
        </View>
      )}
    </Pressable>
  );
};

export const PersonalStats: React.FC<PersonalStatsProps> = ({
  lastWorkoutDays = 0,
  nextMilestone,
  weekProgress,
  personalRecord,
}) => {
  const { theme } = useAppTheme();
  const { t, isLoading } = useTranslations();

  // Fonction de traduction sécurisée
  const safeT = (key: string, fallback: string = key) => {
    try {
      return isLoading ? fallback : t(key as any);
    } catch (error) {
      console.warn('Translation error:', error);
      return fallback;
    }
  };

  // Calcul du message pour la dernière séance
  const getLastWorkoutMessage = () => {
    if (lastWorkoutDays === 0) return { value: safeT('today', 'Aujourd\'hui'), subtitle: safeT('lastWorkout', 'Dernière séance') };
    if (lastWorkoutDays === 1) return { value: safeT('yesterday', 'Hier'), subtitle: safeT('lastWorkout', 'Dernière séance') };
    if (lastWorkoutDays <= 7) return { value: safeT('daysAgo', `Il y a ${lastWorkoutDays}j`).replace('{days}', String(lastWorkoutDays)), subtitle: safeT('lastWorkout', 'Dernière séance') };
    return { value: safeT('getBackToIt', 'Reprends !'), subtitle: safeT('itsBeenAWhile', 'Ça fait un moment...') };
  };

  const lastWorkoutInfo = getLastWorkoutMessage();
  const isRecentWorkout = lastWorkoutDays <= 2;

  return (
    <View style={styles.container}>
      {/* Dernière séance */}
      <StatCard
        icon={isRecentWorkout ? "checkmark-circle" : "time"}
        iconColor={isRecentWorkout ? "#10B981" : "#F59E0B"}
        title={lastWorkoutInfo.subtitle}
        value={lastWorkoutInfo.value}
        isHighlight={!isRecentWorkout}
      />

      {/* Progression de la semaine */}
      {weekProgress && (
        <StatCard
          icon="flag"
          iconColor="#6366F1"
          title={safeT('thisWeek', 'Cette semaine')}
          value={`${weekProgress.completed}/${weekProgress.goal}`}
          subtitle={weekProgress.completed >= weekProgress.goal ? safeT('goalReached', 'Objectif atteint ! 🎯') : safeT('sessions', 'séances')}
          progress={(weekProgress.completed / weekProgress.goal) * 100}
          isHighlight={weekProgress.completed >= weekProgress.goal}
        />
      )}

      {/* Prochain palier */}
      {nextMilestone && (
        <StatCard
          icon="trophy"
          iconColor="#F97316"
          title={nextMilestone.label}
          value={`${nextMilestone.current}/${nextMilestone.target}`}
          subtitle={`Plus que ${nextMilestone.target - nextMilestone.current} !`}
          progress={(nextMilestone.current / nextMilestone.target) * 100}
        />
      )}

      {/* Record personnel */}
      {personalRecord && (
        <StatCard
          icon="star"
          iconColor="#8B5CF6"
          title={personalRecord.label}
          value={personalRecord.value}
          subtitle={personalRecord.isNew ? safeT('newRecord', 'Nouveau record ! 🔥') : safeT('personalRecord', 'Record personnel')}
          isHighlight={personalRecord.isNew}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 24,
    gap: 14,
  },
  statCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    overflow: 'hidden',
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statInfo: {
    flex: 1,
    minWidth: 0,
  },
  statTitle: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  statSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    opacity: 0.85,
  },
  progressWrap: {
    height: 6,
    borderRadius: 3,
    marginTop: 14,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
});