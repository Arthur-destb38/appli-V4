import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { useAppTheme } from '@/theme/ThemeProvider';
import {
  ExploreData,
  TrendingPost,
  SuggestedUser,
  SearchResult,
  getExplore,
  search,
} from '@/services/exploreApi';
import { followUser, unfollowUser } from '@/services/profileApi';

const CURRENT_USER_ID = 'guest-user';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CATEGORIES = [
  { id: 'all', label: 'Tout', icon: 'apps', gradient: ['#667eea', '#764ba2'] },
  { id: 'force', label: 'Force', icon: 'barbell', gradient: ['#f093fb', '#f5576c'] },
  { id: 'cardio', label: 'Cardio', icon: 'heart', gradient: ['#4facfe', '#00f2fe'] },
  { id: 'hypertrophie', label: 'Masse', icon: 'fitness', gradient: ['#43e97b', '#38f9d7'] },
  { id: 'perte', label: 'Perte', icon: 'flame', gradient: ['#fa709a', '#fee140'] },
];

const CHALLENGES = [
  { id: '1', title: '100 pompes', desc: '100 pompes en 1 jour', participants: 234, icon: '💪', gradient: ['#f093fb', '#f5576c'], category: 'force' },
  { id: '2', title: 'Défi 7 jours', desc: '7 séances en 7 jours', participants: 156, icon: '🔥', gradient: ['#667eea', '#764ba2'], category: 'all' },
  { id: '3', title: 'PR Squad', desc: 'Bats ton PR squat', participants: 89, icon: '🏆', gradient: ['#4facfe', '#00f2fe'], category: 'force' },
];

// Mapping catégories vers mots-clés dans les titres
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  force: ['force', 'squat', 'deadlift', 'bench', 'pr', 'heavy', 'powerlifting', 'chest', 'back', 'leg'],
  cardio: ['cardio', 'hiit', 'run', 'course', 'endurance', 'interval', 'conditioning'],
  hypertrophie: ['hypertrophie', 'masse', 'volume', 'pump', 'bro', 'split', 'arms', 'biceps'],
  perte: ['perte', 'cut', 'lean', 'burn', 'fat', 'circuit', 'full body', 'express'],
};

