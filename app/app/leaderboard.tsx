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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { useAppTheme } from '@/theme/ThemeProvider';
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

const CURRENT_USER_ID = 'guest-user';

const TABS: { key: LeaderboardType; label: string; icon: string; gradient: [string, string] }[] = [
  { key: 'volume', label: 'Volume', icon: 'barbell', gradient: ['#6366f1', '#8b5cf6'] },
  { key: 'sessions', label: 'Séances', icon: 'calendar', gradient: ['#10b981', '#14b8a6'] },
  { key: 'likes', label: 'Likes', icon: 'heart', gradient: ['#ec4899', '#f43f5e'] },
  { key: 'followers', label: 'Abonnés', icon: 'people', gradient: ['#f59e0b', '#f97316'] },
];

const PERIODS: { key: LeaderboardPeriod; label: string }[] = [
  { key: 'week', label: '7 jours' },
  { key: 'month', label: '30 jours' },
  { key: 'all', label: 'Tout' },
];

const AVATAR_COLORS: [string, string][] = [
  ['#6366f1', '#8b5cf6'],
  ['#ec4899', '#f43f5e'],
  ['#10b981', '#14b8a6'],
  ['#f59e0b', '#f97316'],
  ['#3b82f6', '#6366f1'],
];

const getAvatarGradient = (username: string): [string, string] => {
  const index = username.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
};

