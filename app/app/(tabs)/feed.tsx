import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Linking,
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
  Dimensions,
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
import { useUserProfile } from '@/hooks/useUserProfile';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Quick action items for stories section
const QUICK_ACTIONS = [
  { id: 'workout', icon: 'add', label: 'Séance', gradient: ['#10b981', '#059669'] },
  { id: 'challenge', icon: 'trophy', label: 'Défi', gradient: ['#f59e0b', '#d97706'] },
  { id: 'pr', icon: 'flame', label: 'PR', gradient: ['#ef4444', '#dc2626'] },
  { id: 'streak', icon: 'flash', label: 'Streak', gradient: ['#8b5cf6', '#7c3aed'] },
];

// Composant pour afficher un commentaire avec like
const CommentItem: React.FC<{
  comment: Comment;
  theme: any;
  currentUserId: string;
  index: number;
}> = ({ comment, theme, currentUserId, index }) => {
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

  // Couleurs aléatoires pour avatars
  const avatarColors = [
    ['#6366f1', '#8b5cf6'],
    ['#ec4899', '#f43f5e'],
    ['#10b981', '#14b8a6'],
    ['#f59e0b', '#f97316'],
  ];
  const colorIndex = comment.username.charCodeAt(0) % avatarColors.length;
  const gradient = avatarColors[colorIndex] as [string, string];

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
            {new Date(comment.created_at).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
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
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useUserProfile();
  const [refreshing, setRefreshing] = useState(false);
  const headerAnim = useRef(new Animated.Value(0)).current;
  const storiesAnim = useRef(new Animated.Value(0)).current;
  const fabAnim = useRef(new Animated.Value(1)).current;

  const currentUserId = profile?.id || 'guest-user';
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
    Animated.stagger(100, [
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(storiesAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // FAB pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(fabAnim, {
          toValue: 1.05,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(fabAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    load(true).catch(() => undefined);
  }, [load]);

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

  const handleQuickAction = (actionId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (actionId === 'workout') {
      router.push('/workout/create');
    }
  };

  // Stories/Quick Actions Component
  const StoriesSection = () => (
    <Animated.View
      style={[
        styles.storiesSection,
        {
          opacity: storiesAnim,
          transform: [
            { translateY: storiesAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
          ],
        },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.storiesContent}
      >
        {/* Your story / Create */}
        <Pressable
          style={styles.storyItem}
          onPress={() => handleQuickAction('workout')}
        >
          <LinearGradient
            colors={['#6366f1', '#8b5cf6']}
            style={styles.storyAvatarGradient}
          >
            <View style={[styles.storyAvatarInner, { backgroundColor: theme.colors.background }]}>
              <Ionicons name="add" size={24} color="#6366f1" />
            </View>
          </LinearGradient>
          <Text style={[styles.storyLabel, { color: theme.colors.textPrimary }]}>Ta story</Text>
        </Pressable>

        {/* Quick actions */}
        {QUICK_ACTIONS.map((action) => (
          <Pressable
            key={action.id}
            style={styles.storyItem}
            onPress={() => handleQuickAction(action.id)}
          >
            <LinearGradient
              colors={action.gradient as [string, string]}
              style={styles.quickActionCircle}
            >
              <Ionicons name={action.icon as any} size={22} color="#FFFFFF" />
            </LinearGradient>
            <Text style={[styles.storyLabel, { color: theme.colors.textPrimary }]}>
              {action.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </Animated.View>
  );

  const renderItem = ({ item, index }: any) => (
    <FeedCard
      shareId={item.share_id}
      ownerId={item.owner_id}
      ownerUsername={item.owner_username}
      workoutTitle={item.workout_title}
      exerciseCount={item.exercise_count}
      setCount={item.set_count}
      createdAt={item.created_at}
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
        <View style={styles.headerActions}>
          <Pressable
            style={({ pressed }) => [
              styles.headerButton,
              { backgroundColor: theme.colors.surfaceMuted, opacity: pressed ? 0.7 : 1 },
            ]}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              router.push('/leaderboard');
            }}
          >
            <LinearGradient
              colors={['#f59e0b', '#d97706']}
              style={styles.headerButtonGradient}
            >
              <Ionicons name="trophy" size={18} color="#fff" />
            </LinearGradient>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.headerButton,
              { backgroundColor: theme.colors.surfaceMuted, opacity: pressed ? 0.7 : 1 },
            ]}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              router.push('/notifications');
            }}
          >
            <View style={styles.notificationWrapper}>
              <Ionicons name="heart" size={20} color="#ec4899" />
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>3</Text>
              </View>
            </View>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.headerButton,
              { backgroundColor: theme.colors.surfaceMuted, opacity: pressed ? 0.7 : 1 },
            ]}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              router.push('/explore');
            }}
          >
            <Ionicons name="search" size={20} color={theme.colors.textPrimary} />
          </Pressable>
        </View>
      </Animated.View>

      {/* Feed */}
      {isLoading && !items.length ? (
        <View style={styles.loadingContainer}>
          <LinearGradient
            colors={['#6366f1', '#8b5cf6']}
            style={styles.loadingGradient}
          >
            <ActivityIndicator size="large" color="#fff" />
          </LinearGradient>
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Chargement du feed...
          </Text>
        </View>
      ) : items.length === 0 ? (
        <ScrollView contentContainerStyle={styles.emptyScrollContent}>
          <StoriesSection />
          <View style={styles.emptyState}>
            <LinearGradient
              colors={['#6366f1', '#8b5cf6']}
              style={styles.emptyIconGradient}
            >
              <Ionicons name="people" size={48} color="#fff" />
            </LinearGradient>
            <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
              Ton feed est vide
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
              Suis d&apos;autres utilisateurs pour voir leurs séances et partager les tiennes !
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
                  <Text style={styles.emptyButtonText}>Explorer</Text>
                </LinearGradient>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.emptySecondaryBtn,
                  { borderColor: theme.colors.border, opacity: pressed ? 0.7 : 1 },
                ]}
                onPress={() => router.push('/workout/create')}
              >
                <Ionicons name="add" size={18} color={theme.colors.textPrimary} />
                <Text style={[styles.emptySecondaryText, { color: theme.colors.textPrimary }]}>
                  Créer une séance
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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#6366f1"
            />
          }
          ListHeaderComponent={<StoriesSection />}
          ListFooterComponent={
            nextCursor ? (
              <Pressable
                style={({ pressed }) => [
                  styles.loadMore,
                  { backgroundColor: theme.colors.surfaceMuted, opacity: pressed ? 0.7 : 1 },
                ]}
                onPress={() => load(false)}
              >
                <LinearGradient
                  colors={['#6366f1', '#8b5cf6']}
                  style={styles.loadMoreIcon}
                >
                  <Ionicons name="chevron-down" size={16} color="#fff" />
                </LinearGradient>
                <Text style={[styles.loadMoreText, { color: theme.colors.textPrimary }]}>
                  Charger plus de posts
                </Text>
              </Pressable>
            ) : (
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
                    Tu es à jour !
                  </Text>
                </View>
              </View>
            )
          }
        />
      )}

      {/* Floating Action Button */}
      <Animated.View
        style={[
          styles.fabContainer,
          {
            bottom: insets.bottom + 90,
            transform: [{ scale: fabAnim }],
          },
        ]}
      >
        <Pressable
          style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            router.push('/workout/create');
          }}
        >
          <LinearGradient
            colors={['#6366f1', '#8b5cf6']}
            style={styles.fab}
          >
            <Ionicons name="add" size={28} color="#FFFFFF" />
          </LinearGradient>
        </Pressable>
      </Animated.View>

      {error ? (
        <View style={[styles.errorBanner, { backgroundColor: theme.colors.error + '20' }]}>
          <Ionicons name="warning" size={18} color={theme.colors.error} />
          <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
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
              Commentaires
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
                Chargement...
              </Text>
            </View>
          ) : commentsModal.comments.length === 0 ? (
            <View style={styles.noComments}>
              <View style={[styles.noCommentsIconCircle, { backgroundColor: theme.colors.surfaceMuted }]}>
                <Ionicons name="chatbubbles-outline" size={48} color={theme.colors.textSecondary} />
              </View>
              <Text style={[styles.noCommentsTitle, { color: theme.colors.textPrimary }]}>
                Pas encore de commentaires
              </Text>
              <Text style={[styles.noCommentsText, { color: theme.colors.textSecondary }]}>
                Sois le premier à commenter cette séance !
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
                  currentUserId={CURRENT_USER_ID}
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
                placeholder="Ajouter un commentaire..."
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  headerButtonGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationWrapper: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#ef4444',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  // Stories section
  storiesSection: {
    marginBottom: 16,
  },
  storiesContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  storyItem: {
    alignItems: 'center',
    gap: 6,
  },
  storyAvatarGradient: {
    width: 68,
    height: 68,
    borderRadius: 34,
    padding: 3,
  },
  storyAvatarInner: {
    width: '100%',
    height: '100%',
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyLabel: {
    fontSize: 11,
    fontWeight: '600',
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
  fabContainer: {
    position: 'absolute',
    right: 20,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
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
});
