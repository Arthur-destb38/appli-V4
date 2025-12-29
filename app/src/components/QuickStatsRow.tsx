import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Easing,
  Pressable,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeProvider';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

interface StatChip {
  id: string;
  value: string | number;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: string;
  explanation?: string;
  editable?: boolean;
  onEdit?: () => void;
}

interface QuickStatsRowProps {
  stats: StatChip[];
}

// Couleurs distinctives pour chaque type de stat
const STAT_COLORS: Record<string, { gradient: [string, string]; glow: string }> = {
  objective: { gradient: ['#10B981', '#059669'], glow: '#10B981' },
  volume: { gradient: ['#8B5CF6', '#7C3AED'], glow: '#8B5CF6' },
  streak: { gradient: ['#F59E0B', '#D97706'], glow: '#F59E0B' },
  drafts: { gradient: ['#F97316', '#EA580C'], glow: '#F97316' },
  completed: { gradient: ['#22C55E', '#16A34A'], glow: '#22C55E' },
  default: { gradient: ['#6366F1', '#4F46E5'], glow: '#6366F1' },
};

const getStatColors = (id: string) => {
  if (id === 'objective' || id.includes('objectif')) return STAT_COLORS.objective;
  if (id === 'volume') return STAT_COLORS.volume;
  if (id === 'streak') return STAT_COLORS.streak;
  if (id === 'drafts') return STAT_COLORS.drafts;
  if (id === 'completed') return STAT_COLORS.completed;
  return STAT_COLORS.default;
};

const StatChipItem: React.FC<{ stat: StatChip; index: number }> = ({ stat, index }) => {
  const { theme } = useAppTheme();
  const [showExplanation, setShowExplanation] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const statColors = getStatColors(stat.id);
  const chipColor = stat.color || statColors.glow;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 500,
        delay: index * 100,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        delay: index * 100,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }),
    ]).start();

    // Animation de pulsation subtile pour le glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [index]);

  const getTrendColor = () => {
    if (stat.trend === 'up') return '#10B981';
    if (stat.trend === 'down') return '#EF4444';
    return theme.colors.textSecondary;
  };

  const getTrendIcon = (): keyof typeof Ionicons.glyphMap => {
    if (stat.trend === 'up') return 'trending-up';
    if (stat.trend === 'down') return 'trending-down';
    return 'remove';
  };

  const handleInfoPress = () => {
    Haptics.selectionAsync().catch(() => {});
    setShowExplanation(true);
  };

  const handleChipPress = () => {
    if (stat.editable && stat.onEdit) {
      Haptics.selectionAsync().catch(() => {});
      stat.onEdit();
    }
  };

  return (
    <>
      <Animated.View
        style={[
          styles.chipWrapper,
          {
            opacity: slideAnim,
            transform: [
              { scale: scaleAnim },
              {
                translateY: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        {/* Glow effect */}
        <Animated.View
          style={[
            styles.glowEffect,
            {
              backgroundColor: chipColor,
              opacity: glowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.15, 0.25],
              }),
            },
          ]}
        />
        
        <Pressable
          onPress={handleChipPress}
          style={({ pressed }) => [
            styles.chip,
            {
              backgroundColor: theme.colors.surface,
              borderColor: `${chipColor}40`,
              transform: [{ scale: pressed && stat.editable ? 0.95 : 1 }],
            },
          ]}
          disabled={!stat.editable}
        >
          {/* Gradient accent bar */}
          <LinearGradient
            colors={statColors.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.accentBar}
          />
          
          <View style={styles.chipInner}>
            {/* Icon with gradient background */}
            <View style={[styles.iconWrapper]}>
              <LinearGradient
                colors={[`${chipColor}30`, `${chipColor}10`]}
                style={styles.iconGradient}
              >
                <Ionicons name={stat.icon} size={20} color={chipColor} />
              </LinearGradient>
            </View>
            
            {/* Content */}
            <View style={styles.chipContent}>
              <View style={styles.valueRow}>
                <Text style={[styles.chipValue, { color: theme.colors.textPrimary }]}>
                  {stat.value}
                </Text>
                {stat.trend && stat.trendValue && (
                  <View style={[styles.trendBadge, { backgroundColor: `${getTrendColor()}20` }]}>
                    <Ionicons name={getTrendIcon()} size={10} color={getTrendColor()} />
                    <Text style={[styles.trendText, { color: getTrendColor() }]}>
                      {stat.trendValue}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.labelRow}>
                <Text 
                  style={[styles.chipLabel, { color: theme.colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {stat.label}
                </Text>
                {stat.explanation && (
                  <Pressable onPress={handleInfoPress} style={styles.infoButton} hitSlop={8}>
                    <Ionicons name="information-circle-outline" size={14} color={theme.colors.textSecondary} />
                  </Pressable>
                )}
                {stat.editable && (
                  <Ionicons name="pencil" size={11} color={chipColor} style={styles.editIcon} />
                )}
              </View>
            </View>
          </View>
        </Pressable>
      </Animated.View>

      {stat.explanation && (
        <Modal
          visible={showExplanation}
          transparent
          animationType="fade"
          onRequestClose={() => setShowExplanation(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowExplanation(false)}
          >
            <Pressable
              style={[styles.explanationCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              onPress={(e) => e.stopPropagation()}
            >
              <LinearGradient
                colors={statColors.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.modalAccentBar}
              />
              <View style={styles.explanationHeader}>
                <LinearGradient
                  colors={[`${chipColor}30`, `${chipColor}10`]}
                  style={styles.explanationIconContainer}
                >
                  <Ionicons name={stat.icon} size={24} color={chipColor} />
                </LinearGradient>
                <Text style={[styles.explanationTitle, { color: theme.colors.textPrimary }]}>
                  {stat.label}
                </Text>
                <Pressable
                  onPress={() => setShowExplanation(false)}
                  style={[styles.closeButton, { backgroundColor: theme.colors.background }]}
                >
                  <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
                </Pressable>
              </View>
              <Text style={[styles.explanationText, { color: theme.colors.textSecondary }]}>
                {stat.explanation}
              </Text>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </>
  );
};

export const QuickStatsRow: React.FC<QuickStatsRowProps> = ({ stats }) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {stats.map((stat, index) => (
        <StatChipItem key={stat.id} stat={stat} index={index} />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  chipWrapper: {
    position: 'relative',
  },
  glowEffect: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: -4,
    borderRadius: 18,
    transform: [{ scaleX: 0.95 }],
  },
  chip: {
    overflow: 'hidden',
    borderRadius: 16,
    borderWidth: 1.5,
    minWidth: 140,
  },
  accentBar: {
    height: 3,
    width: '100%',
  },
  chipInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 10,
  },
  iconWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  iconGradient: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipContent: {
    flex: 1,
    minWidth: 60,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipValue: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  chipLabel: {
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.2,
    textTransform: 'capitalize',
    flex: 1,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 2,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '700',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  infoButton: {
    padding: 2,
  },
  editIcon: {
    marginLeft: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  explanationCard: {
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: 400,
    width: '100%',
    overflow: 'hidden',
  },
  modalAccentBar: {
    height: 4,
    width: '100%',
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 20,
    paddingBottom: 16,
  },
  explanationIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  explanationTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
  },
  explanationText: {
    fontSize: 14,
    lineHeight: 22,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
});




