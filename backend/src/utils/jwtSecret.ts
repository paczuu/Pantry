import { randomBytes } from 'crypto';
import { readFileSync, writeFileSync } from 'fs';
import { dirname, isAbsolute, join } from 'path';

const DEV_FALLBACK = 'pantry-super-secret-key-change-in-production-2026';

/**
 * Resolves the JWT signing secret once at start-up.
 *
 * 1. `JWT_SECRET` from the environment always wins.
 * 2. With an absolute SQLite path (the Docker setup) a random secret is generated on first start and kept next to
 *    the database, so a fresh install is secure without any configuration and sessions survive restarts and updates.
 * 3. Otherwise (local development with a relative path) the old development default is used.
 */
const resolveJwtSecret = (): string => {
  const fromEnv = process.env.JWT_SECRET?.trim();
  if (fromEnv) return fromEnv;

  const dbUrl = (process.env.DATABASE_URL ?? '').split('?')[0];
  const dbPath = dbUrl.startsWith('file:') ? dbUrl.slice('file:'.length) : '';
  if (!dbPath || !isAbsolute(dbPath)) return DEV_FALLBACK;

  const secretFile = join(dirname(dbPath), '.jwt_secret');
  try {
    const saved = readFileSync(secretFile, 'utf8').trim();
    if (saved) return saved;
  } catch {
    // not created yet
  }

  const generated = randomBytes(48).toString('hex');
  try {
    writeFileSync(secretFile, generated, { mode: 0o600 });
  } catch (error) {
    console.warn('Could not persist the generated JWT secret; sessions will reset on restart:', error);
  }
  return generated;
};

export const JWT_SECRET = resolveJwtSecret();
