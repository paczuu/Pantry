export const DEFAULT_EXPIRY_WARNING_DAYS = 3;

export function clampExpiryWarningDays(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_EXPIRY_WARNING_DAYS;
  return Math.min(90, Math.max(1, Math.round(parsed)));
}

export function formatDayCount(days: number): string {
  return days === 1 ? '1 dzień' : `${days} dni`;
}

export function formatWithinDays(days: number): string {
  if (days === 1) return 'w ciągu 1 dnia';
  return `w ciągu ${days} dni`;
}
