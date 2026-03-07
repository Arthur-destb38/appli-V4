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
import { useAuth } from '@/hooks/useAuth';
import { useTranslations } from '@/hooks/usePreferences';
import {
  listMessages,
  sendMessage,
  markConversationAsRead,
  MessageRead,
} from '@/services/messagingApi';
import { getProfile } from '@/services/profileApi';

function WorkoutMessageCard({ content, isMe, theme, router, t }: { content: string; isMe: boolean; theme: any; router: any; t: (key: string) => string }) {
  const shareMatch = content.match(/\[share:(sh_[^\]]+)\]/);
  const extractedShareId = shareMatch ? shareMatch[1] : null;

  return (
    <View>
      <View style={styles.workoutCardHeader}>
        <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.workoutIcon}>
          <Ionicons name="barbell" size={16} color="#fff" />
        </LinearGradient>
        <Text style={[styles.workoutCardTitle, { color: isMe ? '#fff' : theme.colors.textPrimary }]} numberOfLines={2}>
          {content.split('"')[1] || t('workoutFallback')}
        </Text>
      </View>
      {content.includes('•') && (
        <View style={[styles.workoutDetails, { borderTopColor: isMe ? 'rgba(255,255,255,0.15)' : theme.colors.border }]}>
          {content.split('\n').filter((l: string) => l.trim().startsWith('•')).map((line: string, i: number) => (
            <Text key={i} style={[styles.workoutExercise, { color: isMe ? 'rgba(255,255,255,0.9)' : theme.colors.textSecondary }]}>
              {line.trim()}
            </Text>
          ))}
        </View>
      )}
      <Text style={[styles.workoutBy, { color: isMe ? 'rgba(255,255,255,0.6)' : theme.colors.textSecondary }]}>
        par {content.split(' par ')[1]?.split('\n')[0]?.replace(/\[share:.*\]/, '').trim() || ''}
      </Text>
      {extractedShareId && (
        <Pressable
          style={[styles.viewWorkoutBtn, { backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : theme.colors.primary + '15' }]}
          onPress={() => router.push(`/shared-workout/${extractedShareId}`)}
        >
          <Ionicons name="eye-outline" size={15} color={isMe ? '#fff' : theme.colors.primary} />
          <Text style={[styles.viewWorkoutText, { color: isMe ? '#fff' : theme.colors.primary }]}>
            {t('viewWorkout')}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={isMe ? 'rgba(255,255,255,0.7)' : theme.colors.primary} />
        </Pressable>
      )}
    </View>
  );
}

