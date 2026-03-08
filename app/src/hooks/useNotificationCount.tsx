import { useEffect, useState, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { getNotifications } from '@/services/notificationsApi';
import { useAuth } from '@/hooks/useAuth';

const POLL_INTERVAL_MS = 30_000; // 30 seconds

/**
 * Hook that polls for unread notification count.
 * Used to display badges on bell icons and tab bar.
 */
export function useNotificationCount() {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const [unreadCount, setUnreadCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchCount = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await getNotifications(userId, 1);
      setUnreadCount(data.unread_count);
    } catch {
      // Silently fail — don't break the UI for a badge
    }
  }, [userId]);

  useEffect(() => {
    fetchCount();

    intervalRef.current = setInterval(fetchCount, POLL_INTERVAL_MS);

    // Pause polling when app is backgrounded, resume when foregrounded
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        fetchCount();
        if (!intervalRef.current) {
          intervalRef.current = setInterval(fetchCount, POLL_INTERVAL_MS);
        }
      } else {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      subscription.remove();
    };
  }, [fetchCount]);

  return { unreadCount, refresh: fetchCount };
}
