import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';

import { useAppTheme } from '@/theme/ThemeProvider';

interface AppCardProps {
  children: React.ReactNode;
  muted?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const AppCard: React.FC<AppCardProps> = ({ children, muted = false, style }) => {
  const { theme } = useAppTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: muted ? theme.colors.surfaceMuted : theme.colors.surface,
          borderColor: theme.colors.border,
          shadowColor: theme.colors.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
    marginBottom: 16,
  },
});