export default function ExploreScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();

  const [data, setData] = useState<ExploreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState('all');

  const loadExplore = async () => {
    try {
      const exploreData = await getExplore(CURRENT_USER_ID);
      setData(exploreData);
    } catch (error) {
      console.error('Failed to load explore:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadExplore();
  }, []);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults(null);
      return;
    }

    setSearching(true);
    try {
      const results = await search(query.trim());
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleFollow = async (userId: string) => {
    Haptics.selectionAsync().catch(() => {});
    try {
      if (followingIds.has(userId)) {
        await unfollowUser(userId, CURRENT_USER_ID);
        setFollowingIds((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      } else {
        await followUser(userId, CURRENT_USER_ID);
        setFollowingIds((prev) => new Set(prev).add(userId));
      }
    } catch (error) {
      console.error('Follow failed:', error);
    }
  };

  const handleCategoryPress = (catId: string) => {
    Haptics.selectionAsync().catch(() => {});
    setSelectedCategory(catId);
  };

  const handleChallengePress = (challenge: typeof CHALLENGES[0]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    router.push(`/challenge/${challenge.id}` as never);
  };

  // Filtrer les posts par catégorie
  const filteredPosts = React.useMemo(() => {
    if (!data?.trending_posts) return [];
    if (selectedCategory === 'all') return data.trending_posts;
    
    const keywords = CATEGORY_KEYWORDS[selectedCategory] || [];
    return data.trending_posts.filter((post) => {
      const title = post.workout_title.toLowerCase();
      return keywords.some((kw) => title.includes(kw));
    });
  }, [data?.trending_posts, selectedCategory]);

  const renderCategoryChip = (cat: typeof CATEGORIES[0]) => {
    const isSelected = selectedCategory === cat.id;
    return (
      <TouchableOpacity
        key={cat.id}
        onPress={() => handleCategoryPress(cat.id)}
        style={styles.categoryChipWrapper}
      >
        {isSelected ? (
          <LinearGradient
            colors={cat.gradient as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.categoryChip}
          >
            <Ionicons name={cat.icon as any} size={16} color="#fff" />
            <Text style={styles.categoryChipTextActive}>{cat.label}</Text>
          </LinearGradient>
        ) : (
          <View style={[styles.categoryChip, { backgroundColor: theme.colors.surfaceMuted }]}>
            <Ionicons name={cat.icon as any} size={16} color={theme.colors.textSecondary} />
            <Text style={[styles.categoryChipText, { color: theme.colors.textSecondary }]}>
              {cat.label}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderChallengeCard = (challenge: typeof CHALLENGES[0]) => (
    <TouchableOpacity 
      key={challenge.id} 
      style={styles.challengeCard}
      onPress={() => handleChallengePress(challenge)}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={challenge.gradient as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.challengeGradient}
      >
        <Text style={styles.challengeIcon}>{challenge.icon}</Text>
        <View style={styles.challengeContent}>
          <Text style={styles.challengeTitle}>{challenge.title}</Text>
          <Text style={styles.challengeDesc}>{challenge.desc}</Text>
        </View>
        <View style={styles.challengeParticipants}>
          <Ionicons name="people" size={14} color="rgba(255,255,255,0.8)" />
          <Text style={styles.challengeParticipantsText}>{challenge.participants}</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderUserCard = (user: SuggestedUser) => {
    const isFollowing = followingIds.has(user.id);
    return (
      <TouchableOpacity
        key={user.id}
        style={[styles.userCard, { backgroundColor: theme.colors.surface }]}
        onPress={() => router.push(`/profile/${user.id}`)}
      >
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.userAvatarGradient}
        >
          <View style={[styles.userAvatar, { backgroundColor: theme.colors.background }]}>
            <Text style={[styles.userAvatarText, { color: theme.colors.accent }]}>
              {user.username.slice(0, 2).toUpperCase()}
            </Text>
          </View>
        </LinearGradient>
        <Text style={[styles.userName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
          {user.username}
        </Text>
        <Text style={[styles.userStats, { color: theme.colors.textSecondary }]}>
          {user.followers_count} abonnés
        </Text>
        <TouchableOpacity
          style={[
            styles.followBtn,
            {
              backgroundColor: isFollowing ? theme.colors.surfaceMuted : theme.colors.accent,
            },
          ]}
          onPress={(e) => {
            e.stopPropagation();
            handleFollow(user.id);
          }}
        >
          <Text
            style={[
              styles.followBtnText,
              { color: isFollowing ? theme.colors.textPrimary : '#FFF' },
            ]}
          >
            {isFollowing ? 'Suivi' : 'Suivre'}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const GRADIENTS = [
    ['#667eea', '#764ba2'],
    ['#f093fb', '#f5576c'],
    ['#4facfe', '#00f2fe'],
    ['#43e97b', '#38f9d7'],
    ['#fa709a', '#fee140'],
    ['#a18cd1', '#fbc2eb'],
  ];

  const renderPostCard = (post: TrendingPost, index: number) => {
    const gradientColors = GRADIENTS[index % GRADIENTS.length];
    const isLarge = index % 5 === 0;
    
    return (
      <TouchableOpacity
        key={post.share_id}
        style={[
          styles.postCard,
          isLarge && styles.postCardLarge,
        ]}
        onPress={() => router.push(`/profile/${post.owner_id}`)}
      >
        <LinearGradient
          colors={gradientColors as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.postGradient}
        >
          <View style={styles.postHeader}>
            <View style={styles.postExercises}>
              <Ionicons name="barbell" size={14} color="rgba(255,255,255,0.9)" />
              <Text style={styles.postExercisesText}>
                {post.exercise_count} exos
              </Text>
            </View>
            <View style={styles.postLikes}>
              <Ionicons name="heart" size={14} color="#fff" />
              <Text style={styles.postLikesText}>{post.like_count}</Text>
            </View>
          </View>
          
          <View style={styles.postContent}>
            <Text style={styles.postTitle} numberOfLines={2}>
              {post.workout_title}
            </Text>
            <View style={styles.postUser}>
              <View style={styles.postUserAvatar}>
                <Text style={styles.postUserAvatarText}>
                  {post.owner_username.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.postUserName} numberOfLines={1}>
                {post.owner_username}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header avec gradient */}
      <LinearGradient
        colors={[theme.colors.accent + '20', 'transparent']}
        style={[styles.headerGradient, { paddingTop: insets.top }]}
      >
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
            Explorer
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
            Découvre des séances inspirantes
          </Text>
        </View>

        {/* Barre de recherche */}
        <View style={[styles.searchContainer, { backgroundColor: theme.colors.surface }]}>
          <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.textPrimary }]}
            placeholder="Rechercher..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* Catégories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        {CATEGORIES.map(renderCategoryChip)}
      </ScrollView>

      {/* Résultats de recherche */}
      {searchQuery.length >= 2 ? (
        <ScrollView style={styles.searchResults} contentContainerStyle={{ paddingBottom: 100 }}>
          {searching ? (
            <ActivityIndicator style={{ marginTop: 20 }} color={theme.colors.accent} />
          ) : searchResults ? (
            <>
              {searchResults.users.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                    Utilisateurs
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {searchResults.users.map(renderUserCard)}
                  </ScrollView>
                </View>
              )}
              {searchResults.posts.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                    Séances
                  </Text>
                  <View style={styles.postsGrid}>
                    {searchResults.posts.map((post, i) => renderPostCard(post, i))}
                  </View>
                </View>
              )}
              {searchResults.users.length === 0 && searchResults.posts.length === 0 && (
                <View style={styles.noResults}>
                  <Ionicons name="search-outline" size={48} color={theme.colors.textSecondary} />
                  <Text style={[styles.noResultsText, { color: theme.colors.textSecondary }]}>
                    Aucun résultat pour "{searchQuery}"
                  </Text>
                </View>
              )}
            </>
          ) : null}
        </ScrollView>
      ) : (
        /* Contenu Explore */
        <ScrollView
          style={styles.content}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadExplore();
              }}
              tintColor={theme.colors.accent}
            />
          }
        >
          {/* Défis */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                🎯 Défis du moment
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.challengesScroll}>
              {CHALLENGES.map(renderChallengeCard)}
            </ScrollView>
          </View>

          {/* Suggestions d'utilisateurs */}
          {data?.suggested_users && data.suggested_users.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                  ✨ À découvrir
                </Text>
                <TouchableOpacity>
                  <Text style={[styles.seeAll, { color: theme.colors.accent }]}>
                    Voir tout
                  </Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.usersScroll}>
                {data.suggested_users.map(renderUserCard)}
              </ScrollView>
            </View>
          )}

          {/* Posts trending (filtrés par catégorie) */}
          {filteredPosts.length > 0 ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary, paddingHorizontal: 16 }]}>
                {selectedCategory === 'all' ? '🔥 Tendances' : `🔥 ${CATEGORIES.find(c => c.id === selectedCategory)?.label || 'Tendances'}`}
              </Text>
              <View style={styles.postsGrid}>
                {filteredPosts.map((post, i) => renderPostCard(post, i))}
              </View>
            </View>
          ) : selectedCategory !== 'all' && (
            <View style={styles.noResultsCategory}>
              <Ionicons name="search-outline" size={40} color={theme.colors.textSecondary} />
              <Text style={[styles.noResultsCategoryText, { color: theme.colors.textSecondary }]}>
                Aucune séance "{CATEGORIES.find(c => c.id === selectedCategory)?.label}" pour le moment
              </Text>
              <TouchableOpacity 
                style={[styles.resetFilterBtn, { backgroundColor: theme.colors.accent }]}
                onPress={() => setSelectedCategory('all')}
              >
                <Text style={styles.resetFilterBtnText}>Voir tout</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* État vide */}
          {(!data?.trending_posts || data.trending_posts.length === 0) &&
           (!data?.suggested_users || data.suggested_users.length === 0) && (
            <View style={styles.emptyState}>
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.emptyIconBg}
              >
                <Ionicons name="compass" size={40} color="#fff" />
              </LinearGradient>
              <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
                Rien à explorer pour le moment
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                Les séances partagées par la communauté apparaîtront ici
              </Text>
            </View>
          )}
        </ScrollView>
      )}
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
  headerGradient: {
    paddingBottom: 16,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  categoriesContainer: {
    maxHeight: 50,
    marginBottom: 8,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChipWrapper: {
    marginRight: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  categoryChipTextActive: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  searchResults: {
    flex: 1,
    paddingHorizontal: 16,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
  },
  challengesScroll: {
    paddingLeft: 16,
  },
  challengeCard: {
    marginRight: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  challengeGradient: {
    width: 160,
    height: 100,
    padding: 14,
    justifyContent: 'space-between',
  },
  challengeIcon: {
    fontSize: 24,
  },
  challengeContent: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  challengeTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  challengeDesc: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  challengeParticipants: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    position: 'absolute',
    top: 12,
    right: 12,
  },
  challengeParticipantsText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  usersScroll: {
    paddingLeft: 16,
  },
  userCard: {
    width: 130,
    padding: 16,
    marginRight: 12,
    borderRadius: 20,
    alignItems: 'center',
    gap: 8,
  },
  userAvatarGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    padding: 2,
  },
  userAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontSize: 20,
    fontWeight: '700',
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  userStats: {
    fontSize: 12,
  },
  followBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 4,
  },
  followBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 10,
  },
  postCard: {
    width: (SCREEN_WIDTH - 44) / 2,
    borderRadius: 16,
    overflow: 'hidden',
  },
  postCardLarge: {
    width: SCREEN_WIDTH - 24,
  },
  postGradient: {
    aspectRatio: 1.2,
    padding: 14,
    justifyContent: 'space-between',
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  postExercises: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  postExercisesText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  postLikes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  postLikesText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
  },
  postContent: {
    gap: 8,
  },
  postTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  postUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  postUserAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postUserAvatarText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  postUserName: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
    flex: 1,
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  noResultsText: {
    fontSize: 14,
  },
  noResultsCategory: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 32,
    gap: 12,
  },
  noResultsCategoryText: {
    fontSize: 15,
    textAlign: 'center',
  },
  resetFilterBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  resetFilterBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
    gap: 16,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
