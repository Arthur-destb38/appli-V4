import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { useAppTheme } from '@/theme/ThemeProvider';
import * as Haptics from 'expo-haptics';

interface Props {
  title: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  disabled?: boolean;
}

export const AppButton: React.FC<Props> = ({ title, variant = 'primary', loading = false, onPress, style, disabled = false }) => {
  const { theme } = useAppTheme();

  const backgroundColor =
    variant === 'primary'
      ? theme.colors.accent
      : variant === 'secondary'
      ? theme.mode === 'dark'
        ? theme.colors.surfaceMuted
        : '#CED4E0'
      : 'transparent';
  const textColor = variant === 'ghost' ? theme.colors.textPrimary : variant === 'secondary' ? theme.colors.textPrimary : '#FFFFFF';
  const borderColor = variant === 'ghost' ? theme.colors.border : 'transparent';

  const handlePress = () => {
    if (disabled || loading) {
      return;
    }
    Haptics.selectionAsync().catch(() => undefined);
    onPress?.();
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        { backgroundColor, borderColor },
        pressed && { opacity: 0.85 },
        disabled && { opacity: 0.5 },
        style,
      ]}
      onPress={handlePress}
    >
      {loading ? <ActivityIndicator color={textColor} /> : <Text style={[styles.label, { color: textColor }]}>{title}</Text>}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
});
