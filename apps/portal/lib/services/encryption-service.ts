import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // AES GCM recommended IV length
const AUTH_TAG_LENGTH = 16;

/**
 * Get the encryption key from environment variables.
 * The key must be a 64-character hexadecimal string (32 bytes).
 *
 * Generate with: openssl rand -hex 32
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is not set. ' +
        'Generate one with: openssl rand -hex 32'
    );
  }

  if (key.length !== 64) {
    throw new Error(
      'ENCRYPTION_KEY must be exactly 64 hexadecimal characters (32 bytes). ' +
        `Got ${key.length} characters.`
    );
  }

  if (!/^[0-9a-fA-F]+$/.test(key)) {
    throw new Error('ENCRYPTION_KEY must contain only hexadecimal characters.');
  }

  return Buffer.from(key, 'hex');
}

/**
 * Encrypt plaintext using AES-256-GCM.
 *
 * Returns a string in the format: iv:authTag:ciphertext (all hex-encoded)
 *
 * @param plaintext - The string to encrypt
 * @returns Encrypted string with IV and auth tag prepended
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:ciphertext (all hex-encoded)
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt ciphertext that was encrypted with the encrypt function.
 *
 * @param ciphertext - The encrypted string in format iv:authTag:encrypted
 * @returns The decrypted plaintext string
 * @throws Error if decryption fails (invalid key, tampered data, etc.)
 */
export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();

  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw new Error(
      'Invalid ciphertext format. Expected iv:authTag:encrypted'
    );
  }

  const [ivHex, authTagHex, encrypted] = parts;

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  if (iv.length !== IV_LENGTH) {
    throw new Error(`Invalid IV length. Expected ${IV_LENGTH}, got ${iv.length}`);
  }

  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error(
      `Invalid auth tag length. Expected ${AUTH_TAG_LENGTH}, got ${authTag.length}`
    );
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Check if encryption is properly configured.
 * Useful for startup validation.
 *
 * @returns true if encryption key is valid, false otherwise
 */
export function isEncryptionConfigured(): boolean {
  try {
    getEncryptionKey();
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate encryption configuration by performing a roundtrip test.
 *
 * @throws Error if encryption is misconfigured
 */
export function validateEncryptionConfig(): void {
  const testString = 'encryption-validation-test';
  const encrypted = encrypt(testString);
  const decrypted = decrypt(encrypted);

  if (decrypted !== testString) {
    throw new Error('Encryption roundtrip validation failed');
  }
}
