import React, { useEffect, useState, useRef, memo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Animated,
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { useAppTheme } from '@/theme/ThemeProvider';
import { useTranslations } from '@/hooks/usePreferences';
import { useUserProfile } from '@/hooks/useUserProfile';
import {
  LeaderboardEntry,
  LeaderboardResponse,
  LeaderboardType,
  LeaderboardPeriod,
  getVolumeLeaderboard,
  getSessionsLeaderboard,
  getLikesLeaderboard,
  getFollowersLeaderboard,
} from '@/services/leaderboardApi';
import { getAvatarGradient } from '@/utils/colors';

// ============ CONSTANTS ============

type PageTab = 'ranking' | 'challenges';

const LEADERBOARD_TABS: { key: LeaderboardType; icon: string; gradient: [string, string] }[] = [
  { key: 'volume', icon: 'barbell', gradient: ['#6366f1', '#8b5cf6'] },
  { key: 'sessions', icon: 'calendar', gradient: ['#10b981', '#14b8a6'] },
  { key: 'likes', icon: 'heart', gradient: ['#ec4899', '#f43f5e'] },
  { key: 'followers', icon: 'people', gradient: ['#f59e0b', '#f97316'] },
];

const PERIODS: { key: LeaderboardPeriod }[] = [
  { key: 'week' },
  { key: 'month' },
  { key: 'all' },
];

const CHALLENGES = [
  { id: '1', titleKey: 'challenge100Pushups', descKey: 'challenge100PushupsDesc', participants: 234, icon: '💪', gradient: ['#ef4444', '#dc2626'] as [string, string], category: 'force' },
  { id: '2', titleKey: 'challenge7Days', descKey: 'challenge7DaysDesc', participants: 156, icon: '🔥', gradient: ['#6366f1', '#8b5cf6'] as [string, string], category: 'all' },
  { id: '3', titleKey: 'challengePRSquad', descKey: 'challengePRSquatDesc', participants: 89, icon: '🏆', gradient: ['#f59e0b', '#d97706'] as [string, string], category: 'force' },
  { id: '4', titleKey: 'challengeCardioMaster', descKey: 'challengeCardioMasterDesc', participants: 178, icon: '❤️', gradient: ['#ec4899', '#db2777'] as [string, string], category: 'cardio' },
];

// ============ PODIUM COMPONENT ============

const Podium: React.FC<{
  entries: LeaderboardEntry[];
  onPress: (entry: LeaderboardEntry) => void;
  theme: any;
  scoreLabel: string;
}> = ({ entries, onPress, theme, scoreLabel }) => {
  const podiumAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(podiumAnim, {
      toValue: 1,
      duration: 800,
      easing: Easing.out(Easing.back(1.1)),
      useNativeDriver: true,
    }).start();
  }, []);

  const first = entries[0];
  const second = entries[1];
  const third = entries[2];

  const renderPodiumPlace = (entry: LeaderboardEntry | undefined, rank: number, height: number) => {
    if (!entry) return <View style={{ flex: 1 }} />;

    const gradient = getAvatarGradient(entry.username);
    const medalColors: Record<number, { bg: string; border: string; text: string }> = {
      1: { bg: '#FFD700', border: '#FFC107', text: '#92400E' },
      2: { bg: '#E5E7EB', border: '#9CA3AF', text: '#374151' },
      3: { bg: '#F59E0B', border: '#D97706', text: '#78350F' },
    };
    const colors = medalColors[rank];

    return (
      <TouchableOpacity
        style={[styles.podiumPlace, { flex: rank === 1 ? 1.2 : 1 }]}
        onPress={() => onPress(entry)}
        activeOpacity={0.8}
      >
        <Animated.View
          style={[
            styles.podiumAvatarContainer,
            {
              transform: [
                { translateY: podiumAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) },
                { scale: podiumAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) },
              ],
              opacity: podiumAnim,
            },
          ]}
        >
          <View style={[styles.podiumAvatarRing, { borderColor: colors.bg }]}>
            <LinearGradient colors={gradient} style={styles.podiumAvatar}>
              <Text style={styles.podiumAvatarText}>
                {entry.username.slice(0, 1).toUpperCase()}
              </Text>
            </LinearGradient>
          </View>
          <View style={[styles.medalBadge, { backgroundColor: colors.bg }]}>
            <Text style={[styles.medalText, { color: colors.text }]}>{rank}</Text>
          </View>
        </Animated.View>

        <Text style={[styles.podiumUsername, { color: theme.colors.textPrimary }]} numberOfLines={1}>
          {entry.username}
        </Text>
        <Text style={[styles.podiumScore, { color: colors.bg }]}>
          {entry.score.toLocaleString()}
        </Text>
        <Text style={[styles.podiumScoreLabel, { color: theme.colors.textSecondary }]}>
          {scoreLabel}
        </Text>

        <Animated.View
          style={[
            styles.podiumBar,
            {
              height,
              backgroundColor: colors.bg + '30',
              borderColor: colors.bg,
              transform: [{ scaleY: podiumAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) }],
            },
          ]}
        >
          <LinearGradient colors={[colors.bg + '60', colors.bg + '20']} style={styles.podiumBarGradient} />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.podiumContainer}>
      {renderPodiumPlace(second, 2, 70)}
      {renderPodiumPlace(first, 1, 100)}
      {renderPodiumPlace(third, 3, 50)}
    </View>
  );
};

