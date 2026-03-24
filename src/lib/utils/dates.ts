/**
 * Get the most recent Wednesday (the start of the current ad week).
 * If today is Wednesday, returns today.
 */
export function getCurrentWeekStart(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 3=Wed
  const daysToWed = dayOfWeek >= 3 ? dayOfWeek - 3 : dayOfWeek + 4;
  const wed = new Date(now);
  wed.setDate(now.getDate() - daysToWed);
  wed.setHours(0, 0, 0, 0);
  return wed;
}

/**
 * Get the Tuesday following a given Wednesday (end of ad week).
 */
export function getWeekEnd(weekStart: Date): Date {
  const end = new Date(weekStart);
  end.setDate(weekStart.getDate() + 6);
  return end;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function toISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}
