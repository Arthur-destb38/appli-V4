import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
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
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Swipeable } from 'react-native-gesture-handler';

import { useAppTheme } from '@/theme/ThemeProvider';
import { useTranslations } from '@/hooks/usePreferences';
import { useAuth } from '@/hooks/useAuth';
import {
  Notification,
  getNotifications,
  markAllRead,
  markRead,
  deleteNotification,
} from '@/services/notificationsApi';
import { formatTimeAgo } from '@/utils/formatTime';
import { getNotificationStyle } from '@/utils/colors';

type FilterType = 'all' | 'like' | 'comment' | 'follow';
type TFunc = (key: any, params?: Record<string, string | number>) => string;

const LABEL_KEYS: Record<string, string> = {
  like: 'Like',
  comment: 'commentLabel',
  follow: 'subscriptionLabel',
  mention: 'mentionLabel',
};

function getNotificationConfig(type: string, t: TFunc) {
  const style = getNotificationStyle(type);
  const labelKey = LABEL_KEYS[type];
  const label = labelKey === 'Like' ? 'Like' : labelKey ? t(labelKey) : t('notificationLabel');
  return { ...style, label };
}

function groupNotificationsByTime(notifications: Notification[], t: TFunc) {
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
  onDelete: (item: Notification) => void;
  onLongPress: (item: Notification) => void;
  theme: any;
  isDark: boolean;
  t: TFunc;
  language: string;
}

const NotificationItemInner: React.FC<NotificationItemProps> = ({ item, index, onPress, onDelete, onLongPress, theme, isDark, t, language }) => {
  const config = getNotificationConfig(item.type, t);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const swipeableRef = useRef<Swipeable>(null);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: Math.min(index * 40, 400),
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: Math.min(index * 40, 400),
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const renderRightActions = (_progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
    const scale = dragX.interpolate({
      inputRange: [-100, -50, 0],
      outputRange: [1, 0.9, 0.5],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.swipeActionsContainer}>
        <Animated.View style={[styles.swipeDeleteAction, { transform: [{ scale }] }]}>
          <Pressable
            style={styles.swipeDeleteButton}
            onPress={() => {
              swipeableRef.current?.close();
              onDelete(item);
            }}
          >
            <Ionicons name="trash-outline" size={22} color="#fff" />
            <Text style={styles.swipeDeleteText}>{t('deleteAction')}</Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  };

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateX: slideAnim }],
      }}
    >
      <Swipeable
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        overshootRight={false}
        friction={2}
      >
        <Pressable
          style={({ pressed }) => [
            styles.notificationCard,
            {
              backgroundColor: item.read
                ? (isDark ? '#16161e' : '#ffffff')
                : (isDark ? '#1a1a2e' : '#f0f0ff'),
              borderColor: item.read
                ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)')
                : config.color + '30',
              opacity: pressed ? 0.92 : 1,
            },
          ]}
          onPress={() => onPress(item)}
          onLongPress={() => onLongPress(item)}
        >
          {/* Left accent bar */}
          {!item.read && (
            <View style={[styles.accentBar, { backgroundColor: config.color }]} />
          )}

          <LinearGradient colors={config.gradient} style={styles.iconGradient}>
            <Ionicons name={config.icon as any} size={20} color="#fff" />
          </LinearGradient>

          <View style={styles.contentContainer}>
            <View style={styles.contentHeader}>
              <View style={styles.actorRow}>
                <Text style={[styles.actorName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                  {item.actor_username || t('someone')}
                </Text>
                <View style={[styles.typeBadge, { backgroundColor: config.color + '18' }]}>
                  <Text style={[styles.typeBadgeText, { color: config.color }]}>{config.label}</Text>
                </View>
              </View>
              <Text style={[styles.time, { color: theme.colors.textSecondary }]}>
                {formatTimeAgo(item.created_at, t, language)}
              </Text>
            </View>
            <Text style={[styles.message, { color: theme.colors.textSecondary }]} numberOfLines={2}>
              {item.message}
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary + '80'} />
        </Pressable>
      </Swipeable>
    </Animated.View>
  );
};

const NotificationItem = React.memo(NotificationItemInner);

