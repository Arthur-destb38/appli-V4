import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Alert,
  ActivityIndicator,
  Platform,
  ScrollView,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

import { useAppTheme } from '@/theme/ThemeProvider';
import { buildApiUrl, apiCall } from '@/utils/api';

const COPY_PASS = "Présentez ce pass à l'entrée ou sur la machine en salle partenaire Gorillax.";

export default function PassSalleScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loadingApple, setLoadingApple] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  const handleAddToAppleWallet = async () => {
    setLoadingApple(true);
    try {
      const accessToken = await AsyncStorage.getItem('@gorillax_access_token');
      if (!accessToken) {
        Alert.alert('Connexion requise', 'Connecte-toi pour ajouter le pass.');
        return;
      }
      const url = `${buildApiUrl('/wallet/apple/pass')}?access_token=${encodeURIComponent(accessToken)}`;
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          'Ajouter à Apple Wallet',
          'Ouvre ce lien dans Safari pour ajouter le pass : ' + url.slice(0, 50) + '...'
        );
      }
    } catch (e) {
      Alert.alert('Erreur', 'Impossible d\'ouvrir le pass. Vérifie ta connexion.');
    } finally {
      setLoadingApple(false);
    }
  };

  const handleAddToGoogleWallet = async () => {
    setLoadingGoogle(true);
    try {
      const accessToken = await AsyncStorage.getItem('@gorillax_access_token');
      if (!accessToken) {
        Alert.alert('Connexion requise', 'Connecte-toi pour ajouter le pass.');
        return;
      }
      const res = await apiCall('/wallet/google/pass');
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 503) {
          Alert.alert('Non configuré', 'Google Wallet n\'est pas encore configuré sur ce serveur.');
        } else {
          Alert.alert('Erreur', err.detail || 'Impossible de récupérer le pass.');
        }
        return;
      }
      const data = await res.json();
      const addUrl = data.addToWalletUrl;
      if (addUrl) {
        const supported = await Linking.canOpenURL(addUrl);
        if (supported) {
          await Linking.openURL(addUrl);
        } else {
          Alert.alert('Ouvre le lien', addUrl);
        }
      }
    } catch (e) {
      Alert.alert('Erreur', 'Impossible d\'ouvrir Google Wallet. Vérifie ta connexion.');
    } finally {
      setLoadingGoogle(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>Carte membre</Text>
        <View style={{ width: 32 }} />
      </View>
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.content}>
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Carte membre Gorillax</Text>
        <Text style={[styles.copy, { color: theme.colors.textSecondary }]}>{COPY_PASS}</Text>
      </View>

      {Platform.OS === 'ios' && (
        <TouchableOpacity
          style={[styles.button, styles.appleButton]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            handleAddToAppleWallet();
          }}
          disabled={loadingApple}
        >
          {loadingApple ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="wallet" size={22} color="#fff" />
              <Text style={styles.buttonText}>Ajouter à Apple Wallet</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {(Platform.OS === 'android' || Platform.OS === 'web') && (
        <TouchableOpacity
          style={[styles.button, styles.googleButton]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            handleAddToGoogleWallet();
          }}
          disabled={loadingGoogle}
        >
          {loadingGoogle ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="wallet" size={22} color="#fff" />
              <Text style={styles.buttonText}>Ajouter à Google Wallet</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {Platform.OS === 'ios' && (
        <TouchableOpacity
          style={[styles.button, styles.googleButtonSecondary]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            handleAddToGoogleWallet();
          }}
          disabled={loadingGoogle}
        >
          {loadingGoogle ? <ActivityIndicator color="#333" /> : <Text style={styles.buttonTextSecondary}>Lien Google Wallet</Text>}
        </TouchableOpacity>
      )}
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  container: { flex: 1 },
  content: { padding: 20, paddingTop: 24 },
  card: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  copy: {
    fontSize: 15,
    lineHeight: 22,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 12,
  },
  appleButton: {
    backgroundColor: '#000',
  },
  googleButton: {
    backgroundColor: '#4285f4',
  },
  googleButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: '#333',
    fontSize: 17,
    fontWeight: '600',
  },
});
