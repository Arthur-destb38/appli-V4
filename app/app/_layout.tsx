import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { WorkoutsProvider } from '@/hooks/useWorkouts';
import { UserProfileProvider } from '@/hooks/useUserProfile';
import { AuthProvider } from '@/hooks/useAuth';
import { SubscriptionProvider } from '@/hooks/useSubscription';
import { PreferencesProvider } from '@/hooks/usePreferences';
import { AppThemeProvider } from '@/theme/ThemeProvider';
import { DemoProvider } from '../src/contexts/DemoContext';
import { DemoTourOverlay } from '../src/components/DemoTourOverlay';
import { ErrorBoundary } from '../src/components/ErrorBoundary';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <PreferencesProvider>
        <AppThemeProvider>
          <ErrorBoundary>
          <AuthProvider>
            <SubscriptionProvider>
            <UserProfileProvider>
              <WorkoutsProvider>
                <DemoProvider>
                  <View style={styles.root}>
                    <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="create" />
                <Stack.Screen name="track/[id]" />
                <Stack.Screen name="history/index" />
                <Stack.Screen name="history/[id]" />
                <Stack.Screen name="history/progression" />
                <Stack.Screen name="programme/create" />
                <Stack.Screen name="programme/index" />
                <Stack.Screen name="settings" />
                <Stack.Screen name="legal/terms" />
                <Stack.Screen name="legal/privacy" />
                <Stack.Screen name="guide-utilisation" />
                <Stack.Screen name="profile/[id]" />
                <Stack.Screen name="objectives" />
                <Stack.Screen name="pass-salle" />
                <Stack.Screen name="notifications" />
                <Stack.Screen name="library" />
                <Stack.Screen name="leaderboard" />
                <Stack.Screen name="challenge/[id]" />
                <Stack.Screen name="messages/index" />
                <Stack.Screen name="messages/[id]" />
                <Stack.Screen name="messages/new" />
                <Stack.Screen name="shared-workout/[id]" />
                <Stack.Screen name="share-post" />
                <Stack.Screen name="paywall" options={{ presentation: 'modal', headerShown: false }} />
                <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
                <Stack.Screen name="login" />
                <Stack.Screen name="register" />
                <Stack.Screen name="profile-setup" />
                <Stack.Screen name="profile-setup-simple" />
                  </Stack>
                  <DemoTourOverlay />
                </View>
                </DemoProvider>
            </WorkoutsProvider>
          </UserProfileProvider>
            </SubscriptionProvider>
        </AuthProvider>
          </ErrorBoundary>
      </AppThemeProvider>
      </PreferencesProvider>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
