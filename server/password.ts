import { scryptSync, randomBytes, timingSafeEqual } from 'crypto';

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!stored.startsWith('scrypt:')) {
    return password === stored;
  }
  const [, saltHex, hashHex] = stored.split(':');
  const salt = Buffer.from(saltHex, 'hex');
  const hash = scryptSync(password, salt, 64);
  const expected = Buffer.from(hashHex, 'hex');
  try {
    return timingSafeEqual(hash, expected);
  } catch {
    return false;
  }
}
