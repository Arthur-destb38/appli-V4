/**
 * Shared time formatting utilities.
 */

type TFunc = (key: any, params?: Record<string, string | number>) => string;

export function formatTimeAgo(dateString: string, t: TFunc, language: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return t('justNow');
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}${language === 'fr' ? 'j' : 'd'}`;
  return date.toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'short' });
}

export function formatRelativeDate(dateString: string, language: string): string {
  return new Date(dateString).toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
