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

// Couleurs aléatoires pour les avatars et les workout previews
const AVATAR_COLORS = [
  ['#6366f1', '#8b5cf6'],
  ['#ec4899', '#f43f5e'],
  ['#10b981', '#14b8a6'],
  ['#f59e0b', '#f97316'],
  ['#3b82f6', '#6366f1'],
  ['#8b5cf6', '#a855f7'],
  ['#06b6d4', '#0891b2'],
];

const WORKOUT_GRADIENTS = [
  { colors: ['#6366f1', '#8b5cf6', '#a855f7'], dark: ['#1e1b4b', '#312e81', '#3730a3'] },
  { colors: ['#ec4899', '#f43f5e', '#fb7185'], dark: ['#500724', '#831843', '#9d174d'] },
  { colors: ['#10b981', '#14b8a6', '#2dd4bf'], dark: ['#042f2e', '#134e4a', '#115e59'] },
  { colors: ['#f59e0b', '#f97316', '#fb923c'], dark: ['#451a03', '#7c2d12', '#9a3412'] },
  { colors: ['#3b82f6', '#6366f1', '#818cf8'], dark: ['#172554', '#1e3a8a', '#1e40af'] },
];

const getAvatarGradient = (username: string): [string, string] => {
  const index = username.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index] as [string, string];
};

