/**
 * Centralized color palettes for avatars, gradients, and notification icons.
 * Used across FeedCard, CommentItem, NotificationItem, etc.
 */

export const AVATAR_COLORS: [string, string][] = [
  ['#6366f1', '#8b5cf6'],
  ['#ec4899', '#f43f5e'],
  ['#10b981', '#14b8a6'],
  ['#f59e0b', '#f97316'],
  ['#3b82f6', '#6366f1'],
  ['#8b5cf6', '#a855f7'],
  ['#06b6d4', '#0891b2'],
];

export const WORKOUT_GRADIENTS = [
  { colors: ['#6366f1', '#8b5cf6', '#a855f7'] as [string, string, string], dark: ['#1e1b4b', '#312e81', '#3730a3'] as [string, string, string] },
  { colors: ['#ec4899', '#f43f5e', '#fb7185'] as [string, string, string], dark: ['#500724', '#831843', '#9d174d'] as [string, string, string] },
  { colors: ['#10b981', '#14b8a6', '#2dd4bf'] as [string, string, string], dark: ['#042f2e', '#134e4a', '#115e59'] as [string, string, string] },
  { colors: ['#f59e0b', '#f97316', '#fb923c'] as [string, string, string], dark: ['#451a03', '#7c2d12', '#9a3412'] as [string, string, string] },
  { colors: ['#3b82f6', '#6366f1', '#818cf8'] as [string, string, string], dark: ['#172554', '#1e3a8a', '#1e40af'] as [string, string, string] },
];

export const NOTIFICATION_CONFIGS = {
  like: { icon: 'heart', gradient: ['#ec4899', '#f43f5e'] as [string, string], color: '#ec4899' },
  comment: { icon: 'chatbubble', gradient: ['#6366f1', '#8b5cf6'] as [string, string], color: '#6366f1' },
  follow: { icon: 'person-add', gradient: ['#10b981', '#14b8a6'] as [string, string], color: '#10b981' },
  mention: { icon: 'at', gradient: ['#f59e0b', '#f97316'] as [string, string], color: '#f59e0b' },
  default: { icon: 'notifications', gradient: ['#64748b', '#94a3b8'] as [string, string], color: '#64748b' },
} as const;

// Brand gradient used across the app
export const PRIMARY_GRADIENT: [string, string] = ['#6366f1', '#8b5cf6'];

export function getAvatarGradient(username: string): [string, string] {
  const index = username.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

export function getWorkoutGradient(title: string, isDark: boolean): [string, string, string] {
  const index = (title.charCodeAt(0) + title.length) % WORKOUT_GRADIENTS.length;
  const gradient = WORKOUT_GRADIENTS[index];
  return isDark ? gradient.dark : gradient.colors;
}

export function getNotificationStyle(type: string) {
  return NOTIFICATION_CONFIGS[type as keyof typeof NOTIFICATION_CONFIGS] ?? NOTIFICATION_CONFIGS.default;
}
