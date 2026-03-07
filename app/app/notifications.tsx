import React, { useEffect, useState, useRef } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
  Easing,
  SectionList,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { useAppTheme } from '@/theme/ThemeProvider';
import { useTranslations } from '@/hooks/usePreferences';
import { useAuth } from '@/hooks/useAuth';
import {
  Notification,
  getNotifications,
  markAllRead,
  markRead,
} from '@/services/notificationsApi';

function formatTimeAgo(dateString: string, t: (key: string, params?: Record<string, string | number>) => string, language: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return t('justNow');
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}${language === 'fr' ? 'j' : 'd'}`;
  return date.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short' });
}

function getNotificationConfig(type: string, t: (key: string) => string) {
  switch (type) {
    case 'like':
      return {
        icon: 'heart',
        gradient: ['#ec4899', '#f43f5e'] as [string, string],
        color: '#ec4899',
        label: 'Like',
      };
    case 'comment':
      return {
        icon: 'chatbubble',
        gradient: ['#6366f1', '#8b5cf6'] as [string, string],
        color: '#6366f1',
        label: t('commentLabel'),
      };
    case 'follow':
      return {
        icon: 'person-add',
        gradient: ['#10b981', '#14b8a6'] as [string, string],
        color: '#10b981',
        label: t('subscriptionLabel'),
      };
    case 'mention':
      return {
        icon: 'at',
        gradient: ['#f59e0b', '#f97316'] as [string, string],
        color: '#f59e0b',
        label: t('mentionLabel'),
      };
    default:
      return {
        icon: 'notifications',
        gradient: ['#64748b', '#94a3b8'] as [string, string],
        color: '#64748b',
        label: t('notificationLabel'),
      };
  }
}

function groupNotificationsByTime(notifications: Notification[], t: (key: string) => string) {
  const now = new Date();
  const today: Notification[] = [];
  const thisWeek: Notification[] = [];
  const older: Notification[] = [];

  notifications.forEach((notif) => {
    const date = new Date(notif.created_at);
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      today.push(notif);
    } else if (diffDays < 7) {
      thisWeek.push(notif);
    } else {
      older.push(notif);
    }
  });

  const sections = [];
  if (today.length > 0) sections.push({ title: t('today'), data: today });
  if (thisWeek.length > 0) sections.push({ title: t('thisWeek'), data: thisWeek });
  if (older.length > 0) sections.push({ title: t('olderLabel'), data: older });

  return sections;
}

interface NotificationItemProps {
  item: Notification;
  index: number;
  onPress: (item: Notification) => void;
  theme: any;
  t: (key: string, params?: Record<string, string | number>) => string;
  language: string;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ item, index, onPress, theme, t, language }) => {
  const config = getNotificationConfig(item.type, t);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 50,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 50,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateX: slideAnim }],
      }}
    >
      <Pressable
        style={({ pressed }) => [
          styles.notificationCard,
          {
            backgroundColor: item.read ? theme.colors.surface : theme.colors.surfaceMuted,
            borderColor: item.read ? theme.colors.border : config.color + '40',
            opacity: pressed ? 0.92 : 1,
          },
        ]}
        onPress={() => onPress(item)}
      >
        <LinearGradient colors={config.gradient} style={styles.iconGradient}>
          <Ionicons name={config.icon as any} size={22} color="#fff" />
        </LinearGradient>

        <View style={styles.contentContainer}>
          <View style={styles.contentHeader}>
            <Text style={[styles.actorName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
              {item.actor_username || t('someone')}
            </Text>
            <Text style={[styles.time, { color: theme.colors.textSecondary }]}>
              {formatTimeAgo(item.created_at, t, language)}
            </Text>
          </View>
          <View style={[styles.typeBadge, { backgroundColor: config.color + '18', alignSelf: 'flex-start' }]}>
            <Text style={[styles.typeBadgeText, { color: config.color }]}>{config.label}</Text>
          </View>
          <Text style={[styles.message, { color: theme.colors.textPrimary }]} numberOfLines={2}>
            {item.message}
          </Text>
        </View>

        {!item.read && (
          <View style={styles.unreadIndicator}>
            <View style={[styles.unreadDot, { backgroundColor: config.color }]} />
          </View>
        )}

        <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
      </Pressable>
    </Animated.View>
  );
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { theme, mode } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { t, language } = useTranslations();
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const isDark = mode === 'dark';

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  const loadNotifications = async () => {
    if (!userId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const data = await getNotifications(userId);
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [userId]);

  const handleMarkAllRead = async () => {
    if (!userId) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    try {
      await markAllRead(userId);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all read:', error);
    }
  };

  const handleNotificationPress = async (notification: Notification) => {
    Haptics.selectionAsync().catch(() => {});

    if (!notification.read) {
      try {
        await markRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Failed to mark read:', error);
      }
    }

    if (notification.type === 'follow') {
      router.push(`/profile/${notification.actor_id}`);
    } else if (
      notification.reference_id &&
      (notification.type === 'like' || notification.type === 'comment') &&
      notification.reference_id.startsWith('sh_')
    ) {
      router.push(`/shared-workout/${notification.reference_id}`);
    } else if (notification.actor_id) {
      router.push(`/profile/${notification.actor_id}`);
    }
  };

  const sections = groupNotificationsByTime(notifications, t);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.loadingCard, { backgroundColor: theme.colors.surface }]}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            {t('loading')}
          </Text>
        </View>
      </View>
    );
  }

  const bgColor = isDark ? '#0a0a0f' : '#f5f5fa';

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 10,
            backgroundColor: isDark ? '#111118' : '#ffffff',
            borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
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
        <Pressable
          style={({ pressed }) => [styles.backButton, { backgroundColor: theme.colors.surfaceMuted, opacity: pressed ? 0.7 : 1 }]}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
        </Pressable>

        <View style={styles.headerCenter}>
          <LinearGradient colors={['#ec4899', '#f43f5e']} style={styles.headerIcon}>
            <Ionicons name="notifications" size={20} color="#fff" />
          </LinearGradient>
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
            {t('notifications')}
          </Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>

        {unreadCount > 0 ? (
          <Pressable
            style={({ pressed }) => [styles.markAllButton, { backgroundColor: theme.colors.surfaceMuted, opacity: pressed ? 0.7 : 1 }]}
            onPress={handleMarkAllRead}
          >
            <Ionicons name="checkmark-done" size={22} color="#6366f1" />
          </Pressable>
        ) : (
          <View style={styles.placeholderHeaderRight} />
        )}
      </Animated.View>

      {/* Stats rapides */}
      {notifications.length > 0 && (
        <Animated.View
          style={[
            styles.statsRow,
            {
              opacity: headerAnim,
              transform: [
                {
                  translateY: headerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [16, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={[styles.statCard, { backgroundColor: isDark ? '#ec489918' : '#ec489912' }]}>
            <Ionicons name="heart" size={18} color="#ec4899" />
            <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
              {notifications.filter((n) => n.type === 'like').length}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>{t('likesLabel')}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: isDark ? '#6366f118' : '#6366f112' }]}>
            <Ionicons name="chatbubble" size={18} color="#6366f1" />
            <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
              {notifications.filter((n) => n.type === 'comment').length}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>{t('commentsLabel')}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: isDark ? '#10b98118' : '#10b98112' }]}>
            <Ionicons name="person-add" size={18} color="#10b981" />
            <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
              {notifications.filter((n) => n.type === 'follow').length}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>{t('followersLabel')}</Text>
          </View>
        </Animated.View>
      )}

      {/* Liste par sections */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <NotificationItem
            item={item}
            index={index}
            onPress={handleNotificationPress}
            theme={theme}
            t={t}
            language={language}
          />
        )}
        renderSectionHeader={({ section: { title } }) => (
          <View style={[styles.sectionHeader, { backgroundColor: bgColor }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>{title}</Text>
          </View>
        )}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadNotifications();
            }}
            tintColor="#6366f1"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconCircle, { backgroundColor: theme.colors.surfaceMuted }]}>
              <LinearGradient colors={['#ec4899', '#f43f5e']} style={styles.emptyIconGradient}>
                <Ionicons name="notifications-off" size={32} color="#fff" />
              </LinearGradient>
            </View>
            <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
              {t('noNotifications')}
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
              {t('notificationEmptyDesc')}
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/(tabs)/feed')}
            >
              <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.emptyButtonGradient}>
                <Ionicons name="compass" size={18} color="#fff" />
                <Text style={styles.emptyButtonText}>{t('exploreFeed')}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        }
      />
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
  loadingCard: {
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  unreadBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 22,
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  markAllButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderHeaderRight: {
    width: 44,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 16,
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  sectionHeader: {
    paddingVertical: 12,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    gap: 14,
  },
  iconGradient: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    flex: 1,
    gap: 6,
  },
  contentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  actorName: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  time: {
    fontSize: 12,
  },
  unreadIndicator: {
    marginRight: 6,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
    gap: 16,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyIconGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyButton: {
    marginTop: 8,
    borderRadius: 14,
    overflow: 'hidden',
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
