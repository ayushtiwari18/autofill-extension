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
