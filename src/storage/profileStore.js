/**
 * Profile Storage
 * Saves/loads profile as plain JSON (no encryption) for now.
 * Encryption can be re-added later as an optional layer.
 */

const STORAGE_KEY = 'autofill_extension_profile';
const PROFILE_VERSION = '1.0';

export function initializeProfile() {
  return {
    version: PROFILE_VERSION,
    profile: {
      personal: { firstName: '', lastName: '', email: '', phone: '', address: '', city: '', state: '', zipCode: '', country: '' },
      education: { degree: '', major: '', university: '', graduationYear: '', gpa: '' },
      experience: { currentRole: '', currentCompany: '', yearsOfExperience: '', skills: [] },
      links: { linkedin: '', github: '', portfolio: '', website: '' },
      documents: { resume: null }
    },
    metadata: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  };
}

function validateProfile(profile) {
  if (!profile || typeof profile !== 'object') return false;
  if (!profile.profile || typeof profile.profile !== 'object') return false;
  const required = ['personal', 'education', 'experience', 'links', 'documents'];
  return required.every(s => profile.profile[s] && typeof profile.profile[s] === 'object');
}

export async function saveProfile(profile) {
  if (!validateProfile(profile)) throw new Error('Invalid profile structure');
  const toSave = { ...profile, metadata: { ...profile.metadata, updatedAt: new Date().toISOString() } };
  await chrome.storage.local.set({ [STORAGE_KEY]: toSave });
}

export async function loadProfile() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const profile = result[STORAGE_KEY];
  if (!profile) return null;
  // Handle old encrypted format gracefully
  if (profile.salt || profile.iv || profile.ciphertext) {
    console.warn('[ProfileStore] Old encrypted profile detected — clearing it.');
    await chrome.storage.local.remove(STORAGE_KEY);
    return null;
  }
  return profile;
}

export async function deleteProfile() {
  await chrome.storage.local.remove(STORAGE_KEY);
}

export async function getStorageUsage() {
  const bytes = await chrome.storage.local.getBytesInUse(null);
  return { bytesInUse: bytes, quotaBytes: 10485760, percentUsed: (bytes / 10485760) * 100 };
}

export function isChromeStorageAvailable() {
  return typeof chrome !== 'undefined' && !!chrome.storage?.local;
}
