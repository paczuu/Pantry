export type ExpiryStatus = 'expired' | 'warning' | 'ok' | 'none';

/**
 * Wspólna logika oceny terminu ważności.
 * Używana zarówno przez PantryCard, jak i PantryPage (liczniki, grupowanie).
 */
export const getExpiryStatus = (
  expiryDate: string | Date | null | undefined,
  warningDays: number
): ExpiryStatus => {
  if (!expiryDate) return 'none';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const exp = new Date(expiryDate);
  if (isNaN(exp.getTime())) return 'none';

  const warningUntil = new Date(today);
  warningUntil.setDate(warningUntil.getDate() + warningDays);

  if (exp < today) return 'expired';
  if (exp <= warningUntil) return 'warning';
  return 'ok';
};