import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useRouter, useLocalSearchParams } from 'expo-router';
import { Circle, Polyline, Svg } from 'react-native-svg';

import { useWorkouts } from '@/hooks/useWorkouts';
import { buildExerciseProgression } from '@/utils/workoutSummary';

type RangeFilter = '7' | '30' | 'all';

const RANGE_LABELS: Record<RangeFilter, string> = {
  '7': '7 jours',
  '30': '30 jours',
  all: 'Tout',
};

const formatDate = (timestamp: number) =>
  new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(timestamp));

const formatLongDate = (timestamp: number) =>
  new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(timestamp));

const formatKg = (value: number) => `${Math.round(value)} kg`;

export const ExerciseProgressScreen: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams<{ exerciseId?: string; exerciseName?: string }>();
  const exerciseId = params.exerciseId ?? '';
  const exerciseName = params.exerciseName ?? exerciseId;
  const [range, setRange] = useState<RangeFilter>('all');
  const { workouts } = useWorkouts();

  const now = Date.now();

  const points = useMemo(() => {
    const data = buildExerciseProgression(workouts, exerciseId);
    if (range === 'all') {
      return data;
    }
    const days = Number(range);
    const cutoff = now - days * 24 * 60 * 60 * 1000;
    return data.filter((point) => point.date >= cutoff);
  }, [exerciseId, range, workouts, now]);

  const hasEnoughData = points.length >= 3;

  const chartPoints = useMemo(() => {
    if (points.length === 0) {
      return [];
    }
    const width = 320;
    const height = 180;
    const padding = 24;

    const minDate = Math.min(...points.map((point) => point.date));
    const maxDate = Math.max(...points.map((point) => point.date));
    const minValue = Math.min(...points.map((point) => point.value));
    const maxValue = Math.max(...points.map((point) => point.value));

    const dateRange = maxDate - minDate || 1;
    const valueRange = maxValue - minValue || 1;

    const usableWidth = width - padding * 2;
    const usableHeight = height - padding * 2;

    return points.map((point) => {
      const xRatio = (point.date - minDate) / dateRange;
      const yRatio = (point.value - minValue) / valueRange;

      return {
        ...point,
        x: padding + xRatio * usableWidth,
        y: height - padding - yRatio * usableHeight,
      };
    });
  }, [points]);

  const chartPolyline = useMemo(() => {
    if (!chartPoints.length) {
      return '';
    }
    return chartPoints.map((point) => `${point.x},${point.y}`).join(' ');
  }, [chartPoints]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Progression — {exerciseName}</Text>
        <Text style={styles.subtitle}>
          Charge totale (poids × reps) sur les séances contenant cet exercice.
        </Text>
      </View>

      <View style={styles.rangeRow}>
        {(Object.keys(RANGE_LABELS) as RangeFilter[]).map((option) => (
          <TouchableOpacity
            key={option}
            style={[styles.rangeButton, range === option ? styles.rangeButtonActive : null]}
            onPress={() => setRange(option)}>
            <Text
              style={[
                styles.rangeButtonText,
                range === option ? styles.rangeButtonTextActive : null,
              ]}>
              {RANGE_LABELS[option]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {hasEnoughData ? (
        <View style={styles.chartCard}>
          <Svg height={200} width="100%">
            <Polyline
              points={chartPolyline}
              fill="none"
              stroke="#E11D48"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {chartPoints.map((point) => (
              <Circle key={point.workoutId} cx={point.x} cy={point.y} r={5} fill="#0F172A" />
            ))}
          </Svg>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Pas assez de données</Text>
          <Text style={styles.emptySubtitle}>
            Ajoute au moins trois séances avec cet exercice et des charges renseignées pour
            afficher la courbe de progression.
          </Text>
        </View>
      )}

      <View style={styles.listCard}>
        <Text style={styles.listTitle}>Historique des séances</Text>
        {points.length === 0 ? (
          <Text style={styles.emptyList}>Aucune séance enregistrée pour cet exercice.</Text>
        ) : (
          points
            .slice()
            .reverse()
            .map((point) => (
              <View key={point.workoutId} style={styles.listItem}>
                <View>
                  <Text style={styles.listItemTitle}>{point.title}</Text>
                  <Text style={styles.listItemSubtitle}>{formatLongDate(point.date)}</Text>
                </View>
                <Text style={styles.listItemValue}>{formatKg(point.value)}</Text>
              </View>
            ))
        )}
      </View>
    </ScrollView>
  );
};

export default ExerciseProgressScreen;

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },
  header: {
    gap: 8,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
  },
  backButtonText: {
    color: '#1E293B',
    fontWeight: '600',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    color: '#475569',
  },
  rangeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  rangeButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  rangeButtonActive: {
    backgroundColor: '#1D4ED8',
    borderColor: '#1D4ED8',
  },
  rangeButtonText: {
    color: '#1E293B',
    fontWeight: '600',
  },
  rangeButtonTextActive: {
    color: 'white',
  },
  chartCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  emptyState: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 20,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#92400E',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#B45309',
  },
  listCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#0F172A0F',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptyList: {
    color: '#64748B',
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 12,
    marginBottom: 12,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  listItemSubtitle: {
    fontSize: 13,
    color: '#64748B',
  },
  listItemValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
});
