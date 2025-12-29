import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '@/theme/ThemeProvider';

interface WorkoutCardProps {
  title: string;
  date: string;
  status: 'draft' | 'completed' | 'in_progress';
  exerciseCount?: number;
  onPress: () => void;
  onDelete?: () => void;
}

export const WorkoutCard: React.FC<WorkoutCardProps> = ({
  title,
  date,
  status,
  exerciseCount,
  onPress,
  onDelete,
}) => {
  const { theme } = useAppTheme();
  const isDark = theme.mode === 'dark';

  // Configuration selon le statut
  const statusConfig = {
    completed: {
      icon: 'checkmark-circle' as const,
      label: 'Terminé',
      color: theme.colors.success,
      bgColor: theme.colors.success + '15',
      buttonText: 'Consulter',
    },
    in_progress: {
      icon: 'play-circle' as const,
      label: 'En cours',
      color: theme.colors.warning,
      bgColor: theme.colors.warning + '15',
      buttonText: 'Continuer',
    },
    draft: {
      icon: 'document-text' as const,
      label: 'Brouillon',
      color: theme.colors.textSecondary,
      bgColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
      buttonText: 'Démarrer',
    },
  };

  const config = statusConfig[status];

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: theme.colors.surfaceMuted,
          borderColor: theme.colors.border,
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
      onPress={onPress}
    >
      {/* Indicateur de statut (barre latérale) */}
      <View style={[styles.statusIndicator, { backgroundColor: config.color }]} />

      {/* Contenu principal */}
      <View style={styles.content}>
        {/* Header avec titre et badge */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text 
              style={[styles.title, { color: theme.colors.textPrimary }]} 
              numberOfLines={1}
            >
              {title || 'Séance sans nom'}
            </Text>
            
            {/* Badge de statut */}
            <View style={[styles.statusBadge, { backgroundColor: config.bgColor }]}>
              <Ionicons name={config.icon} size={12} color={config.color} />
              <Text style={[styles.statusText, { color: config.color }]}>
                {config.label}
              </Text>
            </View>
          </View>
        </View>

        {/* Métadonnées */}
        <View style={styles.metadata}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={14} color={theme.colors.textSecondary} />
            <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
              {date}
            </Text>
          </View>
          
          {exerciseCount !== undefined && exerciseCount > 0 && (
            <View style={styles.metaItem}>
              <Ionicons name="barbell-outline" size={14} color={theme.colors.textSecondary} />
              <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                {exerciseCount} exercice{exerciseCount > 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              { 
                backgroundColor: status === 'completed' 
                  ? theme.colors.surfaceMuted 
                  : theme.colors.accent,
                borderColor: status === 'completed' ? theme.colors.border : 'transparent',
                borderWidth: status === 'completed' ? 1 : 0,
              },
            ]}
            onPress={onPress}
            activeOpacity={0.8}
          >
            <Ionicons 
              name={status === 'completed' ? 'eye-outline' : 'play'} 
              size={16} 
              color={status === 'completed' ? theme.colors.textPrimary : '#FFFFFF'} 
            />
            <Text
              style={[
                styles.primaryButtonText,
                { color: status === 'completed' ? theme.colors.textPrimary : '#FFFFFF' },
              ]}
            >
              {config.buttonText}
            </Text>
          </TouchableOpacity>

          {onDelete && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={onDelete}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
    overflow: 'hidden',
  },
  statusIndicator: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: 14,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  metadata: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 6,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    padding: 10,
    borderRadius: 10,
  },
});




