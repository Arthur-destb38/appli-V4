import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AppButton } from './AppButton';
import { useAppTheme } from '@/theme/ThemeProvider';

export const LoadingState: React.FC<{ message?: string }> = ({ message }) => {
  const { theme } = useAppTheme();
  return (
    <View style={styles.container}>
      <ActivityIndicator color={theme.colors.accent} />
      {message ? <Text style={[styles.text, { color: theme.colors.textSecondary }]}>{message}</Text> : null}
    </View>
  );
};

export const EmptyState: React.FC<{ title: string; subtitle?: string; actionLabel?: string; onAction?: () => void }> = ({ title, subtitle, actionLabel, onAction }) => {
  const { theme } = useAppTheme();
  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{title}</Text>
      {subtitle ? <Text style={[styles.text, { color: theme.colors.textSecondary }]}>{subtitle}</Text> : null}
      {actionLabel ? <AppButton title={actionLabel} onPress={onAction} variant="secondary" /> : null}
    </View>
  );
};

export const ErrorState: React.FC<{ message: string; retryLabel?: string; onRetry?: () => void }> = ({ message, retryLabel = 'Réessayer', onRetry }) => {
  const { theme } = useAppTheme();
  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.colors.error }]}>Oops…</Text>
      <Text style={[styles.text, { color: theme.colors.textSecondary }]}>{message}</Text>
      {onRetry ? <AppButton title={retryLabel} onPress={onRetry} /> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  text: {
    fontSize: 15,
    textAlign: 'center',
  },
});