// ============ ENTRY CARD COMPONENT ============

const EntryCard: React.FC<{
  entry: LeaderboardEntry;
  index: number;
  onPress: () => void;
  theme: any;
  scoreLabel: string;
  currentUserId: string;
  t: (key: any, params?: Record<string, string | number>) => string;
}> = memo(({ entry, index, onPress, theme, scoreLabel, currentUserId, t }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const isCurrentUser = entry.user_id === currentUserId;
  const gradient = getAvatarGradient(entry.username);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 400, delay: index * 50,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0, duration: 400, delay: index * 50,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateX: slideAnim }] }}>
      <TouchableOpacity
        style={[
          styles.entryCard,
          {
            backgroundColor: isCurrentUser ? '#6366f115' : theme.colors.surface,
            borderColor: isCurrentUser ? '#6366f1' : theme.colors.border,
          },
        ]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={[styles.rankBadge, { backgroundColor: theme.colors.surfaceMuted }]}>
          <Text style={[styles.rankText, { color: theme.colors.textPrimary }]}>{entry.rank}</Text>
        </View>

        <LinearGradient colors={gradient} style={styles.entryAvatar}>
          <Text style={styles.entryAvatarText}>{entry.username.slice(0, 1).toUpperCase()}</Text>
        </LinearGradient>

        <View style={styles.entryInfo}>
          <Text style={[styles.entryUsername, { color: isCurrentUser ? '#6366f1' : theme.colors.textPrimary }]}>
            {entry.username}
            {isCurrentUser && ` (${t('youLabel')})`}
          </Text>
          {entry.change !== 0 && (
            <View style={styles.changeContainer}>
              <Ionicons
                name={entry.change > 0 ? 'trending-up' : 'trending-down'}
                size={14}
                color={entry.change > 0 ? '#10b981' : '#ef4444'}
              />
              <Text style={[styles.changeText, { color: entry.change > 0 ? '#10b981' : '#ef4444' }]}>
                {Math.abs(entry.change)} {Math.abs(entry.change) > 1 ? t('placesLabel') : t('placeLabel')}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.scoreContainer}>
          <Text style={[styles.scoreValue, { color: theme.colors.textPrimary }]}>
            {entry.score.toLocaleString()}
          </Text>
          <Text style={[styles.scoreLabelText, { color: theme.colors.textSecondary }]}>{scoreLabel}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ============ CHALLENGE CARD COMPONENT ============

const ChallengeCard = memo(({ challenge, index, onPress, t }: {
  challenge: typeof CHALLENGES[0];
  index: number;
  onPress: () => void;
  t: (key: any, params?: Record<string, string | number>) => string;
}) => {
  const cardAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(cardAnim, {
      toValue: 1, delay: index * 100,
      useNativeDriver: true, tension: 50, friction: 8,
    }).start();
  }, [index]);

  return (
    <Animated.View
      style={{
        opacity: cardAnim,
        transform: [
          { translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) },
          { scale: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) },
        ],
      }}
    >
      <Pressable
        style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }] }]}
        onPress={onPress}
      >
        <LinearGradient
          colors={challenge.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.challengeCard}
        >
          <View style={styles.challengeDecor1} />
          <View style={styles.challengeDecor2} />

          <View style={styles.challengeRow}>
            <View style={styles.challengeIconBox}>
              <Text style={styles.challengeIcon}>{challenge.icon}</Text>
            </View>
            <View style={styles.challengeInfo}>
              <Text style={styles.challengeTitle}>{t(challenge.titleKey)}</Text>
              <Text style={styles.challengeDesc}>{t(challenge.descKey)}</Text>
            </View>
          </View>

          <View style={styles.challengeFooter}>
            <View style={styles.challengeParticipants}>
              <Ionicons name="people" size={14} color="rgba(255,255,255,0.9)" />
              <Text style={styles.challengeParticipantsText}>{challenge.participants}</Text>
            </View>
            <View style={styles.challengeJoinBtn}>
              <Text style={styles.challengeJoinText}>{t('participate')}</Text>
              <Ionicons name="chevron-forward" size={14} color="#fff" />
            </View>
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
});

