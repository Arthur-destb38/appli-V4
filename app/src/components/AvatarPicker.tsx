import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';

import { useAppTheme } from '@/theme/ThemeProvider';
import { uploadAvatar, deleteAvatar } from '@/services/profileApi';

interface AvatarPickerProps {
  userId: string;
  currentAvatarUrl: string | null;
  username: string;
  size?: number;
  onAvatarChange?: (newAvatarUrl: string | null) => void;
  editable?: boolean;
}

export function AvatarPicker({
  userId,
  currentAvatarUrl,
  username,
  size = 100,
  onAvatarChange,
  editable = true,
}: AvatarPickerProps) {
  const { theme } = useAppTheme();
  const [uploading, setUploading] = useState(false);
  const [localAvatar, setLocalAvatar] = useState<string | null>(currentAvatarUrl);

  const avatarUrl = localAvatar || currentAvatarUrl;
  const initials = username.slice(0, 2).toUpperCase();

  const pickImage = async () => {
    if (!editable) return;

    Haptics.selectionAsync().catch(() => {});

    // Demander la permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission requise',
        'Autorise l\'accès à ta galerie pour changer ton avatar.'
      );
      return;
    }

    // Ouvrir le picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (result.canceled || !result.assets[0].base64) {
      return;
    }

    const asset = result.assets[0];
    const mimeType = asset.mimeType || 'image/jpeg';
    const base64Uri = `data:${mimeType};base64,${asset.base64}`;

    setUploading(true);
    try {
      const response = await uploadAvatar(userId, base64Uri);
      setLocalAvatar(response.avatar_url);
      onAvatarChange?.(response.avatar_url);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      Alert.alert('Erreur', 'Impossible d\'uploader l\'avatar. Réessaie.');
    } finally {
      setUploading(false);
    }
  };

  const removeAvatar = async () => {
    if (!editable || !avatarUrl) return;

    Haptics.selectionAsync().catch(() => {});

    Alert.alert(
      'Supprimer l\'avatar',
      'Tu veux vraiment supprimer ta photo de profil ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setUploading(true);
            try {
              await deleteAvatar(userId);
              setLocalAvatar(null);
              onAvatarChange?.(null);
            } catch (error) {
              console.error('Failed to delete avatar:', error);
              Alert.alert('Erreur', 'Impossible de supprimer l\'avatar.');
            } finally {
              setUploading(false);
            }
          },
        },
      ]
    );
  };

  const showOptions = () => {
    if (!editable) return;

    if (avatarUrl) {
      Alert.alert(
        'Photo de profil',
        'Que veux-tu faire ?',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Changer la photo', onPress: pickImage },
          { text: 'Supprimer', style: 'destructive', onPress: removeAvatar },
        ]
      );
    } else {
      pickImage();
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
      onPress={showOptions}
      disabled={!editable || uploading}
      activeOpacity={editable ? 0.7 : 1}
    >
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={[
            styles.avatar,
            { width: size, height: size, borderRadius: size / 2 },
          ]}
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: theme.colors.accent + '25',
            },
          ]}
        >
          <Text
            style={[
              styles.initials,
              { color: theme.colors.accent, fontSize: size * 0.35 },
            ]}
          >
            {initials}
          </Text>
        </View>
      )}

      {uploading && (
        <View
          style={[
            styles.loadingOverlay,
            { borderRadius: size / 2 },
          ]}
        >
          <ActivityIndicator color="#FFF" size="small" />
        </View>
      )}

      {editable && !uploading && (
        <View
          style={[
            styles.editBadge,
            { backgroundColor: theme.colors.accent },
          ]}
        >
          <Ionicons name="camera" size={14} color="#FFF" />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  avatar: {
    resizeMode: 'cover',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: '700',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
});




