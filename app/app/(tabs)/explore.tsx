import React, { useEffect, useState, useRef, memo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Dimensions,
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
  ExploreData,
  TrendingPost,
  SuggestedUser,
  SearchResult,
  getExplore,
  search,
} from '@/services/exploreApi';
import { followUser, unfollowUser } from '@/services/profileApi';
import { useUserProfile } from '@/hooks/useUserProfile';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CATEGORIES = [
  { id: 'all', label: 'Tout', icon: 'grid', gradient: ['#6366f1', '#8b5cf6'] },
  { id: 'force', label: 'Force', icon: 'barbell', gradient: ['#ef4444', '#dc2626'] },
  { id: 'cardio', label: 'Cardio', icon: 'heart', gradient: ['#ec4899', '#db2777'] },
  { id: 'hypertrophie', label: 'Masse', icon: 'fitness', gradient: ['#10b981', '#059669'] },
  { id: 'perte', label: 'Perte', icon: 'flame', gradient: ['#f59e0b', '#d97706'] },
];

const CHALLENGES = [
  { id: '1', title: '100 pompes', desc: '100 pompes en 1 jour', participants: 234, icon: '💪', gradient: ['#ef4444', '#dc2626'], category: 'force' },
  { id: '2', title: 'Défi 7 jours', desc: '7 séances en 7 jours', participants: 156, icon: '🔥', gradient: ['#6366f1', '#8b5cf6'], category: 'all' },
  { id: '3', title: 'PR Squad', desc: 'Bats ton PR squat', participants: 89, icon: '🏆', gradient: ['#f59e0b', '#d97706'], category: 'force' },
  { id: '4', title: 'Cardio Master', desc: '30min cardio/jour', participants: 178, icon: '❤️', gradient: ['#ec4899', '#db2777'], category: 'cardio' },
];

// Avatar gradients
const AVATAR_GRADIENTS = [
  ['#6366f1', '#8b5cf6'],
  ['#ec4899', '#db2777'],
  ['#10b981', '#059669'],
  ['#f59e0b', '#d97706'],
  ['#ef4444', '#dc2626'],
  ['#06b6d4', '#0891b2'],
];

const POST_GRADIENTS = [
  ['#6366f1', '#8b5cf6'],
  ['#ec4899', '#db2777'],
  ['#10b981', '#059669'],
  ['#f59e0b', '#d97706'],
  ['#ef4444', '#dc2626'],
  ['#06b6d4', '#0891b2'],
];

const getAvatarGradient = (name: string): [string, string] => {
  const index = name.charCodeAt(0) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[index] as [string, string];
};

// ============ SEPARATE COMPONENTS FOR PROPER HOOK USAGE ============

interface ChallengeCardProps {
  challenge: typeof CHALLENGES[0];
  index: number;
  onPress: () => void;
}

