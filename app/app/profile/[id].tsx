import React, { useEffect, useState, useRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Animated,
  Easing,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { useAppTheme } from '@/theme/ThemeProvider';
import {
  Profile,
  UserPost,
  getProfile,
  getUserPosts,
  followUser,
  unfollowUser,
} from '@/services/profileApi';
import { createOrGetConversation } from '@/services/messagingApi';
import { useUserProfile } from '@/hooks/useUserProfile';

export default function ProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme, mode } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { profile: currentUserProfile } = useUserProfile();
  const isDark = mode === 'dark';

  const CURRENT_USER_ID = currentUserProfile?.id || 'guest-user';

  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'saved'>('posts');

  const headerAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!loading && profile) {
      Animated.stagger(150, [
        Animated.timing(headerAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.back(1.1)),
          useNativeDriver: true,
        }),
        Animated.timing(contentAnim, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading, profile]);

  const loadProfile = async () => {
    if (!id) return;
    try {
      const [profileData, postsData] = await Promise.all([
        getProfile(id, CURRENT_USER_ID),
        getUserPosts(id),
      ]);
      setProfile(profileData);
      setPosts(postsData.posts);
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [id]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadProfile();
  };

  const handleFollowToggle = async () => {
    if (!profile || followLoading) return;
    
    setFollowLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    
    try {
      if (profile.is_following) {
        await unfollowUser(profile.id, CURRENT_USER_ID);
        setProfile({
          ...profile,
          is_following: false,
          followers_count: profile.followers_count - 1,
        });
      } else {
        await followUser(profile.id, CURRENT_USER_ID);
        setProfile({
          ...profile,
          is_following: true,
          followers_count: profile.followers_count + 1,
        });
      }
    } catch (error) {
      console.error('Failed to toggle follow:', error);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleMessagePress = async () => {
    if (!profile || !CURRENT_USER_ID || messageLoading) return;
    
    setMessageLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    
    try {
      const response = await createOrGetConversation(CURRENT_USER_ID, profile.id);
      router.push(`/messages/${response.conversation.id}?participantId=${profile.id}`);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    } finally {
      setMessageLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.loadingSpinner, { backgroundColor: theme.colors.surface }]}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Chargement...
          </Text>
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.errorIconCircle, { backgroundColor: theme.colors.error + '20' }]}>
          <Ionicons name="person-outline" size={48} color={theme.colors.error} />
        </View>
        <Text style={[styles.errorTitle, { color: theme.colors.textPrimary }]}>
          Profil introuvable
        </Text>
        <Text style={[styles.errorSubtitle, { color: theme.colors.textSecondary }]}>
          Ce profil n'existe pas ou a été supprimé
        </Text>
        <Pressable
          style={({ pressed }) => [styles.errorButton, { backgroundColor: theme.colors.accent, opacity: pressed ? 0.9 : 1 }]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={18} color="#fff" />
          <Text style={styles.errorButtonText}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  const initials = profile.username.slice(0, 2).toUpperCase();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.accent}
          />
        }
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
            colors={isDark ? ['#1e1b4b', '#312e81', '#1e1b4b'] : ['#6366f1', '#8b5cf6', '#a855f7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.headerGradient, { paddingTop: insets.top + 12 }]}
          >
            {/* Cercles décoratifs */}
            <View style={styles.decorCircle1} pointerEvents="none" />
            <View style={styles.decorCircle2} pointerEvents="none" />

            {/* Navigation */}
            <View style={styles.navBar}>
              <Pressable
                onPress={() => router.back()}
                style={({ pressed }) => [styles.navButton, { opacity: pressed ? 0.8 : 1 }]}
              >
                <Ionicons name="arrow-back" size={22} color="#fff" />
              </Pressable>
              <Text style={styles.navTitle} numberOfLines={1}>{profile.username}</Text>
              <View style={styles.navButton} />
            </View>

            {/* Avatar centré */}
            <View style={styles.avatarRow}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatarRing}>
                  {profile.avatar_url ? (
                    <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
                  ) : (
                    <LinearGradient
                      colors={['#f97316', '#ea580c']}
                      style={styles.avatar}
                    >
                      <Text style={styles.avatarText}>{initials}</Text>
                    </LinearGradient>
                  )}
                </View>
                {profile.is_own_profile && (
                  <View style={styles.editAvatarBadge}>
                    <Ionicons name="camera" size={12} color="#fff" />
                  </View>
                )}
              </View>
            </View>

            {/* Stats en ligne sous l'avatar */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{profile.posts_count}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{profile.followers_count}</Text>
                <Text style={styles.statLabel}>Abonnés</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{profile.following_count}</Text>
                <Text style={styles.statLabel}>Suivis</Text>
              </View>
            </View>

            {/* Bio */}
            <View style={styles.bioSection}>
              <Text style={styles.bioUsername}>@{profile.username}</Text>
              {profile.objective && (
                <View style={styles.objectiveBadge}>
                  <Ionicons name="flag" size={12} color="#fff" />
                  <Text style={styles.objectiveText}>{profile.objective}</Text>
                </View>
              )}
              {profile.bio ? (
                <Text style={styles.bioText}>{profile.bio}</Text>
              ) : !profile.objective && (
                <Text style={styles.bioPlaceholder}>Aucune bio</Text>
              )}
              {profile.total_likes > 0 && (
                <View style={styles.likesRow}>
                  <Ionicons name="heart" size={14} color="#ef4444" />
                  <Text style={styles.likesText}>{profile.total_likes} J'aime reçus</Text>
                </View>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              {profile.is_own_profile ? (
                <Pressable
                  style={({ pressed }) => [styles.editProfileBtn, { opacity: pressed ? 0.9 : 1 }]}
                  onPress={() => router.push('/(tabs)/profile')}
                >
                  <Ionicons name="pencil" size={16} color="#fff" />
                  <Text style={styles.editProfileText}>Modifier le profil</Text>
                </Pressable>
              ) : (
                <>
                  <Pressable
                    style={({ pressed }) => [
                      styles.followBtn,
                      profile.is_following && styles.followingBtn,
                      { opacity: pressed ? 0.9 : 1 },
                    ]}
                    onPress={handleFollowToggle}
                    disabled={followLoading}
                  >
                    {followLoading ? (
                      <ActivityIndicator size="small" color={profile.is_following ? '#fff' : '#6366f1'} />
                    ) : (
                      <>
                        <Ionicons
                          name={profile.is_following ? 'checkmark' : 'person-add'}
                          size={16}
                          color={profile.is_following ? '#fff' : '#6366f1'}
                        />
                        <Text style={[
                          styles.followBtnText,
                          profile.is_following && styles.followingBtnText,
                        ]}>
                          {profile.is_following ? 'Abonné' : 'Suivre'}
                        </Text>
                      </>
                    )}
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.messageBtn, { opacity: pressed ? 0.9 : 1 }]}
                    onPress={handleMessagePress}
                    disabled={messageLoading}
                  >
                    {messageLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="chatbubble-outline" size={18} color="#fff" />
                        <Text style={styles.messageBtnText}>Message</Text>
                      </>
                    )}
                  </Pressable>
                </>
              )}
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Onglets et contenu */}
        <Animated.View
          style={[
            styles.contentSection,
            {
              opacity: contentAnim,
              transform: [
                {
                  translateY: contentAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [30, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {/* Onglets */}
          <View style={[styles.tabsContainer, { backgroundColor: theme.colors.surface }]}>
            <Pressable
              style={[
                styles.tab,
                activeTab === 'posts' && styles.tabActive,
              ]}
              onPress={() => { Haptics.selectionAsync().catch(() => {}); setActiveTab('posts'); }}
            >
              <Ionicons
                name="grid"
                size={20}
                color={activeTab === 'posts' ? theme.colors.accent : theme.colors.textSecondary}
              />
              <Text style={[styles.tabText, { color: activeTab === 'posts' ? theme.colors.accent : theme.colors.textSecondary }]}>
                Posts
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.tab,
                activeTab === 'saved' && styles.tabActive,
              ]}
              onPress={() => { Haptics.selectionAsync().catch(() => {}); setActiveTab('saved'); }}
            >
              <Ionicons
                name="bookmark"
                size={20}
                color={activeTab === 'saved' ? theme.colors.accent : theme.colors.textSecondary}
              />
              <Text style={[styles.tabText, { color: activeTab === 'saved' ? theme.colors.accent : theme.colors.textSecondary }]}>
                Sauvegardés
              </Text>
            </Pressable>
            <View
              style={[
                styles.tabIndicator,
                {
                  backgroundColor: theme.colors.accent,
                  left: activeTab === 'posts' ? '2%' : '52%',
                  width: '46%',
                },
              ]}
            />
          </View>

          {/* Contenu des onglets */}
          {posts.length === 0 ? (
            <View style={styles.emptyPosts}>
              <LinearGradient
                colors={isDark ? ['#312e81', '#1e1b4b'] : ['#6366f115', '#8b5cf608']}
                style={styles.emptyIconCircle}
              >
                <Ionicons
                  name={activeTab === 'posts' ? 'barbell-outline' : 'bookmark-outline'}
                  size={44}
                  color={theme.colors.accent}
                />
              </LinearGradient>
              <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
                {activeTab === 'posts' ? 'Aucune séance partagée' : 'Aucun post sauvegardé'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                {activeTab === 'posts'
                  ? 'Les séances que tu partages apparaîtront ici'
                  : 'Les posts que tu sauvegardes apparaîtront ici'}
              </Text>
              {activeTab === 'posts' && !profile.is_own_profile && (
                <Text style={[styles.emptyHint, { color: theme.colors.textSecondary }]}>
                  Ce profil n'a pas encore partagé de séance
                </Text>
              )}
            </View>
          ) : (
            <View style={styles.postsGrid}>
              {posts.map((post, index) => (
                <Pressable
                  key={post.share_id}
                  style={({ pressed }) => [
                    styles.postCard,
                    { 
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                  }}
                >
                  <LinearGradient
                    colors={['#6366f1', '#8b5cf6']}
                    style={styles.postIconBg}
                  >
                    <Ionicons name="barbell" size={20} color="#fff" />
                  </LinearGradient>
                  <Text
                    style={[styles.postTitle, { color: theme.colors.textPrimary }]}
                    numberOfLines={2}
                  >
                    {post.workout_title}
                  </Text>
                  <View style={styles.postMeta}>
                    <View style={styles.postMetaItem}>
                      <Ionicons name="heart" size={12} color="#ef4444" />
                      <Text style={[styles.postMetaText, { color: theme.colors.textSecondary }]}>
                        {post.like_count}
                      </Text>
                    </View>
                    <View style={styles.postMetaItem}>
                      <Ionicons name="fitness" size={12} color={theme.colors.accent} />
                      <Text style={[styles.postMetaText, { color: theme.colors.textSecondary }]}>
                        {post.exercise_count}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingSpinner: {
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  errorIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  errorSubtitle: {
    fontSize: 15,
    textAlign: 'center',
  },
  errorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  errorButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  headerWrapper: {},
  headerGradient: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    position: 'relative',
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
    bottom: 40,
    left: -40,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  avatarRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    padding: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 42,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    marginHorizontal: 4,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
    fontWeight: '600',
  },
  bioSection: {
    gap: 8,
    marginBottom: 16,
  },
  bioUsername: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  objectiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  objectiveText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  bioText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 20,
  },
  bioPlaceholder: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    fontStyle: 'italic',
  },
  likesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  likesText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  editProfileBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  editProfileText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  followBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 14,
  },
  followingBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  followBtnText: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '700',
  },
  followingBtnText: {
    color: '#fff',
  },
  messageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  messageBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  contentSection: {
    paddingTop: 20,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    borderRadius: 14,
    backgroundColor: 'transparent',
    marginBottom: 24,
    position: 'relative',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    zIndex: 1,
  },
  tabActive: {},
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    borderRadius: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyPosts: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
    gap: 14,
  },
  emptyIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
  },
  emptyHint: {
    fontSize: 13,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 4,
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 10,
  },
  postCard: {
    width: '31%',
    aspectRatio: 0.9,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
  },
  postIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postTitle: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  postMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  postMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  postMetaText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
