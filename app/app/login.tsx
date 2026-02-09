import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useAppTheme } from '@/theme/ThemeProvider';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading } = useAuth();
  const { theme } = useAppTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    setError('');
    try {
      await login({ username: username.trim(), password });
      console.log('✅ Connexion réussie, redirection...');
      router.replace('/(tabs)');
    } catch (err) {
      console.error('❌ Erreur de connexion:', err);
      // Extraire le message d'erreur proprement
      let errorMessage = 'Erreur de connexion';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String((err as any).detail);
      }
      setError(errorMessage);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    try {
      await login({ username: 'demo', password: 'DemoPassword123' });
      console.log('✅ Connexion demo réussie');
      router.replace('/(tabs)');
    } catch (err) {
      console.error('❌ Erreur connexion demo:', err);
      let errorMessage = 'Impossible de se connecter avec le compte demo';
      if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>🦍 Gorillax</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Connecte-toi à ton compte
          </Text>
        </View>

        <View style={styles.form}>
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.colors.textPrimary }]}>
              Nom d'utilisateur
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.surface,
                  color: theme.colors.textPrimary,
                  borderColor: theme.colors.border,
                },
              ]}
              value={username}
              onChangeText={setUsername}
              placeholder="Ton nom d'utilisateur"
              placeholderTextColor={theme.colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.colors.textPrimary }]}>
              Mot de passe
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.surface,
                  color: theme.colors.textPrimary,
                  borderColor: theme.colors.border,
                },
              ]}
              value={password}
              onChangeText={setPassword}
              placeholder="Ton mot de passe"
              placeholderTextColor={theme.colors.textSecondary}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="current-password"
              editable={!isLoading}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.colors.accent }]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>Se connecter</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.demoButton]}
            onPress={handleDemoLogin}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>🧪 Connexion Demo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => router.push('/register')}
            disabled={isLoading}
          >
            <Text style={[styles.linkText, { color: theme.colors.accent }]}>
              Pas encore inscrit ? Créer un compte
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  demoButton: {
    backgroundColor: '#28a745',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
    fontWeight: '500',
  },
});