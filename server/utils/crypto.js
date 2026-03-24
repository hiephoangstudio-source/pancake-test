/**
 * AES-256-GCM encryption/decryption for sensitive data (access tokens).
 * Key derived from ENCRYPTION_KEY env variable (or JWT_SECRET as fallback).
 */
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function getKey() {
    const secret = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || '2hstudio_default_key';
    // Derive a 32-byte key from the secret using SHA-256
    return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypt plaintext → "iv:encrypted:authTag" (base64)
 */
export function encrypt(plaintext) {
    if (!plaintext) return '';
    const key = getKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag();
    // Format: iv:encrypted:tag (all base64)
    return `${iv.toString('base64')}:${encrypted}:${authTag.toString('base64')}`;
}

/**
 * Decrypt "iv:encrypted:authTag" → plaintext
 */
export function decrypt(encryptedStr) {
    if (!encryptedStr) return '';
    // Check if it's actually encrypted (has our iv:data:tag format)
    const parts = encryptedStr.split(':');
    if (parts.length !== 3) {
        // Not encrypted (legacy plaintext token), return as-is
        return encryptedStr;
    }
    try {
        const key = getKey();
        const iv = Buffer.from(parts[0], 'base64');
        const encrypted = parts[1];
        const authTag = Buffer.from(parts[2], 'base64');
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encrypted, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (err) {
        // Decryption failed — might be legacy plaintext token
        console.warn('Decrypt failed, treating as plaintext:', err.message);
        return encryptedStr;
    }
}

/**
 * Check if a string looks like it's already encrypted (iv:data:tag format).
 */
export function isEncrypted(str) {
    if (!str) return false;
    const parts = str.split(':');
    return parts.length === 3 && parts[0].length >= 16;
}
