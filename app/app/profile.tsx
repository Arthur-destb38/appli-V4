import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useRouter } from 'expo-router';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAuth } from '@/hooks/useAuth';

const ProfileScreen: React.FC = () => {
  const router = useRouter();
  const { profile, isLoading, updateProfile, error } = useUserProfile();
  const { logout, user } = useAuth();
  const [username, setUsername] = useState('');
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username);
      setConsent(profile.consent_to_public_share);
    }
  }, [profile]);

  const handleSave = async () => {
    if (!username.trim()) {
      Alert.alert('Pseudo requis', 'Merci de saisir un pseudo.');
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        username,
        consent_to_public_share: consent,
      });
      Alert.alert('Profil enregistré', 'Tes préférences ont été mises à jour.');
    } catch (err) {
      Alert.alert(
        'Enregistrement impossible',
        err instanceof Error ? err.message : 'Réessaie plus tard.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (isLoading && !profile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Chargement du profil…</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Mon profil</Text>
        <Text style={styles.subtitle}>
          Choisis un pseudo et indique si tu acceptes de rendre tes séances partagées publiques.
        </Text>
        <Text style={styles.label}>Pseudo</Text>
        <TextInput
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
          placeholder="athlete-1234"
        />
        <View style={styles.switchRow}>
          <View style={styles.switchLabels}>
            <Text style={styles.switchTitle}>Partager publiquement</Text>
            <Text style={styles.switchHelp}>
              Active ce réglage pour autoriser tes séances partagées à apparaître dans le feed.
            </Text>
          </View>
          <Switch value={consent} onValueChange={setConsent} />
        </View>
        <TouchableOpacity
          style={[styles.saveButton, saving ? styles.saveButtonDisabled : null]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.saveButtonText}>Enregistrer</Text>
          )}
        </TouchableOpacity>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

      {user && (
        <View style={styles.card}>
          <Text style={styles.title}>Compte</Text>
          <Text style={styles.subtitle}>Connecté en tant que : {user.username}</Text>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={async () => {
              Alert.alert(
                'Déconnexion',
                'Es-tu sûr de vouloir te déconnecter ?',
                [
                  { text: 'Annuler', style: 'cancel' },
                  {
                    text: 'Déconnexion',
                    style: 'destructive',
                    onPress: async () => {
                      await logout();
                      router.replace('/login');
                    },
                  },
                ]
              );
            }}
          >
            <Text style={styles.logoutButtonText}>Se déconnecter</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    gap: 16,
    shadowColor: '#0F172A0F',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    color: '#475569',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#F8FAFC',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  switchLabels: {
    flex: 1,
    gap: 4,
  },
  switchTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  switchHelp: {
    fontSize: 13,
    color: '#64748B',
  },
  saveButton: {
    backgroundColor: '#1D4ED8',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  errorText: {
    color: '#B91C1C',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 24,
  },
  loadingText: {
    color: '#475569',
    fontSize: 16,
  },
  logoutButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  logoutButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
});
