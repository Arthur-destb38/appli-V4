import React from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';

type Story = {
  id: string;
  title: string;
  username: string;
  avatar: string;
  media: string;
};

type Props = {
  stories: Story[];
  onOpen: (story: Story) => void;
};

export const StoriesCarousel: React.FC<Props> = ({ stories, onOpen }) => {
  if (!stories.length) return null;

  return (
    <View style={styles.container}>
      <FlatList
        data={stories}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <Pressable style={styles.item} onPress={() => onOpen(item)}>
            <View style={styles.avatarBorder}>
              <Image source={{ uri: item.avatar }} style={styles.avatar} />
            </View>
            <Text style={styles.username} numberOfLines={1}>
              {item.username}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  item: {
    alignItems: 'center',
    marginRight: 12,
    width: 70,
  },
  avatarBorder: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2,
    borderColor: '#FF6B70',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  username: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
});
