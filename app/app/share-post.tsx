import React, { useState, useRef, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';

import { useAppTheme } from '@/theme/ThemeProvider';
import { useWorkouts } from '@/hooks/useWorkouts';
import { useTranslations } from '@/hooks/usePreferences';

const COLOR_PALETTE = [
  { hex: '#6366f1', label: 'Indigo' },
  { hex: '#8b5cf6', label: 'Violet' },
  { hex: '#ec4899', label: 'Rose' },
  { hex: '#f43f5e', label: 'Rouge' },
  { hex: '#f97316', label: 'Orange' },
  { hex: '#f59e0b', label: 'Ambre' },
  { hex: '#10b981', label: 'Émeraude' },
  { hex: '#14b8a6', label: 'Teal' },
  { hex: '#3b82f6', label: 'Bleu' },
  { hex: '#06b6d4', label: 'Cyan' },
];

export default function SharePostScreen() {
  const { workoutId, workoutTitle, exerciseCount, setCount } = useLocalSearchParams<{
    workoutId: string;
    workoutTitle: string;
    exerciseCount: string;
    setCount: string;
  }>();

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, mode } = useAppTheme();
  const { shareWorkout } = useWorkouts();
  const { t } = useTranslations();
  const isDark = mode === 'dark';

  const [caption, setCaption] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_PALETTE[0].hex);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 9,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const pickImage = async () => {
    Haptics.selectionAsync().catch(() => {});
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('permissionRequired'), t('photoPermissionMessage'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.6,
      base64: true,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setImageUri(asset.uri);
    if (asset.base64) {
      const mime = asset.mimeType || 'image/jpeg';
      setImageBase64(`data:${mime};base64,${asset.base64}`);
    }
  };

  const removeImage = () => {
    Haptics.selectionAsync().catch(() => {});
    setImageUri(null);
    setImageBase64(null);
  };

  const handlePublish = async () => {
    if (isPublishing) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setIsPublishing(true);
    try {
      await shareWorkout(Number(workoutId), {
        caption: caption.trim() || undefined,
        color: selectedColor,
        image_base64: imageBase64 || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.replace('/(tabs)/feed');
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      Alert.alert(t('error'), error?.message || t('cannotPublish'));
    } finally {
      setIsPublishing(false);
    }
  };

  const darken = (hex: string, amount: number) => {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (num >> 16) - amount);
    const g = Math.max(0, ((num >> 8) & 0x00ff) - amount);
    const b = Math.max(0, (num & 0x0000ff) - amount);
    return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable
          style={({ pressed }) => [
            styles.closeBtn,
            { backgroundColor: theme.colors.surfaceMuted, opacity: pressed ? 0.7 : 1 },
          ]}
          onPress={() => router.back()}
        >
          <Ionicons name="close" size={22} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
          {t('newPost')}
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.publishBtn,
            { opacity: pressed && !isPublishing ? 0.85 : 1 },
          ]}
          onPress={handlePublish}
          disabled={isPublishing}
        >
          <LinearGradient
            colors={[selectedColor, darken(selectedColor, 30)]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.publishGradient}
          >
            {isPublishing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="paper-plane" size={16} color="#fff" />
                <Text style={styles.publishText}>{t('publish')}</Text>
              </>
            )}
          </LinearGradient>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            {/* Workout Preview Card */}
            <View style={styles.previewSection}>
              <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>
                {t('previewLabel')}
              </Text>
              <View style={[styles.previewCard, { backgroundColor: selectedColor + '15' }]}>
                <LinearGradient
                  colors={isDark
                    ? [darken(selectedColor, 120), darken(selectedColor, 80)]
                    : [selectedColor, darken(selectedColor, 20)]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.workoutCard}
                >
                  <View style={styles.workoutCardOverlay}>
                    <View style={styles.workoutBadge}>
                      <Ionicons name="fitness" size={14} color="#fff" />
                      <Text style={styles.workoutBadgeText}>{t('workoutLabelSingle')}</Text>
                    </View>
                    <Text style={styles.workoutTitle} numberOfLines={2}>
                      {workoutTitle || t('myWorkout')}
                    </Text>
                    <View style={styles.workoutStats}>
                      <View style={styles.workoutStat}>
                        <Text style={styles.workoutStatValue}>{exerciseCount || '0'}</Text>
                        <Text style={styles.workoutStatLabel}>{t('exercisesLabel')}</Text>
                      </View>
                      <View style={styles.statDivider} />
                      <View style={styles.workoutStat}>
                        <Text style={styles.workoutStatValue}>{setCount || '0'}</Text>
                        <Text style={styles.workoutStatLabel}>{t('setsLabel')}</Text>
                      </View>
                    </View>
                  </View>
                  {/* Decorative circles */}
                  <View style={[styles.decoCircle, styles.decoCircle1]} />
                  <View style={[styles.decoCircle, styles.decoCircle2]} />
                </LinearGradient>

                {/* Image preview */}
                {imageUri && (
                  <View style={styles.imagePreviewContainer}>
                    <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                    <Pressable
                      style={({ pressed }) => [
                        styles.removeImageBtn,
                        { opacity: pressed ? 0.7 : 1 },
                      ]}
                      onPress={removeImage}
                    >
                      <Ionicons name="close-circle" size={28} color="#fff" />
                    </Pressable>
                  </View>
                )}
              </View>
            </View>

            {/* Caption */}
            <View style={styles.captionSection}>
              <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>
                {t('descriptionLabel')}
              </Text>
              <View
                style={[
                  styles.captionInputContainer,
                  {
                    backgroundColor: theme.colors.surfaceMuted,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <TextInput
                  style={[styles.captionInput, { color: theme.colors.textPrimary }]}
                  placeholder={t('describeWorkout')}
                  placeholderTextColor={theme.colors.textSecondary}
                  value={caption}
                  onChangeText={setCaption}
                  multiline
                  maxLength={2000}
                  textAlignVertical="top"
                />
                <Text style={[styles.charCount, { color: theme.colors.textSecondary }]}>
                  {caption.length}/2000
                </Text>
              </View>
            </View>

            {/* Color Picker */}
            <View style={styles.colorSection}>
              <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>
                {t('colorLabel')}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.colorRow}
              >
                {COLOR_PALETTE.map((c) => {
                  const isSelected = selectedColor === c.hex;
                  return (
                    <Pressable
                      key={c.hex}
                      onPress={() => {
                        Haptics.selectionAsync().catch(() => {});
                        setSelectedColor(c.hex);
                      }}
                      style={[
                        styles.colorOption,
                        isSelected && {
                          borderColor: c.hex,
                          borderWidth: 3,
                          transform: [{ scale: 1.1 }],
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.colorCircle,
                          { backgroundColor: c.hex },
                          isSelected && styles.colorCircleSelected,
                        ]}
                      >
                        {isSelected && (
                          <Ionicons name="checkmark" size={18} color="#fff" />
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Photo Button */}
            <View style={styles.photoSection}>
              <Text style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}>
                {t('photoLabel')}
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.photoBtn,
                  {
                    backgroundColor: theme.colors.surfaceMuted,
                    borderColor: theme.colors.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
                onPress={pickImage}
              >
                <LinearGradient
                  colors={[selectedColor + '20', selectedColor + '08']}
                  style={styles.photoBtnGradient}
                >
                  <View style={[styles.photoBtnIcon, { backgroundColor: selectedColor + '20' }]}>
                    <Ionicons
                      name={imageUri ? 'image' : 'camera-outline'}
                      size={24}
                      color={selectedColor}
                    />
                  </View>
                  <View style={styles.photoBtnContent}>
                    <Text style={[styles.photoBtnTitle, { color: theme.colors.textPrimary }]}>
                      {imageUri ? t('changePhoto') : t('addPhoto')}
                    </Text>
                    <Text style={[styles.photoBtnSubtitle, { color: theme.colors.textSecondary }]}>
                      {imageUri ? t('tapToReplace') : t('fromGallery')}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
                </LinearGradient>
              </Pressable>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  publishBtn: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  publishGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  publishText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 24,
    paddingTop: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  previewSection: {},
  previewCard: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  workoutCard: {
    borderRadius: 20,
    padding: 20,
    minHeight: 140,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  workoutCardOverlay: {
    gap: 10,
    zIndex: 1,
  },
  workoutBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  workoutBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  workoutTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  workoutStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  workoutStat: {
    alignItems: 'center',
  },
  workoutStatValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
  workoutStatLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  decoCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  decoCircle1: {
    width: 120,
    height: 120,
    top: -30,
    right: -20,
  },
  decoCircle2: {
    width: 80,
    height: 80,
    bottom: -20,
    left: -10,
  },
  imagePreviewContainer: {
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 220,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captionSection: {},
  captionInputContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  captionInput: {
    fontSize: 16,
    lineHeight: 22,
    minHeight: 100,
    maxHeight: 200,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 6,
  },
  colorSection: {},
  colorRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 4,
  },
  colorOption: {
    borderRadius: 22,
    borderWidth: 3,
    borderColor: 'transparent',
    padding: 2,
  },
  colorCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCircleSelected: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  photoSection: {},
  photoBtn: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  photoBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  photoBtnIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoBtnContent: {
    flex: 1,
    gap: 2,
  },
  photoBtnTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  photoBtnSubtitle: {
    fontSize: 13,
  },
});
