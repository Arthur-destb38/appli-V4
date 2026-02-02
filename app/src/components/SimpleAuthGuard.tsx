import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useAppTheme } from '@/theme/ThemeProvider';

interface SimpleAuthGuardProps {
  children: React.ReactNode;
}

export const SimpleAuthGuard: React.FC<SimpleAuthGuardProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { theme } = useAppTheme();

  React.useEffect(() => {
    if (isLoading) return;

    const isAuthScreen = pathname === '/login' || pathname === '/register';
    
    // Si pas connecté et pas sur écran d'auth -> login
    if (!isAuthenticated && !isAuthScreen) {
      console.log('SimpleAuthGuard: Redirection vers login');
      router.replace('/login');
    }
    // Si connecté et sur écran d'auth -> app directement
    else if (isAuthenticated && isAuthScreen) {
      console.log('SimpleAuthGuard: Redirection vers app');
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, pathname, router]);

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