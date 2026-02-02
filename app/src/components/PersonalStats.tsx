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
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(progressAnim, {
        toValue: progress || 0,
        duration: 1000,
        delay: 200,
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
          backgroundColor: isHighlight ? iconColor + '15' : theme.colors.surface,
          borderColor: isHighlight ? iconColor + '30' : theme.colors.border,
          opacity: pressed ? 0.8 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      <Animated.View style={[styles.statContent, { transform: [{ scale: scaleAnim }] }]}>
        <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
          <Ionicons name={icon} size={20} color={iconColor} />
        </View>
        
        <View style={styles.statInfo}>
          <Text style={[styles.statTitle, { color: theme.colors.textSecondary }]}>
            {title}
          </Text>
          <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
            {value}
          </Text>
          {subtitle && (
            <Text style={[styles.statSubtitle, { color: theme.colors.textSecondary }]}>
              {subtitle}
            </Text>
          )}
        </View>

        {progress !== undefined && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressTrack, { backgroundColor: theme.colors.surfaceMuted }]}>
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
          </View>
        )}
      </Animated.View>
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

  // Calcul du message pour la dernière séance
  const getLastWorkoutMessage = () => {
    if (lastWorkoutDays === 0) return { value: "Aujourd'hui", subtitle: "Dernière séance" };
    if (lastWorkoutDays === 1) return { value: "Hier", subtitle: "Dernière séance" };
    if (lastWorkoutDays <= 7) return { value: `Il y a ${lastWorkoutDays}j`, subtitle: "Dernière séance" };
    return { value: "Reprends !", subtitle: "Ça fait un moment..." };
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
          title="Cette semaine"
          value={`${weekProgress.completed}/${weekProgress.goal}`}
          subtitle={weekProgress.completed >= weekProgress.goal ? "Objectif atteint ! 🎯" : "séances"}
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
          subtitle={personalRecord.isNew ? "Nouveau record ! 🔥" : "Record personnel"}
          isHighlight={personalRecord.isNew}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 20,
    gap: 12,
  },
  statCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statInfo: {
    flex: 1,
  },
  statTitle: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  statSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  progressContainer: {
    width: 60,
    alignItems: 'flex-end',
  },
  progressTrack: {
    width: 60,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
});