const ChallengeCard = memo(({ challenge, index, onPress }: ChallengeCardProps) => {
  const cardAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(cardAnim, {
      toValue: 1,
      delay: index * 100,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
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
        style={({ pressed }) => [styles.challengeCard, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}
        onPress={onPress}
      >
        <LinearGradient
          colors={challenge.gradient as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.challengeGradient}
        >
          <View style={styles.challengeDecor1} />
          <View style={styles.challengeDecor2} />

          <View style={styles.challengeHeader}>
            <View style={styles.challengeIconBox}>
              <Text style={styles.challengeIcon}>{challenge.icon}</Text>
            </View>
            <View style={styles.challengeParticipants}>
              <Ionicons name="people" size={12} color="rgba(255,255,255,0.9)" />
              <Text style={styles.challengeParticipantsText}>{challenge.participants}</Text>
            </View>
          </View>

          <View style={styles.challengeContent}>
            <Text style={styles.challengeTitle}>{challenge.title}</Text>
            <Text style={styles.challengeDesc}>{challenge.desc}</Text>
          </View>

          <View style={styles.challengeJoinBtn}>
            <Text style={styles.challengeJoinText}>Participer</Text>
            <Ionicons name="chevron-forward" size={14} color="#fff" />
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
});

interface UserCardProps {
  user: SuggestedUser;
  index: number;
  isFollowing: boolean;
  onPress: () => void;
  onFollow: () => void;
  theme: any;
}

const UserCard = memo(({ user, index, isFollowing, onPress, onFollow, theme }: UserCardProps) => {
  const avatarGradient = getAvatarGradient(user.username);
  const cardAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(cardAnim, {
      toValue: 1,
      delay: index * 80,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
  }, [index]);

  return (
    <Animated.View
      style={{
        opacity: cardAnim,
        transform: [
          { translateX: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) },
        ],
      }}
    >
      <Pressable
        style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }] }]}
        onPress={onPress}
      >
        <LinearGradient
          colors={avatarGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.userCard}
        >
          {/* Decorative elements */}
          <View style={styles.userCardDecor1} />
          <View style={styles.userCardDecor2} />
          
          {/* Avatar */}
          <View style={styles.userAvatarContainer}>
            <View style={styles.userAvatarRing}>
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>
                  {user.username.slice(0, 2).toUpperCase()}
                </Text>
              </View>
            </View>
          </View>

          {/* User info */}
          <Text style={styles.userName} numberOfLines={1}>
            {user.username}
          </Text>
          <Text style={styles.userStats}>
            {user.followers_count} abonné{user.followers_count > 1 ? 's' : ''}
          </Text>

          {/* Follow button */}
          <Pressable
            style={({ pressed }) => [
              styles.followBtn,
              isFollowing && styles.followBtnFollowing,
              { opacity: pressed ? 0.8 : 1 }
            ]}
            onPress={(e) => {
              e.stopPropagation();
              onFollow();
            }}
          >
            <Ionicons 
              name={isFollowing ? 'checkmark' : 'person-add'} 
              size={14} 
              color={isFollowing ? 'rgba(255,255,255,0.8)' : '#fff'} 
            />
            <Text style={[styles.followBtnText, isFollowing && styles.followBtnTextFollowing]}>
              {isFollowing ? 'Suivi' : 'Suivre'}
            </Text>
          </Pressable>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
});

interface PostCardProps {
  post: TrendingPost;
  index: number;
  onPress: () => void;
  theme: { colors: { surface: string; textPrimary: string; textSecondary: string; border: string } };
}

