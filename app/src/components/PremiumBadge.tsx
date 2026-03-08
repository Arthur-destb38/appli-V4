import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeProvider';

interface PremiumBadgeProps {
  size?: 'small' | 'medium';
}

export function PremiumBadge({ size = 'small' }: PremiumBadgeProps) {
  const { theme } = useAppTheme();
  const accent = theme.colors.primary;
  const isSmall = size === 'small';

  return (
    <View style={[
      styles.badge,
      { backgroundColor: accent + '20', borderColor: accent + '40' },
      isSmall ? styles.badgeSmall : styles.badgeMedium,
    ]}>
      <Ionicons name="diamond" size={isSmall ? 10 : 14} color={accent} />
      <Text style={[styles.text, { color: accent }, isSmall && styles.textSmall]}>
        PRO
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
    gap: 3,
  },
  badgeSmall: { paddingHorizontal: 5, paddingVertical: 2 },
  badgeMedium: { paddingHorizontal: 8, paddingVertical: 4 },
  text: { fontSize: 11, fontWeight: '800' },
  textSmall: { fontSize: 9 },
});
