/**
 * Profile Storage Engine
 * Manages encrypted profile data persistence using chrome.storage.local
 * Integrates with encryption utilities for secure data storage
 */

import { encrypt, decrypt } from '../utils/encryption.js';

// ============================================
// CONSTANTS
// ============================================
const STORAGE_KEY = 'autofill_extension_profile';
const MAX_RECOMMENDED_SIZE = 5 * 1024 * 1024; // 5MB in bytes
const PROFILE_VERSION = '1.0';

// ============================================
// PUBLIC API
// ============================================

/**
 * Check if Chrome Storage API is available
 * @returns {boolean} - true if chrome.storage.local is available
 */
export function isChromeStorageAvailable() {
  return (
    typeof chrome !== 'undefined' &&
    chrome.storage &&
    chrome.storage.local &&
    typeof chrome.storage.local.get === 'function' &&
    typeof chrome.storage.local.set === 'function' &&
    typeof chrome.storage.local.remove === 'function'
  );
}