const PostCard = memo(({ post, index, onPress, theme }: PostCardProps) => {
  const accentColors = POST_GRADIENTS[index % POST_GRADIENTS.length] as [string, string];
  const cardAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(cardAnim, {
      toValue: 1,
      delay: index * 60,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
  }, [index]);

  return (
    <Animated.View
      style={[
        styles.postCard,
        {
          opacity: cardAnim,
          transform: [
            { scale: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
          ],
        },
      ]}
    >
      <Pressable
        style={({ pressed }) => [
          styles.postPressable,
          { backgroundColor: theme.colors.surface, opacity: pressed ? 0.92 : 1 }
        ]}
        onPress={onPress}
      >
        {/* Accent bar (gradient) */}
        <LinearGradient
          colors={accentColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.postAccentBar}
        />
        <View style={styles.postInner}>
          <View style={styles.postHeader}>
            <View style={[styles.postExercises, { backgroundColor: accentColors[0] + '18' }]}>
              <Ionicons name="barbell" size={12} color={accentColors[0]} />
              <Text style={[styles.postExercisesText, { color: accentColors[0] }]}>
                {post.exercise_count} exos
              </Text>
            </View>
            <View style={styles.postLikes}>
              <Ionicons name="heart" size={14} color={theme.colors.textSecondary} />
              <Text style={[styles.postLikesText, { color: theme.colors.textSecondary }]}>
                {post.like_count}
              </Text>
            </View>
          </View>
          <Text style={[styles.postTitle, { color: theme.colors.textPrimary }]} numberOfLines={2}>
            {post.workout_title}
          </Text>
          <View style={styles.postUser}>
            <View style={[styles.postUserAvatar, { backgroundColor: accentColors[0] + '25' }]}>
              <Text style={[styles.postUserAvatarText, { color: accentColors[0] }]}>
                {post.owner_username.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.postUserName, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              @{post.owner_username}
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
});

// ============ END SEPARATE COMPONENTS ============

// Mapping catégories vers mots-clés dans les titres
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  force: ['force', 'squat', 'deadlift', 'bench', 'pr', 'heavy', 'powerlifting', 'chest', 'back', 'leg'],
  cardio: ['cardio', 'hiit', 'run', 'course', 'endurance', 'interval', 'conditioning'],
  hypertrophie: ['hypertrophie', 'masse', 'volume', 'pump', 'bro', 'split', 'arms', 'biceps'],
  perte: ['perte', 'cut', 'lean', 'burn', 'fat', 'circuit', 'full body', 'express'],
};

export default function ExploreScreen() {
  const router = useRouter();
  const { theme, mode } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { profile } = useUserProfile();
  const isDark = mode === 'dark';

  const currentUserId = profile?.id || 'guest-user';

  const [data, setData] = useState<ExploreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchFocused, setSearchFocused] = useState(false);

  // Animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const searchFocusAnim = useRef(new Animated.Value(0)).current;
  const fabAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // FAB pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(fabAnim, {
          toValue: 1.05,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(fabAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleSearchFocus = (focused: boolean) => {
    setSearchFocused(focused);
    Animated.spring(searchFocusAnim, {
      toValue: focused ? 1 : 0,
      useNativeDriver: false,
      tension: 50,
      friction: 8,
    }).start();
  };

  const loadExplore = async () => {
    try {
      const exploreData = await getExplore(currentUserId);
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
  }, [currentUserId]);

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
        await unfollowUser(userId, currentUserId);
        setFollowingIds((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      } else {
        await followUser(userId, currentUserId);
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

  const renderCategoryChip = (cat: typeof CATEGORIES[0], index: number) => {
    const isSelected = selectedCategory === cat.id;
    return (
      <Pressable
        key={cat.id}
        onPress={() => handleCategoryPress(cat.id)}
        style={({ pressed }) => [styles.categoryChipWrapper, { opacity: pressed ? 0.8 : 1 }]}
      >
        <View style={[
          styles.categoryChip,
          isSelected && styles.categoryChipSelected,
          { backgroundColor: isSelected ? 'transparent' : theme.colors.surface }
        ]}>
          {isSelected && (
            <LinearGradient
              colors={cat.gradient as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFillObject}
            />
          )}
          <View style={[
            styles.categoryIconCircle,
            { backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : cat.gradient[0] + '20' }
          ]}>
            <Ionicons
              name={cat.icon as any}
              size={14}
              color={isSelected ? '#fff' : cat.gradient[0]}
            />
          </View>
          <Text style={[
            styles.categoryChipText,
            { color: isSelected ? '#fff' : theme.colors.textPrimary }
          ]}>
            {cat.label}
          </Text>
        </View>
      </Pressable>
    );
  };

  const gradientColors: [string, string, string] = isDark
    ? ['#1a1625', '#151020', '#0f1218']
    : ['#f0f0ff', '#e8e8ff', '#F7F8FA'];

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <LinearGradient
          colors={['#6366f1', '#8b5cf6']}
          style={styles.loadingGradient}
        >
          <ActivityIndicator size="large" color="#fff" />
        </LinearGradient>
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Chargement...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Modern Header */}
      <LinearGradient
        colors={gradientColors}
        style={[styles.headerGradient, { paddingTop: insets.top }]}
      >
        {/* Decorative circles */}
        <View style={[styles.headerDecor1, { backgroundColor: '#6366f110' }]} />
        <View style={[styles.headerDecor2, { backgroundColor: '#8b5cf608' }]} />

        <Animated.View
          style={[
            styles.header,
            {
              opacity: headerAnim,
              transform: [
                { translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) },
              ],
            },
          ]}
        >
          <View style={styles.headerTop}>
            <View>
              <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
                Explorer
              </Text>
              <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
                Découvre des séances inspirantes
              </Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.headerBtn,
                  { backgroundColor: theme.colors.surface, opacity: pressed ? 0.7 : 1 }
                ]}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  router.push('/notifications');
                }}
              >
                <Ionicons name="notifications-outline" size={20} color={theme.colors.textPrimary} />
              </Pressable>
            </View>
          </View>

          {/* Search bar with animation */}
          <Animated.View
            style={[
              styles.searchContainer,
              {
                backgroundColor: theme.colors.surface,
                borderColor: searchFocusAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [theme.colors.border, '#6366f1'],
                }),
                shadowColor: '#6366f1',
                shadowOpacity: searchFocusAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.15],
                }),
              },
            ]}
          >
            <Ionicons name="search" size={18} color={theme.colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.textPrimary }]}
              placeholder="Rechercher des séances, utilisateurs..."
              placeholderTextColor={theme.colors.textSecondary}
              value={searchQuery}
              onChangeText={handleSearch}
              onFocus={() => handleSearchFocus(true)}
              onBlur={() => handleSearchFocus(false)}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => handleSearch('')}>
                <Ionicons name="close-circle" size={18} color={theme.colors.textSecondary} />
              </Pressable>
            )}
          </Animated.View>
        </Animated.View>
      </LinearGradient>

      {/* Categories - horizontal scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        {CATEGORIES.map((cat, index) => renderCategoryChip(cat, index))}
      </ScrollView>

      {/* Search results */}
      {searchQuery.length >= 2 ? (
        <ScrollView style={styles.searchResults} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
          {searching ? (
            <View style={styles.searchingContainer}>
              <ActivityIndicator size="large" color="#6366f1" />
              <Text style={[styles.searchingText, { color: theme.colors.textSecondary }]}>
                Recherche en cours...
              </Text>
            </View>
          ) : searchResults ? (
            <>
              {searchResults.users.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionTitleRow}>
                      <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.sectionIcon}>
                        <Ionicons name="people" size={14} color="#fff" />
                      </LinearGradient>
                      <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                        Utilisateurs
                      </Text>
                    </View>
                    <View style={[styles.sectionBadge, { backgroundColor: '#6366f120' }]}>
                      <Text style={[styles.sectionBadgeText, { color: '#6366f1' }]}>
                        {searchResults.users.length}
                      </Text>
                    </View>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.usersScrollContent}>
                    {searchResults.users.map((user, i) => (
                      <UserCard
                        key={user.id}
                        user={user}
                        index={i}
                        isFollowing={followingIds.has(user.id)}
                        onPress={() => router.push(`/profile/${user.id}`)}
                        onFollow={() => handleFollow(user.id)}
                        theme={theme}
                      />
                    ))}
                  </ScrollView>
                </View>
              )}
              {searchResults.posts.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionTitleRow}>
                      <LinearGradient colors={['#10b981', '#059669']} style={styles.sectionIcon}>
                        <Ionicons name="barbell" size={14} color="#fff" />
                      </LinearGradient>
                      <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                        Séances
                      </Text>
                    </View>
                    <View style={[styles.sectionBadge, { backgroundColor: '#10b98120' }]}>
                      <Text style={[styles.sectionBadgeText, { color: '#10b981' }]}>
                        {searchResults.posts.length}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.postsGrid}>
                    {searchResults.posts.map((post, i) => (
                      <PostCard
                        key={post.share_id}
                        post={post}
                        index={i}
                        onPress={() => router.push(`/profile/${post.owner_id}`)}
                        theme={theme}
                      />
                    ))}
                  </View>
                </View>
              )}
              {searchResults.users.length === 0 && searchResults.posts.length === 0 && (
                <View style={styles.noResults}>
                  <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.noResultsIcon}>
                    <Ionicons name="search" size={32} color="#fff" />
                  </LinearGradient>
                  <Text style={[styles.noResultsTitle, { color: theme.colors.textPrimary }]}>
                    Aucun résultat
                  </Text>
                  <Text style={[styles.noResultsText, { color: theme.colors.textSecondary }]}>
                    Aucun résultat pour &quot;{searchQuery}&quot;
                  </Text>
                </View>
              )}
            </>
          ) : null}
        </ScrollView>
      ) : (
        /* Main Explore content */
        <ScrollView
          style={styles.content}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadExplore();
              }}
              tintColor="#6366f1"
            />
          }
        >
          {/* Challenges section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.sectionIcon}>
                  <Ionicons name="trophy" size={14} color="#fff" />
                </LinearGradient>
                <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                  Défis du moment
                </Text>
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.challengesScrollContent}
            >
              {CHALLENGES.map((challenge, i) => (
                <ChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  index={i}
                  onPress={() => handleChallengePress(challenge)}
                />
              ))}
            </ScrollView>
          </View>

          {/* Suggested users section */}
          {data?.suggested_users && data.suggested_users.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <LinearGradient colors={['#ec4899', '#db2777']} style={styles.sectionIcon}>
                    <Ionicons name="sparkles" size={14} color="#fff" />
                  </LinearGradient>
                  <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                    À découvrir
                  </Text>
                </View>
                <Pressable
                  style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                >
                  <Text style={[styles.seeAll, { color: '#6366f1' }]}>
                    Voir tout
                  </Text>
                </Pressable>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.usersScrollContent}
              >
                {data.suggested_users.map((user, i) => (
                  <UserCard
                    key={user.id}
                    user={user}
                    index={i}
                    isFollowing={followingIds.has(user.id)}
                    onPress={() => router.push(`/profile/${user.id}`)}
                    onFollow={() => handleFollow(user.id)}
                    theme={theme}
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Trending posts section */}
          {filteredPosts.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <LinearGradient colors={['#ef4444', '#dc2626']} style={styles.sectionIcon}>
                    <Ionicons name="flame" size={14} color="#fff" />
                  </LinearGradient>
                  <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                    {selectedCategory === 'all' ? 'Tendances' : CATEGORIES.find(c => c.id === selectedCategory)?.label || 'Tendances'}
                  </Text>
                </View>
                <View style={[styles.sectionBadge, { backgroundColor: '#ef444420' }]}>
                  <Text style={[styles.sectionBadgeText, { color: '#ef4444' }]}>
                    {filteredPosts.length}
                  </Text>
                </View>
              </View>
              <View style={styles.postsGrid}>
                {filteredPosts.map((post, i) => (
                  <PostCard
                    key={post.share_id}
                    post={post}
                    index={i}
                    onPress={() => router.push(`/profile/${post.owner_id}`)}
                    theme={theme}
                  />
                ))}
              </View>
            </View>
          ) : selectedCategory !== 'all' && (
            <View style={styles.noResultsCategory}>
              <LinearGradient
                colors={CATEGORIES.find(c => c.id === selectedCategory)?.gradient as [string, string] || ['#6366f1', '#8b5cf6']}
                style={styles.noResultsCategoryIcon}
              >
                <Ionicons name="search" size={32} color="#fff" />
              </LinearGradient>
              <Text style={[styles.noResultsCategoryTitle, { color: theme.colors.textPrimary }]}>
                Aucune séance trouvée
              </Text>
              <Text style={[styles.noResultsCategoryText, { color: theme.colors.textSecondary }]}>
                Aucune séance &quot;{CATEGORIES.find(c => c.id === selectedCategory)?.label}&quot; pour le moment
              </Text>
              <Pressable
                style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
                onPress={() => setSelectedCategory('all')}
              >
                <LinearGradient
                  colors={['#6366f1', '#8b5cf6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.resetFilterBtn}
                >
                  <Text style={styles.resetFilterBtnText}>Voir tout</Text>
                </LinearGradient>
              </Pressable>
            </View>
          )}

          {/* Empty state */}
          {(!data?.trending_posts || data.trending_posts.length === 0) &&
           (!data?.suggested_users || data.suggested_users.length === 0) && (
            <View style={styles.emptyState}>
              <LinearGradient
                colors={['#6366f1', '#8b5cf6']}
                style={styles.emptyIconBg}
              >
                <Ionicons name="compass" size={48} color="#fff" />
              </LinearGradient>
              <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
                Rien à explorer pour le moment
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                Les séances partagées par la communauté apparaîtront ici
              </Text>
              <Pressable
                style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
                onPress={() => router.push('/create')}
              >
                <LinearGradient
                  colors={['#6366f1', '#8b5cf6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.emptyBtn}
                >
                  <Ionicons name="add" size={20} color="#fff" />
                  <Text style={styles.emptyBtnText}>Créer une séance</Text>
                </LinearGradient>
              </Pressable>
            </View>
          )}
        </ScrollView>
      )}

      {/* Floating Action Button */}
      <Animated.View
        style={[
          styles.fabContainer,
          {
            bottom: insets.bottom + 90,
            transform: [{ scale: fabAnim }],
          },
        ]}
      >
        <Pressable
          style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            router.push('/create');
          }}
        >
          <LinearGradient
            colors={['#6366f1', '#8b5cf6']}
            style={styles.fab}
          >
            <Ionicons name="add" size={28} color="#FFFFFF" />
          </LinearGradient>
        </Pressable>
      </Animated.View>
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
    gap: 20,
  },
  loadingGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '500',
  },
  headerGradient: {
    paddingBottom: 16,
    overflow: 'hidden',
  },
  headerDecor1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  headerDecor2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  header: {
    paddingHorizontal: 16,
    gap: 14,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 10,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    padding: 0,
  },
  categoriesContainer: {
    maxHeight: 56,
    marginBottom: 8,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 8,
  },
  categoryChipWrapper: {
    marginRight: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 8,
    overflow: 'hidden',
  },
  categoryChipSelected: {
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  categoryIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  searchResults: {
    flex: 1,
  },
  searchingContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 16,
  },
  searchingText: {
    fontSize: 14,
    fontWeight: '500',
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
    marginBottom: 14,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  sectionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sectionBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
  },
  challengesScrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  challengeCard: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  challengeGradient: {
    width: 180,
    height: 130,
    padding: 14,
    overflow: 'hidden',
  },
  challengeDecor1: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  challengeDecor2: {
    position: 'absolute',
    bottom: -15,
    left: -15,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  challengeIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  challengeIcon: {
    fontSize: 20,
  },
  challengeParticipants: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  challengeParticipantsText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '700',
  },
  challengeContent: {
    flex: 1,
    justifyContent: 'flex-end',
    gap: 2,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
  },
  challengeDesc: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  challengeJoinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
    marginTop: 8,
  },
  challengeJoinText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  usersScrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  userCard: {
    width: 130,
    height: 160,
    padding: 14,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  userCardDecor1: {
    position: 'absolute',
    top: -25,
    right: -25,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  userCardDecor2: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  userAvatarContainer: {
    alignItems: 'center',
  },
  userAvatarRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 3,
  },
  userAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1f2937',
  },
  userName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  userStats: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
  },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    width: '100%',
  },
  followBtnFollowing: {
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  followBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  followBtnTextFollowing: {
    color: 'rgba(255,255,255,0.8)',
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 10,
  },
  postCard: {
    width: (SCREEN_WIDTH - 44) / 2,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  postPressable: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    flexDirection: 'row',
    minHeight: 120,
  },
  postAccentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  postInner: {
    flex: 1,
    paddingLeft: 12,
    paddingRight: 12,
    paddingVertical: 12,
    justifyContent: 'space-between',
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  postExercises: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  postExercisesText: {
    fontSize: 10,
    fontWeight: '700',
  },
  postLikes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  postLikesText: {
    fontSize: 12,
    fontWeight: '600',
  },
  postTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
    lineHeight: 18,
  },
  postUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  postUserAvatar: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postUserAvatarText: {
    fontSize: 10,
    fontWeight: '800',
  },
  postUserName: {
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
    gap: 16,
  },
  noResultsIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  noResultsTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  noResultsText: {
    fontSize: 14,
    textAlign: 'center',
  },
  noResultsCategory: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
    gap: 12,
  },
  noResultsCategoryIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  noResultsCategoryTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  noResultsCategoryText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  resetFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  resetFilterBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
    gap: 16,
  },
  emptyIconBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  emptyBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  fabContainer: {
    position: 'absolute',
    right: 20,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
});
