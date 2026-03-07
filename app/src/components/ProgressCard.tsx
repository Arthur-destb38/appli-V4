import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { useAppTheme } from '@/theme/ThemeProvider';
import { useTranslations } from '@/hooks/usePreferences';

interface ProgressCardProps {
  // Stats principales
  sessionsThisWeek: number;
  totalSessions: number;
  volumeThisWeek: number;
  // Objectif
  weeklyGoal: number;
  goalProgressPercent: number;
  // Comparaison semaine dernière
  sessionsChange?: number;
  volumeChangePercent?: number | null;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const ProgressCard: React.FC<ProgressCardProps> = ({
  sessionsThisWeek,
  totalSessions,
  volumeThisWeek,
  weeklyGoal,
  goalProgressPercent,
  sessionsChange = 0,
  volumeChangePercent,
}) => {
  const { theme } = useAppTheme();
  const { t } = useTranslations();
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Animation du cercle
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: goalProgressPercent / 100,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, [goalProgressPercent]);

  // Paramètres du cercle SVG
  const size = 120;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Couleurs selon le thème
  const isDark = theme.mode === 'dark';
  const progressColor = goalProgressPercent >= 100 ? theme.colors.success : theme.colors.accent;
  const trackColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

  // Couleur du changement
  const getChangeColor = (change: number | null | undefined) => {
    if (change === null || change === undefined || change === 0) return theme.colors.textSecondary;
    return change > 0 ? theme.colors.success : theme.colors.error;
  };

  const formatChange = (change: number | null | undefined, suffix = '') => {
    if (change === null || change === undefined) return '—';
    const sign = change > 0 ? '+' : '';
    return `${sign}${change}${suffix}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{t('progression')}</Text>
        <View style={[styles.badge, { backgroundColor: theme.colors.accentMuted }]}>
          <Text style={[styles.badgeText, { color: theme.colors.accent }]}>
            {t('sessionsOfGoal', { current: sessionsThisWeek, goal: weeklyGoal })}
          </Text>
        </View>
      </View>

      {/* Contenu principal */}
      <View style={styles.content}>
        {/* Cercle de progression */}
        <View style={styles.circleContainer}>
          <Svg width={size} height={size} style={styles.svg}>
            <Defs>
              <LinearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={theme.colors.accent} />
                <Stop offset="100%" stopColor={goalProgressPercent >= 100 ? theme.colors.success : theme.colors.accent} />
              </LinearGradient>
            </Defs>
            {/* Track */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={trackColor}
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* Progress */}
            <AnimatedCircle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="url(#progressGradient)"
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [circumference, 0],
              })}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </Svg>
          {/* Texte au centre */}
          <View style={styles.circleContent}>
            <Text style={[styles.percentText, { color: theme.colors.textPrimary }]}>
              {Math.round(goalProgressPercent)}%
            </Text>
            <Text style={[styles.percentLabel, { color: theme.colors.textSecondary }]}>
              {t('ofGoal')}
            </Text>
          </View>
        </View>

        {/* Stats à droite */}
        <View style={styles.statsContainer}>
          {/* Cette semaine */}
          <View style={[styles.statItem, { backgroundColor: theme.colors.surfaceMuted }]}>
            <View style={styles.statHeader}>
              <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
                {sessionsThisWeek}
              </Text>
              <Text style={[styles.statChange, { color: getChangeColor(sessionsChange) }]}>
                {formatChange(sessionsChange)}
              </Text>
            </View>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              {t('thisWeek')}
            </Text>
          </View>

          {/* Total */}
          <View style={[styles.statItem, { backgroundColor: theme.colors.surfaceMuted }]}>
            <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
              {totalSessions}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              {t('totalSessions')}
            </Text>
          </View>

          {/* Volume */}
          <View style={[styles.statItem, { backgroundColor: theme.colors.surfaceMuted }]}>
            <View style={styles.statHeader}>
              <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
                {volumeThisWeek >= 1000 ? `${(volumeThisWeek / 1000).toFixed(1)}k` : volumeThisWeek}
              </Text>
              <Text style={[styles.statChange, { color: getChangeColor(volumeChangePercent) }]}>
                {formatChange(volumeChangePercent, '%')}
              </Text>
            </View>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              {t('kgLifted')}
            </Text>
          </View>
        </View>
      </View>

      {/* Message motivant si objectif atteint */}
      {goalProgressPercent >= 100 && (
        <View style={[styles.successBanner, { backgroundColor: theme.colors.success + '15' }]}>
          <Text style={[styles.successText, { color: theme.colors.success }]}>
            🎉 {t('weeklyGoalReached')}
          </Text>
        </View>
      )}

      {/* Message si pas de données */}
      {totalSessions === 0 && (
        <View style={[styles.emptyBanner, { backgroundColor: theme.colors.surfaceMuted }]}>
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            💪 {t('startFirstSession')}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  circleContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    transform: [{ rotate: '0deg' }],
  },
  circleContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentText: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -1,
  },
  percentLabel: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  statsContainer: {
    flex: 1,
    gap: 10,
  },
  statItem: {
    padding: 12,
    borderRadius: 14,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statChange: {
    fontSize: 13,
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  successBanner: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  successText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyBanner: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});




