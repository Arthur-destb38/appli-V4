import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  Easing,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useAppTheme } from '@/theme/ThemeProvider';
import { useUserProfile } from '@/hooks/useUserProfile';
import {
  listConversations,
  ConversationRead,
  getUnreadCount,
} from '@/services/messagingApi';
import { buildApiUrl } from '@/utils/api';

export default function MessagesTabScreen() {
  const { theme, mode } = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useUserProfile();

  const [conversations, setConversations] = useState<ConversationRead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);

  // Animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;

  const isDark = mode === 'dark';

  const loadConversations = useCallback(async () => {
    if (!profile?.id) return;
    try {
      const [convResponse, unreadCount] = await Promise.all([
        listConversations(profile.id),
        getUnreadCount(profile.id),
      ]);
      setConversations(convResponse.conversations);
      setTotalUnread(unreadCount);
    } catch (error) {
      console.warn('Failed to load conversations:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [profile?.id]);

  // Fonction pour seeder les messages de démo
  const seedDemoMessages = useCallback(async () => {
    if (!profile?.id) return;
    try {
      setIsLoading(true);
      const response = await fetch(`${buildApiUrl('/seed/messages')}?user_id=${profile.id}`, {
        method: 'POST',
      });
      if (response.ok) {
        // Recharger les conversations après le seed
        await loadConversations();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    } catch (error) {
      console.warn('Failed to seed messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, [profile?.id, loadConversations]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useFocusEffect(
    React.useCallback(() => {
      if (profile?.id) loadConversations();
    }, [profile?.id, loadConversations])
  );

  useEffect(() => {
    Animated.stagger(100, [
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(contentAnim, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [headerAnim, contentAnim]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadConversations();
  };

  const handleConversationPress = (conversation: ConversationRead) => {
    Haptics.selectionAsync().catch(() => {});
    router.push(`/messages/${conversation.id}?participantId=${conversation.participant.id}`);
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const gradientColors = isDark
    ? ['#1a1f2e', '#0F1218', '#0F1218']
    : ['#e0e7ff', '#c7d2fe', '#F7F8FA'];

  // Composant ConversationCard
  const ConversationCard: React.FC<{
    conversation: ConversationRead;
    index: number;
  }> = ({ conversation, index }) => {
    const cardAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.spring(cardAnim, {
        toValue: 1,
        delay: index * 50,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    }, [cardAnim, index]);

    const hasUnread = conversation.unread_count > 0;
    const avatarLetter = conversation.participant.username.charAt(0).toUpperCase();

    return (
      <Animated.View
        style={{
          opacity: cardAnim,
          transform: [
            { translateX: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) },
          ],
        }}
      >
        <Pressable
          style={({ pressed }) => [
            styles.conversationCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: hasUnread ? theme.colors.primary + '40' : theme.colors.border,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}
          onPress={() => handleConversationPress(conversation)}
        >
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={hasUnread ? ['#6366F1', '#8B5CF6'] : [theme.colors.surfaceMuted, theme.colors.border]}
              style={styles.avatarGradient}
            >
              {conversation.participant.avatar_url ? (
                <View style={[styles.avatar, { backgroundColor: theme.colors.surface }]}>
                  <Text style={[styles.avatarText, { color: theme.colors.primary }]}>
                    {avatarLetter}
                  </Text>
                </View>
              ) : (
                <View style={[styles.avatar, { backgroundColor: theme.colors.surface }]}>
                  <Text style={[styles.avatarText, { color: hasUnread ? theme.colors.primary : theme.colors.textSecondary }]}>
                    {avatarLetter}
                  </Text>
                </View>
              )}
            </LinearGradient>
            {hasUnread && (
              <View style={styles.onlineDot}>
                <View style={[styles.onlineDotInner, { backgroundColor: theme.colors.primary }]} />
              </View>
            )}
          </View>

          {/* Content */}
          <View style={styles.conversationContent}>
            <View style={styles.conversationHeader}>
              <Text
                style={[
                  styles.participantName,
                  { color: theme.colors.textPrimary, fontWeight: hasUnread ? '700' : '600' },
                ]}
                numberOfLines={1}
              >
                {conversation.participant.username}
              </Text>
              <Text style={[styles.timestamp, { color: hasUnread ? theme.colors.primary : theme.colors.textSecondary }]}>
                {formatTime(conversation.last_message_at)}
              </Text>
            </View>
            <View style={styles.lastMessageRow}>
              <Text
                style={[
                  styles.lastMessage,
                  {
                    color: hasUnread ? theme.colors.textPrimary : theme.colors.textSecondary,
                    fontWeight: hasUnread ? '500' : '400',
                  },
                ]}
                numberOfLines={1}
              >
                {conversation.last_message?.content || 'Aucun message'}
              </Text>
              {hasUnread && (
                <View style={[styles.unreadBadge, { backgroundColor: theme.colors.primary }]}>
                  <Text style={styles.unreadBadgeText}>
                    {conversation.unread_count > 9 ? '9+' : conversation.unread_count}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Chevron */}
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        </Pressable>
      </Animated.View>
    );
  };

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
            <View style={styles.topBarTitle}>
              <Ionicons name="chatbubbles" size={26} color={theme.colors.primary} />
              <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
                Messages
              </Text>
              {totalUnread > 0 && (
                <View style={[styles.headerBadge, { backgroundColor: theme.colors.primary }]}>
                  <Text style={styles.headerBadgeText}>{totalUnread}</Text>
                </View>
              )}
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.newChatBtn,
                { backgroundColor: theme.colors.primary, opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                router.push('/messages/new');
              }}
            >
              <Ionicons name="create-outline" size={20} color="#FFFFFF" />
            </Pressable>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
              <View style={[styles.statIcon, { backgroundColor: theme.colors.primary + '20' }]}>
                <Ionicons name="chatbubble" size={18} color={theme.colors.primary} />
              </View>
              <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
                {conversations.length}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Conversations
              </Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
              <View style={[styles.statIcon, { backgroundColor: theme.colors.warning + '20' }]}>
                <Ionicons name="mail-unread" size={18} color={theme.colors.warning} />
              </View>
              <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
                {totalUnread}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Non lus
              </Text>
            </View>
          </View>
        </Animated.View>
      </LinearGradient>

      {/* Liste */}
      <Animated.View
        style={[
          styles.listContainer,
          {
            opacity: contentAnim,
            transform: [{ translateY: contentAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
          },
        ]}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
              Chargement...
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={theme.colors.primary}
              />
            }
          >
            {conversations.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIconOuter, { backgroundColor: theme.colors.primary + '10' }]}>
                  <View style={[styles.emptyIconInner, { backgroundColor: theme.colors.primary + '20' }]}>
                    <Ionicons name="chatbubbles-outline" size={48} color={theme.colors.primary} />
                  </View>
                </View>
                <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
                  Aucune conversation
                </Text>
                <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                  Commencez à discuter avec d&apos;autres athlètes !
                </Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.emptyBtn,
                    { opacity: pressed ? 0.8 : 1 },
                  ]}
                  onPress={() => router.push('/messages/new')}
                >
                  <LinearGradient
                    colors={['#6366F1', '#8B5CF6']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.emptyBtnGradient}
                  >
                    <Ionicons name="add" size={20} color="#FFFFFF" />
                    <Text style={styles.emptyBtnText}>Nouvelle conversation</Text>
                  </LinearGradient>
                </Pressable>
                
                {/* Bouton pour charger les conversations de démo */}
                <Pressable
                  style={({ pressed }) => [
                    styles.demoBtn,
                    { 
                      backgroundColor: theme.colors.surfaceMuted, 
                      borderColor: theme.colors.border,
                      opacity: pressed ? 0.8 : 1 
                    },
                  ]}
                  onPress={seedDemoMessages}
                >
                  <Ionicons name="sparkles" size={18} color={theme.colors.warning} />
                  <Text style={[styles.demoBtnText, { color: theme.colors.textPrimary }]}>
                    Charger des conversations démo
                  </Text>
                </Pressable>
              </View>
            ) : (
              <>
                <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
                  VOS CONVERSATIONS
                </Text>
                {conversations.map((conv, index) => (
                  <ConversationCard key={conv.id} conversation={conv} index={index} />
                ))}
              </>
            )}
          </ScrollView>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroGradient: {
    paddingHorizontal: 16,
    paddingBottom: 20,
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
  topBarTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  headerBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  headerBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  newChatBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    gap: 6,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarGradient: {
    width: 52,
    height: 52,
    borderRadius: 26,
    padding: 2,
  },
  avatar: {
    flex: 1,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  conversationContent: {
    flex: 1,
    gap: 4,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  participantName: {
    fontSize: 16,
    flex: 1,
  },
  timestamp: {
    fontSize: 12,
    fontWeight: '500',
  },
  lastMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lastMessage: {
    fontSize: 14,
    flex: 1,
  },
  unreadBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    minWidth: 22,
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
    gap: 16,
  },
  emptyIconOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconInner: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyBtn: {
    marginTop: 8,
    borderRadius: 14,
    overflow: 'hidden',
  },
  emptyBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  emptyBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  demoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    marginTop: 12,
  },
  demoBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

