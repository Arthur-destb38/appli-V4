import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
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
import { useTranslations } from '@/hooks/usePreferences';

const ProfileScreen: React.FC = () => {
  const router = useRouter();
  const { profile, isLoading, updateProfile, error } = useUserProfile();
  const { logout, user } = useAuth();
  const { t } = useTranslations();
  const [username, setUsername] = useState('');
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setUsername(user?.username || profile.username);
      setConsent(profile.consent_to_public_share);
    }
  }, [profile]);

  const handleSave = async () => {
    if (!username.trim()) {
      Alert.alert(t('pseudoRequired'), t('enterPseudo'));
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        username,
        consent_to_public_share: consent,
      });
      Alert.alert(t('profileRegistered'), t('preferencesUpdated'));
    } catch (err) {
      Alert.alert(
        t('savingFailed'),
        err instanceof Error ? err.message : t('retryLater')
      );
    } finally {
      setSaving(false);
    }
  };

  if (isLoading && !profile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>{t('loadingProfile')}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{t('myProfileTitle')}</Text>
        <Text style={styles.subtitle}>
          {t('profilePageDesc')}
        </Text>
        <Text style={styles.label}>{t('pseudo')}</Text>
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
            <Text style={styles.switchTitle}>{t('sharePublicly')}</Text>
            <Text style={styles.switchHelp}>
              {t('sharePubliclyDesc')}
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
            <Text style={styles.saveButtonText}>{t('save')}</Text>
          )}
        </TouchableOpacity>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

      {user && (
        <View style={styles.card}>
          <Text style={styles.title}>{t('accountSection')}</Text>
          <Text style={styles.subtitle}>{t('loggedInAs')} {user.username}</Text>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={async () => {
              const doLogout = async () => {
                await logout();
                router.replace('/login');
              };
              if (Platform.OS === 'web' && typeof window !== 'undefined') {
                if (window.confirm(t('logoutConfirm'))) {
                  await doLogout();
                }
              } else {
                Alert.alert(
                  t('disconnectTitle'),
                  t('logoutConfirm'),
                  [
                    { text: t('cancel'), style: 'cancel' },
                    { text: t('disconnectTitle'), style: 'destructive', onPress: doLogout },
                  ]
                );
              }
            }}
          >
            <Text style={styles.logoutButtonText}>{t('disconnectLabel')}</Text>
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
