import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;
const DIGEST = 'sha512';

function getMasterKey(): Buffer {
  const secret = process.env.APP_ENCRYPTION_KEY || process.env.CRON_SECRET;
  if (!secret) {
    throw new Error('APP_ENCRYPTION_KEY or CRON_SECRET must be set for key encryption');
  }
  return crypto.scryptSync(secret, 'systemics-salt', KEY_LENGTH);
}

/**
 * Encrypt a plaintext string (e.g., an API key).
 * Returns a hex string: salt + iv + authTag + ciphertext
 */
export function encrypt(plaintext: string): string {
  const masterKey = getMasterKey();
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);

  const key = crypto.pbkdf2Sync(masterKey, salt, ITERATIONS, KEY_LENGTH, DIGEST);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  const combined = Buffer.concat([salt, iv, authTag, ciphertext]);
  return combined.toString('hex');
}

/**
 * Decrypt a hex string back to plaintext.
 */
export function decrypt(cipherHex: string): string {
  const masterKey = getMasterKey();
  const combined = Buffer.from(cipherHex, 'hex');

  const salt = combined.subarray(0, SALT_LENGTH);
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

  const key = crypto.pbkdf2Sync(masterKey, salt, ITERATIONS, KEY_LENGTH, DIGEST);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return plaintext.toString('utf8');
}
