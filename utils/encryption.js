/**
 * AES-256-GCM Encryption/Decryption Utility
 * 
 * Used for securely storing sensitive data like SMTP credentials in the database.
 * Requires ENCRYPTION_KEY environment variable (32-byte hex string).
 * 
 * @example
 * const { encrypt, decrypt } = require('./encryption');
 * 
 * const encrypted = encrypt('my-password');
 * const decrypted = decrypt(encrypted); // 'my-password'
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 16 bytes for AES
const AUTH_TAG_LENGTH = 16; // 16 bytes for GCM auth tag
const SALT_LENGTH = 64; // 64 bytes for key derivation

/**
 * Get encryption key from environment variable
 * @returns {Buffer} 32-byte encryption key
 * @throws {Error} if ENCRYPTION_KEY not configured
 */
function getEncryptionKey() {
    const key = process.env.ENCRYPTION_KEY;
    
    if (!key) {
        throw new Error('ENCRYPTION_KEY environment variable is required for encryption');
    }
    
    // Derive a 32-byte key from the environment variable
    // This allows using any string as the key
    return crypto.scryptSync(key, 'salt', 32);
}

/**
 * Encrypt a string using AES-256-GCM
 * @param {string} text - Plain text to encrypt
 * @returns {string} Encrypted data in format: iv:authTag:encrypted (hex-encoded)
 * @throws {Error} if encryption fails
 */
function encrypt(text) {
    if (!text) {
        return null;
    }
    
    try {
        const key = getEncryptionKey();
        
        // Generate random IV for this encryption
        const iv = crypto.randomBytes(IV_LENGTH);
        
        // Create cipher
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
        
        // Encrypt the text
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        // Get the auth tag
        const authTag = cipher.getAuthTag();
        
        // Return combined string: iv:authTag:encrypted
        return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
        throw new Error(`Encryption failed: ${error.message}`);
    }
}

/**
 * Decrypt a string encrypted with AES-256-GCM
 * @param {string} encryptedData - Encrypted data in format: iv:authTag:encrypted
 * @returns {string} Decrypted plain text
 * @throws {Error} if decryption fails or data is tampered
 */
function decrypt(encryptedData) {
    if (!encryptedData) {
        return null;
    }
    
    try {
        const key = getEncryptionKey();
        
        // Split the combined string
        const parts = encryptedData.split(':');
        if (parts.length !== 3) {
            throw new Error('Invalid encrypted data format');
        }
        
        const iv = Buffer.from(parts[0], 'hex');
        const authTag = Buffer.from(parts[1], 'hex');
        const encrypted = parts[2];
        
        // Create decipher
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        
        // Decrypt the text
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (error) {
        throw new Error(`Decryption failed: ${error.message}`);
    }
}

/**
 * Check if encryption is configured
 * @returns {boolean} True if ENCRYPTION_KEY is set
 */
function isConfigured() {
    return !!process.env.ENCRYPTION_KEY;
}

/**
 * Generate a random encryption key (for initial setup)
 * @returns {string} 64-character hex string (32 bytes)
 */
function generateKey() {
    return crypto.randomBytes(32).toString('hex');
}

module.exports = {
    encrypt,
    decrypt,
    isConfigured,
    generateKey
};