const FILTERS: { key: FilterType; icon: string; color: string }[] = [
  { key: 'all', icon: 'apps', color: '#6366f1' },
  { key: 'like', icon: 'heart', color: '#ec4899' },
  { key: 'comment', icon: 'chatbubble', color: '#6366f1' },
  { key: 'follow', icon: 'person-add', color: '#10b981' },
];

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
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

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

  const loadNotifications = useCallback(async () => {
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
  }, [userId]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Auto-refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (!loading) {
        loadNotifications();
      }
    }, [loadNotifications])
  );

  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'all') return notifications;
    return notifications.filter((n) => n.type === activeFilter);
  }, [notifications, activeFilter]);

  const filterCounts = useMemo(() => ({
    all: notifications.length,
    like: notifications.filter((n) => n.type === 'like').length,
    comment: notifications.filter((n) => n.type === 'comment').length,
    follow: notifications.filter((n) => n.type === 'follow').length,
  }), [notifications]);

  const sections = useMemo(
    () => groupNotificationsByTime(filteredNotifications, t),
    [filteredNotifications, t]
  );

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

  const handleDelete = async (notification: Notification) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      await deleteNotification(notification.id);
      setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
      if (!notification.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleLongPress = (notification: Notification) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    const options: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }[] = [];

    if (!notification.read) {
      options.push({
        text: t('markAsRead'),
        onPress: async () => {
          try {
            await markRead(notification.id);
            setNotifications((prev) =>
              prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
          } catch (error) {
            console.error('Failed to mark read:', error);
          }
        },
      });
    }

    options.push({
      text: t('deleteAction'),
      style: 'destructive',
      onPress: () => handleDelete(notification),
    });

    options.push({ text: t('cancel'), style: 'cancel' });

    Alert.alert(t('notificationActions'), undefined, options);
  };

  const handleClearAll = () => {
    if (notifications.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    Alert.alert(
      t('clearAllNotifications'),
      t('clearAllNotificationsDesc'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('clearAll'),
          style: 'destructive',
          onPress: async () => {
            try {
              await Promise.all(notifications.map((n) => deleteNotification(n.id)));
              setNotifications([]);
              setUnreadCount(0);
            } catch (error) {
              console.error('Failed to clear notifications:', error);
            }
          },
        },
      ]
    );
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

  const getFilterLabel = (key: FilterType): string => {
    switch (key) {
      case 'all': return t('allFilter');
      case 'like': return t('likesLabel');
      case 'comment': return t('commentsLabel');
      case 'follow': return t('followsFilter');
      default: return key;
    }
  };

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
            paddingTop: insets.top + 8,
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
        {/* Top row */}
        <View style={styles.headerTopRow}>
          <Pressable
            style={({ pressed }) => [styles.backButton, { backgroundColor: isDark ? '#1e1e2e' : '#f0f0f5', opacity: pressed ? 0.7 : 1 }]}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={22} color={theme.colors.primary} />
          </Pressable>

          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
              {t('notifications')}
            </Text>
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>

          <View style={styles.headerActions}>
            {unreadCount > 0 && (
              <Pressable
                style={({ pressed }) => [styles.headerActionBtn, { backgroundColor: isDark ? '#1e1e2e' : '#f0f0f5', opacity: pressed ? 0.7 : 1 }]}
                onPress={handleMarkAllRead}
              >
                <Ionicons name="checkmark-done" size={20} color="#6366f1" />
              </Pressable>
            )}
            {notifications.length > 0 && (
              <Pressable
                style={({ pressed }) => [styles.headerActionBtn, { backgroundColor: isDark ? '#1e1e2e' : '#f0f0f5', opacity: pressed ? 0.7 : 1 }]}
                onPress={handleClearAll}
              >
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
              </Pressable>
            )}
            {notifications.length === 0 && unreadCount === 0 && (
              <View style={{ width: 40 }} />
            )}
          </View>
        </View>

        {/* Filter tabs */}
        {notifications.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
            style={styles.filterScroll}
          >
            {FILTERS.map((filter) => {
              const isActive = activeFilter === filter.key;
              const count = filterCounts[filter.key];
              if (filter.key !== 'all' && count === 0) return null;

              return (
                <Pressable
                  key={filter.key}
                  style={[
                    styles.filterChip,
                    isActive
                      ? { backgroundColor: filter.color + '20', borderColor: filter.color + '50' }
                      : { backgroundColor: isDark ? '#1a1a24' : '#f0f0f5', borderColor: 'transparent' },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setActiveFilter(filter.key);
                  }}
                >
                  <Ionicons
                    name={filter.icon as any}
                    size={14}
                    color={isActive ? filter.color : theme.colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.filterLabel,
                      { color: isActive ? filter.color : theme.colors.textSecondary },
                    ]}
                  >
                    {getFilterLabel(filter.key)}
                  </Text>
                  <View
                    style={[
                      styles.filterCount,
                      { backgroundColor: isActive ? filter.color + '30' : (isDark ? '#2a2a34' : '#e0e0e8') },
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterCountText,
                        { color: isActive ? filter.color : theme.colors.textSecondary },
                      ]}
                    >
                      {count}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </Animated.View>

      {/* Stats row */}
      {notifications.length > 0 && activeFilter === 'all' && (
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
          {[
            { type: 'like', icon: 'heart', color: '#ec4899', label: t('likesLabel') },
            { type: 'comment', icon: 'chatbubble', color: '#6366f1', label: t('commentsLabel') },
            { type: 'follow', icon: 'person-add', color: '#10b981', label: t('followersLabel') },
          ].map((stat) => {
            const count = notifications.filter((n) => n.type === stat.type).length;
            const unread = notifications.filter((n) => n.type === stat.type && !n.read).length;
            return (
              <Pressable
                key={stat.type}
                style={[styles.statCard, { backgroundColor: isDark ? stat.color + '12' : stat.color + '0a' }]}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setActiveFilter(stat.type as FilterType);
                }}
              >
                <View style={styles.statIconRow}>
                  <Ionicons name={stat.icon as any} size={18} color={stat.color} />
                  {unread > 0 && (
                    <View style={[styles.statUnreadDot, { backgroundColor: stat.color }]}>
                      <Text style={styles.statUnreadText}>{unread}</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
                  {count}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>{stat.label}</Text>
              </Pressable>
            );
          })}
        </Animated.View>
      )}

      {/* Section list */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <NotificationItem
            item={item}
            index={index}
            onPress={handleNotificationPress}
            onDelete={handleDelete}
            onLongPress={handleLongPress}
            theme={theme}
            isDark={isDark}
            t={t}
            language={language}
          />
        )}
        renderSectionHeader={({ section: { title, data } }) => (
          <View style={[styles.sectionHeader, { backgroundColor: bgColor }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>{title}</Text>
            <View style={[styles.sectionCount, { backgroundColor: isDark ? '#1e1e2e' : '#e8e8f0' }]}>
              <Text style={[styles.sectionCountText, { color: theme.colors.textSecondary }]}>{data.length}</Text>
            </View>
          </View>
        )}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 40 }]}
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
            <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? '#1a1a2e' : '#f0f0ff' }]}>
              <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.emptyIconGradient}>
                <Ionicons name={activeFilter === 'all' ? 'notifications-off' : getNotificationConfig(activeFilter, t).icon as any} size={30} color="#fff" />
              </LinearGradient>
            </View>
            <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
              {activeFilter === 'all' ? t('noNotifications') : t('noNotificationsForFilter')}
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
              {activeFilter === 'all'
                ? t('notificationEmptyDesc')
                : t('notificationFilterEmptyDesc')}
            </Text>
            {activeFilter !== 'all' ? (
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => setActiveFilter('all')}
              >
                <View style={[styles.emptyButtonOutline, { borderColor: '#6366f1' }]}>
                  <Ionicons name="apps" size={16} color="#6366f1" />
                  <Text style={[styles.emptyButtonOutlineText, { color: '#6366f1' }]}>{t('showAllNotifications')}</Text>
                </View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push('/(tabs)/feed')}
              >
                <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.emptyButtonGradient}>
                  <Ionicons name="compass" size={18} color="#fff" />
                  <Text style={styles.emptyButtonText}>{t('exploreFeed')}</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
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
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  unreadBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 22,
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterScroll: {
    marginTop: 10,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterCount: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  filterCountText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 10,
    marginBottom: 8,
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
  statIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statUnreadDot: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 16,
    alignItems: 'center',
  },
  statUnreadText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
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
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingTop: 18,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCount: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  sectionCountText: {
    fontSize: 11,
    fontWeight: '700',
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
    overflow: 'hidden',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
  },
  iconGradient: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    flex: 1,
    gap: 4,
  },
  contentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  actorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  actorName: {
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
  },
  typeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
  },
  time: {
    fontSize: 11,
    fontWeight: '500',
    flexShrink: 0,
  },
  swipeActionsContainer: {
    width: 80,
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeDeleteAction: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  swipeDeleteButton: {
    flex: 1,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    width: '100%',
    marginLeft: 8,
    gap: 4,
  },
  swipeDeleteText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
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
  emptyIconGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
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
  emptyButtonOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderRadius: 14,
  },
  emptyButtonOutlineText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
