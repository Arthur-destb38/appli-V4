import React, { useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useAppTheme } from '@/theme/ThemeProvider';
import { AppCard } from './AppCard';

interface HistoryProgressChartProps {
  data: Array<{
    week: string;
    value: number;
    label?: string;
  }>;
  title?: string;
  unit?: string;
  type?: 'volume' | 'count';
}

export const HistoryProgressChart: React.FC<HistoryProgressChartProps> = ({
  data,
  title = 'Progression',
  unit = 'kg',
  type = 'volume',
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

  const maxValue = useMemo(() => {
    if (data.length === 0) return 1;
    return Math.max(...data.map((d) => d.value), 1);
  }, [data]);

  const total = useMemo(() => {
    return data.reduce((sum, d) => sum + d.value, 0);
  }, [data]);

  const trend = useMemo(() => {
    if (data.length < 2) return 'neutral';
    const last = data[data.length - 1].value;
    const previous = data[data.length - 2].value;
    if (last > previous) return 'up';
    if (last < previous) return 'down';
    return 'neutral';
  }, [data]);

  const trendColor = trend === 'up' ? '#10B981' : trend === 'down' ? '#EF4444' : theme.colors.textSecondary;
  const trendIcon = trend === 'up' ? '📈' : trend === 'down' ? '📉' : '➡️';

  if (data.length === 0) {
    return null;
  }

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <AppCard style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{title}</Text>
          <View style={styles.trendContainer}>
            <Text style={styles.trendIcon}>{trendIcon}</Text>
            <Text style={[styles.trendText, { color: trendColor }]}>
              {trend === 'up' ? 'En hausse' : trend === 'down' ? 'En baisse' : 'Stable'}
            </Text>
          </View>
        </View>

        <View style={styles.totalRow}>
          <Text style={[styles.totalLabel, { color: theme.colors.textSecondary }]}>Total</Text>
          <Text style={[styles.totalValue, { color: theme.colors.textPrimary }]}>
            {Math.round(total).toLocaleString()} {unit}
          </Text>
        </View>

        <View style={styles.chartContainer}>
          {data.map((item, index) => {
            const height = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
            return (
              <View key={index} style={styles.barWrapper}>
                <View style={styles.barContainer}>
                  <Animated.View
                    style={[
                      styles.bar,
                      {
                        height: `${height}%`,
                        backgroundColor: theme.colors.accent,
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.barLabel, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                  {item.week}
                </Text>
                <Text style={[styles.barValue, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                  {Math.round(item.value).toLocaleString()}
                </Text>
              </View>
            );
          })}
        </View>
      </AppCard>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendIcon: {
    fontSize: 16,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 120,
    marginTop: 16,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  barContainer: {
    width: '80%',
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '100%',
    minHeight: 4,
    borderRadius: 4,
  },
  barLabel: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  barValue: {
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
});

