import { prisma } from '../config/prisma.js';

export const DEFAULT_EXPIRY_WARNING_DAYS = 3;

export function clampExpiryWarningDays(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_EXPIRY_WARNING_DAYS;
  return Math.min(90, Math.max(1, Math.round(parsed)));
}

export async function getExpiryWarningDays(householdId: string): Promise<number> {
  const household = await prisma.household.findUnique({
    where: { id: householdId },
    select: { expiryWarningDays: true },
  });

  return clampExpiryWarningDays(household?.expiryWarningDays);
}

export function addDays(from: Date, days: number): Date {
  const next = new Date(from);
  next.setDate(next.getDate() + days);
  return next;
}
