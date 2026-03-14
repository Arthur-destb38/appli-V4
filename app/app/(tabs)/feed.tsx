import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  KeyboardAvoidingView,
  Platform,
  Easing,
  ScrollView,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { useFeed } from '@/hooks/useFeed';
import { useAppTheme } from '@/theme/ThemeProvider';
import { FeedCard } from '@/components/FeedCard';
import { getComments, addComment, Comment, toggleCommentLike } from '@/services/likesApi';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useTranslations } from '@/hooks/usePreferences';
import { useNotificationCount } from '@/hooks/useNotificationCount';
import { getAvatarGradient } from '@/utils/colors';
import { formatRelativeDate } from '@/utils/formatTime';
import { getSuggestedUsers, searchUsers, SuggestedUser } from '@/services/exploreApi';
import { followUser, unfollowUser } from '@/services/profileApi';

// Composant pour afficher un commentaire avec like
const CommentItem: React.FC<{
  comment: Comment;
  theme: any;
  currentUserId: string;
  index: number;
}> = ({ comment, theme, currentUserId, index }) => {
  const { language } = useTranslations();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      delay: index * 50,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  const handleLike = async () => {
    if (isLoading) return;

    setLiked(!liked);
    setLikeCount((prev) => (liked ? prev - 1 : prev + 1));
    setIsLoading(true);
    Haptics.selectionAsync().catch(() => {});

    try {
      const response = await toggleCommentLike(comment.id, currentUserId);
      setLiked(response.liked);
      setLikeCount(response.like_count);
    } catch {
      setLiked(liked);
      setLikeCount((prev) => (liked ? prev + 1 : prev - 1));
    } finally {
      setIsLoading(false);
    }
  };

  const gradient = getAvatarGradient(comment.username);

  return (
    <Animated.View style={[styles.commentItem, { opacity: fadeAnim }]}>
      <LinearGradient colors={gradient} style={styles.commentAvatarGradient}>
        <View style={[styles.commentAvatar, { backgroundColor: theme.colors.background }]}>
          <Text style={[styles.commentAvatarText, { color: gradient[0] }]}>
            {comment.username.slice(0, 1).toUpperCase()}
          </Text>
        </View>
      </LinearGradient>
      <View style={styles.commentContent}>
        <View style={[styles.commentBubble, { backgroundColor: theme.colors.surfaceMuted }]}>
          <Text style={[styles.commentUsername, { color: theme.colors.textPrimary }]}>
            {comment.username}
          </Text>
          <Text style={[styles.commentText, { color: theme.colors.textPrimary }]}>
            {comment.content}
          </Text>
        </View>
        <View style={styles.commentMeta}>
          <Text style={[styles.commentDate, { color: theme.colors.textSecondary }]}>
            {formatRelativeDate(comment.created_at, language)}
          </Text>
          <TouchableOpacity style={styles.commentLikeBtn} onPress={handleLike} disabled={isLoading}>
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={14}
              color={liked ? '#FF3B5C' : theme.colors.textSecondary}
            />
            {likeCount > 0 && (
              <Text style={[styles.commentLikeCount, { color: theme.colors.textSecondary }]}>
                {likeCount}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

const FeedScreen: React.FC = () => {
  const { items, load, nextCursor, isLoading, error, duplicate } = useFeed();
  const { theme, mode } = useAppTheme();
  const { t, language } = useTranslations();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { unreadCount: notifCount } = useNotificationCount();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'feed' | 'discover'>('feed');
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [loadingDiscover, setLoadingDiscover] = useState(false);
  const [followingId, setFollowingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SuggestedUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const headerAnim = useRef(new Animated.Value(0)).current;

  // Priorité à user?.id (auth) pour commentaires/likes, puis profile (chargé après)
  const currentUserId = user?.id ?? profile?.id ?? 'guest-user';
  const isDark = mode === 'dark';

  // Comments modal state
  const [commentsModal, setCommentsModal] = useState<{
    visible: boolean;
    shareId: string | null;
    comments: Comment[];
    loading: boolean;
  }>({
    visible: false,
    shareId: null,
    comments: [],
    loading: false,
  });
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

  }, []);

  useEffect(() => {
    load(true).catch(() => undefined);
  }, [load]);

  useEffect(() => {
    if (activeTab === 'discover' && suggestedUsers.length === 0) {
      setLoadingDiscover(true);
      getSuggestedUsers(undefined, 20)
        .then((users) => setSuggestedUsers(users))
        .catch(() => {})
        .finally(() => setLoadingDiscover(false));
    }
  }, [activeTab]);

  const handleFollowToggle = async (userId: string) => {
    if (followingId) return;
    setFollowingId(userId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      if (followedIds.has(userId)) {
        await unfollowUser(userId);
        setFollowedIds((prev) => { const s = new Set(prev); s.delete(userId); return s; });
      } else {
        await followUser(userId);
        setFollowedIds((prev) => new Set([...prev, userId]));
      }
    } catch {} finally {
      setFollowingId(null);
    }
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const results = await searchUsers(query.trim(), 20);
        setSearchResults(results);
      } catch {} finally {
        setIsSearching(false);
      }
    }, 350);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      await load(true);
    } finally {
      setRefreshing(false);
    }
  };

  const openComments = async (shareId: string) => {
    setCommentsModal({ visible: true, shareId, comments: [], loading: true });
    try {
      const response = await getComments(shareId);
      setCommentsModal((prev) => ({ ...prev, comments: response.comments, loading: false }));
    } catch {
      setCommentsModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || !commentsModal.shareId || postingComment) return;

    setPostingComment(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      const comment = await addComment(commentsModal.shareId, currentUserId, newComment.trim());
      setCommentsModal((prev) => ({
        ...prev,
        comments: [comment, ...prev.comments],
      }));
      setNewComment('');
    } catch {
      // Handle error
    } finally {
      setPostingComment(false);
    }
  };

  const renderItem = ({ item, index }: any) => (
    <FeedCard
      shareId={item.share_id}
      ownerId={item.owner_id}
      ownerUsername={item.owner_username}
      workoutTitle={item.workout_title}
      exerciseCount={item.exercise_count}
      setCount={item.set_count}
      createdAt={item.created_at}
      caption={item.caption}
      color={item.color}
      imageUrl={item.image_url}
      currentUserId={currentUserId}
      initialLikeCount={item.like_count || 0}
      comments={item.comments || []}
      commentCount={item.comment_count || 0}
      onProfilePress={() => router.push(`/profile/${item.owner_id}`)}
      onDuplicate={() => duplicate(item.share_id)}
      onCommentPress={() => openComments(item.share_id)}
      onWorkoutPress={(shareId) => router.push(`/shared-workout/${shareId}`)}
      index={index}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Modern Header */}
      <Animated.View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 8,
            backgroundColor: theme.colors.background,
            opacity: headerAnim,
            transform: [
              {
                translateY: headerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={styles.logoContainer}>
          <View style={styles.logoIconWrapper}>
            <LinearGradient
              colors={['#6366f1', '#8b5cf6']}
              style={styles.logoIcon}
            >
              <Ionicons name="fitness" size={20} color="#fff" />
            </LinearGradient>
            {/* Activity indicator dot */}
            <View style={styles.activityDot} />
          </View>
          <View>
            <Text style={[styles.logo, { color: theme.colors.textPrimary }]}>Gorillax</Text>
            <Text style={[styles.logoSubtitle, { color: theme.colors.textSecondary }]}>
              {items.length > 0 ? `${items.length} posts` : 'Feed'}
            </Text>
          </View>
        </View>
        <Pressable
          style={({ pressed }) => [styles.notifBtn, { opacity: pressed ? 0.8 : 1 }]}
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            router.push('/notifications');
          }}
        >
          <LinearGradient
            colors={['#7c3aed', '#6d28d9']}
            style={styles.notifBtnInner}
          >
            <Ionicons name="notifications" size={20} color="#fff" />
            {notifCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{notifCount > 99 ? '99+' : notifCount}</Text>
              </View>
            )}
          </LinearGradient>
        </Pressable>
      </Animated.View>

      {/* Tab bar */}
      <View style={[styles.tabBar, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.border }]}>
        <Pressable
          style={[styles.tabItem, activeTab === 'feed' && styles.tabItemActive]}
          onPress={() => { setActiveTab('feed'); Haptics.selectionAsync().catch(() => {}); }}
        >
          {activeTab === 'feed' && (
            <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.tabActiveIndicator} />
          )}
          <Ionicons name="barbell" size={18} color={activeTab === 'feed' ? '#6366f1' : theme.colors.textSecondary} />
          <Text style={[styles.tabLabel, { color: activeTab === 'feed' ? '#6366f1' : theme.colors.textSecondary }]}>
            Séances
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabItem, activeTab === 'discover' && styles.tabItemActive]}
          onPress={() => { setActiveTab('discover'); Haptics.selectionAsync().catch(() => {}); }}
        >
          {activeTab === 'discover' && (
            <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.tabActiveIndicator} />
          )}
          <Ionicons name="people" size={18} color={activeTab === 'discover' ? '#6366f1' : theme.colors.textSecondary} />
          <Text style={[styles.tabLabel, { color: activeTab === 'discover' ? '#6366f1' : theme.colors.textSecondary }]}>
            Découvrir
          </Text>
        </Pressable>
      </View>

      {/* Feed */}
      {activeTab === 'discover' ? (
        loadingDiscover ? (
          <View style={styles.loadingContainer}>
            <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.loadingGradient}>
              <ActivityIndicator size="large" color="#fff" />
            </LinearGradient>
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Chargement…</Text>
          </View>
        ) : (
          <FlatList
            data={searchQuery.trim() ? searchResults : suggestedUsers}
            keyExtractor={(u) => u.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.discoverList, { paddingBottom: insets.bottom + 100 }]}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              <View>
                {/* Barre de recherche */}
                <View style={[styles.searchBar, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border }]}>
                  <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
                  <TextInput
                    style={[styles.searchInput, { color: theme.colors.textPrimary }]}
                    placeholder="Rechercher un utilisateur…"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={searchQuery}
                    onChangeText={handleSearchChange}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="search"
                  />
                  {isSearching && <ActivityIndicator size="small" color="#6366f1" />}
                  {searchQuery.length > 0 && !isSearching && (
                    <Pressable onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
                      <Ionicons name="close-circle" size={18} color={theme.colors.textSecondary} />
                    </Pressable>
                  )}
                </View>
                {!searchQuery.trim() && (
                  <View style={styles.discoverHeader}>
                    <Text style={[styles.discoverTitle, { color: theme.colors.textPrimary }]}>Athlètes à suivre</Text>
                    <Text style={[styles.discoverSubtitle, { color: theme.colors.textSecondary }]}>
                      Découvre des gens qui partagent leur entraînement
                    </Text>
                  </View>
                )}
              </View>
            }
            ListEmptyComponent={
              !isSearching ? (
                <View style={styles.emptyState}>
                  <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.emptyIconGradient}>
                    <Ionicons name={searchQuery.trim() ? 'search' : 'people'} size={40} color="#fff" />
                  </LinearGradient>
                  <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
                    {searchQuery.trim() ? 'Aucun résultat' : 'Personne à suggérer'}
                  </Text>
                  <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                    {searchQuery.trim() ? `Aucun utilisateur trouvé pour "${searchQuery}"` : 'Reviens plus tard quand d\'autres utilisateurs s\'inscriront'}
                  </Text>
                </View>
              ) : null
            }
            renderItem={({ item }) => {
              const isFollowing = followedIds.has(item.id);
              const isLoading = followingId === item.id;
              const gradient = getAvatarGradient(item.username);
              return (
                <Pressable
                  style={[styles.userCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                  onPress={() => router.push(`/profile/${item.id}`)}
                >
                  {/* Avatar */}
                  <Pressable onPress={() => router.push(`/profile/${item.id}`)}>
                    {item.avatar_url ? (
                      <Image source={{ uri: item.avatar_url }} style={styles.userAvatar} />
                    ) : (
                      <LinearGradient colors={gradient} style={styles.userAvatarGradient}>
                        <Text style={styles.userAvatarText}>{item.username.slice(0, 2).toUpperCase()}</Text>
                      </LinearGradient>
                    )}
                  </Pressable>

                  {/* Info */}
                  <View style={styles.userInfo}>
                    <Text style={[styles.userName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                      @{item.username}
                    </Text>
                    {item.objective ? (
                      <View style={styles.userObjectiveBadge}>
                        <Ionicons name="flag" size={10} color="#8b5cf6" />
                        <Text style={[styles.userObjective, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                          {item.objective}
                        </Text>
                      </View>
                    ) : item.bio ? (
                      <Text style={[styles.userBio, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                        {item.bio}
                      </Text>
                    ) : null}
                    <View style={styles.userStats}>
                      <Ionicons name="people-outline" size={12} color={theme.colors.textSecondary} />
                      <Text style={[styles.userStatText, { color: theme.colors.textSecondary }]}>
                        {item.followers_count} abonnés
                      </Text>
                      <Text style={[styles.userStatDot, { color: theme.colors.textSecondary }]}>·</Text>
                      <Ionicons name="barbell-outline" size={12} color={theme.colors.textSecondary} />
                      <Text style={[styles.userStatText, { color: theme.colors.textSecondary }]}>
                        {item.posts_count} posts
                      </Text>
                    </View>
                  </View>

                  {/* Follow button */}
                  <Pressable
                    style={[
                      styles.followBtn,
                      isFollowing
                        ? { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border, borderWidth: 1 }
                        : { backgroundColor: '#6366f1' },
                    ]}
                    onPress={() => handleFollowToggle(item.id)}
                    disabled={!!followingId}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color={isFollowing ? theme.colors.textPrimary : '#fff'} />
                    ) : (
                      <Text style={[styles.followBtnText, { color: isFollowing ? theme.colors.textPrimary : '#fff' }]}>
                        {isFollowing ? 'Suivi ✓' : 'Suivre'}
                      </Text>
                    )}
                  </Pressable>
                </Pressable>
              );
            }}
          />
        )
      ) : isLoading && !items.length ? (
        <View style={styles.loadingContainer}>
          <LinearGradient
            colors={['#6366f1', '#8b5cf6']}
            style={styles.loadingGradient}
          >
            <ActivityIndicator size="large" color="#fff" />
          </LinearGradient>
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            {t('feedLoading')}
          </Text>
        </View>
      ) : items.length === 0 ? (
        <ScrollView contentContainerStyle={styles.emptyScrollContent}>
          <View style={styles.emptyState}>
            <LinearGradient
              colors={['#6366f1', '#8b5cf6']}
              style={styles.emptyIconGradient}
            >
              <Ionicons name="people" size={48} color="#fff" />
            </LinearGradient>
            <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
              {t('feedEmptyTitle')}
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
              {t('feedEmptySubtitle')}
            </Text>
            <View style={styles.emptyActions}>
              <Pressable
                style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
                onPress={() => router.push('/explore')}
              >
                <LinearGradient
                  colors={['#6366f1', '#8b5cf6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.emptyButtonGradient}
                >
                  <Ionicons name="compass" size={18} color="#fff" />
                  <Text style={styles.emptyButtonText}>{t('explore')}</Text>
                </LinearGradient>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.emptySecondaryBtn,
                  { borderColor: theme.colors.border, opacity: pressed ? 0.7 : 1 },
                ]}
                onPress={() => router.push('/create')}
              >
                <Ionicons name="add" size={18} color={theme.colors.textPrimary} />
                <Text style={[styles.emptySecondaryText, { color: theme.colors.textPrimary }]}>
                  {t('createWorkout')}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.share_id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={8}
          removeClippedSubviews={true}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#6366f1"
            />
          }
          onEndReached={() => { if (nextCursor && !isLoading) load(false); }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            isLoading && items.length > 0 ? (
              <ActivityIndicator style={{ marginVertical: 20 }} color="#6366f1" />
            ) : !nextCursor && items.length > 0 ? (
              <View style={styles.endOfFeed}>
                <LinearGradient
                  colors={isDark ? ['transparent', '#6366f120', 'transparent'] : ['transparent', '#6366f110', 'transparent']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.endGradient}
                />
                <View style={[styles.endBadge, { backgroundColor: theme.colors.surfaceMuted }]}>
                  <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                  <Text style={[styles.endText, { color: theme.colors.textSecondary }]}>
                    {t('feedUpToDate')}
                  </Text>
                </View>
              </View>
            ) : null
          }
        />
      )}

      ) /* end discover ternary */}

      {error ? (
        <View style={[styles.errorBanner, { backgroundColor: theme.colors.error + '20' }]}>
          <Ionicons name="warning" size={18} color={theme.colors.error} />
          <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
          <Pressable onPress={() => load(true)} style={styles.errorRetry}>
            <Text style={[styles.errorRetryText, { color: theme.colors.error }]}>{t('retryLabel')}</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Comments Modal */}
      <Modal
        visible={commentsModal.visible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCommentsModal((prev) => ({ ...prev, visible: false }))}
      >
        <TouchableWithoutFeedback
          onPress={() => setCommentsModal((prev) => ({ ...prev, visible: false }))}
        >
          <View style={styles.commentsOverlay} />
        </TouchableWithoutFeedback>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.commentsModal, { backgroundColor: theme.colors.background }]}
        >
          {/* Drag indicator */}
          <View style={styles.dragIndicatorContainer}>
            <View style={[styles.dragIndicator, { backgroundColor: theme.colors.border }]} />
          </View>

          {/* Comments Header */}
          <View style={[styles.commentsHeader, { borderColor: theme.colors.border }]}>
            <View style={{ width: 40 }} />
            <Text style={[styles.commentsTitle, { color: theme.colors.textPrimary }]}>
              {t('commentsTitle')}
            </Text>
            <TouchableOpacity
              style={[styles.closeModalBtn, { backgroundColor: theme.colors.surfaceMuted }]}
              onPress={() => setCommentsModal((prev) => ({ ...prev, visible: false }))}
            >
              <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Comments List */}
          {commentsModal.loading ? (
            <View style={styles.commentsLoading}>
              <ActivityIndicator size="large" color="#6366f1" />
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                {t('loading')}
              </Text>
            </View>
          ) : commentsModal.comments.length === 0 ? (
            <View style={styles.noComments}>
              <View style={[styles.noCommentsIconCircle, { backgroundColor: theme.colors.surfaceMuted }]}>
                <Ionicons name="chatbubbles-outline" size={48} color={theme.colors.textSecondary} />
              </View>
              <Text style={[styles.noCommentsTitle, { color: theme.colors.textPrimary }]}>
                {t('noCommentsYet')}
              </Text>
              <Text style={[styles.noCommentsText, { color: theme.colors.textSecondary }]}>
                {t('beFirstToComment')}
              </Text>
            </View>
          ) : (
            <FlatList
              data={commentsModal.comments}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.commentsList}
              showsVerticalScrollIndicator={false}
              renderItem={({ item, index }) => (
                <CommentItem
                  comment={item}
                  theme={theme}
                  currentUserId={currentUserId}
                  index={index}
                />
              )}
            />
          )}

          {/* Comment Input */}
          <View
            style={[
              styles.commentInputContainer,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.surface,
              },
            ]}
          >
            <View style={[styles.inputWrapper, { backgroundColor: theme.colors.surfaceMuted }]}>
              <TextInput
                style={[styles.commentInput, { color: theme.colors.textPrimary }]}
                placeholder={t('addCommentPlaceholder')}
                placeholderTextColor={theme.colors.textSecondary}
                value={newComment}
                onChangeText={setNewComment}
                multiline
                maxLength={500}
              />
            </View>
            <TouchableOpacity
              onPress={handlePostComment}
              disabled={!newComment.trim() || postingComment}
              style={styles.sendButtonWrapper}
            >
              <LinearGradient
                colors={newComment.trim() ? ['#6366f1', '#8b5cf6'] : [theme.colors.surfaceMuted, theme.colors.surfaceMuted]}
                style={styles.sendButton}
              >
                {postingComment ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons
                    name="send"
                    size={18}
                    color={newComment.trim() ? '#fff' : theme.colors.textSecondary}
                  />
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

export default FeedScreen;

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
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoIconWrapper: {
    position: 'relative',
  },
  logoIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: 'white',
  },
  logo: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  logoSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: -2,
  },
  notifBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  notifBtnInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#ef4444',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#6d28d9',
  },
  notifBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 20,
  },
  loadingGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '500',
  },
  emptyScrollContent: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  emptyIconGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  emptyActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  emptySecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  emptySecondaryText: {
    fontSize: 15,
    fontWeight: '600',
  },
  loadMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 16,
    marginTop: 8,
  },
  loadMoreIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  endOfFeed: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  endGradient: {
    position: 'absolute',
    top: '50%',
    left: 16,
    right: 16,
    height: 1,
  },
  endBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  endText: {
    fontSize: 13,
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  errorRetry: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  errorRetryText: {
    fontSize: 13,
    fontWeight: '700',
  },
  // Comments Modal
  commentsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  commentsModal: {
    flex: 1,
    marginTop: 80,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  dragIndicatorContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeModalBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentsLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  noComments: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 12,
  },
  noCommentsIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  noCommentsTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  noCommentsText: {
    fontSize: 14,
    textAlign: 'center',
  },
  commentsList: {
    padding: 16,
    paddingBottom: 120,
  },
  commentItem: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  commentAvatarGradient: {
    width: 42,
    height: 42,
    borderRadius: 21,
    padding: 2,
  },
  commentAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentAvatarText: {
    fontSize: 14,
    fontWeight: '700',
  },
  commentContent: {
    flex: 1,
    gap: 6,
  },
  commentBubble: {
    padding: 12,
    borderRadius: 16,
    borderTopLeftRadius: 4,
    gap: 4,
  },
  commentUsername: {
    fontWeight: '700',
    fontSize: 14,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingLeft: 4,
  },
  commentDate: {
    fontSize: 12,
  },
  commentLikeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
  },
  commentLikeCount: {
    fontSize: 12,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    gap: 12,
    borderTopWidth: 1,
  },
  inputWrapper: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  commentInput: {
    fontSize: 15,
    maxHeight: 100,
    minHeight: 20,
  },
  sendButtonWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Tab bar
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 4,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    position: 'relative',
  },
  tabItemActive: {},
  tabActiveIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '10%',
    right: '10%',
    height: 2,
    borderRadius: 1,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Discover
  discoverList: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  discoverHeader: {
    marginBottom: 16,
  },
  discoverTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  discoverSubtitle: {
    fontSize: 13,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  userAvatarGradient: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  userInfo: {
    flex: 1,
    gap: 3,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
  },
  userObjectiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userObjective: {
    fontSize: 12,
  },
  userBio: {
    fontSize: 12,
  },
  userStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  userStatText: {
    fontSize: 11,
  },
  userStatDot: {
    fontSize: 11,
  },
  followBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 72,
    alignItems: 'center',
  },
  followBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
