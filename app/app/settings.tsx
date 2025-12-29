import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  Pressable,
  View,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { useAppTheme } from '@/theme/ThemeProvider';
import { useUserProfile } from '@/hooks/useUserProfile';

const toTimeLabel = (date: Date) => {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

interface SettingRowProps {
  icon: string;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
  onPress?: () => void;
  theme: any;
}

const SettingRow: React.FC<SettingRowProps> = ({
  icon,
  iconColor,
  iconBg,
  title,
  subtitle,
  rightElement,
  onPress,
  theme,
}) => (
  <TouchableOpacity
    style={styles.settingRow}
    onPress={onPress}
    disabled={!onPress}
    activeOpacity={onPress ? 0.7 : 1}
  >
    <View style={[styles.settingIcon, { backgroundColor: iconBg }]}>
      <Ionicons name={icon as any} size={20} color={iconColor} />
    </View>
    <View style={styles.settingContent}>
      <Text style={[styles.settingTitle, { color: theme.colors.textPrimary }]}>{title}</Text>
      {subtitle && (
        <Text style={[styles.settingSubtitle, { color: theme.colors.textSecondary }]}>{subtitle}</Text>
      )}
    </View>
    {rightElement || (onPress && <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />)}
  </TouchableOpacity>
);

const SettingsScreen: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, mode, setMode } = useAppTheme();
  const { profile, updateProfile } = useUserProfile();
  const [notificationsOn, setNotificationsOn] = useState(false);
  const [usageMinutes] = useState(0);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState(profile?.username ?? '');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [notificationTime, setNotificationTime] = useState<Date>(() => {
    const base = new Date();
    base.setHours(18);
    base.setMinutes(0);
    base.setSeconds(0);
    base.setMilliseconds(0);
    return base;
  });
  const [isPickingTime, setIsPickingTime] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const switchTrackColor = {
    false: theme.colors.surfaceMuted,
    true: '#6366f1',
  };
  const notificationLabel = useMemo(
    () => `Rappel quotidien à ${toTimeLabel(notificationTime)}`,
    [notificationTime]
  );

  const incrementHours = (delta: number) => {
    Haptics.selectionAsync().catch(() => {});
    setNotificationTime((prev) => {
      const next = new Date(prev);
      let hours = next.getHours() + delta;
      if (hours < 0) hours = 24 + hours;
      if (hours >= 24) hours = hours % 24;
      next.setHours(hours);
      return next;
    });
  };

  const incrementMinutes = (delta: number) => {
    Haptics.selectionAsync().catch(() => {});
    setNotificationTime((prev) => {
      const next = new Date(prev);
      let minutes = next.getMinutes() + delta;
      while (minutes < 0) minutes += 60;
      while (minutes >= 60) minutes -= 60;
      next.setMinutes(minutes);
      return next;
    });
  };

  const handleConsentToggle = async (value: boolean) => {
    Haptics.selectionAsync().catch(() => {});
    try {
      await updateProfile({ consent_to_public_share: value });
    } catch (error) {
      console.warn('Failed to update consent', error);
    }
  };

  useEffect(() => {
    setUsernameDraft(profile?.username ?? '');
  }, [profile?.username]);

  const openUsernameModal = () => {
    Haptics.selectionAsync().catch(() => {});
    setUsernameDraft(profile?.username ?? '');
    setUsernameError(null);
    setIsEditingUsername(true);
  };

  const handleSaveUsername = async () => {
    const next = usernameDraft.trim();
    if (!next) {
      setUsernameError('Le pseudo ne peut pas être vide.');
      return;
    }
    if (next.length < 3) {
      setUsernameError('Choisis un pseudo d\'au moins 3 caractères.');
      return;
    }
    try {
      await updateProfile({ username: next });
      setIsEditingUsername(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (error) {
      console.warn('Failed to update username', error);
      setUsernameError('Impossible de mettre à jour le pseudo pour le moment.');
    }
  };

  return (
    <>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: theme.colors.surfaceMuted }]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>Paramètres</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }}
          >
            {/* Section Profil */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>PROFIL</Text>
              <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <SettingRow
                  icon="person"
                  iconColor="#6366f1"
                  iconBg="#6366f120"
                  title="Pseudo"
                  subtitle={profile?.username || 'Non défini'}
                  onPress={openUsernameModal}
                  theme={theme}
                />
                <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
                <SettingRow
                  icon="globe"
                  iconColor="#10b981"
                  iconBg="#10b98120"
                  title="Partage public"
                  subtitle="Séances visibles dans le feed"
                  rightElement={
                    <Switch
                      value={profile?.consent_to_public_share ?? false}
                      onValueChange={handleConsentToggle}
                      trackColor={switchTrackColor}
                      thumbColor="#fff"
                    />
                  }
                  theme={theme}
                />
              </View>
            </View>

            {/* Section Apparence */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>APPARENCE</Text>
              <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <SettingRow
                  icon="moon"
                  iconColor="#8b5cf6"
                  iconBg="#8b5cf620"
                  title="Mode sombre"
                  subtitle={mode === 'dark' ? 'Activé' : 'Désactivé'}
                  rightElement={
                    <Switch
                      value={mode === 'dark'}
                      onValueChange={(value) => {
                        Haptics.selectionAsync().catch(() => {});
                        setMode(value ? 'dark' : 'light');
                      }}
                      trackColor={switchTrackColor}
                      thumbColor="#fff"
                    />
                  }
                  theme={theme}
                />
              </View>
            </View>

            {/* Section Notifications */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>NOTIFICATIONS</Text>
              <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <SettingRow
                  icon="notifications"
                  iconColor="#f59e0b"
                  iconBg="#f59e0b20"
                  title="Rappels"
                  subtitle={notificationsOn ? notificationLabel : 'Désactivés'}
                  rightElement={
                    <Switch
                      value={notificationsOn}
                      onValueChange={(value) => {
                        Haptics.selectionAsync().catch(() => {});
                        setNotificationsOn(value);
                      }}
                      trackColor={switchTrackColor}
                      thumbColor="#fff"
                    />
                  }
                  theme={theme}
                />
                {notificationsOn && (
                  <>
                    <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
                    <TouchableOpacity
                      style={styles.timePickerButton}
                      onPress={() => setIsPickingTime(true)}
                    >
                      <View style={[styles.settingIcon, { backgroundColor: '#f59e0b20' }]}>
                        <Ionicons name="time" size={20} color="#f59e0b" />
                      </View>
                      <View style={styles.settingContent}>
                        <Text style={[styles.settingTitle, { color: theme.colors.textPrimary }]}>
                          Heure du rappel
                        </Text>
                      </View>
                      <View style={[styles.timeBadge, { backgroundColor: '#f59e0b20' }]}>
                        <Text style={[styles.timeBadgeText, { color: '#f59e0b' }]}>
                          {toTimeLabel(notificationTime)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>

            {/* Section Statistiques */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>STATISTIQUES</Text>
              <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <View style={styles.statsRow}>
                  <View style={[styles.settingIcon, { backgroundColor: '#3b82f620' }]}>
                    <Ionicons name="time-outline" size={20} color="#3b82f6" />
                  </View>
                  <View style={styles.settingContent}>
                    <Text style={[styles.settingTitle, { color: theme.colors.textPrimary }]}>
                      Temps cette semaine
                    </Text>
                    <Text style={[styles.settingSubtitle, { color: theme.colors.textSecondary }]}>
                      Temps passé sur l&apos;app
                    </Text>
                  </View>
                  <View style={[styles.statBadge, { backgroundColor: theme.colors.surfaceMuted }]}>
                    <Text style={[styles.statBadgeText, { color: theme.colors.textPrimary }]}>
                      {usageMinutes} min
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Section Légal */}
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>LÉGAL</Text>
              <View style={[styles.sectionCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <SettingRow
                  icon="document-text"
                  iconColor="#64748b"
                  iconBg="#64748b20"
                  title="Conditions d'utilisation"
                  onPress={() => router.push('/legal/terms')}
                  theme={theme}
                />
                <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
                <SettingRow
                  icon="shield-checkmark"
                  iconColor="#64748b"
                  iconBg="#64748b20"
                  title="Confidentialité"
                  onPress={() => router.push('/legal/privacy')}
                  theme={theme}
                />
              </View>
            </View>

            {/* Version */}
            <View style={styles.versionContainer}>
              <Text style={[styles.versionText, { color: theme.colors.textSecondary }]}>
                Gorillax v1.0.0
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </View>

      {/* Modal Modifier Pseudo */}
      <Modal
        animationType="fade"
        transparent
        visible={isEditingUsername}
        onRequestClose={() => setIsEditingUsername(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setIsEditingUsername(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: theme.colors.surface }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconCircle, { backgroundColor: '#6366f120' }]}>
                <Ionicons name="person" size={28} color="#6366f1" />
              </View>
              <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
                Modifier le pseudo
              </Text>
              <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
                Choisis un pseudo unique pour ton profil
              </Text>
            </View>

            <View style={[styles.inputContainer, { backgroundColor: theme.colors.surfaceMuted, borderColor: usernameError ? theme.colors.error : 'transparent' }]}>
              <Ionicons name="at" size={20} color={theme.colors.textSecondary} />
              <TextInput
                value={usernameDraft}
                onChangeText={(text) => {
                  setUsernameDraft(text);
                  if (usernameError) setUsernameError(null);
                }}
                placeholder="Ton pseudo"
                placeholderTextColor={theme.colors.textSecondary}
                style={[styles.input, { color: theme.colors.textPrimary }]}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {usernameError && (
              <Text style={[styles.errorText, { color: theme.colors.error }]}>{usernameError}</Text>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: theme.colors.surfaceMuted }]}
                onPress={() => setIsEditingUsername(false)}
              >
                <Text style={[styles.modalCancelText, { color: theme.colors.textSecondary }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveUsername}>
                <LinearGradient
                  colors={['#6366f1', '#8b5cf6']}
                  style={styles.modalSaveBtnGradient}
                >
                  <Text style={styles.modalSaveText}>Enregistrer</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal Heure */}
      <Modal
        animationType="slide"
        transparent
        visible={isPickingTime}
        onRequestClose={() => setIsPickingTime(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setIsPickingTime(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: theme.colors.surface }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconCircle, { backgroundColor: '#f59e0b20' }]}>
                <Ionicons name="time" size={28} color="#f59e0b" />
              </View>
              <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
                Heure du rappel
              </Text>
              <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
                Choisis l&apos;heure de ta notification quotidienne
              </Text>
            </View>

            <View style={styles.timePickerRow}>
              {/* Heures */}
              <View style={styles.timeColumn}>
                <Text style={[styles.timeColumnLabel, { color: theme.colors.textSecondary }]}>Heures</Text>
                <View style={[styles.stepper, { backgroundColor: theme.colors.surfaceMuted }]}>
                  <TouchableOpacity
                    style={[styles.stepperButton, { backgroundColor: theme.colors.surface }]}
                    onPress={() => incrementHours(-1)}
                  >
                    <Ionicons name="remove" size={20} color={theme.colors.textPrimary} />
                  </TouchableOpacity>
                  <Text style={[styles.timeValueLarge, { color: theme.colors.textPrimary }]}>
                    {notificationTime.getHours().toString().padStart(2, '0')}
                  </Text>
                  <TouchableOpacity
                    style={[styles.stepperButton, { backgroundColor: theme.colors.surface }]}
                    onPress={() => incrementHours(1)}
                  >
                    <Ionicons name="add" size={20} color={theme.colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={[styles.timeSeparator, { color: theme.colors.textPrimary }]}>:</Text>

              {/* Minutes */}
              <View style={styles.timeColumn}>
                <Text style={[styles.timeColumnLabel, { color: theme.colors.textSecondary }]}>Minutes</Text>
                <View style={[styles.stepper, { backgroundColor: theme.colors.surfaceMuted }]}>
                  <TouchableOpacity
                    style={[styles.stepperButton, { backgroundColor: theme.colors.surface }]}
                    onPress={() => incrementMinutes(-5)}
                  >
                    <Ionicons name="remove" size={20} color={theme.colors.textPrimary} />
                  </TouchableOpacity>
                  <Text style={[styles.timeValueLarge, { color: theme.colors.textPrimary }]}>
                    {notificationTime.getMinutes().toString().padStart(2, '0')}
                  </Text>
                  <TouchableOpacity
                    style={[styles.stepperButton, { backgroundColor: theme.colors.surface }]}
                    onPress={() => incrementMinutes(5)}
                  >
                    <Ionicons name="add" size={20} color={theme.colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: theme.colors.surfaceMuted }]}
                onPress={() => setIsPickingTime(false)}
              >
                <Text style={[styles.modalCancelText, { color: theme.colors.textSecondary }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={() => setIsPickingTime(false)}>
                <LinearGradient
                  colors={['#f59e0b', '#f97316']}
                  style={styles.modalSaveBtnGradient}
                >
                  <Text style={styles.modalSaveText}>Valider</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

export default SettingsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 10,
    marginLeft: 4,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 14,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  settingSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginLeft: 68,
  },
  timePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 14,
  },
  timeBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  timeBadgeText: {
    fontSize: 15,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 14,
  },
  statBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  statBadgeText: {
    fontSize: 15,
    fontWeight: '700',
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  versionText: {
    fontSize: 13,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    borderRadius: 24,
    padding: 24,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    gap: 12,
    borderWidth: 2,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  errorText: {
    fontSize: 13,
    marginTop: 8,
    marginLeft: 4,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  modalSaveBtn: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  modalSaveBtnGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalSaveText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  timeColumn: {
    alignItems: 'center',
    gap: 10,
  },
  timeColumnLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 6,
    gap: 12,
  },
  stepperButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeValueLarge: {
    fontSize: 32,
    fontWeight: '800',
    width: 50,
    textAlign: 'center',
  },
  timeSeparator: {
    fontSize: 32,
    fontWeight: '800',
    marginTop: 26,
  },
});
