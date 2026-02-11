import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Pressable,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '@/theme/ThemeProvider';
import { useDemo } from '../contexts/DemoContext';
import type { ArrowPosition } from '../contexts/DemoContext';

const STEP_DURATION_MS = 4500;

function ArrowTriangle({ point, color }: { point: ArrowPosition; color: string }) {
  const size = 12;
  const base = {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
  };
  const top = { ...base, borderLeftWidth: size, borderRightWidth: size, borderBottomWidth: size * 1.1, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: color };
  const bottom = { ...base, borderLeftWidth: size, borderRightWidth: size, borderTopWidth: size * 1.1, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: color };
  const left = { ...base, borderTopWidth: size, borderBottomWidth: size, borderRightWidth: size * 1.1, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderRightColor: color };
  const right = { ...base, borderTopWidth: size, borderBottomWidth: size, borderLeftWidth: size * 1.1, borderTopColor: 'transparent', borderBottomColor: 'transparent', borderLeftColor: color };
  const style = point === 'top' ? top : point === 'bottom' ? bottom : point === 'left' ? left : right;
  return <View style={[styles.arrowTriangle, style]} />;
}

export function DemoTourOverlay() {
  const { theme } = useAppTheme();
  const { isDemoActive, demoStep, steps, nextStep, stopDemo } = useDemo();
  const router = useRouter();
  const progressAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Navigate when step changes
  useEffect(() => {
    if (!isDemoActive || !steps[demoStep]) return;
    const route = steps[demoStep].route as any;
    router.replace(route);
  }, [isDemoActive, demoStep, steps]);

  // Auto-advance timer and progress bar
  useEffect(() => {
    if (!isDemoActive) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      progressAnim.setValue(0);
      return;
    }

    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: STEP_DURATION_MS,
      useNativeDriver: false,
    }).start();

    timerRef.current = setInterval(() => {
      nextStep();
    }, STEP_DURATION_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isDemoActive, demoStep]);

  if (!isDemoActive) return null;

  const step = steps[demoStep];
  if (!step) return null;

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const cardAtBottom = step.arrowPosition === 'top';
  const cardAtTop = step.arrowPosition === 'bottom';
  const cardOnLeft = step.arrowPosition === 'right';
  const cardOnRight = step.arrowPosition === 'left';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Transparent overlay - only the card captures touches */}
      <Pressable style={styles.overlay} onPress={stopDemo}>
        <View style={styles.overlayTouchable} />
      </Pressable>

      {/* Card + arrow */}
      <View
        style={[
          styles.cardWrapper,
          cardAtBottom && styles.cardBottom,
          cardAtTop && styles.cardTop,
          cardOnLeft && styles.cardLeft,
          cardOnRight && styles.cardRight,
          !cardAtTop && !cardAtBottom && !cardOnLeft && !cardOnRight && styles.cardBottom,
        ]}
        pointerEvents="box-none"
      >
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          {/* Arrow pointing to the content */}
          <View style={[styles.arrowRow, step.arrowPosition === 'bottom' && styles.arrowRowBottom]}>
            {(step.arrowPosition === 'top' || step.arrowPosition === 'bottom') && (
              <View style={step.arrowPosition === 'top' ? styles.arrowAboveCard : styles.arrowBelowCard}>
                <ArrowTriangle point={step.arrowPosition} color={theme.colors.surface} />
              </View>
            )}
          </View>
          {step.arrowPosition === 'left' && (
            <View style={styles.arrowLeftOfCard}>
              <ArrowTriangle point="left" color={theme.colors.surface} />
            </View>
          )}
          {step.arrowPosition === 'right' && (
            <View style={styles.arrowRightOfCard}>
              <ArrowTriangle point="right" color={theme.colors.surface} />
            </View>
          )}

          <View style={styles.cardHeader}>
            <View style={[styles.stepBadge, { backgroundColor: theme.colors.accent + '25' }]}>
              <Text style={[styles.stepBadgeText, { color: theme.colors.accent }]}>
                {demoStep + 1} / {steps.length}
              </Text>
            </View>
            <TouchableOpacity onPress={stopDemo} hitSlop={12} style={styles.skipBtn}>
              <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{step.title}</Text>
          <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
            {step.description}
          </Text>

          <View style={[styles.progressTrack, { backgroundColor: theme.colors.border }]}>
            <Animated.View
              style={[styles.progressBar, { backgroundColor: theme.colors.accent }, { width: progressWidth }]}
            />
          </View>

          <TouchableOpacity
            onPress={nextStep}
            style={[styles.nextButton, { backgroundColor: theme.colors.accent }]}
            activeOpacity={0.8}
          >
            <Text style={styles.nextButtonText}>
              {demoStep >= steps.length - 1 ? 'Terminer' : 'Suivant'}
            </Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  overlayTouchable: {
    flex: 1,
  },
  cardWrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    maxWidth: 400,
    alignSelf: 'center',
  },
  cardBottom: {
    bottom: 24,
  },
  cardTop: {
    top: 100,
  },
  cardLeft: {
    left: 16,
    top: '30%',
  },
  cardRight: {
    right: 16,
    left: undefined,
    top: '30%',
  },
  card: {
    borderRadius: 16,
    borderWidth: 2,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  arrowRow: {
    alignItems: 'center',
    marginBottom: 4,
  },
  arrowRowBottom: {
    marginBottom: 0,
    marginTop: 4,
  },
  arrowAboveCard: {
    alignSelf: 'center',
  },
  arrowBelowCard: {
    alignSelf: 'center',
  },
  arrowLeftOfCard: {
    position: 'absolute',
    left: -10,
    top: '40%',
  },
  arrowRightOfCard: {
    position: 'absolute',
    right: -10,
    top: '40%',
  },
  arrowTriangle: {
    width: 0,
    height: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  skipBtn: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
