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
// PRIVATE HELPER FUNCTIONS
// ============================================

/**
 * Validate profile structure matches expected schema
 * @param {Object} profile - Profile object to validate
 * @returns {boolean} - true if valid structure
 */
function validateProfile(profile) {
  if (!profile || typeof profile !== 'object') return false;
  if (profile.version !== PROFILE_VERSION) return false;
  if (!profile.profile || typeof profile.profile !== 'object') return false;
  
  // Validate top-level sections exist
  const requiredSections = ['personal', 'education', 'experience', 'links', 'documents'];
  for (const section of requiredSections) {
    if (!profile.profile[section] || typeof profile.profile[section] !== 'object') {
      return false;
    }
  }
  
  // Validate metadata exists
  if (!profile.metadata || typeof profile.metadata !== 'object') return false;
  
  return true;
}

/**
 * Calculate size of encrypted profile data in bytes
 * @param {Object} encryptedData - Encrypted profile { salt, iv, ciphertext }
 * @returns {number} - Size in bytes
 */
function calculateProfileSize(encryptedData) {
  const jsonString = JSON.stringify(encryptedData);
  return new Blob([jsonString]).size;
}

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

/**
 * Create empty profile structure with default values
 * @returns {Object} - Empty profile with version 1.0 schema
 */
export function initializeProfile() {
  return {
    version: PROFILE_VERSION,
    profile: {
      personal: {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        country: ''
      },
      education: {
        degree: '',
        major: '',
        university: '',
        graduationYear: '',
        gpa: ''
      },
      experience: {
        currentRole: '',
        currentCompany: '',
        yearsOfExperience: '',
        skills: []
      },
      links: {
        linkedin: '',
        github: '',
        portfolio: '',
        website: ''
      },
      documents: {
        resume: null
      }
    },
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  };
}

/**
 * Save encrypted profile to chrome.storage.local
 * @param {Object} profile - Profile object to save
 * @param {string} password - Encryption password
 * @returns {Promise<void>} - Resolves on success
 * @throws {Error} - If save fails, quota exceeded, or invalid profile
 */
export async function saveProfile(profile, password) {
  // Check Chrome Storage API availability
  if (!isChromeStorageAvailable()) {
    throw new Error('Chrome Storage API is not available');
  }

  // Validate profile structure
  if (!validateProfile(profile)) {
    throw new Error('Invalid profile structure');
  }

  // Update metadata timestamp
  const profileToSave = {
    ...profile,
    metadata: {
      ...profile.metadata,
      updatedAt: new Date().toISOString()
    }
  };

  // Encrypt profile
  let encryptedData;
  try {
    encryptedData = await encrypt(profileToSave, password);
  } catch (error) {
    // Propagate encryption errors
    throw error;
  }

  // Calculate and validate size
  const sizeInBytes = calculateProfileSize(encryptedData);
  if (sizeInBytes > MAX_RECOMMENDED_SIZE) {
    throw new Error(
      `Profile size (${(sizeInBytes / 1024 / 1024).toFixed(2)}MB) exceeds recommended limit (5MB). Consider reducing resume size.`
    );
  }

  // Save to chrome.storage.local
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: encryptedData });
  } catch (error) {
    // Handle quota exceeded error
    if (error.message && error.message.includes('QUOTA_EXCEEDED')) {
      throw new Error('Storage quota exceeded - reduce profile size');
    }
    throw new Error(`Failed to save profile: ${error.message}`);
  }
}

/**
 * Load and decrypt profile from chrome.storage.local
 * @param {string} password - Decryption password
 * @returns {Promise<Object|null>} - Decrypted profile or null if none exists
 * @throws {Error} - If decryption fails or wrong password
 */
export async function loadProfile(password) {
  // Check Chrome Storage API availability
  if (!isChromeStorageAvailable()) {
    throw new Error('Chrome Storage API is not available');
  }

  // Retrieve encrypted data from storage
  let result;
  try {
    result = await chrome.storage.local.get(STORAGE_KEY);
  } catch (error) {
    throw new Error(`Failed to load profile: ${error.message}`);
  }

  // Check if profile exists
  const encryptedData = result[STORAGE_KEY];
  if (!encryptedData) {
    return null; // No profile stored (first use)
  }

  // Decrypt profile
  let profile;
  try {
    profile = await decrypt(encryptedData, password);
  } catch (error) {
    // Propagate decryption errors (wrong password or corrupted data)
    throw error;
  }

  // Validate decrypted profile structure
  if (!validateProfile(profile)) {
    throw new Error('Stored profile data is corrupted');
  }

  return profile;
}
