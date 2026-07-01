/**
 * idb.js — IndexedDB module
 * ─────────────────────────
 * Single source of truth for ALL storage operations.
 * Nothing else in the codebase should open IndexedDB directly.
 *
 * Works in:
 *   ✅ Content scripts
 *   ✅ Background service workers
 *   ✅ Options page
 *   ✅ Plain browser (for manual tests)
 *
 * All methods return Promises. Never throws — rejects on error.
 */

import { DB_NAME, DB_VERSION, STORES, PROFILE_KEY } from './schema.js';

// ─── Internal: open (or reuse) the DB connection ─────────────────────────────

let _dbPromise = null;

function openDB() {
  if (_dbPromise) return _dbPromise;

  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = event.target.result;
      console.log(`[IDB] upgrading to v${DB_VERSION}`);

      // ── Store 1: profile ────────────────────────────────────────────────
      if (!db.objectStoreNames.contains(STORES.PROFILE)) {
        db.createObjectStore(STORES.PROFILE, { keyPath: 'key' });
        console.log('[IDB] created store: profile');
      }

      // ── Store 2: field_memory ────────────────────────────────────────────
      if (!db.objectStoreNames.contains(STORES.FIELD_MEMORY)) {
        const memStore = db.createObjectStore(STORES.FIELD_MEMORY, {
          keyPath: 'fingerprint',
        });
        memStore.createIndex('by_domain', 'domain', { unique: false });
        console.log('[IDB] created store: field_memory (index: by_domain)');
      }

      // ── Store 3: platform_patterns ───────────────────────────────────────
      if (!db.objectStoreNames.contains(STORES.PLATFORM_PATTERNS)) {
        const patStore = db.createObjectStore(STORES.PLATFORM_PATTERNS, {
          keyPath: 'id',
          autoIncrement: true,
        });
        patStore.createIndex('by_domain', 'domain', { unique: false });
        console.log('[IDB] created store: platform_patterns (index: by_domain)');
      }
    };

    req.onsuccess  = (e) => { console.log('[IDB] opened'); resolve(e.target.result); };
    req.onerror    = (e) => { console.error('[IDB] open error', e.target.error); reject(e.target.error); _dbPromise = null; };
    req.onblocked  = ()  => { console.warn('[IDB] open blocked — close other tabs'); };
  });

  return _dbPromise;
}

// ─── Internal helper: run a transaction ──────────────────────────────────────

function tx(storeName, mode, fn) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store       = transaction.objectStore(storeName);
    let result;
    try {
      result = fn(store);
    } catch (err) {
      reject(err);
      return;
    }
    transaction.oncomplete = () => resolve(result instanceof IDBRequest ? result.result : result);
    transaction.onerror    = (e) => reject(e.target.error);
    transaction.onabort    = (e) => reject(e.target.error);
  }));
}

// ─── Helper: wrap an IDBRequest in a Promise ─────────────────────────────────

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror   = (e) => reject(e.target.error);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// PROFILE  operations
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Save (upsert) the user profile.
 * @param {object} profileData — shape matches schema.js PROFILE comment
 * @returns {Promise<void>}
 */
export async function saveProfile(profileData) {
  const record = {
    ...profileData,
    key:       PROFILE_KEY,
    updatedAt: Date.now(),
  };
  return openDB().then(db => new Promise((resolve, reject) => {
    const t   = db.transaction(STORES.PROFILE, 'readwrite');
    const req = t.objectStore(STORES.PROFILE).put(record);
    t.oncomplete = () => { console.log('[IDB] profile saved'); resolve(); };
    t.onerror    = (e) => reject(e.target.error);
  }));
}

/**
 * Get the user profile. Returns null if not set yet.
 * @returns {Promise<object|null>}
 */
export async function getProfile() {
  return openDB().then(db => new Promise((resolve, reject) => {
    const t   = db.transaction(STORES.PROFILE, 'readonly');
    const req = t.objectStore(STORES.PROFILE).get(PROFILE_KEY);
    req.onsuccess = (e) => resolve(e.target.result || null);
    req.onerror   = (e) => reject(e.target.error);
  }));
}

/**
 * Check if a profile exists (has been set up).
 * @returns {Promise<boolean>}
 */
export async function hasProfile() {
  const p = await getProfile();
  return p !== null;
}

/**
 * Delete the profile record (used in settings reset).
 * @returns {Promise<void>}
 */
export async function deleteProfile() {
  return openDB().then(db => new Promise((resolve, reject) => {
    const t   = db.transaction(STORES.PROFILE, 'readwrite');
    const req = t.objectStore(STORES.PROFILE).delete(PROFILE_KEY);
    t.oncomplete = () => resolve();
    t.onerror    = (e) => reject(e.target.error);
  }));
}


// ═══════════════════════════════════════════════════════════════════════════
// FIELD_MEMORY  operations
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get memory for a specific field fingerprint.
 * @param {string} fingerprint — e.g. "docs.google.com::full name::text"
 * @returns {Promise<object|null>}
 */
export async function getFieldMemory(fingerprint) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const t   = db.transaction(STORES.FIELD_MEMORY, 'readonly');
    const req = t.objectStore(STORES.FIELD_MEMORY).get(fingerprint);
    req.onsuccess = (e) => resolve(e.target.result || null);
    req.onerror   = (e) => reject(e.target.error);
  }));
}

