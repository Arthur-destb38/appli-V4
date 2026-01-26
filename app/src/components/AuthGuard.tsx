import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useAppTheme } from '@/theme/ThemeProvider';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const { theme } = useAppTheme();

  React.useEffect(() => {
    if (isLoading) return; // Attendre que l'auth soit chargée

    const inAuthGroup = segments[0] === '(auth)';
    const isAuthScreen = segments[0] === 'login' || segments[0] === 'register';
    const isProfileSetupScreen = segments[0] === 'profile-setup';

    if (!isAuthenticated && !isAuthScreen) {
      // Utilisateur non connecté et pas sur un écran d'auth -> rediriger vers login
      router.replace('/login');
    } else if (isAuthenticated && isAuthScreen) {
      // Utilisateur connecté et sur un écran d'auth -> rediriger vers l'app
      router.replace('/');
    } else if (isAuthenticated && user && !user.profile_completed && !isProfileSetupScreen) {
      // Utilisateur connecté mais profil incomplet -> rediriger vers setup
      router.replace('/profile-setup');
    } else if (isAuthenticated && user && user.profile_completed && isProfileSetupScreen) {
      // Utilisateur avec profil complet sur la page setup -> rediriger vers l'app
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, user, segments, router]);

  // Afficher un loader pendant le chargement de l'auth
  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});