import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { WorkoutsProvider } from '@/hooks/useWorkouts';
import { UserProfileProvider } from '@/hooks/useUserProfile';
import { AuthProvider } from '@/hooks/useAuth';
import { AppThemeProvider } from '@/theme/ThemeProvider';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AppThemeProvider>
        <AuthProvider>
          <UserProfileProvider>
            <WorkoutsProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen
                  name="create"
                  options={{ title: 'Nouvelle séance', headerShown: true, headerBackTitle: 'Retour' }}
                />
                <Stack.Screen
                  name="track/[id]"
                  options={{ title: 'Suivi séance', headerShown: true, headerBackTitle: 'Retour' }}
                />
                <Stack.Screen
                  name="history/index"
                  options={{ title: 'Historique', headerShown: false }}
                />
                <Stack.Screen
                  name="history/[id]"
                  options={{ title: 'Détail séance', headerShown: true, headerBackTitle: 'Retour' }}
                />
                <Stack.Screen
                  name="history/progression"
                  options={{ title: 'Progression', headerShown: true, headerBackTitle: 'Retour' }}
                />
                <Stack.Screen
                  name="programme/create"
                  options={{ title: 'Nouveau programme', headerShown: true, headerBackTitle: 'Retour' }}
                />
                <Stack.Screen
                  name="programme/index"
                  options={{ title: 'Mon Programme', headerShown: false }}
                />
                <Stack.Screen
                  name="settings"
                  options={{ title: 'Paramètres', headerShown: true, headerBackTitle: 'Retour' }}
                />
                <Stack.Screen
                  name="legal/terms"
                  options={{ title: 'Conditions d\'utilisation', headerShown: true, headerBackTitle: 'Retour' }}
                />
                <Stack.Screen
                  name="legal/privacy"
                  options={{ title: 'Politique de confidentialité', headerShown: true, headerBackTitle: 'Retour' }}
                />
                <Stack.Screen
                  name="profile/[id]"
                  options={{ title: 'Profil', headerShown: false }}
                />
                <Stack.Screen
                  name="objectives"
                  options={{ title: 'Mes Objectifs', headerShown: true, headerBackTitle: 'Retour' }}
                />
                <Stack.Screen
                  name="notifications"
                  options={{ title: 'Notifications', headerShown: true, headerBackTitle: 'Retour' }}
                />
                <Stack.Screen
                  name="library"
                  options={{ title: 'Bibliothèque', headerShown: true, headerBackTitle: 'Retour' }}
                />
                <Stack.Screen
                  name="leaderboard"
                  options={{ title: 'Classement', headerShown: true, headerBackTitle: 'Retour' }}
                />
                <Stack.Screen
                  name="challenge/[id]"
                  options={{ title: 'Défi', headerShown: false }}
                />
                <Stack.Screen
                  name="messages/index"
                  options={{ title: 'Messages', headerShown: true, headerBackTitle: 'Retour' }}
                />
                <Stack.Screen
                  name="messages/[id]"
                  options={{ title: 'Conversation', headerShown: true, headerBackTitle: 'Retour' }}
                />
                <Stack.Screen
                  name="messages/new"
                  options={{ title: 'Nouveau message', headerShown: true, headerBackTitle: 'Retour' }}
                />
                <Stack.Screen
                  name="shared-workout/[id]"
                  options={{ title: 'Séance partagée', headerShown: true, headerBackTitle: 'Retour' }}
                />
                <Stack.Screen
                  name="modal"
                  options={{ presentation: 'modal', title: 'Modal' }}
                />
                <Stack.Screen
                  name="login"
                  options={{ title: 'Connexion', headerShown: false }}
                />
                <Stack.Screen
                  name="register"
                  options={{ title: 'Inscription', headerShown: false }}
                />
                <Stack.Screen
                  name="profile-setup"
                  options={{ title: 'Configuration du profil', headerShown: false }}
                />
                <Stack.Screen
                  name="profile-setup-simple"
                  options={{ title: 'Configuration du profil', headerShown: false }}
                />
              </Stack>
            </WorkoutsProvider>
          </UserProfileProvider>
        </AuthProvider>
      </AppThemeProvider>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
