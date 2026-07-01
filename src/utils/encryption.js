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

/**
 * Check if Web Crypto API is available in current context
 * @returns {boolean} - true if crypto.subtle is available and functional
 */
export function isWebCryptoAvailable() {
  return (
    typeof window !== 'undefined' &&
    window.crypto &&
    window.crypto.subtle &&
    typeof window.crypto.subtle.encrypt === 'function' &&
    typeof window.crypto.subtle.decrypt === 'function'
  );
}

/**
 * Derive encryption key from password using PBKDF2
 * @param {string} password - User's encryption password
 * @param {Uint8Array} salt - 16-byte salt for key derivation
 * @returns {Promise<CryptoKey>} - Derived AES-GCM key
 * @throws {Error} - If Web Crypto unavailable or derivation fails
 */
export async function deriveKey(password, salt) {
  if (!isWebCryptoAvailable()) {
    throw new Error('Web Crypto API is not available in this browser');
  }

  if (!password || typeof password !== 'string' || password.length === 0) {
    throw new Error('Password cannot be empty');
  }

  if (!(salt instanceof Uint8Array) || salt.length !== SALT_LENGTH) {
    throw new Error(`Salt must be a Uint8Array of ${SALT_LENGTH} bytes`);
  }

  // Convert password string to ArrayBuffer
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  // Import password as CryptoKey for PBKDF2
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  // Derive AES-GCM key using PBKDF2
  const key = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    baseKey,
    {
      name: 'AES-GCM',
      length: KEY_LENGTH
    },
    false,
    ['encrypt', 'decrypt']
  );

  return key;
}

/**
 * Encrypt data object using AES-GCM
 * @param {Object} data - JavaScript object to encrypt (will be JSON stringified)
 * @param {string} password - User's encryption password
 * @returns {Promise<Object>} - Object with { salt, iv, ciphertext } in base64
 * @throws {Error} - If encryption fails or Web Crypto unavailable
 */
export async function encrypt(data, password) {
  if (!isWebCryptoAvailable()) {
    throw new Error('Web Crypto API is not available in this browser');
  }

  if (!password || typeof password !== 'string' || password.length === 0) {
    throw new Error('Password cannot be empty');
  }

  // Validate data is serializable
  let jsonString;
  try {
    jsonString = JSON.stringify(data);
  } catch (error) {
    throw new Error('Data cannot be serialized to JSON');
  }

  // Generate random salt
  const salt = window.crypto.getRandomValues(new Uint8Array(SALT_LENGTH));

  // Derive encryption key
  const key = await deriveKey(password, salt);

  // Generate random IV
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  // Convert JSON string to ArrayBuffer
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(jsonString);

  // Encrypt using AES-GCM
  let ciphertext;
  try {
    ciphertext = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      dataBuffer
    );
  } catch (error) {
    throw new Error('Encryption operation failed');
  }

  // Return encrypted data with salt and IV in base64
  return {
    salt: arrayBufferToBase64(salt),
    iv: arrayBufferToBase64(iv),
    ciphertext: arrayBufferToBase64(ciphertext)
  };
}

/**
 * Decrypt encrypted data object using AES-GCM
 * @param {Object} encryptedData - Object with { salt, iv, ciphertext } in base64
 * @param {string} password - User's encryption password
 * @returns {Promise<Object>} - Decrypted JavaScript object
 * @throws {Error} - If decryption fails, wrong password, or corrupted data
 */
export async function decrypt(encryptedData, password) {
  if (!isWebCryptoAvailable()) {
    throw new Error('Web Crypto API is not available in this browser');
  }

  if (!password || typeof password !== 'string' || password.length === 0) {
    throw new Error('Password cannot be empty');
  }

  // Validate encrypted data structure
  if (!encryptedData || typeof encryptedData !== 'object') {
    throw new Error('Invalid encrypted data format');
  }

  if (!encryptedData.salt || !encryptedData.iv || !encryptedData.ciphertext) {
    throw new Error('Invalid encrypted data format - missing required fields');
  }

  // Decode base64 strings to ArrayBuffers
  let salt, iv, ciphertext;
  try {
    salt = new Uint8Array(base64ToArrayBuffer(encryptedData.salt));
    iv = new Uint8Array(base64ToArrayBuffer(encryptedData.iv));
    ciphertext = base64ToArrayBuffer(encryptedData.ciphertext);
  } catch (error) {
    throw new Error('Corrupted encrypted data - invalid base64 encoding');
  }

  // Validate salt and IV lengths
  if (salt.length !== SALT_LENGTH) {
    throw new Error('Corrupted encrypted data - invalid salt length');
  }
  if (iv.length !== IV_LENGTH) {
    throw new Error('Corrupted encrypted data - invalid IV length');
  }

  // Derive key from password and salt
  const key = await deriveKey(password, salt);

  // Decrypt using AES-GCM
  let decryptedBuffer;
  try {
    decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      ciphertext
    );
  } catch (error) {
    throw new Error('Decryption failed - incorrect password or corrupted data');
  }

  // Convert decrypted ArrayBuffer to string
  const decoder = new TextDecoder();
  const jsonString = decoder.decode(decryptedBuffer);

  // Parse JSON back to object
  let data;
  try {
    data = JSON.parse(jsonString);
  } catch (error) {
    throw new Error('Corrupted decrypted data - invalid JSON');
  }

  return data;
}