const getWorkoutGradient = (title: string, isDark: boolean): [string, string, string] => {
  const index = (title.charCodeAt(0) + title.length) % WORKOUT_GRADIENTS.length;
  const gradient = WORKOUT_GRADIENTS[index];
  return (isDark ? gradient.dark : gradient.colors) as [string, string, string];
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
  const { theme, mode } = useAppTheme();
  const isDark = mode === 'dark';
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [menuVisible, setMenuVisible] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [showDoubleTapHeart, setShowDoubleTapHeart] = useState(false);
  const [saved, setSaved] = useState(false);
  const lastTapRef = useRef<number>(0);
  const cardScaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const saveAnim = useRef(new Animated.Value(1)).current;

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

  // Time ago format
  const getTimeAgo = () => {
    const diff = Date.now() - new Date(createdAt).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 60) return `${minutes}min`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}j`;
    return formattedDate;
  };

  const avatarGradient = getAvatarGradient(ownerUsername);
  const workoutGradient = getWorkoutGradient(workoutTitle, isDark);

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

  const handleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setSaved(!saved);
    Animated.sequence([
      Animated.timing(saveAnim, {
        toValue: 1.3,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(saveAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
    onDuplicate?.();
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
              transform: [{ scale: cardScaleAnim }],
            },
          ]}
        >
          <DoubleTapHeart
            visible={showDoubleTapHeart}
            onAnimationEnd={() => setShowDoubleTapHeart(false)}
          />

          {/* Header - Avatar & Username */}
          <View style={styles.header}>
            <Pressable style={styles.userInfo} onPress={onProfilePress}>
              <View style={styles.avatarContainer}>
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
                {/* Online indicator */}
                <View style={[styles.onlineIndicator, { borderColor: theme.colors.surface }]} />
              </View>
              <View style={styles.userMeta}>
                <View style={styles.usernameRow}>
                  <Text style={[styles.username, { color: theme.colors.textPrimary }]}>
                    {ownerUsername}
                  </Text>
                  <View style={[styles.verifiedBadge, { backgroundColor: avatarGradient[0] + '20' }]}>
                    <Ionicons name="checkmark" size={10} color={avatarGradient[0]} />
                  </View>
                </View>
                <View style={styles.dateBadge}>
                  <Ionicons name="time-outline" size={11} color={theme.colors.textSecondary} />
                  <Text style={[styles.date, { color: theme.colors.textSecondary }]}>
                    {getTimeAgo()}
                  </Text>
                </View>
              </View>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.moreButton,
                { backgroundColor: theme.colors.surfaceMuted, opacity: pressed ? 0.7 : 1 },
              ]}
              onPress={() => setMenuVisible(true)}
            >
              <Ionicons name="ellipsis-horizontal" size={18} color={theme.colors.textSecondary} />
            </Pressable>
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

          {/* Content - Workout preview with varied gradients */}
          <Pressable
            style={({ pressed }) => [styles.workoutPreview, { opacity: pressed ? 0.95 : 1 }]}
            onPress={() => onWorkoutPress?.(shareId)}
          >
            <LinearGradient
              colors={workoutGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.workoutGradient}
            >
              {/* Decorative circles */}
              <View style={styles.decorCircle1} />
              <View style={styles.decorCircle2} />
              
              <View style={styles.workoutHeader}>
                <View style={styles.workoutIconContainer}>
                  <Ionicons name="barbell" size={22} color="#fff" />
                </View>
                <View style={styles.workoutArrow}>
                  <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.8)" />
                </View>
              </View>
              <Text style={styles.workoutTitle} numberOfLines={2}>
                {workoutTitle}
              </Text>
              <View style={styles.workoutStats}>
                <View style={styles.statPillNew}>
                  <View style={styles.statPillIcon}>
                    <Ionicons name="heart" size={12} color="#fff" />
                  </View>
                  <Text style={styles.statPillText}>{exerciseCount} exercices</Text>
                </View>
                <View style={styles.statPillNew}>
                  <View style={styles.statPillIcon}>
                    <Ionicons name="layers" size={12} color="#fff" />
                  </View>
                  <Text style={styles.statPillText}>{setCount} séries</Text>
                </View>
              </View>
            </LinearGradient>
          </Pressable>

          {/* Actions - Like, Comment, Share, Save */}
          <View style={styles.actions}>
            <View style={styles.leftActions}>
              <LikeButton liked={liked} likeCount={likeCount} onToggle={handleLike} />
              <Pressable
                style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.6 : 1 }]}
                onPress={onCommentPress}
              >
                <Ionicons name="chatbubble-outline" size={22} color={theme.colors.textSecondary} />
                {commentCount > 0 && (
                  <Text style={[styles.actionCount, { color: theme.colors.textSecondary }]}>
                    {commentCount}
                  </Text>
                )}
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.actionBtn, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Ionicons name="paper-plane-outline" size={22} color={theme.colors.textSecondary} />
              </Pressable>
            </View>
            
            {/* Save button with animation */}
            <Animated.View style={{ transform: [{ scale: saveAnim }] }}>
              <Pressable
                style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
                onPress={handleSave}
              >
                <LinearGradient
                  colors={saved ? ['#10b981', '#059669'] : ['#f97316', '#ea580c']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.saveButtonGradient}
                >
                  <Ionicons
                    name={saved ? 'checkmark-circle' : 'bookmark-outline'}
                    size={15}
                    color="#fff"
                  />
                  <Text style={styles.saveButtonText}>
                    {saved ? 'Enregistré' : 'Enregistrer'}
                  </Text>
                </LinearGradient>
              </Pressable>
            </Animated.View>
          </View>

          {/* Engagement Section */}
          <View style={styles.engagement}>
            {/* Like avatars and count */}
            {likeCount > 0 && (
              <View style={styles.likeSection}>
                <View style={styles.likeAvatars}>
                  {[0, 1, 2].slice(0, Math.min(likeCount, 3)).map((i) => (
                    <LinearGradient
                      key={i}
                      colors={AVATAR_COLORS[(i + index) % AVATAR_COLORS.length] as [string, string]}
                      style={[styles.miniAvatar, { marginLeft: i > 0 ? -8 : 0 }]}
                    >
                      <View style={[styles.miniAvatarInner, { backgroundColor: theme.colors.surface }]} />
                    </LinearGradient>
                  ))}
                </View>
                <Text style={[styles.likeCountText, { color: theme.colors.textPrimary }]}>
                  <Text style={{ fontWeight: '700' }}>{likeCount}</Text> J&apos;aime{likeCount > 1 ? 's' : ''}
                </Text>
              </View>
            )}

            <View style={styles.caption}>
              <Text style={{ color: theme.colors.textPrimary, lineHeight: 20 }}>
                <Text style={styles.captionUsername}>{ownerUsername}</Text>
                {' '}a partagé sa séance 💪
              </Text>
            </View>

            {/* Comments preview with better styling */}
            {comments.length > 0 && (
              <View style={styles.commentsPreview}>
                {comments.slice(0, 2).map((comment) => (
                  <View key={comment.id} style={styles.commentPreviewItem}>
                    <Text style={{ color: theme.colors.textPrimary, lineHeight: 18 }} numberOfLines={2}>
                      <Text style={styles.commentPreviewUsername}>{comment.username}</Text>
                      {' '}{comment.content}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* View comments link */}
            <Pressable
              onPress={onCommentPress}
              style={({ pressed }) => [styles.viewCommentsBtn, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={[styles.viewComments, { color: theme.colors.textSecondary }]}>
                {commentCount > 0
                  ? `Voir les ${commentCount} commentaire${commentCount > 1 ? 's' : ''}`
                  : 'Ajouter un commentaire...'}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
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
  avatarContainer: {
    position: 'relative',
  },
  avatarGradient: {
    width: 50,
    height: 50,
    borderRadius: 25,
    padding: 2.5,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 17,
    fontWeight: '800',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10b981',
    borderWidth: 2.5,
  },
  userMeta: {
    gap: 3,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  username: {
    fontSize: 15,
    fontWeight: '700',
  },
  verifiedBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  date: {
    fontSize: 12,
    fontWeight: '500',
  },
  moreButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    width: 300,
    borderRadius: 24,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 16,
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
    borderRadius: 14,
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
    borderRadius: 20,
    overflow: 'hidden',
  },
  workoutGradient: {
    padding: 18,
    position: 'relative',
    overflow: 'hidden',
  },
  decorCircle1: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  workoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  workoutIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutArrow: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 14,
    letterSpacing: -0.3,
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
  statPillNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  statPillIcon: {
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
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
    gap: 2,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    gap: 5,
  },
  actionCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  engagement: {
    paddingHorizontal: 14,
    paddingBottom: 16,
    gap: 8,
  },
  likeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  likeAvatars: {
    flexDirection: 'row',
  },
  miniAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    padding: 1.5,
  },
  miniAvatarInner: {
    width: '100%',
    height: '100%',
    borderRadius: 9,
  },
  likeCountText: {
    fontSize: 14,
  },
  caption: {},
  captionUsername: {
    fontWeight: '700',
  },
  commentsPreview: {
    gap: 4,
  },
  commentPreviewItem: {},
  commentPreviewUsername: {
    fontWeight: '700',
  },
  viewCommentsBtn: {
    paddingVertical: 2,
  },
  viewComments: {
    fontSize: 13,
    fontWeight: '500',
  },
});