// Composant Podium
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
        {/* Avatar */}
        <Animated.View
          style={[
            styles.podiumAvatarContainer,
            {
              transform: [
                {
                  translateY: podiumAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  }),
                },
                {
                  scale: podiumAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 1],
                  }),
                },
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
          {/* Medal badge */}
          <View style={[styles.medalBadge, { backgroundColor: colors.bg }]}>
            <Text style={[styles.medalText, { color: colors.text }]}>{rank}</Text>
          </View>
        </Animated.View>

        {/* Username */}
        <Text style={[styles.podiumUsername, { color: theme.colors.textPrimary }]} numberOfLines={1}>
          {entry.username}
        </Text>

        {/* Score */}
        <Text style={[styles.podiumScore, { color: colors.bg }]}>
          {entry.score.toLocaleString()}
        </Text>
        <Text style={[styles.podiumScoreLabel, { color: theme.colors.textSecondary }]}>
          {scoreLabel}
        </Text>

        {/* Podium bar */}
        <Animated.View
          style={[
            styles.podiumBar,
            {
              height,
              backgroundColor: colors.bg + '30',
              borderColor: colors.bg,
              transform: [
                {
                  scaleY: podiumAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={[colors.bg + '60', colors.bg + '20']}
            style={styles.podiumBarGradient}
          />
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

// Composant Entry Card
const EntryCard: React.FC<{
  entry: LeaderboardEntry;
  index: number;
  onPress: () => void;
  theme: any;
  scoreLabel: string;
}> = ({ entry, index, onPress, theme, scoreLabel }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const isCurrentUser = entry.user_id === CURRENT_USER_ID;
  const gradient = getAvatarGradient(entry.username);

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
    Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }).start();
  };

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateX: slideAnim }, { scale: scaleAnim }],
      }}
    >
      <TouchableOpacity
        style={[
          styles.entryCard,
          {
            backgroundColor: isCurrentUser ? '#6366f115' : theme.colors.surface,
            borderColor: isCurrentUser ? '#6366f1' : theme.colors.border,
          },
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {/* Rank */}
        <View style={[styles.rankBadge, { backgroundColor: theme.colors.surfaceMuted }]}>
          <Text style={[styles.rankText, { color: theme.colors.textPrimary }]}>{entry.rank}</Text>
        </View>

        {/* Avatar */}
        <LinearGradient colors={gradient} style={styles.entryAvatar}>
          <Text style={styles.entryAvatarText}>
            {entry.username.slice(0, 1).toUpperCase()}
          </Text>
        </LinearGradient>

        {/* Info */}
        <View style={styles.entryInfo}>
          <Text
            style={[
              styles.entryUsername,
              { color: isCurrentUser ? '#6366f1' : theme.colors.textPrimary },
            ]}
          >
            {entry.username}
            {isCurrentUser && ' (Toi)'}
          </Text>
          {entry.change !== 0 && (
            <View style={styles.changeContainer}>
              <Ionicons
                name={entry.change > 0 ? 'trending-up' : 'trending-down'}
                size={14}
                color={entry.change > 0 ? '#10b981' : '#ef4444'}
              />
              <Text
                style={[
                  styles.changeText,
                  { color: entry.change > 0 ? '#10b981' : '#ef4444' },
                ]}
              >
                {Math.abs(entry.change)} place{Math.abs(entry.change) > 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </View>

        {/* Score */}
        <View style={styles.scoreContainer}>
          <Text style={[styles.scoreValue, { color: theme.colors.textPrimary }]}>
            {entry.score.toLocaleString()}
          </Text>
          <Text style={[styles.scoreLabel, { color: theme.colors.textSecondary }]}>
            {scoreLabel}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function LeaderboardScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<LeaderboardType>('sessions');
  const [activePeriod, setActivePeriod] = useState<LeaderboardPeriod>('week');
  const [data, setData] = useState<LeaderboardResponse | null>(null);
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

  const loadLeaderboard = async () => {
    try {
      let response: LeaderboardResponse;
      switch (activeTab) {
        case 'volume':
          response = await getVolumeLeaderboard(activePeriod, CURRENT_USER_ID);
          break;
        case 'sessions':
          response = await getSessionsLeaderboard(activePeriod, CURRENT_USER_ID);
          break;
        case 'likes':
          response = await getLikesLeaderboard(CURRENT_USER_ID);
          break;
        case 'followers':
          response = await getFollowersLeaderboard(CURRENT_USER_ID);
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
    setLoading(true);
    loadLeaderboard();
  }, [activeTab, activePeriod]);

  const handleTabChange = (tab: LeaderboardType) => {
    Haptics.selectionAsync().catch(() => {});
    setActiveTab(tab);
  };

  const handlePeriodChange = (period: LeaderboardPeriod) => {
    Haptics.selectionAsync().catch(() => {});
    setActivePeriod(period);
  };

  const getScoreLabel = (): string => {
    switch (activeTab) {
      case 'volume':
        return 'kg';
      case 'sessions':
        return 'séances';
      case 'likes':
        return 'likes';
      case 'followers':
        return 'abonnés';
    }
  };

  const activeTabConfig = TABS.find((t) => t.key === activeTab)!;
  const topThree = data?.entries.slice(0, 3) || [];
  const restOfList = data?.entries.slice(3) || [];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header avec gradient */}
      <Animated.View
        style={{
          opacity: headerAnim,
          transform: [
            {
              translateY: headerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-30, 0],
              }),
            },
          ],
        }}
      >
        <LinearGradient
          colors={activeTabConfig.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerGradient, { paddingTop: insets.top + 12 }]}
        >
          <View style={styles.decorCircle1} pointerEvents="none" />
          <View style={styles.decorCircle2} pointerEvents="none" />

          <View style={styles.headerNav}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Ionicons name="trophy" size={24} color="#FFD700" />
              <Text style={styles.headerTitle}>Classements</Text>
            </View>
            <View style={{ width: 44 }} />
          </View>

          {/* Tabs */}
          <View style={styles.tabsRow}>
            {TABS.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tabButton,
                  activeTab === tab.key && styles.tabButtonActive,
                ]}
                onPress={() => handleTabChange(tab.key)}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={18}
                  color={activeTab === tab.key ? '#fff' : 'rgba(255,255,255,0.6)'}
                />
                <Text
                  style={[
                    styles.tabText,
                    { color: activeTab === tab.key ? '#fff' : 'rgba(255,255,255,0.6)' },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Période */}
          {(activeTab === 'volume' || activeTab === 'sessions') && (
            <View style={styles.periodRow}>
              {PERIODS.map((period) => (
                <TouchableOpacity
                  key={period.key}
                  style={[
                    styles.periodChip,
                    activePeriod === period.key && styles.periodChipActive,
                  ]}
                  onPress={() => handlePeriodChange(period.key)}
                >
                  <Text
                    style={[
                      styles.periodText,
                      { opacity: activePeriod === period.key ? 1 : 0.7 },
                    ]}
                  >
                    {period.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </LinearGradient>
      </Animated.View>

      {/* Contenu */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <View style={[styles.loadingCard, { backgroundColor: theme.colors.surface }]}>
            <ActivityIndicator size="large" color={activeTabConfig.gradient[0]} />
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
              Chargement...
            </Text>
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
              onRefresh={() => {
                setRefreshing(true);
                loadLeaderboard();
              }}
              tintColor={activeTabConfig.gradient[0]}
            />
          }
          ListHeaderComponent={
            <>
              {/* Podium */}
              {topThree.length > 0 && (
                <Podium
                  entries={topThree}
                  onPress={(entry) => router.push(`/profile/${entry.user_id}`)}
                  theme={theme}
                  scoreLabel={getScoreLabel()}
                />
              )}

              {/* Mon rang */}
              {data?.my_rank && (
                <View style={[styles.myRankCard, { backgroundColor: theme.colors.surfaceMuted }]}>
                  <LinearGradient
                    colors={activeTabConfig.gradient}
                    style={styles.myRankIcon}
                  >
                    <Ionicons name="medal" size={18} color="#fff" />
                  </LinearGradient>
                  <Text style={[styles.myRankText, { color: theme.colors.textPrimary }]}>
                    Tu es <Text style={{ fontWeight: '800', color: activeTabConfig.gradient[0] }}>#{data.my_rank}</Text> au classement !
                  </Text>
                </View>
              )}

              {/* Titre section */}
              {restOfList.length > 0 && (
                <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
                  CLASSEMENT
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
                <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
                  Pas encore de classement
                </Text>
                <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                  Partage tes séances pour apparaître ici !
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
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
  headerNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  tabButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  tabText: {
    fontSize: 12,
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
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
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
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 12,
  },
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
  scoreLabel: {
    fontSize: 11,
  },
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
});
