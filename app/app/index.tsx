import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useAppTheme } from '@/theme/ThemeProvider';

export default function Index() {
  const { theme } = useAppTheme();

  // Redirection directe vers l'app - pas d'auth pour débloquer
  return <Redirect href="/(tabs)" />;
}



