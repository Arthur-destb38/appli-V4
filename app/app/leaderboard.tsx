import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

const TABS: { key: LeaderboardType; label: string; icon: string }[] = [
  { key: 'volume', label: 'Volume', icon: 'barbell' },
  { key: 'sessions', label: 'Séances', icon: 'calendar' },
  { key: 'likes', label: 'Likes', icon: 'heart' },
  { key: 'followers', label: 'Abonnés', icon: 'people' },
];

const PERIODS: { key: LeaderboardPeriod; label: string }[] = [
  { key: 'week', label: '7 jours' },
  { key: 'month', label: '30 jours' },
  { key: 'all', label: 'Tout' },
];

export default function LeaderboardScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<LeaderboardType>('sessions');
  const [activePeriod, setActivePeriod] = useState<LeaderboardPeriod>('week');
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const getMedalColor = (rank: number): string => {
    switch (rank) {
      case 1:
        return '#FFD700'; // Or
      case 2:
        return '#C0C0C0'; // Argent
      case 3:
        return '#CD7F32'; // Bronze
      default:
        return theme.colors.textSecondary;
    }
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

  const renderEntry = ({ item }: { item: LeaderboardEntry }) => {
    const isCurrentUser = item.user_id === CURRENT_USER_ID;
    const medalColor = getMedalColor(item.rank);

    return (
      <TouchableOpacity
        style={[
          styles.entryCard,
          {
            backgroundColor: isCurrentUser
              ? theme.colors.accent + '15'
              : theme.colors.surface,
            borderColor: isCurrentUser ? theme.colors.accent : theme.colors.border,
          },
        ]}
        onPress={() => router.push(`/profile/${item.user_id}`)}
      >
        {/* Rang */}
        <View style={[styles.rankContainer, { backgroundColor: medalColor + '20' }]}>
          {item.rank <= 3 ? (
            <Ionicons name="trophy" size={20} color={medalColor} />
          ) : (
            <Text style={[styles.rankText, { color: theme.colors.textSecondary }]}>
              {item.rank}
            </Text>
          )}
        </View>

        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: theme.colors.accent + '25' }]}>
          {item.avatar_url ? (
            <View style={styles.avatarImage} />
          ) : (
            <Text style={[styles.avatarText, { color: theme.colors.accent }]}>
              {item.username.slice(0, 2).toUpperCase()}
            </Text>
          )}
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Text
            style={[
              styles.username,
              { color: isCurrentUser ? theme.colors.accent : theme.colors.textPrimary },
            ]}
          >
            {item.username}
            {isCurrentUser && ' (Toi)'}
          </Text>
          {item.change !== 0 && (
            <View style={styles.changeContainer}>
              <Ionicons
                name={item.change > 0 ? 'arrow-up' : 'arrow-down'}
                size={12}
                color={item.change > 0 ? theme.colors.success : theme.colors.error}
              />
              <Text
                style={{
                  color: item.change > 0 ? theme.colors.success : theme.colors.error,
                  fontSize: 12,
                }}
              >
                {Math.abs(item.change)}
              </Text>
            </View>
          )}
        </View>

        {/* Score */}
        <View style={styles.scoreContainer}>
          <Text style={[styles.score, { color: theme.colors.textPrimary }]}>
            {item.score.toLocaleString()}
          </Text>
          <Text style={[styles.scoreLabel, { color: theme.colors.textSecondary }]}>
            {getScoreLabel()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, paddingTop: insets.top },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
          🏆 Classements
        </Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Description */}
      <View style={[styles.descriptionCard, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border }]}>
        <Ionicons name="information-circle-outline" size={20} color={theme.colors.accent} style={{ marginRight: 10 }} />
        <Text style={[styles.descriptionText, { color: theme.colors.textSecondary }]}>
          Compare tes performances avec la communauté ! Filtre par catégorie et période pour voir où tu te situes.
        </Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              {
                backgroundColor:
                  activeTab === tab.key ? theme.colors.accent : theme.colors.surfaceMuted,
              },
            ]}
            onPress={() => handleTabChange(tab.key)}
          >
            <Ionicons
              name={tab.icon as any}
              size={18}
              color={activeTab === tab.key ? '#FFF' : theme.colors.textSecondary}
            />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === tab.key ? '#FFF' : theme.colors.textSecondary },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Période (seulement pour volume et sessions) */}
      {(activeTab === 'volume' || activeTab === 'sessions') && (
        <View style={styles.periodContainer}>
          {PERIODS.map((period) => (
            <TouchableOpacity
              key={period.key}
              style={[
                styles.periodChip,
                {
                  backgroundColor:
                    activePeriod === period.key
                      ? theme.colors.accent + '20'
                      : 'transparent',
                  borderColor:
                    activePeriod === period.key
                      ? theme.colors.accent
                      : theme.colors.border,
                },
              ]}
              onPress={() => handlePeriodChange(period.key)}
            >
              <Text
                style={{
                  color:
                    activePeriod === period.key
                      ? theme.colors.accent
                      : theme.colors.textSecondary,
                  fontWeight: activePeriod === period.key ? '600' : '400',
                  fontSize: 13,
                }}
              >
                {period.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Mon rang */}
      {data?.my_rank && (
        <View
          style={[
            styles.myRankBanner,
            { backgroundColor: theme.colors.accent + '15', borderColor: theme.colors.accent },
          ]}
        >
          <Ionicons name="medal" size={20} color={theme.colors.accent} />
          <Text style={[styles.myRankText, { color: theme.colors.accent }]}>
            Tu es #{data.my_rank} au classement !
          </Text>
        </View>
      )}

      {/* Liste */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      ) : (
        <FlatList
          data={data?.entries || []}
          renderItem={renderEntry}
          keyExtractor={(item) => item.user_id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadLeaderboard();
              }}
              tintColor={theme.colors.accent}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="trophy-outline" size={64} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
                Pas encore de classement
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                Partage tes séances pour apparaître ici !
              </Text>
            </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 28,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  descriptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  descriptionText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  periodContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  periodChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  myRankBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  myRankText: {
    fontSize: 15,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  rankContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 16,
    fontWeight: '700',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  score: {
    fontSize: 18,
    fontWeight: '700',
  },
  scoreLabel: {
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    gap: 12,
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


