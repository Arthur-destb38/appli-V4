import React, { useEffect, useState, useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
  Easing,
  SectionList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { useAppTheme } from '@/theme/ThemeProvider';
import {
  Notification,
  getNotifications,
  markAllRead,
  markRead,
} from '@/services/notificationsApi';

const CURRENT_USER_ID = 'guest-user';

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'À l\'instant';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} j`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function getNotificationConfig(type: string) {
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
        label: 'Commentaire',
      };
    case 'follow':
      return {
        icon: 'person-add',
        gradient: ['#10b981', '#14b8a6'] as [string, string],
        color: '#10b981',
        label: 'Abonnement',
      };
    case 'mention':
      return {
        icon: 'at',
        gradient: ['#f59e0b', '#f97316'] as [string, string],
        color: '#f59e0b',
        label: 'Mention',
      };
    default:
      return {
        icon: 'notifications',
        gradient: ['#64748b', '#94a3b8'] as [string, string],
        color: '#64748b',
        label: 'Notification',
      };
  }
}

function groupNotificationsByTime(notifications: Notification[]) {
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
  if (today.length > 0) sections.push({ title: 'Aujourd\'hui', data: today });
  if (thisWeek.length > 0) sections.push({ title: 'Cette semaine', data: thisWeek });
  if (older.length > 0) sections.push({ title: 'Plus ancien', data: older });

  return sections;
}

interface NotificationItemProps {
  item: Notification;
  index: number;
  onPress: (item: Notification) => void;
  theme: any;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ item, index, onPress, theme }) => {
  const config = getNotificationConfig(item.type);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

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

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View
      style={[
        {
          opacity: fadeAnim,
          transform: [{ translateX: slideAnim }, { scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.notificationCard,
          {
            backgroundColor: item.read ? theme.colors.surface : theme.colors.surfaceMuted,
            borderColor: item.read ? theme.colors.border : config.color + '30',
          },
        ]}
        onPress={() => onPress(item)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {/* Icône avec gradient */}
        <LinearGradient colors={config.gradient} style={styles.iconGradient}>
          <Ionicons name={config.icon as any} size={20} color="#fff" />
        </LinearGradient>

        {/* Contenu */}
        <View style={styles.contentContainer}>
          <View style={styles.contentHeader}>
            <View style={[styles.typeBadge, { backgroundColor: config.color + '15' }]}>
              <Text style={[styles.typeBadgeText, { color: config.color }]}>{config.label}</Text>
            </View>
            <Text style={[styles.time, { color: theme.colors.textSecondary }]}>
              {formatTimeAgo(item.created_at)}
            </Text>
          </View>
          <Text style={[styles.message, { color: theme.colors.textPrimary }]} numberOfLines={2}>
            {item.message}
          </Text>
        </View>

        {/* Indicateur non lu */}
        {!item.read && (
          <View style={styles.unreadIndicator}>
            <LinearGradient colors={config.gradient} style={styles.unreadDot} />
          </View>
        )}

        {/* Chevron */}
        <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await getNotifications(CURRENT_USER_ID);
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
  }, []);

  const handleMarkAllRead = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    try {
      await markAllRead(CURRENT_USER_ID);
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
    } else if (notification.reference_id) {
      router.push(`/profile/${notification.actor_id}`);
    }
  };

  const sections = groupNotificationsByTime(notifications);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.loadingCard, { backgroundColor: theme.colors.surface }]}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Chargement...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          { paddingTop: insets.top + 8 },
          {
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
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.colors.surfaceMuted }]}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <LinearGradient colors={['#ec4899', '#f43f5e']} style={styles.headerIcon}>
            <Ionicons name="notifications" size={18} color="#fff" />
          </LinearGradient>
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
            Notifications
          </Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>

        {unreadCount > 0 ? (
          <TouchableOpacity
            style={[styles.markAllButton, { backgroundColor: theme.colors.surfaceMuted }]}
            onPress={handleMarkAllRead}
          >
            <Ionicons name="checkmark-done" size={20} color="#6366f1" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 44 }} />
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
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={[styles.statCard, { backgroundColor: '#ec489915' }]}>
            <Ionicons name="heart" size={16} color="#ec4899" />
            <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
              {notifications.filter((n) => n.type === 'like').length}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Likes</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#6366f115' }]}>
            <Ionicons name="chatbubble" size={16} color="#6366f1" />
            <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
              {notifications.filter((n) => n.type === 'comment').length}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Commentaires</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#10b98115' }]}>
            <Ionicons name="person-add" size={16} color="#10b981" />
            <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
              {notifications.filter((n) => n.type === 'follow').length}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Abonnés</Text>
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
          />
        )}
        renderSectionHeader={({ section: { title } }) => (
          <View style={[styles.sectionHeader, { backgroundColor: theme.colors.background }]}>
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
              Pas de notifications
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
              Tu recevras des notifications quand quelqu&apos;un interagit avec tes séances
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push('/(tabs)/feed')}
            >
              <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.emptyButtonGradient}>
                <Ionicons name="compass" size={18} color="#fff" />
                <Text style={styles.emptyButtonText}>Explorer le feed</Text>
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
    paddingBottom: 16,
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
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    display: 'none',
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
    marginRight: 4,
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
