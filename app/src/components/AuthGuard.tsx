import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useAppTheme } from '@/theme/ThemeProvider';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useAppTheme();
  const [isMounted, setIsMounted] = React.useState(false);

  // Attendre que le composant soit monté
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    if (isLoading || !isMounted) return;

    const isAuthScreen = pathname === '/login' || pathname === '/register';
    const isProfileSetupScreen = pathname === '/profile-setup' || pathname === '/profile-setup-simple';

    console.log('AuthGuard:', { isAuthenticated, pathname, userProfileCompleted: user?.profile_completed });

    // Utiliser setTimeout pour éviter les erreurs de navigation
    const navigate = (path: string) => {
      setTimeout(() => {
        router.replace(path as any);
      }, 50);
    };

    if (!isAuthenticated && !isAuthScreen) {
      // Pas connecté et pas sur écran d'auth -> login
      console.log('Redirection vers login');
      navigate('/login');
    } else if (isAuthenticated && isAuthScreen) {
      // Connecté et sur écran d'auth -> vérifier profil
      if (user && user.profile_completed === false) {
        console.log('Redirection vers profile-setup-simple');
        navigate('/profile-setup-simple');
      } else {
        console.log('Redirection vers app');
        navigate('/(tabs)');
      }
    } else if (isAuthenticated && user && user.profile_completed === false && !isProfileSetupScreen) {
      // Connecté mais profil incomplet -> setup
      console.log('Redirection vers profile-setup-simple (profil incomplet)');
      navigate('/profile-setup-simple');
    }
  }, [isAuthenticated, isLoading, user, pathname, router, isMounted]);

  if (isLoading || !isMounted) {
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