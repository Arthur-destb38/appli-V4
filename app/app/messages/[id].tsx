import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useAppTheme } from '@/theme/ThemeProvider';
import { useUserProfile } from '@/hooks/useUserProfile';
import {
  listMessages,
  sendMessage,
  markConversationAsRead,
  MessageRead,
} from '@/services/messagingApi';
import { getProfile } from '@/services/profileApi';

export default function ChatScreen() {
  const { theme, mode } = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id: conversationId, participantId } = useLocalSearchParams<{
    id: string;
    participantId: string;
  }>();
  const { profile } = useUserProfile();

  const [messages, setMessages] = useState<MessageRead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [inputText, setInputText] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [participantAvatar, setParticipantAvatar] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  const headerAnim = useRef(new Animated.Value(0)).current;

  const isDark = mode === 'dark';

  // Charger les infos du participant
  useEffect(() => {
    if (participantId) {
      getProfile(participantId)
        .then((p) => {
          setParticipantName(p.username);
          setParticipantAvatar(p.avatar_url || null);
        })
        .catch(() => {
          setParticipantName(`User_${participantId.slice(0, 8)}`);
        });
    }
  }, [participantId]);

  // Charger les messages
  const loadMessages = useCallback(async () => {
    if (!conversationId || !profile?.id) return;
    try {
      const response = await listMessages(conversationId, profile.id);
      setMessages(response.messages);
      // Marquer comme lu
      await markConversationAsRead(conversationId, profile.id);
    } catch (error) {
      console.warn('Failed to load messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, profile?.id]);

  useEffect(() => {
    loadMessages();
    // Polling toutes les 3 secondes pour les nouveaux messages
    const interval = setInterval(loadMessages, 3000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [headerAnim]);

  // Scroll automatique vers le bas
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages.length]);

  const handleSend = async () => {
    if (!inputText.trim() || !conversationId || !profile?.id || isSending) return;

    const content = inputText.trim();
    setInputText('');
    setIsSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    try {
      const response = await sendMessage(conversationId, profile.id, content);
      setMessages((prev) => [...prev, response.message]);
    } catch (error) {
      console.warn('Failed to send message:', error);
      setInputText(content); // Restaurer le texte en cas d'erreur
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Aujourd'hui";
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Hier';
    }
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  // Grouper les messages par date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = new Date(message.created_at).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, MessageRead[]>);

  const avatarLetter = participantName.charAt(0).toUpperCase();

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          {
            backgroundColor: theme.colors.surface,
            borderBottomColor: theme.colors.border,
            paddingTop: insets.top,
            opacity: headerAnim,
            transform: [
              { translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) },
            ],
          },
        ]}
      >
        <View style={styles.headerContent}>
          <Pressable
            style={({ pressed }) => [
              styles.backBtn,
              { backgroundColor: theme.colors.surfaceMuted, opacity: pressed ? 0.6 : 1 },
            ]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color={theme.colors.textPrimary} />
          </Pressable>

          <Pressable
            style={styles.headerProfile}
            onPress={() => {
              if (participantId) {
                router.push(`/profile/${participantId}`);
              }
            }}
          >
            <LinearGradient
              colors={['#6366F1', '#8B5CF6']}
              style={styles.avatarGradient}
            >
              <View style={[styles.avatar, { backgroundColor: theme.colors.surface }]}>
                <Text style={[styles.avatarText, { color: theme.colors.primary }]}>
                  {avatarLetter}
                </Text>
              </View>
            </LinearGradient>
            <View style={styles.headerInfo}>
              <Text style={[styles.headerName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                {participantName || 'Chargement...'}
              </Text>
              <Text style={[styles.headerStatus, { color: theme.colors.success }]}>
                En ligne
              </Text>
            </View>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.moreBtn,
              { backgroundColor: theme.colors.surfaceMuted, opacity: pressed ? 0.6 : 1 },
            ]}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              // Options menu
            }}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={theme.colors.textPrimary} />
          </Pressable>
        </View>
      </Animated.View>

      {/* Messages */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={[styles.messagesContent, { paddingBottom: 16 }]}
          showsVerticalScrollIndicator={false}
        >
          {Object.entries(groupedMessages).map(([date, msgs]) => (
            <View key={date}>
              {/* Date separator */}
              <View style={styles.dateSeparator}>
                <View style={[styles.dateLine, { backgroundColor: theme.colors.border }]} />
                <Text style={[styles.dateText, { color: theme.colors.textSecondary, backgroundColor: theme.colors.background }]}>
                  {formatDate(msgs[0].created_at)}
                </Text>
                <View style={[styles.dateLine, { backgroundColor: theme.colors.border }]} />
              </View>

              {/* Messages du jour */}
              {msgs.map((message, index) => {
                const isMe = message.sender_id === profile?.id;
                const showAvatar = !isMe && (index === 0 || msgs[index - 1]?.sender_id !== message.sender_id);

                return (
                  <View
                    key={message.id}
                    style={[
                      styles.messageRow,
                      isMe ? styles.messageRowMe : styles.messageRowOther,
                    ]}
                  >
                    {!isMe && showAvatar && (
                      <View style={[styles.messageAvatar, { backgroundColor: theme.colors.surfaceMuted }]}>
                        <Text style={[styles.messageAvatarText, { color: theme.colors.primary }]}>
                          {avatarLetter}
                        </Text>
                      </View>
                    )}
                    {!isMe && !showAvatar && <View style={styles.messageAvatarPlaceholder} />}

                    <View
                      style={[
                        styles.messageBubble,
                        isMe
                          ? { backgroundColor: theme.colors.primary }
                          : { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: 1 },
                        message.content.startsWith('💪 Séance partagée') && styles.workoutBubble,
                      ]}
                    >
                      {message.content.startsWith('💪 Séance partagée') ? (
                        <View>
                          <View style={styles.workoutHeader}>
                            <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.workoutIcon}>
                              <Ionicons name="barbell" size={16} color="#fff" />
                            </LinearGradient>
                            <Text style={[styles.workoutTitle, { color: isMe ? '#fff' : theme.colors.textPrimary }]}>
                              {message.content.split('"')[1] || 'Séance'}
                            </Text>
                          </View>
                          {message.content.includes('•') && (
                            <View style={[styles.workoutDetails, { borderTopColor: isMe ? 'rgba(255,255,255,0.15)' : theme.colors.border }]}>
                              {message.content.split('\n').filter((l: string) => l.trim().startsWith('•')).map((line: string, i: number) => (
                                <Text key={i} style={[styles.workoutExercise, { color: isMe ? 'rgba(255,255,255,0.9)' : theme.colors.textSecondary }]}>
                                  {line.trim()}
                                </Text>
                              ))}
                            </View>
                          )}
                          <Text style={[styles.workoutBy, { color: isMe ? 'rgba(255,255,255,0.6)' : theme.colors.textSecondary }]}>
                            par {message.content.split(' par ')[1]?.split('\n')[0] || ''}
                          </Text>
                        </View>
                      ) : (
                        <Text
                          style={[
                            styles.messageText,
                            { color: isMe ? '#FFFFFF' : theme.colors.textPrimary },
                          ]}
                        >
                          {message.content}
                        </Text>
                      )}
                      <View style={styles.messageFooter}>
                        <Text
                          style={[
                            styles.messageTime,
                            { color: isMe ? 'rgba(255,255,255,0.7)' : theme.colors.textSecondary },
                          ]}
                        >
                          {formatTime(message.created_at)}
                        </Text>
                        {isMe && (
                          <Ionicons
                            name={message.read_at ? 'checkmark-done' : 'checkmark'}
                            size={14}
                            color={message.read_at ? '#4ADE80' : 'rgba(255,255,255,0.7)'}
                            style={styles.readIcon}
                          />
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ))}

          {messages.length === 0 && (
            <View style={styles.emptyChat}>
              <View style={[styles.emptyChatIcon, { backgroundColor: theme.colors.primary + '20' }]}>
                <Ionicons name="chatbubble-ellipses-outline" size={32} color={theme.colors.primary} />
              </View>
              <Text style={[styles.emptyChatText, { color: theme.colors.textSecondary }]}>
                Envoyez votre premier message !
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Input */}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.border,
            paddingBottom: insets.bottom + 8,
          },
        ]}
      >
        <View style={[styles.inputWrapper, { backgroundColor: theme.colors.surfaceMuted }]}>
          <TextInput
            style={[styles.input, { color: theme.colors.textPrimary }]}
            placeholder="Écrivez un message..."
            placeholderTextColor={theme.colors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={2000}
          />
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.sendBtn,
            {
              backgroundColor: inputText.trim() ? theme.colors.primary : theme.colors.surfaceMuted,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
          onPress={handleSend}
          disabled={!inputText.trim() || isSending}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons
              name="send"
              size={20}
              color={inputText.trim() ? '#FFFFFF' : theme.colors.textSecondary}
            />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerProfile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    padding: 2,
  },
  avatar: {
    flex: 1,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerInfo: {
    flex: 1,
    gap: 2,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  moreBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 12,
    paddingTop: 16,
  },
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dateLine: {
    flex: 1,
    height: 1,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 12,
    textTransform: 'capitalize',
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 8,
    maxWidth: '85%',
  },
  messageRowMe: {
    alignSelf: 'flex-end',
  },
  messageRowOther: {
    alignSelf: 'flex-start',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  messageAvatarText: {
    fontSize: 14,
    fontWeight: '600',
  },
  messageAvatarPlaceholder: {
    width: 40,
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    maxWidth: '100%',
  },
  workoutBubble: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    minWidth: 240,
  },
  workoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  workoutIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  workoutDetails: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    marginBottom: 6,
    gap: 3,
  },
  workoutExercise: {
    fontSize: 13,
    lineHeight: 18,
  },
  workoutBy: {
    fontSize: 12,
    marginTop: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  messageTime: {
    fontSize: 11,
  },
  readIcon: {
    marginLeft: 2,
  },
  emptyChat: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyChatIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyChatText: {
    fontSize: 15,
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 10,
  },
  inputWrapper: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 120,
  },
  input: {
    fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});



