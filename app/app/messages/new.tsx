import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useAppTheme } from '@/theme/ThemeProvider';
import { useUserProfile } from '@/hooks/useUserProfile';
import { createOrGetConversation } from '@/services/messagingApi';
import { searchUsers } from '@/services/exploreApi';
import { useTranslations } from '@/hooks/usePreferences';

type UserResult = {
  id: string;
  username: string;
  avatar_url: string | null;
  bio?: string;
};

export default function NewConversationScreen() {
  const { theme, mode } = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useUserProfile();
  const { t } = useTranslations();

  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const isDark = mode === 'dark';

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [headerAnim]);

  // Recherche d'utilisateurs avec debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setUsers([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchUsers(searchQuery, 20);
        // Filtrer l'utilisateur actuel
        const filtered = results.filter((u: UserResult) => u.id !== profile?.id);
        setUsers(filtered);
      } catch (error) {
        console.warn('Search failed:', error);
        setUsers([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, profile?.id]);

  const handleUserSelect = async (user: UserResult) => {
    if (!profile?.id || isCreating) return;

    setIsCreating(true);
    Haptics.selectionAsync().catch(() => {});

    try {
      const response = await createOrGetConversation(profile.id, user.id);
      router.replace(`/messages/${response.conversation.id}?participantId=${user.id}`);
    } catch (error) {
      console.warn('Failed to create conversation:', error);
      setIsCreating(false);
    }
  };

  const gradientColors = isDark
    ? ['#1a1f2e', '#0F1218', '#0F1218']
    : ['#e0e7ff', '#c7d2fe', '#F7F8FA'];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <LinearGradient
        colors={gradientColors as [string, string, ...string[]]}
        style={[styles.heroGradient, { paddingTop: insets.top }]}
      >
        <Animated.View
          style={[
            styles.heroContent,
            {
              opacity: headerAnim,
              transform: [
                { translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) },
              ],
            },
          ]}
        >
          {/* Top bar */}
          <View style={styles.topBar}>
            <Pressable
              style={({ pressed }) => [
                styles.backBtn,
                { backgroundColor: theme.colors.surface, opacity: pressed ? 0.6 : 1 },
              ]}
              onPress={() => router.back()}
            >
              <Ionicons name="close" size={22} color={theme.colors.textPrimary} />
            </Pressable>
            <View style={styles.topBarTitle}>
              <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
                {t('newConversationTitle')}
              </Text>
            </View>
            <View style={{ width: 44 }} />
          </View>

          {/* Search */}
          <View style={[styles.searchContainer, { backgroundColor: theme.colors.surface }]}>
            <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.textPrimary }]}
              placeholder={t('searchUserPlaceholder')}
              placeholderTextColor={theme.colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
              </Pressable>
            )}
          </View>
        </Animated.View>
      </LinearGradient>

      {/* Results */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {isSearching ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
              {t('searching')}
            </Text>
          </View>
        ) : searchQuery.trim() === '' ? (
          <View style={styles.hintContainer}>
            <View style={[styles.hintIcon, { backgroundColor: theme.colors.primary + '20' }]}>
              <Ionicons name="people" size={32} color={theme.colors.primary} />
            </View>
            <Text style={[styles.hintTitle, { color: theme.colors.textPrimary }]}>
              {t('findAthlete')}
            </Text>
            <Text style={[styles.hintText, { color: theme.colors.textSecondary }]}>
              {t('searchByUsername')}
            </Text>
          </View>
        ) : users.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.colors.surfaceMuted }]}>
              <Ionicons name="search-outline" size={32} color={theme.colors.textSecondary} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
              {t('noResults')}
            </Text>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              {t('noUserFoundFor', { query: searchQuery })}
            </Text>
          </View>
        ) : (
          <>
            <Text style={[styles.resultsHeader, { color: theme.colors.textSecondary }]}>
              {t('resultCountLabel', { count: users.length })}
            </Text>
            {users.map((user, index) => {
              const avatarLetter = user.username.charAt(0).toUpperCase();
              return (
                <Pressable
                  key={user.id}
                  style={({ pressed }) => [
                    styles.userCard,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                    },
                  ]}
                  onPress={() => handleUserSelect(user)}
                  disabled={isCreating}
                >
                  <LinearGradient
                    colors={['#6366F1', '#8B5CF6']}
                    style={styles.userAvatarGradient}
                  >
                    <View style={[styles.userAvatar, { backgroundColor: theme.colors.surface }]}>
                      <Text style={[styles.userAvatarText, { color: theme.colors.primary }]}>
                        {avatarLetter}
                      </Text>
                    </View>
                  </LinearGradient>

                  <View style={styles.userInfo}>
                    <Text style={[styles.userName, { color: theme.colors.textPrimary }]}>
                      {user.username}
                    </Text>
                    {user.bio && (
                      <Text
                        style={[styles.userBio, { color: theme.colors.textSecondary }]}
                        numberOfLines={1}
                      >
                        {user.bio}
                      </Text>
                    )}
                  </View>

                  <View style={[styles.messageIcon, { backgroundColor: theme.colors.primary + '20' }]}>
                    <Ionicons name="chatbubble" size={18} color={theme.colors.primary} />
                  </View>
                </Pressable>
              );
            })}
          </>
        )}
      </ScrollView>

      {/* Loading overlay */}
      {isCreating && (
        <View style={styles.creatingOverlay}>
          <View style={[styles.creatingBox, { backgroundColor: theme.colors.surface }]}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.creatingText, { color: theme.colors.textPrimary }]}>
              {t('creatingConversation')}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroGradient: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  heroContent: {
    gap: 16,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 10,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '500',
  },
  hintContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  hintIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  hintTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  hintText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  resultsHeader: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
  },
  userAvatarGradient: {
    width: 52,
    height: 52,
    borderRadius: 26,
    padding: 2,
  },
  userAvatar: {
    flex: 1,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontSize: 20,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
    gap: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  userBio: {
    fontSize: 14,
  },
  messageIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  creatingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  creatingBox: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
  },
  creatingText: {
    fontSize: 15,
    fontWeight: '600',
  },
});



