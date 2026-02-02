import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/theme/ThemeProvider';

export default function ProfileSetupSimple() {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();

  const goToApp = () => {
    console.log('🚀 Navigation vers l\'app principale');
    router.replace('/(tabs)');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.content, { paddingTop: insets.top + 40 }]}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          🦍 Bienvenue sur Gorillax !
        </Text>
        
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Tu peux configurer ton profil plus tard dans les paramètres
        </Text>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.accent }]}
          onPress={goToApp}
        >
          <Text style={styles.buttonText}>
            Accéder à l'app
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.skipButton]}
          onPress={goToApp}
        >
          <Text style={[styles.skipText, { color: theme.colors.textSecondary }]}>
            Passer pour l'instant
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
  },
  button: {
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  skipButton: {
    paddingVertical: 12,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '500',
  },
});