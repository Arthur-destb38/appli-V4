import React, { useState, useRef, useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';

import { useAppTheme } from '@/theme/ThemeProvider';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useWorkouts } from '@/hooks/useWorkouts';
import { updateRemoteProfile } from '@/services/userProfileApi';
import { uploadAvatar } from '@/services/profileApi';

const CURRENT_USER_ID = 'guest-user';

export default function ProfileScreen() {
  const { theme } = useAppTheme();
  const { profile, refresh } = useUserProfile();
  const { workouts } = useWorkouts();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editObjective, setEditObjective] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const cardsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(150, [
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.back(1.1)),
        useNativeDriver: true,
      }),
      Animated.timing(cardsAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Calculer les stats
  const completedWorkouts = workouts.filter(w => w.workout.status === 'completed').length;
  const totalExercises = workouts.reduce((acc, w) => acc + w.exercises.length, 0);

  const menuItems = [
    { label: 'Mon profil public', route: '/profile/guest-user', icon: 'person' as const, color: '#6366f1' },
    { label: 'Progression', route: '/history', icon: 'trending-up' as const, color: '#10b981' },
    { label: 'Mon Programme', route: '/programme', icon: 'calendar' as const, color: '#f59e0b' },
    { label: 'Classement', route: '/leaderboard', icon: 'trophy' as const, color: '#ec4899' },
    { label: 'Notifications', route: '/notifications', icon: 'notifications' as const, color: '#8b5cf6' },
  ];

  const settingsItems = [
    { label: 'Paramètres', route: '/settings', icon: 'settings' as const },
    { label: 'Conditions d\'utilisation', route: '/legal/terms', icon: 'document-text' as const },
    { label: 'Confidentialité', route: '/legal/privacy', icon: 'shield-checkmark' as const },
  ];

  const openEditModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setEditUsername(profile?.username || '');
    setEditBio(profile?.bio || '');
    setEditObjective(profile?.objective || '');
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!editUsername.trim()) {
      Alert.alert('Erreur', 'Le nom d\'utilisateur ne peut pas être vide');
      return;
    }

    setSaving(true);
    try {
      await updateRemoteProfile(profile?.id || CURRENT_USER_ID, {
        username: editUsername.trim(),
        bio: editBio.trim() || undefined,
        objective: editObjective.trim() || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await refresh();
      setEditModalVisible(false);
      Alert.alert('✅ Profil mis à jour !');
    } catch (error: any) {
      if (error.code === 'username_taken') {
        Alert.alert('Erreur', 'Ce nom d\'utilisateur est déjà pris');
      } else {
        Alert.alert('Erreur', 'Impossible de sauvegarder le profil');
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePickAvatar = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission requise', 'Autorise l\'accès à tes photos pour changer ton avatar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setUploadingAvatar(true);
      try {
        await uploadAvatar(profile?.id || CURRENT_USER_ID, result.assets[0].base64);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        await refresh();
      } catch (error) {
        Alert.alert('Erreur', 'Impossible de changer l\'avatar');
      } finally {
        setUploadingAvatar(false);
      }
    }
  };

  const avatarUri = profile?.avatar_url;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header avec gradient */}
        <Animated.View
          style={[
            styles.headerWrapper,
            {
              opacity: headerAnim,
              transform: [
                {
                  translateY: headerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-30, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={theme.dark ? ['#1e1b4b', '#312e81', '#1e1b4b'] : ['#6366f1', '#8b5cf6', '#a855f7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.headerGradient, { paddingTop: insets.top + 20 }]}
          >
            {/* Cercles décoratifs */}
            <View style={styles.decorCircle1} pointerEvents="none" />
            <View style={styles.decorCircle2} pointerEvents="none" />

            {/* Avatar */}
            <TouchableOpacity 
              onPress={handlePickAvatar} 
              disabled={uploadingAvatar}
              style={styles.avatarContainer}
              activeOpacity={0.8}
            >
              <View style={styles.avatarRing}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
                ) : (
                  <LinearGradient
                    colors={['#f97316', '#ea580c']}
                    style={styles.avatar}
                  >
                    <Text style={styles.avatarText}>
                      {(profile?.username || 'U').charAt(0).toUpperCase()}
                    </Text>
                  </LinearGradient>
                )}
              </View>
              <View style={styles.editAvatarBadge}>
                {uploadingAvatar ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="camera" size={14} color="#fff" />
                )}
              </View>
            </TouchableOpacity>

            {/* Infos utilisateur */}
            <Text style={styles.username}>{profile?.username || 'Utilisateur'}</Text>
            <Text style={styles.bio}>{profile?.bio || 'Aucune bio définie'}</Text>

            {profile?.objective && (
              <View style={styles.objectiveBadge}>
                <Ionicons name="flag" size={14} color="#fff" />
                <Text style={styles.objectiveText}>{profile.objective}</Text>
              </View>
            )}

            {/* Bouton modifier */}
            <TouchableOpacity style={styles.editButton} onPress={openEditModal} activeOpacity={0.8}>
              <Ionicons name="pencil" size={16} color="#fff" />
              <Text style={styles.editButtonText}>Modifier le profil</Text>
            </TouchableOpacity>

            {/* Stats rapides */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{completedWorkouts}</Text>
                <Text style={styles.statLabel}>Séances</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{totalExercises}</Text>
                <Text style={styles.statLabel}>Exercices</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{workouts.length}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Menu principal */}
        <Animated.View
          style={[
            styles.menuSection,
            {
              opacity: cardsAnim,
              transform: [
                {
                  translateY: cardsAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
            Menu
          </Text>
          <View style={[styles.menuCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            {menuItems.map((item, index) => (
              <Pressable
                key={item.route}
                style={({ pressed }) => [
                  styles.menuItem,
                  index !== menuItems.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: theme.colors.border,
                  },
                  { opacity: pressed ? 0.7 : 1 },
                ]}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  router.push(item.route as never);
                }}
              >
                <View style={styles.menuItemLeft}>
                  <View style={[styles.menuIconContainer, { backgroundColor: item.color + '20' }]}>
                    <Ionicons name={item.icon} size={20} color={item.color} />
                  </View>
                  <Text style={[styles.menuItemText, { color: theme.colors.textPrimary }]}>
                    {item.label}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* Paramètres */}
        <Animated.View
          style={[
            styles.menuSection,
            {
              opacity: cardsAnim,
              transform: [
                {
                  translateY: cardsAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
            Réglages
          </Text>
          <View style={[styles.menuCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            {settingsItems.map((item, index) => (
              <Pressable
                key={item.route}
                style={({ pressed }) => [
                  styles.menuItem,
                  index !== settingsItems.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: theme.colors.border,
                  },
                  { opacity: pressed ? 0.7 : 1 },
                ]}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  router.push(item.route as never);
                }}
              >
                <View style={styles.menuItemLeft}>
                  <View style={[styles.menuIconContainer, { backgroundColor: theme.colors.surfaceMuted }]}>
                    <Ionicons name={item.icon} size={20} color={theme.colors.textSecondary} />
                  </View>
                  <Text style={[styles.menuItemText, { color: theme.colors.textPrimary }]}>
                    {item.label}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* Version & Logout */}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.logoutButton, { backgroundColor: theme.colors.error + '15' }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
              Alert.alert('Déconnexion', 'Es-tu sûr de vouloir te déconnecter ?', [
                { text: 'Annuler', style: 'cancel' },
                { text: 'Déconnexion', style: 'destructive', onPress: () => router.push('/auth/login') },
              ]);
            }}
          >
            <Ionicons name="log-out-outline" size={20} color={theme.colors.error} />
            <Text style={[styles.logoutText, { color: theme.colors.error }]}>Déconnexion</Text>
          </TouchableOpacity>
          
          <Text style={[styles.version, { color: theme.colors.textSecondary }]}>
            Gorillax v1.0.0
          </Text>
        </View>
      </ScrollView>

      {/* Modal d'édition */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <Pressable 
            style={styles.modalBackdrop} 
            onPress={() => setEditModalVisible(false)} 
          />
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHandle} />
            
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
                Modifier le profil
              </Text>
              <TouchableOpacity 
                onPress={() => setEditModalVisible(false)}
                style={[styles.modalCloseBtn, { backgroundColor: theme.colors.surfaceMuted }]}
              >
                <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                Nom d'utilisateur
              </Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                <Ionicons name="person-outline" size={18} color={theme.colors.textSecondary} />
                <TextInput
                  style={[styles.input, { color: theme.colors.textPrimary }]}
                  value={editUsername}
                  onChangeText={setEditUsername}
                  placeholder="Ton pseudo"
                  placeholderTextColor={theme.colors.textSecondary}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                Bio
              </Text>
              <View style={[styles.inputWrapper, styles.textAreaWrapper, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                <TextInput
                  style={[styles.input, styles.textArea, { color: theme.colors.textPrimary }]}
                  value={editBio}
                  onChangeText={setEditBio}
                  placeholder="Parle de toi..."
                  placeholderTextColor={theme.colors.textSecondary}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                Objectif
              </Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
                <Ionicons name="flag-outline" size={18} color={theme.colors.textSecondary} />
                <TextInput
                  style={[styles.input, { color: theme.colors.textPrimary }]}
                  value={editObjective}
                  onChangeText={setEditObjective}
                  placeholder="Ex: Prise de masse, Perte de poids..."
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>
            </View>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveProfile}
              disabled={saving}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#6366f1', '#8b5cf6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveButtonGradient}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.saveButtonText}>Enregistrer</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerWrapper: {
    marginBottom: 24,
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
  },
  decorCircle1: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: 20,
    left: -40,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    padding: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 51,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 51,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '800',
    color: '#fff',
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  username: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  bio: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  objectiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  objectiveText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    marginBottom: 20,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  menuSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 16,
    marginTop: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
  },
  version: {
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(150,150,150,0.3)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  textAreaWrapper: {
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  saveButton: {
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
