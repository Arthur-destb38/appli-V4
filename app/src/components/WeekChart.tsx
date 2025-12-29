import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeProvider';

interface DayData {
  day: string; // L, M, M, J, V, S, D
  value: number;
  isToday?: boolean;
}

interface WeekChartProps {
  data: DayData[];
  title?: string;
  unit?: string;
  totalValue?: number;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    value: string;
  };
}

const DayBar: React.FC<{ day: DayData; maxValue: number; index: number }> = ({
  day,
  maxValue,
  index,
}) => {
  const { theme } = useAppTheme();
  const heightAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(heightAnim, {
      toValue: 1,
      duration: 600,
      delay: index * 60,
      easing: Easing.out(Easing.back(1.2)),
      useNativeDriver: false,
    }).start();
  }, [day.value, maxValue, index]);

  const percentage = maxValue > 0 ? (day.value / maxValue) * 100 : 0;
  const minHeight = 8;
  const maxHeight = 80;

  return (
    <View style={styles.barContainer}>
      <View style={[styles.barTrack, { backgroundColor: theme.colors.surfaceMuted }]}>
        <Animated.View
          style={[
            styles.barFill,
            {
              backgroundColor: day.isToday ? theme.colors.accent : theme.colors.accent + '80',
              height: heightAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [minHeight, Math.max(minHeight, (percentage / 100) * maxHeight)],
              }),
            },
          ]}
        />
      </View>
      <Text
        style={[
          styles.dayLabel,
          {
            color: day.isToday ? theme.colors.accent : theme.colors.textSecondary,
            fontWeight: day.isToday ? '700' : '500',
          },
        ]}
      >
        {day.day}
      </Text>
      {day.isToday && (
        <View style={[styles.todayDot, { backgroundColor: theme.colors.accent }]} />
      )}
    </View>
  );
};

export const WeekChart: React.FC<WeekChartProps> = ({
  data,
  title = 'Cette semaine',
  unit = 'kg',
  totalValue,
  trend,
}) => {
  const { theme } = useAppTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const maxValue = Math.max(...data.map((d) => d.value), 1);

  const getTrendColor = () => {
    if (trend?.direction === 'up') return '#10B981';
    if (trend?.direction === 'down') return '#EF4444';
    return theme.colors.textSecondary;
  };

  const getTrendIcon = (): keyof typeof Ionicons.glyphMap => {
    if (trend?.direction === 'up') return 'trending-up';
    if (trend?.direction === 'down') return 'trending-down';
    return 'remove';
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          opacity: fadeAnim,
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="analytics-outline" size={18} color={theme.colors.accent} />
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{title}</Text>
        </View>
        {trend && (
          <View style={[styles.trendBadge, { backgroundColor: `${getTrendColor()}15` }]}>
            <Ionicons name={getTrendIcon()} size={14} color={getTrendColor()} />
            <Text style={[styles.trendText, { color: getTrendColor() }]}>{trend.value}</Text>
          </View>
        )}
      </View>

      {/* Chart */}
      <View style={styles.chartContainer}>
        {data.map((day, index) => (
          <DayBar key={day.day + index} day={day} maxValue={maxValue} index={index} />
        ))}
      </View>

      {/* Total */}
      {totalValue !== undefined && (
        <View style={styles.totalRow}>
          <Text style={[styles.totalLabel, { color: theme.colors.textSecondary }]}>
            Volume total
          </Text>
          <Text style={[styles.totalValue, { color: theme.colors.textPrimary }]}>
            {totalValue.toLocaleString()} {unit}
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  trendText: {
    fontSize: 13,
    fontWeight: '700',
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 110,
    paddingTop: 10,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
  },
  barTrack: {
    width: 24,
    height: 80,
    borderRadius: 12,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 12,
  },
  dayLabel: {
    marginTop: 8,
    fontSize: 12,
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150,150,150,0.1)',
  },
  totalLabel: {
    fontSize: 14,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
  },
});




