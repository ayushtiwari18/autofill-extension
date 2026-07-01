/**
 * profileStore.js — Profile Storage (IDB-backed)
 * ─────────────────────────────────────────────────────────
 * FIXED: All reads/writes now go through idb.js (IndexedDB).
 * Previously used chrome.storage.local, which was completely separate
 * from the idb.js store that fillRecorder.js and content scripts use.
 * That split meant the profile saved in the popup was never seen by
 * the fill engine. Now there is ONE data source for everything.
 *
 * Public API (unchanged — callers don’t need to change):
 *   initializeProfile()   — returns a blank profile skeleton
 *   saveProfile(profile)  — upserts to IDB
 *   loadProfile()         — reads from IDB, returns null if not set
 *   deleteProfile()       — removes from IDB
 *   hasProfile()          — boolean check
 */

import {
  saveProfile  as idbSave,
  getProfile   as idbGet,
  deleteProfile as idbDelete,
  hasProfile   as idbHas,
} from './idb.js';

export const PROFILE_VERSION = '1.0';

// ──────────────────────────────────────────────────────────
// SHAPE
// ──────────────────────────────────────────────────────────

/**
 * Returns a blank profile with the canonical nested shape.
 * Used by ProfileForm as initial state on first run.
 */
export function initializeProfile() {
  return {
    version: PROFILE_VERSION,
    profile: {
      personal: {
        firstName:   '',
        lastName:    '',
        email:       '',
        phone:       '',
        address:     '',
        city:        '',
        state:       '',
        zipCode:     '',
        country:     '',
      },
      education: {
        degree:         '',
        major:          '',
        university:     '',
        graduationYear: '',
        gpa:            '',
      },
      experience: {
        currentRole:       '',
        currentCompany:    '',
        yearsOfExperience: '',
        skills:            [],
      },
      links: {
        linkedin:  '',
        github:    '',
        portfolio: '',
        website:   '',
      },
      documents: {
        resume: null,
      },
    },
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
}

// ──────────────────────────────────────────────────────────
// VALIDATION
// ──────────────────────────────────────────────────────────

function validateProfile(profile) {
  if (!profile || typeof profile !== 'object') return false;
  if (!profile.profile || typeof profile.profile !== 'object') return false;
  const required = ['personal', 'education', 'experience', 'links'];
  return required.every(
    s => profile.profile[s] && typeof profile.profile[s] === 'object'
  );
}

// ──────────────────────────────────────────────────────────
// PUBLIC API
// ──────────────────────────────────────────────────────────

/**
 * Save (upsert) a profile to IndexedDB.
 * Stamps updatedAt before saving.
 * @param {object} profile — must pass validateProfile()
 * @returns {Promise<void>}
 */
export async function saveProfile(profile) {
  if (!validateProfile(profile)) throw new Error('Invalid profile structure');
  const toSave = {
    ...profile,
    metadata: {
      ...profile.metadata,
      updatedAt: new Date().toISOString(),
    },
  };
  await idbSave(toSave);
  console.log('[ProfileStore] saved to IDB');
}

/**
 * Load the profile from IndexedDB.
 * Returns null if no profile has been saved yet.
 * Handles the old chrome.storage encrypted format by returning null
 * (user will need to re-enter profile).
 * @returns {Promise<object|null>}
 */
export async function loadProfile() {
  try {
    const record = await idbGet();
    if (!record) return null;

    // Guard against old encrypted chrome.storage format
    // (salt / iv / ciphertext keys indicate old format)
    if (record.salt || record.iv || record.ciphertext) {
      console.warn('[ProfileStore] Old encrypted format detected in IDB — ignoring.');
      return null;
    }

    return record;
  } catch (err) {
    console.error('[ProfileStore] loadProfile error:', err);
    return null;
  }
}

/**
 * Returns true if a profile exists in IDB.
 * @returns {Promise<boolean>}
 */
export async function hasProfile() {
  return idbHas();
}

/**
 * Delete the profile from IDB.
 * @returns {Promise<void>}
 */
export async function deleteProfile() {
  await idbDelete();
  console.log('[ProfileStore] deleted from IDB');
}