// ============ MAIN SCREEN ============

export default function RankingsScreen() {
  const router = useRouter();
  const { theme, mode } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslations();
  const { profile } = useUserProfile();
  const isDark = mode === 'dark';

  const currentUserId = profile?.id || 'guest-user';

  // Page-level tab
  const [pageTab, setPageTab] = useState<PageTab>('ranking');

  // Leaderboard state
  const [activeTab, setActiveTab] = useState<LeaderboardType>('sessions');
  const [activePeriod, setActivePeriod] = useState<LeaderboardPeriod>('week');
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1, duration: 500,
      easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start();
  }, []);

  // Leaderboard helpers
  const getTabLabel = (key: LeaderboardType): string => {
    switch (key) {
      case 'volume': return t('leaderVolume');
      case 'sessions': return t('leaderSessions');
      case 'likes': return t('leaderLikes');
      case 'followers': return t('leaderFollowers');
    }
  };

  const getPeriodLabel = (key: LeaderboardPeriod): string => {
    switch (key) {
      case 'week': return t('sevenDays');
      case 'month': return t('thirtyDays');
      case 'all': return t('allTime');
    }
  };

  const getScoreLabel = (): string => {
    switch (activeTab) {
      case 'volume': return 'kg';
      case 'sessions': return t('sessionsLabel').toLowerCase();
      case 'likes': return 'likes';
      case 'followers': return t('followersLabel').toLowerCase();
    }
  };

  const loadLeaderboard = async () => {
    try {
      let response: LeaderboardResponse;
      switch (activeTab) {
        case 'volume':
          response = await getVolumeLeaderboard(activePeriod, currentUserId);
          break;
        case 'sessions':
          response = await getSessionsLeaderboard(activePeriod, currentUserId);
          break;
        case 'likes':
          response = await getLikesLeaderboard(currentUserId);
          break;
        case 'followers':
          response = await getFollowersLeaderboard(currentUserId);
          break;
      }
      setData(response);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (pageTab === 'ranking') {
      setLoading(true);
      loadLeaderboard();
    }
  }, [activeTab, activePeriod, pageTab]);

  const handleTabChange = (tab: LeaderboardType) => {
    Haptics.selectionAsync().catch(() => {});
    setActiveTab(tab);
  };

  const handlePeriodChange = (period: LeaderboardPeriod) => {
    Haptics.selectionAsync().catch(() => {});
    setActivePeriod(period);
  };

  const handlePageTabChange = (tab: PageTab) => {
    Haptics.selectionAsync().catch(() => {});
    setPageTab(tab);
  };

  const activeTabConfig = LEADERBOARD_TABS.find((tab) => tab.key === activeTab)!;
  const topThree = data?.entries.slice(0, 3) || [];
  const restOfList = data?.entries.slice(3) || [];

  const headerGradient: [string, string] = pageTab === 'ranking'
    ? activeTabConfig.gradient
    : ['#6366f1', '#8b5cf6'];

  // ============ RENDER ============

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <Animated.View
        style={{
          opacity: headerAnim,
          transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }],
        }}
      >
        <LinearGradient
          colors={headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerGradient, { paddingTop: insets.top + 8 }]}
        >
          <View style={styles.decorCircle1} pointerEvents="none" />
          <View style={styles.decorCircle2} pointerEvents="none" />

          {/* Title */}
          <View style={styles.headerTitleRow}>
            <Ionicons name="trophy" size={24} color="#FFD700" />
            <Text style={styles.headerTitle}>{t('rankings')}</Text>
          </View>

          {/* Page tabs: Classement | Defis */}
          <View style={styles.pageTabsRow}>
            <Pressable
              style={[styles.pageTab, pageTab === 'ranking' && styles.pageTabActive]}
              onPress={() => handlePageTabChange('ranking')}
            >
              <Ionicons name="podium" size={16} color={pageTab === 'ranking' ? '#fff' : 'rgba(255,255,255,0.6)'} />
              <Text style={[styles.pageTabText, { color: pageTab === 'ranking' ? '#fff' : 'rgba(255,255,255,0.6)' }]}>
                {t('rankingSection')}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.pageTab, pageTab === 'challenges' && styles.pageTabActive]}
              onPress={() => handlePageTabChange('challenges')}
            >
              <Ionicons name="flame" size={16} color={pageTab === 'challenges' ? '#fff' : 'rgba(255,255,255,0.6)'} />
              <Text style={[styles.pageTabText, { color: pageTab === 'challenges' ? '#fff' : 'rgba(255,255,255,0.6)' }]}>
                {t('challengesTab')}
              </Text>
            </Pressable>
          </View>

          {/* Leaderboard sub-filters (only on ranking tab) */}
          {pageTab === 'ranking' && (
            <>
              <View style={styles.leaderTabsRow}>
                {LEADERBOARD_TABS.map((tab) => (
                  <TouchableOpacity
                    key={tab.key}
                    style={[styles.leaderTab, activeTab === tab.key && styles.leaderTabActive]}
                    onPress={() => handleTabChange(tab.key)}
                  >
                    <Ionicons
                      name={tab.icon as any}
                      size={16}
                      color={activeTab === tab.key ? '#fff' : 'rgba(255,255,255,0.5)'}
                    />
                    <Text style={[styles.leaderTabText, { color: activeTab === tab.key ? '#fff' : 'rgba(255,255,255,0.5)' }]}>
                      {getTabLabel(tab.key)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {(activeTab === 'volume' || activeTab === 'sessions') && (
                <View style={styles.periodRow}>
                  {PERIODS.map((period) => (
                    <TouchableOpacity
                      key={period.key}
                      style={[styles.periodChip, activePeriod === period.key && styles.periodChipActive]}
                      onPress={() => handlePeriodChange(period.key)}
                    >
                      <Text style={[styles.periodText, { opacity: activePeriod === period.key ? 1 : 0.7 }]}>
                        {getPeriodLabel(period.key)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}
        </LinearGradient>
      </Animated.View>

      {/* Content */}
      {pageTab === 'ranking' ? (
        loading ? (
          <View style={styles.loadingContainer}>
            <View style={[styles.loadingCard, { backgroundColor: theme.colors.surface }]}>
              <ActivityIndicator size="large" color={activeTabConfig.gradient[0]} />
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>{t('loading')}</Text>
            </View>
          </View>
        ) : (
          <FlatList
            data={restOfList}
            keyExtractor={(item) => item.user_id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => { setRefreshing(true); loadLeaderboard(); }}
                tintColor={activeTabConfig.gradient[0]}
              />
            }
            ListHeaderComponent={
              <>
                {topThree.length > 0 && (
                  <Podium
                    entries={topThree}
                    onPress={(entry) => router.push(`/profile/${entry.user_id}`)}
                    theme={theme}
                    scoreLabel={getScoreLabel()}
                  />
                )}

                {data?.my_rank && (
                  <View style={[styles.myRankCard, { backgroundColor: theme.colors.surfaceMuted }]}>
                    <LinearGradient colors={activeTabConfig.gradient} style={styles.myRankIcon}>
                      <Ionicons name="medal" size={18} color="#fff" />
                    </LinearGradient>
                    <Text style={[styles.myRankText, { color: theme.colors.textPrimary }]}>
                      {t('yourRankIs', { rank: String(data.my_rank) }).split(`#${data.my_rank}`)[0]}
                      <Text style={{ fontWeight: '800', color: activeTabConfig.gradient[0] }}>#{data.my_rank}</Text>
                      {t('yourRankIs', { rank: String(data.my_rank) }).split(`#${data.my_rank}`)[1]}
                    </Text>
                  </View>
                )}

                {restOfList.length > 0 && (
                  <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
                    {t('rankingSection')}
                  </Text>
                )}
              </>
            }
            renderItem={({ item, index }) => (
              <EntryCard
                entry={item}
                index={index}
                onPress={() => router.push(`/profile/${item.user_id}`)}
                theme={theme}
                scoreLabel={getScoreLabel()}
                currentUserId={currentUserId}
                t={t}
              />
            )}
            ListEmptyComponent={
              topThree.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={[styles.emptyIconCircle, { backgroundColor: theme.colors.surfaceMuted }]}>
                    <LinearGradient colors={activeTabConfig.gradient} style={styles.emptyIconGradient}>
                      <Ionicons name="trophy" size={32} color="#fff" />
                    </LinearGradient>
                  </View>
                  <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>{t('noRankingYet')}</Text>
                  <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>{t('shareToAppear')}</Text>
                </View>
              ) : null
            }
          />
        )
      ) : (
        /* Challenges tab */
        <ScrollView
          contentContainerStyle={styles.challengesContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Active challenges */}
          <View style={styles.challengeSection}>
            <View style={styles.challengeSectionHeader}>
              <Ionicons name="flame" size={20} color="#ef4444" />
              <Text style={[styles.challengeSectionTitle, { color: theme.colors.textPrimary }]}>
                {t('activeChallenges')}
              </Text>
            </View>
            {CHALLENGES.map((challenge, index) => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                index={index}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                  router.push(`/challenge/${challenge.id}` as never);
                }}
                t={t}
              />
            ))}
          </View>

          {/* Coming soon */}
          <View style={[styles.comingSoonCard, { backgroundColor: theme.colors.surfaceMuted }]}>
            <View style={styles.comingSoonIcon}>
              <Ionicons name="rocket" size={28} color="#6366f1" />
            </View>
            <Text style={[styles.comingSoonTitle, { color: theme.colors.textPrimary }]}>
              {t('moreChallengesSoon')}
            </Text>
            <Text style={[styles.comingSoonDesc, { color: theme.colors.textSecondary }]}>
              {t('moreChallengesSoonDesc')}
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

// ============ STYLES ============

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
  headerGradient: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
    position: 'relative',
  },
  decorCircle1: {
    position: 'absolute',
    top: -30,
    right: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: 20,
    left: -30,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },

  // Page tabs (Classement / Defis)
  pageTabsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    padding: 3,
    marginBottom: 14,
  },
  pageTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 11,
  },
  pageTabActive: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  pageTabText: {
    fontSize: 14,
    fontWeight: '700',
  },

  // Leaderboard sub-tabs
  leaderTabsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  leaderTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  leaderTabActive: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  leaderTabText: {
    fontSize: 11,
    fontWeight: '600',
  },
  periodRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  periodChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  periodChipActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  periodText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },

  // Loading
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

  // List
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },

  // Podium
  podiumContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingTop: 30,
    paddingBottom: 20,
    gap: 8,
  },
  podiumPlace: {
    alignItems: 'center',
  },
  podiumAvatarContainer: {
    marginBottom: 8,
  },
  podiumAvatarRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    padding: 3,
  },
  podiumAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  podiumAvatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
  medalBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medalText: {
    fontSize: 12,
    fontWeight: '800',
  },
  podiumUsername: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
    maxWidth: 80,
  },
  podiumScore: {
    fontSize: 18,
    fontWeight: '800',
  },
  podiumScoreLabel: {
    fontSize: 11,
    marginBottom: 8,
  },
  podiumBar: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 2,
    overflow: 'hidden',
  },
  podiumBarGradient: {
    flex: 1,
  },

  // My rank
  myRankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 20,
    gap: 12,
  },
  myRankIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  myRankText: {
    fontSize: 15,
    flex: 1,
  },

  // Section title
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 12,
  },

  // Entry card
  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 15,
    fontWeight: '700',
  },
  entryAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  entryInfo: {
    flex: 1,
    gap: 2,
  },
  entryUsername: {
    fontSize: 15,
    fontWeight: '600',
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  scoreLabelText: {
    fontSize: 11,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
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
  },

  // Challenges content
  challengesContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 100,
  },
  challengeSection: {
    gap: 12,
    marginBottom: 24,
  },
  challengeSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  challengeSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },

  // Challenge card
  challengeCard: {
    borderRadius: 20,
    padding: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  challengeDecor1: {
    position: 'absolute',
    top: -15,
    right: -15,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  challengeDecor2: {
    position: 'absolute',
    bottom: -20,
    left: -10,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  challengeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  challengeIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  challengeIcon: {
    fontSize: 26,
  },
  challengeInfo: {
    flex: 1,
    gap: 4,
  },
  challengeTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  challengeDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  challengeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  challengeParticipants: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  challengeParticipantsText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  challengeJoinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  challengeJoinText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },

  // Coming soon
  comingSoonCard: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 20,
    gap: 12,
  },
  comingSoonIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366f115',
    alignItems: 'center',
    justifyContent: 'center',
  },
  comingSoonTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  comingSoonDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
