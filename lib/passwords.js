import bcrypt from 'bcryptjs';

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export function getPasswordPolicyError(password) {
  if (typeof password !== 'string') return 'Password is required.';
  if (password.length < PASSWORD_MIN_LENGTH) return 'Password must be at least 8 characters long.';
  if (password.length > PASSWORD_MAX_LENGTH) return 'Password cannot exceed 128 characters.';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number.';
  return null;
}

export function isBcryptPasswordHash(value) {
  return typeof value === 'string' && /^\$2[aby]\$\d{2}\$/.test(value);
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(candidate, storedValue) {
  if (typeof candidate !== 'string' || typeof storedValue !== 'string') return false;
  if (isBcryptPasswordHash(storedValue)) {
    return bcrypt.compare(candidate, storedValue);
  }
  // One-time compatibility path for existing accounts created before hashing
  // was introduced. Successful legacy logins are upgraded by the login route.
  return candidate === storedValue;
}
