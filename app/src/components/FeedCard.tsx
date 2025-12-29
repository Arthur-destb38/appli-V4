import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  Alert,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

import { useAppTheme } from '@/theme/ThemeProvider';
import { LikeButton, DoubleTapHeart } from './LikeButton';
import { toggleLike } from '@/services/likesApi';

interface CommentPreview {
  id: string;
  username: string;
  content: string;
}

interface FeedCardProps {
  shareId: string;
  ownerId: string;
  ownerUsername: string;
  workoutTitle: string;
  exerciseCount: number;
  setCount: number;
  createdAt: string;
  initialLiked?: boolean;
  initialLikeCount?: number;
  currentUserId: string;
  comments?: CommentPreview[];
  commentCount?: number;
  onProfilePress?: () => void;
  onDuplicate?: () => void;
  onCommentPress?: () => void;
  onHide?: (shareId: string) => void;
  onReport?: (shareId: string) => void;
  onWorkoutPress?: (shareId: string) => void;
  index?: number;
}

// Couleurs aléatoires pour les avatars
const AVATAR_COLORS = [
  ['#6366f1', '#8b5cf6'],
  ['#ec4899', '#f43f5e'],
  ['#10b981', '#14b8a6'],
  ['#f59e0b', '#f97316'],
  ['#3b82f6', '#6366f1'],
];

const getAvatarGradient = (username: string): [string, string] => {
  const index = username.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index] as [string, string];
};

