import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useAppTheme } from '@/theme/ThemeProvider';

interface WorkoutCardProps {
  title: string;
  date: string;
  status: 'draft' | 'completed' | 'in_progress';
  exerciseCount?: number;
  onPress: () => void;
  onDelete?: () => void;
}

// Couleurs alignées sur les empty states (Dernière séance créée / terminée)
const DRAFT_COLORS = {
  gradient: ['#F9731612', '#EA580C08', 'transparent'] as const,
  border: 'rgba(249, 115, 22, 0.25)',
  iconBg: 'rgba(249, 115, 22, 0.15)',
  iconColor: '#F97316',
  deco: 'rgba(249, 115, 22, 0.08)',
  buttonGradient: ['#F97316', '#EA580C'] as const,
};
const COMPLETED_COLORS = {
  gradient: ['#22C55E12', '#16A34A08', 'transparent'] as const,
  border: 'rgba(34, 197, 94, 0.25)',
  iconBg: 'rgba(34, 197, 94, 0.15)',
  iconColor: '#22C55E',
  deco: 'rgba(34, 197, 94, 0.08)',
};

export const WorkoutCard: React.FC<WorkoutCardProps> = ({
  title,
  date,
  status,
  exerciseCount,
  onPress,
  onDelete,
}) => {
  const { theme } = useAppTheme();
  const isCompleted = status === 'completed';
  const colors = isCompleted ? COMPLETED_COLORS : DRAFT_COLORS;

  const iconName = isCompleted ? 'trophy-outline' : status === 'in_progress' ? 'play-circle' : 'barbell-outline';
  const buttonText = isCompleted ? 'Consulter' : status === 'in_progress' ? 'Continuer' : 'Démarrer';

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          borderColor: colors.border,
          backgroundColor: theme.colors.surface,
          opacity: pressed ? 0.96 : 1,
        },
      ]}
      onPress={onPress}
    >
      <LinearGradient
        colors={colors.gradient}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {onDelete && (
        <TouchableOpacity
          style={styles.deleteWrap}
          onPress={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
        </TouchableOpacity>
      )}

      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <View style={[styles.iconCircle, { backgroundColor: colors.iconBg }]}>
            <Ionicons name={iconName} size={36} color={colors.iconColor} />
          </View>
          <View style={[styles.deco, styles.deco1, { backgroundColor: colors.deco }]} />
          <View style={[styles.deco, styles.deco2, { backgroundColor: colors.deco }]} />
        </View>

        <Text style={[styles.title, { color: theme.colors.textPrimary }]} numberOfLines={2}>
          {title || 'Séance sans nom'}
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          {date}
          {exerciseCount !== undefined && exerciseCount > 0
            ? ` · ${exerciseCount} exercice${exerciseCount > 1 ? 's' : ''}`
            : ''}
        </Text>

        {isCompleted ? (
          <Pressable
            onPress={onPress}
            style={({ pressed }) => [
              styles.ctaSecondary,
              { borderColor: 'rgba(34, 197, 94, 0.4)', opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <Ionicons name="eye-outline" size={18} color="#22C55E" />
            <Text style={[styles.ctaSecondaryText, { color: '#22C55E' }]}>{buttonText}</Text>
          </Pressable>
        ) : (
          <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}>
            <LinearGradient
              colors={DRAFT_COLORS.buttonGradient}
              style={styles.ctaGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="play" size={20} color="#fff" />
              <Text style={styles.ctaText}>{buttonText}</Text>
            </LinearGradient>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
    position: 'relative',
  },
  deleteWrap: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
    padding: 8,
  },
  content: {
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  iconWrap: {
    position: 'relative',
    marginBottom: 20,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deco: {
    position: 'absolute',
    borderRadius: 999,
  },
  deco1: {
    width: 48,
    height: 48,
    top: -8,
    right: -12,
  },
  deco2: {
    width: 32,
    height: 32,
    bottom: -4,
    left: -16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    overflow: 'hidden',
  },
  ctaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  ctaSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  ctaSecondaryText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
