import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useSubscription } from '@/hooks/useSubscription';
import { useTranslations } from '@/hooks/usePreferences';

interface PremiumGateProps {
  children: React.ReactNode;
  feature?: string;
}

/**
 * Wraps content that requires premium.
 * Shows a locked overlay with upgrade CTA for free users.
 */
export function PremiumGate({ children, feature }: PremiumGateProps) {
  const { isPremium, showPaywall } = useSubscription();
  const { theme, mode } = useAppTheme();
  const { t } = useTranslations();
  const isDark = mode === 'dark';

  if (isPremium) return <>{children}</>;

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: isDark ? '#1a1a2e' : '#f0f0f5', borderColor: isDark ? '#333' : '#ddd' }]}
      onPress={showPaywall}
      activeOpacity={0.8}
    >
      <View style={styles.lockedContent}>
        <Ionicons name="lock-closed" size={24} color={theme.colors.primary} />
        <Text style={[styles.lockedText, { color: isDark ? '#ccc' : '#444' }]}>
          {feature || t('premiumFeature')}
        </Text>
        <View style={[styles.upgradeButton, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.upgradeText}>{t('upgradeToPremium')}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
  },
  lockedContent: { alignItems: 'center', gap: 10 },
  lockedText: { fontSize: 14, fontWeight: '500', textAlign: 'center' },
  upgradeButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  upgradeText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