export const FeedCard: React.FC<FeedCardProps> = ({
  shareId,
  ownerId,
  ownerUsername,
  workoutTitle,
  exerciseCount,
  setCount,
  createdAt,
  initialLiked = false,
  initialLikeCount = 0,
  currentUserId,
  comments = [],
  commentCount = 0,
  onProfilePress,
  onDuplicate,
  onCommentPress,
  onHide,
  onReport,
  onWorkoutPress,
  index = 0,
}) => {
  const { theme } = useAppTheme();
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [menuVisible, setMenuVisible] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [showDoubleTapHeart, setShowDoubleTapHeart] = useState(false);
  const lastTapRef = useRef<number>(0);
  const cardScaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 80,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 80,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const formattedDate = new Date(createdAt).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
  });

  const avatarGradient = getAvatarGradient(ownerUsername);

  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      if (!liked) {
        handleLike();
        setShowDoubleTapHeart(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    }
    lastTapRef.current = now;
  }, [liked]);

  const handleLike = async () => {
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((prev) => (wasLiked ? prev - 1 : prev + 1));

    try {
      const response = await toggleLike(shareId, currentUserId);
      setLiked(response.liked);
      setLikeCount(response.like_count);
    } catch (error) {
      setLiked(wasLiked);
      setLikeCount((prev) => (wasLiked ? prev + 1 : prev - 1));
    }
  };

  const handleHide = () => {
    setMenuVisible(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setHidden(true);
    onHide?.(shareId);
  };

  const handleReport = () => {
    setMenuVisible(false);
    Alert.alert(
      '🚨 Signaler ce post',
      'Pourquoi signales-tu ce post ?',
      [
        { text: 'Contenu inapproprié', onPress: () => submitReport('inappropriate') },
        { text: 'Spam', onPress: () => submitReport('spam') },
        { text: 'Harcèlement', onPress: () => submitReport('harassment') },
        { text: 'Annuler', style: 'cancel' },
      ]
    );
  };

  const submitReport = (reason: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    Alert.alert('✅ Merci', 'Ton signalement a été envoyé. Nous allons examiner ce post.');
    onReport?.(shareId);
  };

  const handlePressIn = () => {
    Animated.spring(cardScaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(cardScaleAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  if (hidden) {
    return null;
  }

  return (
    <Animated.View
      style={[
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Pressable
        onPress={handleDoubleTap}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              transform: [{ scale: cardScaleAnim }],
              shadowColor: theme.dark ? '#000' : '#6366f1',
            },
          ]}
        >
          <DoubleTapHeart
            visible={showDoubleTapHeart}
            onAnimationEnd={() => setShowDoubleTapHeart(false)}
          />

          {/* Header - Avatar & Username */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.userInfo} onPress={onProfilePress}>
              <LinearGradient
                colors={avatarGradient}
                style={styles.avatarGradient}
              >
                <View style={[styles.avatar, { backgroundColor: theme.colors.surface }]}>
                  <Text style={[styles.avatarText, { color: avatarGradient[0] }]}>
                    {ownerUsername.slice(0, 1).toUpperCase()}
                  </Text>
                </View>
              </LinearGradient>
              <View style={styles.userMeta}>
                <Text style={[styles.username, { color: theme.colors.textPrimary }]}>
                  {ownerUsername}
                </Text>
                <Text style={[styles.date, { color: theme.colors.textSecondary }]}>
                  {formattedDate}
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.moreButton, { backgroundColor: theme.colors.surfaceMuted }]}
              onPress={() => setMenuVisible(true)}
            >
              <Ionicons name="ellipsis-horizontal" size={18} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Menu Modal */}
          <Modal
            visible={menuVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setMenuVisible(false)}
          >
            <Pressable style={styles.menuOverlay} onPress={() => setMenuVisible(false)}>
              <View style={[styles.menuContainer, { backgroundColor: theme.colors.surface }]}>
                <TouchableOpacity style={styles.menuItem} onPress={handleReport}>
                  <View style={[styles.menuIconCircle, { backgroundColor: '#FF6B6B20' }]}>
                    <Ionicons name="flag-outline" size={20} color="#FF6B6B" />
                  </View>
                  <View>
                    <Text style={[styles.menuItemText, { color: '#FF6B6B' }]}>Signaler</Text>
                    <Text style={[styles.menuItemDesc, { color: theme.colors.textSecondary }]}>
                      Contenu inapproprié
                    </Text>
                  </View>
                </TouchableOpacity>
                <View style={[styles.menuDivider, { backgroundColor: theme.colors.border }]} />
                <TouchableOpacity style={styles.menuItem} onPress={handleHide}>
                  <View style={[styles.menuIconCircle, { backgroundColor: theme.colors.surfaceMuted }]}>
                    <Ionicons name="eye-off-outline" size={20} color={theme.colors.textPrimary} />
                  </View>
                  <View>
                    <Text style={[styles.menuItemText, { color: theme.colors.textPrimary }]}>Masquer</Text>
                    <Text style={[styles.menuItemDesc, { color: theme.colors.textSecondary }]}>
                      Ne plus voir ce post
                    </Text>
                  </View>
                </TouchableOpacity>
                <View style={[styles.menuDivider, { backgroundColor: theme.colors.border }]} />
                <TouchableOpacity style={styles.menuCancelBtn} onPress={() => setMenuVisible(false)}>
                  <Text style={[styles.menuCancelText, { color: theme.colors.textSecondary }]}>
                    Annuler
                  </Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Modal>

          {/* Content - Workout preview */}
          <TouchableOpacity
            style={styles.workoutPreview}
            onPress={() => onWorkoutPress?.(shareId)}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={theme.dark ? ['#1e1b4b', '#312e81'] : ['#6366f1', '#8b5cf6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.workoutGradient}
            >
              <View style={styles.workoutHeader}>
                <View style={styles.workoutIconContainer}>
                  <Ionicons name="barbell" size={24} color="#fff" />
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
              </View>
              <Text style={styles.workoutTitle} numberOfLines={2}>
                {workoutTitle}
              </Text>
              <View style={styles.workoutStats}>
                <View style={styles.statPill}>
                  <Ionicons name="fitness" size={14} color="#fff" />
                  <Text style={styles.statPillText}>{exerciseCount} exercices</Text>
                </View>
                <View style={styles.statPill}>
                  <Ionicons name="layers" size={14} color="#fff" />
                  <Text style={styles.statPillText}>{setCount} séries</Text>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Actions - Like, Comment, Share, Save */}
          <View style={styles.actions}>
            <View style={styles.leftActions}>
              <LikeButton liked={liked} likeCount={likeCount} onToggle={handleLike} />
              <TouchableOpacity style={styles.actionBtn} onPress={onCommentPress}>
                <Ionicons name="chatbubble-outline" size={22} color={theme.colors.textSecondary} />
                {commentCount > 0 && (
                  <Text style={[styles.actionCount, { color: theme.colors.textSecondary }]}>
                    {commentCount}
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn}>
                <Ionicons name="paper-plane-outline" size={22} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                onDuplicate?.();
              }}
            >
              <LinearGradient
                colors={['#f97316', '#ea580c']}
                style={styles.saveButtonGradient}
              >
                <Ionicons name="bookmark-outline" size={15} color="#fff" />
                <Text style={styles.saveButtonText}>Enregistrer</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Engagement Section */}
          <View style={styles.engagement}>
            {likeCount > 0 && (
              <Text style={[styles.likeCountText, { color: theme.colors.textPrimary }]}>
                {likeCount} J&apos;aime{likeCount > 1 ? 's' : ''}
              </Text>
            )}

            <View style={styles.caption}>
              <Text style={{ color: theme.colors.textPrimary }}>
                <Text style={styles.captionUsername}>{ownerUsername}</Text>
                {' '}a partagé sa séance 💪
              </Text>
            </View>

            {/* Comments preview */}
            {comments.length > 0 && (
              <View style={styles.commentsPreview}>
                {comments.slice(0, 2).map((comment) => (
                  <View key={comment.id} style={styles.commentPreviewItem}>
                    <Text style={{ color: theme.colors.textPrimary }} numberOfLines={2}>
                      <Text style={styles.commentPreviewUsername}>{comment.username}</Text>
                      {' '}{comment.content}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* View comments link */}
            <TouchableOpacity onPress={onCommentPress} style={styles.viewCommentsBtn}>
              <Text style={[styles.viewComments, { color: theme.colors.textSecondary }]}>
                {commentCount > 0
                  ? `Voir les ${commentCount} commentaire${commentCount > 1 ? 's' : ''}`
                  : 'Ajouter un commentaire...'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarGradient: {
    width: 46,
    height: 46,
    borderRadius: 23,
    padding: 2,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
  },
  userMeta: {
    gap: 2,
  },
  username: {
    fontSize: 15,
    fontWeight: '700',
  },
  date: {
    fontSize: 12,
  },
  moreButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    width: 300,
    borderRadius: 20,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 14,
  },
  menuIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
  },
  menuItemDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  menuDivider: {
    height: 1,
    marginHorizontal: 20,
  },
  menuCancelBtn: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  menuCancelText: {
    fontSize: 15,
    fontWeight: '600',
  },
  workoutPreview: {
    marginHorizontal: 14,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  workoutGradient: {
    padding: 16,
  },
  workoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  workoutIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  workoutStats: {
    flexDirection: 'row',
    gap: 10,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statPillText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    gap: 4,
  },
  actionCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  engagement: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  likeCountText: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  caption: {
    marginBottom: 6,
  },
  captionUsername: {
    fontWeight: '700',
  },
  commentsPreview: {
    gap: 4,
    marginBottom: 4,
  },
  commentPreviewItem: {},
  commentPreviewUsername: {
    fontWeight: '700',
  },
  viewCommentsBtn: {
    paddingVertical: 4,
  },
  viewComments: {
    fontSize: 13,
  },
});
