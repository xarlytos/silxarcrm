import crypto from 'crypto';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Field-level encryption service using AES-256-GCM
 * Supports key rotation via key_id versioning
 *
 * GCM (Galois/Counter Mode) provides authenticated encryption:
 * - Confidentiality (AES-256)
 * - Authenticity (GMAC)
 * - Tamper detection
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 16; // 128 bits
const KEYID_SEPARATOR = '::';

interface EncryptionConfig {
  keyId: string;
  masterKey: string;
}

interface EncryptedData {
  ciphertext: string;
  iv: string;
  authTag: string;
  salt: string;
  keyId: string;
}

interface DecryptedData {
  plaintext: string;
  keyId: string;
}

class EncryptionService {
  private config: EncryptionConfig;
  private derivedKeyCache: Map<string, Buffer> = new Map();

  constructor() {
    const masterKey = process.env.ENCRYPTION_MASTER_KEY;
    const keyId = process.env.ENCRYPTION_KEY_ID || 'default-2024-01';

    if (!masterKey) {
      throw new Error(
        'ENCRYPTION_MASTER_KEY environment variable is required. ' +
        'Generate with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
      );
    }

    this.config = {
      keyId,
      masterKey,
    };
  }

  /**
   * Derive a key from master key using PBKDF2
   * Includes salt to prevent rainbow tables
   */
  private deriveKey(salt: Buffer, keyId: string): Buffer {
    const cacheKey = `${keyId}:${salt.toString('hex')}`;

    if (this.derivedKeyCache.has(cacheKey)) {
      return this.derivedKeyCache.get(cacheKey)!;
    }

    const derived = crypto.pbkdf2Sync(
      this.config.masterKey,
      salt,
      100000, // iterations (NIST recommendation)
      32, // 256 bits for AES-256
      'sha256'
    );

    this.derivedKeyCache.set(cacheKey, derived);
    return derived;
  }

  /**
   * Encrypt plaintext using AES-256-GCM
   * Returns base64-encoded payload with IV, salt, and auth tag
   */
  encrypt(plaintext: string, keyId?: string): EncryptedData {
    if (!plaintext || typeof plaintext !== 'string') {
      throw new Error('Plaintext must be a non-empty string');
    }

    const effectiveKeyId = keyId || this.config.keyId;
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = this.deriveKey(salt, effectiveKeyId);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return {
      ciphertext: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      salt: salt.toString('base64'),
      keyId: effectiveKeyId,
    };
  }

  /**
   * Encrypt and serialize as single string for database storage
   * Format: keyId::ciphertext|iv|salt|authTag (base64-encoded payload)
   */
  encryptToString(plaintext: string, keyId?: string): string {
    const encrypted = this.encrypt(plaintext, keyId);

    const payload = [
      encrypted.ciphertext,
      encrypted.iv,
      encrypted.salt,
      encrypted.authTag,
    ].join('|');

    return `${encrypted.keyId}${KEYID_SEPARATOR}${payload}`;
  }

  /**
   * Decrypt AES-256-GCM encrypted data
   * Verifies authentication tag to detect tampering
   */
  decrypt(encrypted: EncryptedData): string {
    const key = this.deriveKey(Buffer.from(encrypted.salt, 'base64'), encrypted.keyId);
    const iv = Buffer.from(encrypted.iv, 'base64');
    const authTag = Buffer.from(encrypted.authTag, 'base64');
    const ciphertext = Buffer.from(encrypted.ciphertext, 'base64');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    try {
      const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]);
      return decrypted.toString('utf8');
    } catch (error) {
      throw new Error(
        `Decryption failed: authentication tag verification failed. ` +
        `Data may be corrupted or tampered. Key ID: ${encrypted.keyId}`
      );
    }
  }

  /**
   * Decrypt from serialized string format
   */
  decryptFromString(encryptedString: string): DecryptedData {
    const [keyId, payload] = encryptedString.split(KEYID_SEPARATOR);

    if (!payload) {
      throw new Error('Invalid encrypted string format');
    }

    const [ciphertext, iv, salt, authTag] = payload.split('|');

    if (!ciphertext || !iv || !salt || !authTag) {
      throw new Error('Corrupted encrypted data: missing components');
    }

    const decrypted = this.decrypt({
      ciphertext,
      iv,
      authTag,
      salt,
      keyId: keyId || this.config.keyId,
    });

    return {
      plaintext: decrypted,
      keyId,
    };
  }

  /**
   * Encrypt object with multiple PII fields
   * Returns object with encrypted_* fields
   */
  encryptPiiObject<T extends Record<string, any>>(
    data: T,
    piiFields: (keyof T)[],
    keyId?: string
  ): T & Record<string, string> {
    const encrypted = { ...data };
    const effectiveKeyId = keyId || this.config.keyId;

    for (const field of piiFields) {
      const value = data[field];
      if (value && typeof value === 'string') {
        const encryptedField = `encrypted_${String(field)}`;
        encrypted[encryptedField as keyof typeof encrypted] =
          this.encryptToString(value, effectiveKeyId) as any;
      }
    }

    return encrypted;
  }

  /**
   * Decrypt object with encrypted_* fields back to original fields
   */
  decryptPiiObject<T extends Record<string, any>>(
    data: T,
    piiFields: string[]
  ): T & Record<string, string> {
    const decrypted = { ...data };

    for (const field of piiFields) {
      const encryptedField = `encrypted_${field}`;
      const value = data[encryptedField];

      if (value && typeof value === 'string') {
        try {
          const result = this.decryptFromString(value);
          decrypted[field as keyof typeof decrypted] = result.plaintext as any;
        } catch (error) {
          console.error(
            `Failed to decrypt field "${field}":`,
            error instanceof Error ? error.message : error
          );
          // Keep encrypted field, fail gracefully
        }
      }
    }

    return decrypted;
  }

  /**
   * Re-encrypt data with new key (for key rotation)
   */
  reEncrypt(encryptedString: string, newKeyId: string): string {
    const { plaintext } = this.decryptFromString(encryptedString);
    return this.encryptToString(plaintext, newKeyId);
  }

  /**
   * Verify encrypted data integrity without decryption
   * Returns false if tampered
   */
  verifyIntegrity(encryptedString: string): boolean {
    try {
      this.decryptFromString(encryptedString);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get encryption metadata (key version)
   */
  getKeyInfo(encryptedString: string): { keyId: string } {
    const [keyId] = encryptedString.split(KEYID_SEPARATOR);
    return { keyId: keyId || this.config.keyId };
  }

  /**
   * Generate a new master key (run once, store securely)
   */
  static generateMasterKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

// Singleton instance
export const encryptionService = new EncryptionService();

export default EncryptionService;
