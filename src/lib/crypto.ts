import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Get encryption key from environment variable.
 * Throws if ENCRYPTION_KEY not set or invalid length.
 */
function getEncryptionKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
        throw new Error("ENCRYPTION_KEY environment variable not set");
    }

    const keyBuffer = Buffer.from(key, "hex");

    if (keyBuffer.length !== 32) {
        throw new Error("ENCRYPTION_KEY must be 32 bytes (64 hex characters)");
    }

    return keyBuffer;
}

/**
 * Encrypt plaintext string using AES-256-GCM.
 * Returns base64-encoded ciphertext containing IV + encrypted data + auth tag.
 * Returns null if input is null/undefined/empty.
 */
export function encrypt(plaintext: string | null | undefined): string | null {
    if (!plaintext) return null;

    const key = getEncryptionKey();
    const iv = randomBytes(IV_LENGTH);

    const cipher = createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([
        cipher.update(plaintext, "utf8"),
        cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    // Concatenate: IV || encrypted data || auth tag
    const combined = Buffer.concat([iv, encrypted, authTag]);

    return combined.toString("base64");
}

/**
 * Decrypt ciphertext using AES-256-GCM.
 * Throws error if auth tag verification fails (tampered/corrupted data).
 * Returns null if input is null/undefined/empty.
 */
export function decrypt(ciphertext: string | null | undefined): string | null {
    if (!ciphertext) return null;

    const key = getEncryptionKey();
    const combined = Buffer.from(ciphertext, "base64");

    if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH) {
        throw new Error("Decryption failed: ciphertext too short");
    }

    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH, combined.length - AUTH_TAG_LENGTH);

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    try {
        const decrypted = Buffer.concat([
            decipher.update(encrypted),
            decipher.final(),
        ]);
        return decrypted.toString("utf8");
    } catch {
        throw new Error("Decryption failed: data may be corrupted or tampered");
    }
}
