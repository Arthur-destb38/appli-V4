import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useAppTheme } from '@/theme/ThemeProvider';

interface LikeButtonProps {
  liked: boolean;
  likeCount: number;
  onToggle: () => Promise<void>;
  size?: 'small' | 'medium' | 'large';
}

export const LikeButton: React.FC<LikeButtonProps> = ({
  liked,
  likeCount,
  onToggle,
  size = 'medium',
}) => {
  const { theme } = useAppTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [isAnimating, setIsAnimating] = useState(false);

  const iconSize = size === 'small' ? 20 : size === 'medium' ? 24 : 28;
  const fontSize = size === 'small' ? 12 : size === 'medium' ? 14 : 16;

  const handlePress = async () => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    
    // Animation de scale (bounce)
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.7,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        tension: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Haptic feedback
    if (!liked) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else {
      Haptics.selectionAsync().catch(() => {});
    }

    try {
      await onToggle();
    } finally {
      setIsAnimating(false);
    }
  };

  return (
    <Pressable onPress={handlePress} style={styles.container}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Ionicons
          name={liked ? 'heart' : 'heart-outline'}
          size={iconSize}
          color={liked ? '#FF3B5C' : theme.colors.textSecondary}
        />
      </Animated.View>
      {likeCount > 0 && (
        <Text style={[styles.count, { color: theme.colors.textSecondary, fontSize }]}>
          {likeCount}
        </Text>
      )}
    </Pressable>
  );
};

// Composant pour l'animation double-tap (coeur qui apparaît au centre)
interface DoubleTapHeartProps {
  visible: boolean;
  onAnimationEnd: () => void;
}

export const DoubleTapHeart: React.FC<DoubleTapHeartProps> = ({ visible, onAnimationEnd }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Animation d'apparition
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 3,
          tension: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Attendre puis disparaître
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(scaleAnim, {
              toValue: 1.5,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ]).start(() => {
            scaleAnim.setValue(0);
            onAnimationEnd();
          });
        }, 400);
      });
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.doubleTapHeart,
        {
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
        },
      ]}
      pointerEvents="none"
    >
      <Ionicons name="heart" size={100} color="#FF3B5C" />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  count: {
    fontWeight: '600',
  },
  doubleTapHeart: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -50,
    marginLeft: -50,
    zIndex: 100,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
});




