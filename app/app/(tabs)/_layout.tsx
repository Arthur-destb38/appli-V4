import { Tabs } from 'expo-router';
import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/theme/ThemeProvider';
import { useTranslations } from '@/hooks/usePreferences';
import { SimpleAuthGuard } from '@/components/SimpleAuthGuard';

export default function TabLayout() {
  const { theme } = useAppTheme();
  const { t, isLoading } = useTranslations();
  const insets = useSafeAreaInsets();

  // Si les traductions sont en cours de chargement, utiliser les valeurs par défaut
  const getTitle = (key: string, fallback: string) => {
    return isLoading ? fallback : t(key as any);
  };

  return (
    // Pas d'AuthGuard - accès direct
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : 12,
          height: Platform.OS === 'ios' ? 84 : 64,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        },
      }}
    >
        <Tabs.Screen
          name="index"
          options={{
            title: getTitle('home', 'Accueil'),
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons 
                name={focused ? 'home' : 'home-outline'} 
                size={24} 
                color={color} 
              />
            ),
          }}
        />
        <Tabs.Screen
          name="feed"
          options={{
            title: getTitle('feed', 'Réseau'),
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons 
                name={focused ? 'people' : 'people-outline'} 
                size={24} 
                color={color} 
              />
            ),
          }}
        />
        <Tabs.Screen
          name="messages"
          options={{
            title: getTitle('messages', 'Messages'),
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons 
                name={focused ? 'chatbubbles' : 'chatbubbles-outline'} 
                size={24} 
                color={color} 
              />
            ),
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: getTitle('explore', 'Explorer'),
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons 
                name={focused ? 'compass' : 'compass-outline'} 
                size={24} 
                color={color} 
              />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: getTitle('profile', 'Profil'),
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons 
                name={focused ? 'person' : 'person-outline'} 
                size={24} 
                color={color} 
              />
            ),
          }}
        />
      </Tabs>
  );
}
