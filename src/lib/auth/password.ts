import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const MIN_PASSWORD_LENGTH = 10;
const DEFAULT_N = 16_384;
const DEFAULT_R = 8;
const DEFAULT_P = 1;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;

function validatePasswordRules(password: string): void {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов`);
  }
}

export async function hashPassword(plain: string): Promise<string> {
  validatePasswordRules(plain);

  const salt = randomBytes(SALT_LENGTH);
  const derivedKey = scryptSync(plain, salt, KEY_LENGTH, {
    N: DEFAULT_N,
    r: DEFAULT_R,
    p: DEFAULT_P,
  });

  return `scrypt$${DEFAULT_N}$${DEFAULT_R}$${DEFAULT_P}$${salt.toString('base64')}$${derivedKey.toString('base64')}`;
}

export async function verifyPassword(plain: string, stored: string): Promise<{ ok: boolean; legacy?: boolean }> {
  if (stored.startsWith('$argon2') || stored.startsWith('argon2$')) {
    return { ok: false, legacy: true };
  }

  if (!stored.startsWith('scrypt$')) {
    return { ok: false };
  }

  const parts = stored.split('$');

  if (parts.length !== 6) {
    return { ok: false };
  }

  const [, nRaw, rRaw, pRaw, saltB64, hashB64] = parts;
  const N = Number.parseInt(nRaw, 10);
  const r = Number.parseInt(rRaw, 10);
  const p = Number.parseInt(pRaw, 10);

  if (!Number.isSafeInteger(N) || !Number.isSafeInteger(r) || !Number.isSafeInteger(p)) {
    return { ok: false };
  }

  const salt = Buffer.from(saltB64, 'base64');
  const expectedHash = Buffer.from(hashB64, 'base64');

  if (!salt.length || !expectedHash.length) {
    return { ok: false };
  }

  const derivedKey = scryptSync(plain, salt, expectedHash.length, { N, r, p });

  if (derivedKey.length !== expectedHash.length) {
    return { ok: false };
  }

  return { ok: timingSafeEqual(derivedKey, expectedHash) };
}
