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

export default function RegisterScreen() {
  const router = useRouter();
  const { register, isLoading } = useAuth();
  const { theme } = useAppTheme();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string>('');

  const validateForm = () => {
    if (!username.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Veuillez remplir tous les champs');
      return false;
    }

    if (username.trim().length < 3) {
      setError('Le nom d\'utilisateur doit contenir au moins 3 caractères');
      return false;
    }

    // Validation du format du username
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(username.trim())) {
      setError('Le nom d\'utilisateur ne peut contenir que des lettres, chiffres, tirets et underscores');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Veuillez entrer une adresse email valide');
      return false;
    }

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return false;
    }

    // Validation de la complexité du mot de passe
    if (!/[a-z]/.test(password)) {
      setError('Le mot de passe doit contenir au moins une minuscule');
      return false;
    }
    if (!/[A-Z]/.test(password)) {
      setError('Le mot de passe doit contenir au moins une majuscule');
      return false;
    }
    if (!/\d/.test(password)) {
      setError('Le mot de passe doit contenir au moins un chiffre');
      return false;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    console.log('🔵 handleRegister appelé');
    
    if (!validateForm()) {
      console.log('❌ Validation échouée');
      return;
    }

    console.log('✅ Validation OK, inscription en cours...');
    setError('');
    try {
      await register({
        username: username.trim(),
        email: email.trim(),
        password: password,
      });
      console.log('✅ Inscription réussie, redirection vers profil...');
      router.replace('/profile-setup-simple');
    } catch (err) {
      console.error('❌ Erreur d\'inscription:', err);
      // Extraire le message d'erreur proprement
      let errorMessage = 'Erreur lors de l\'inscription';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String((err as any).detail);
      }
      console.log('📝 Message d\'erreur:', errorMessage);
      setError(errorMessage);
    }
  };

  const handleQuickRegister = async () => {
    setError('');
    try {
      const timestamp = Date.now();
      await register({
        username: `user${timestamp}`,
        email: `test${timestamp}@example.com`,
        password: 'TestPassword123',
      });
      console.log('✅ Inscription rapide réussie');
      router.replace('/profile-setup-simple');
    } catch (err) {
      console.error('❌ Erreur inscription rapide:', err);
      let errorMessage = 'Erreur lors de l\'inscription rapide';
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
            Crée ton compte
          </Text>
        </View>

        <View style={styles.form}>
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{String(error)}</Text>
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
              placeholder="Choisis un nom d'utilisateur"
              placeholderTextColor={theme.colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username-new"
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.colors.textPrimary }]}>
              Email
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
              value={email}
              onChangeText={setEmail}
              placeholder="ton@email.com"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.colors.textPrimary }]}>
              Mot de passe
            </Text>
            <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
              Min 8 caractères, 1 majuscule, 1 minuscule, 1 chiffre
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
              placeholder="Ex: MonMotDePasse123"
              placeholderTextColor={theme.colors.textSecondary}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password-new"
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.colors.textPrimary }]}>
              Confirmer le mot de passe
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
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Répète ton mot de passe"
              placeholderTextColor={theme.colors.textSecondary}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password-new"
              editable={!isLoading}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.button, 
              { backgroundColor: theme.colors.accent },
              isLoading && { opacity: 0.6 }
            ]}
            onPress={() => {
              console.log('🔘 Bouton S\'inscrire cliqué');
              handleRegister();
            }}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>S'inscrire</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.quickButton]}
            onPress={handleQuickRegister}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>🧪 Inscription Rapide</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => router.back()}
            disabled={isLoading}
          >
            <Text style={[styles.linkText, { color: theme.colors.accent }]}>
              Déjà un compte ? Se connecter
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
  hint: {
    fontSize: 12,
    marginBottom: 6,
    fontStyle: 'italic',
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
  quickButton: {
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