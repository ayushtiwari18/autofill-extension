/**
 * Encryption Utilities Module
 * Provides AES-GCM encryption/decryption using Web Crypto API
 * with PBKDF2 key derivation for secure profile data storage
 */

// ============================================
// CONSTANTS
// ============================================
const PBKDF2_ITERATIONS = 100000; // OWASP recommended minimum
const SALT_LENGTH = 16;           // 128 bits
const IV_LENGTH = 12;             // 96 bits (optimal for AES-GCM)
const KEY_LENGTH = 256;           // 256 bits

// ============================================
// PRIVATE HELPER FUNCTIONS
// ============================================

/**
 * Convert ArrayBuffer to base64 string
 * @param {ArrayBuffer} buffer - Binary data to encode
 * @returns {string} - Base64 encoded string
 */
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string to ArrayBuffer
 * @param {string} base64 - Base64 encoded string
 * @returns {ArrayBuffer} - Decoded binary data
 */
function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// ============================================
// PUBLIC API
// ============================================
// Functions will be added in subsequent commits