/**
 * Save (upsert) a field_memory record.
 * @param {object} record — full field_memory shape
 * @returns {Promise<void>}
 */
export async function saveFieldMemory(record) {
  const toSave = {
    ...record,
    updatedAt: Date.now(),
    createdAt: record.createdAt || Date.now(),
  };
  return openDB().then(db => new Promise((resolve, reject) => {
    const t   = db.transaction(STORES.FIELD_MEMORY, 'readwrite');
    const req = t.objectStore(STORES.FIELD_MEMORY).put(toSave);
    t.oncomplete = () => resolve();
    t.onerror    = (e) => reject(e.target.error);
  }));
}

/**
 * Record a fill event — create or update a field_memory entry.
 * This is the main write path called after every fill.
 *
 * @param {string} fingerprint
 * @param {string} domain
 * @param {string} label        — normalized label
 * @param {string} fieldType
 * @param {string} value        — the value that was filled
 * @returns {Promise<void>}
 */
export async function recordFill({ fingerprint, domain, label, fieldType, value }) {
  const existing = await getFieldMemory(fingerprint);

  if (existing) {
    const entry = existing.values.find(v => v.value === value);
    if (entry) {
      entry.usedCount++;
      entry.lastUsed = Date.now();
    } else {
      existing.values.push({ value, usedCount: 1, lastUsed: Date.now() });
    }
    await saveFieldMemory(existing);
  } else {
    await saveFieldMemory({
      fingerprint,
      domain,
      label,
      fieldType,
      values:    [{ value, usedCount: 1, lastUsed: Date.now() }],
      confirmed: false,
      createdAt: Date.now(),
    });
  }

  console.log(`[IDB] recordFill: "${value}" → ${fingerprint}`);
}

/**
 * Get all field memories for a given domain.
 * @param {string} domain
 * @returns {Promise<object[]>}
 */
export async function getFieldMemoriesByDomain(domain) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const t     = db.transaction(STORES.FIELD_MEMORY, 'readonly');
    const index = t.objectStore(STORES.FIELD_MEMORY).index('by_domain');
    const req   = index.getAll(domain);
    req.onsuccess = (e) => resolve(e.target.result || []);
    req.onerror   = (e) => reject(e.target.error);
  }));
}

/**
 * Delete a single field memory record.
 * @param {string} fingerprint
 * @returns {Promise<void>}
 */
export async function deleteFieldMemory(fingerprint) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const t   = db.transaction(STORES.FIELD_MEMORY, 'readwrite');
    const req = t.objectStore(STORES.FIELD_MEMORY).delete(fingerprint);
    t.oncomplete = () => resolve();
    t.onerror    = (e) => reject(e.target.error);
  }));
}

/**
 * Clear ALL field memories (used in settings reset).
 * @returns {Promise<void>}
 */
export async function clearAllFieldMemory() {
  return openDB().then(db => new Promise((resolve, reject) => {
    const t   = db.transaction(STORES.FIELD_MEMORY, 'readwrite');
    const req = t.objectStore(STORES.FIELD_MEMORY).clear();
    t.oncomplete = () => resolve();
    t.onerror    = (e) => reject(e.target.error);
  }));
}


// ═══════════════════════════════════════════════════════════════════════════
// PLATFORM_PATTERNS  operations
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Save a new platform pattern (selector → field-type mapping).
 * @param {object} pattern — { domain, selectorPattern, labelPattern, fieldType }
 * @returns {Promise<number>} — the auto-incremented id
 */
export async function savePlatformPattern(pattern) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const t   = db.transaction(STORES.PLATFORM_PATTERNS, 'readwrite');
    const req = t.objectStore(STORES.PLATFORM_PATTERNS).add({
      ...pattern,
      observedCount: pattern.observedCount || 1,
      updatedAt:     Date.now(),
    });
    req.onsuccess = (e) => resolve(e.target.result);  // returns new id
    t.onerror     = (e) => reject(e.target.error);
  }));
}

/**
 * Get all platform patterns for a domain.
 * @param {string} domain
 * @returns {Promise<object[]>}
 */
export async function getPlatformPatterns(domain) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const t     = db.transaction(STORES.PLATFORM_PATTERNS, 'readonly');
    const index = t.objectStore(STORES.PLATFORM_PATTERNS).index('by_domain');
    const req   = index.getAll(domain);
    req.onsuccess = (e) => resolve(e.target.result || []);
    req.onerror   = (e) => reject(e.target.error);
  }));
}


// ═══════════════════════════════════════════════════════════════════════════
// UTILITY  — export all for convenience
// ═══════════════════════════════════════════════════════════════════════════

export const idb = {
  // profile
  saveProfile,
  getProfile,
  hasProfile,
  deleteProfile,
  // field_memory
  getFieldMemory,
  saveFieldMemory,
  recordFill,
  getFieldMemoriesByDomain,
  deleteFieldMemory,
  clearAllFieldMemory,
  // platform_patterns
  savePlatformPattern,
  getPlatformPatterns,
};

export default idb;