export default function ChatScreen() {
  const { theme, mode } = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id: conversationId, participantId } = useLocalSearchParams<{
    id: string;
    participantId: string;
  }>();
  const { user } = useAuth();
  const { t, language } = useTranslations();

  const [messages, setMessages] = useState<MessageRead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [inputText, setInputText] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [participantAvatar, setParticipantAvatar] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);
  const headerAnim = useRef(new Animated.Value(0)).current;

  const isDark = mode === 'dark';

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

  const loadMessages = useCallback(async () => {
    if (!conversationId || !user?.id) return;
    try {
      const response = await listMessages(conversationId, user!.id);
      setMessages(response.messages);
      await markConversationAsRead(conversationId, user!.id);
    } catch (error) {
      console.warn('Failed to load messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, user?.id]);

  useEffect(() => {
    loadMessages();
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

  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages.length]);

  const handleSend = async () => {
    if (!inputText.trim() || !conversationId || !user?.id || isSending) return;

    const content = inputText.trim();
    setInputText('');
    setIsSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    try {
      const response = await sendMessage(conversationId, user!.id, content);
      setMessages((prev) => [...prev, response.message]);
    } catch (error) {
      console.warn('Failed to send message:', error);
      setInputText(content);
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString(language === 'fr' ? 'fr-FR' : 'en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return t('today');
    if (date.toDateString() === yesterday.toDateString()) return t('yesterday');
    return date.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const groupedMessages = messages.reduce((groups, message) => {
    const date = new Date(message.created_at).toDateString();
    if (!groups[date]) groups[date] = [];
    groups[date].push(message);
    return groups;
  }, {} as Record<string, MessageRead[]>);

  const avatarLetter = participantName.charAt(0).toUpperCase();

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: isDark ? '#0a0a0f' : '#f0f0f5' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          {
            backgroundColor: isDark ? '#111118' : '#ffffff',
            borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
            paddingTop: insets.top,
            opacity: headerAnim,
            transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
          },
        ]}
      >
        <View style={styles.headerContent}>
          <Pressable
            style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
          </Pressable>

          <Pressable
            style={styles.headerProfile}
            onPress={() => { if (participantId) router.push(`/profile/${participantId}`); }}
          >
            <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.avatarGradient}>
              <Text style={styles.avatarText}>{avatarLetter}</Text>
            </LinearGradient>
            <View style={styles.headerInfo}>
              <Text style={[styles.headerName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                {participantName || t('loading')}
              </Text>
              <View style={styles.onlineRow}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineText}>{t('onlineStatus')}</Text>
              </View>
            </View>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.moreBtn, { opacity: pressed ? 0.6 : 1 }]}
            onPress={() => Haptics.selectionAsync().catch(() => {})}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={theme.colors.textSecondary} />
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
                <View style={[styles.datePill, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                  <Text style={[styles.dateText, { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)' }]}>
                    {formatDate(msgs[0].created_at)}
                  </Text>
                </View>
              </View>

              {msgs.map((message, index) => {
                const isMe = message.sender_id === user?.id;
                const isFirst = index === 0 || msgs[index - 1]?.sender_id !== message.sender_id;
                const isLast = index === msgs.length - 1 || msgs[index + 1]?.sender_id !== message.sender_id;
                const isWorkout = message.content.startsWith('💪 Séance partagée');

                return (
                  <View
                    key={message.id}
                    style={[
                      styles.messageRow,
                      isMe ? styles.messageRowMe : styles.messageRowOther,
                      { marginTop: isFirst ? 12 : 2 },
                    ]}
                  >
                    {/* Avatar for other's messages */}
                    {!isMe && isLast ? (
                      <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.messageAvatar}>
                        <Text style={styles.messageAvatarText}>{avatarLetter}</Text>
                      </LinearGradient>
                    ) : !isMe ? (
                      <View style={styles.messageAvatarPlaceholder} />
                    ) : null}

                    <View style={styles.messageBubbleContainer}>
                      {isWorkout ? (
                        <View
                          style={[
                            styles.workoutBubble,
                            isMe
                              ? { backgroundColor: '#6366f1' }
                              : { backgroundColor: isDark ? '#1a1a2e' : '#ffffff', borderColor: isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.15)', borderWidth: 1 },
                            isMe && isLast && styles.bubbleMeLastRadius,
                            !isMe && isLast && styles.bubbleOtherLastRadius,
                          ]}
                        >
                          <WorkoutMessageCard content={message.content} isMe={isMe} theme={theme} router={router} t={t} />
                          <View style={styles.messageFooter}>
                            <Text style={[styles.messageTime, { color: isMe ? 'rgba(255,255,255,0.6)' : theme.colors.textSecondary }]}>
                              {formatTime(message.created_at)}
                            </Text>
                            {isMe && (
                              <Ionicons
                                name={message.read_at ? 'checkmark-done' : 'checkmark'}
                                size={14}
                                color={message.read_at ? '#4ADE80' : 'rgba(255,255,255,0.6)'}
                                style={styles.readIcon}
                              />
                            )}
                          </View>
                        </View>
                      ) : (
                        <View
                          style={[
                            styles.messageBubble,
                            isMe
                              ? { backgroundColor: theme.colors.primary }
                              : { backgroundColor: isDark ? '#18181f' : '#ffffff' },
                            !isMe && !isDark && { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
                            isMe && isLast && styles.bubbleMeLastRadius,
                            !isMe && isLast && styles.bubbleOtherLastRadius,
                          ]}
                        >
                          <View style={styles.messageInline}>
                            <View style={styles.messageTextWrap}>
                              <Text style={[styles.messageText, { color: isMe ? '#FFFFFF' : theme.colors.textPrimary }]}>
                                {message.content}
                              </Text>
                            </View>
                            <View style={styles.messageTimeBadge}>
                              <Text style={[styles.messageTime, { color: isMe ? 'rgba(255,255,255,0.55)' : theme.colors.textSecondary }]}>
                                {formatTime(message.created_at)}
                              </Text>
                              {isMe && (
                                <Ionicons
                                  name={message.read_at ? 'checkmark-done' : 'checkmark'}
                                  size={13}
                                  color={message.read_at ? '#4ADE80' : 'rgba(255,255,255,0.55)'}
                                />
                              )}
                            </View>
                          </View>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          ))}

          {messages.length === 0 && (
            <View style={styles.emptyChat}>
              <View style={[styles.emptyChatIcon, { backgroundColor: theme.colors.primary + '15' }]}>
                <Ionicons name="chatbubble-ellipses-outline" size={36} color={theme.colors.primary} />
              </View>
              <Text style={[styles.emptyChatTitle, { color: theme.colors.textPrimary }]}>
                {t('startConversation')}
              </Text>
              <Text style={[styles.emptyChatSub, { color: theme.colors.textSecondary }]}>
                {t('sendFirstMessageTo', { name: participantName || t('defaultUser') })}
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
            backgroundColor: isDark ? '#111118' : '#ffffff',
            borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
            paddingBottom: insets.bottom + 8,
          },
        ]}
      >
        <View style={[styles.inputWrapper, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f0f0f5', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'transparent' }]}>
          <TextInput
            style={[styles.input, { color: theme.colors.textPrimary }]}
            placeholder={t('writeMessage')}
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
            { opacity: pressed && inputText.trim() ? 0.8 : 1 },
          ]}
          onPress={handleSend}
          disabled={!inputText.trim() || isSending}
        >
          <LinearGradient
            colors={inputText.trim() ? ['#6366f1', '#8b5cf6'] : isDark ? ['#1a1a2e', '#1a1a2e'] : ['#e0e0e5', '#e0e0e5']}
            style={styles.sendBtnGradient}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons
                name="arrow-up"
                size={22}
                color={inputText.trim() ? '#FFFFFF' : theme.colors.textSecondary}
              />
            )}
          </LinearGradient>
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
    paddingHorizontal: 8,
    paddingVertical: 10,
    gap: 6,
  },
  backBtn: {
    width: 40,
    height: 40,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  headerInfo: {
    flex: 1,
    gap: 2,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  onlineText: {
    fontSize: 12,
    color: '#22c55e',
    fontWeight: '500',
  },
  moreBtn: {
    width: 40,
    height: 40,
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
    paddingTop: 8,
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 16,
  },
  datePill: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 12,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    maxWidth: '75%',
    marginBottom: 4,
    overflow: 'hidden',
  },
  messageRowMe: {
    alignSelf: 'flex-end',
  },
  messageRowOther: {
    alignSelf: 'flex-start',
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  messageAvatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  messageAvatarPlaceholder: {
    width: 34,
  },
  messageBubbleContainer: {
    flex: 1,
    minWidth: 0,
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    maxWidth: '100%',
    overflow: 'hidden',
  },
  bubbleMeLastRadius: {
    borderBottomRightRadius: 6,
  },
  bubbleOtherLastRadius: {
    borderBottomLeftRadius: 6,
  },
  workoutBubble: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 20,
    minWidth: 240,
    maxWidth: '100%',
    overflow: 'hidden',
  },
  workoutCardHeader: {
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
  workoutCardTitle: {
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
  viewWorkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  viewWorkoutText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  messageInline: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    gap: 6,
    maxWidth: '100%',
  },
  messageTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  messageTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingTop: 2,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 6,
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
    paddingVertical: 80,
    gap: 10,
  },
  emptyChatIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyChatTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptyChatSub: {
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  inputWrapper: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 120,
  },
  input: {
    fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: {
    marginBottom: 2,
  },
  sendBtnGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
