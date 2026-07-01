/**
 * schema.js — IndexedDB schema constants
 * Single source of truth for DB name, version, store names, indexes.
 * Import this anywhere — no side effects.
 */

export const DB_NAME    = 'smartfill_db';
export const DB_VERSION = 1;

export const STORES = {
  PROFILE:           'profile',
  FIELD_MEMORY:      'field_memory',
  PLATFORM_PATTERNS: 'platform_patterns',
};

/**
 * PROFILE store
 * ─────────────
 * One singleton record per user.
 * key: "user_profile" (always)
 *
 * Shape:
 * {
 *   key: 'user_profile',
 *   personal: {
 *     firstName, lastName, email, phone,
 *     address, city, state, zipCode, country
 *   },
 *   education: {
 *     university, degree, major, graduationYear, gpa
 *   },
 *   experience: {
 *     currentCompany, currentRole, yearsOfExperience, skills
 *   },
 *   links: {
 *     linkedin, github, portfolio, website
 *   },
 *   updatedAt: timestamp
 * }
 */
export const PROFILE_KEY = 'user_profile';

/**
 * FIELD_MEMORY store
 * ──────────────────
 * One record per (domain + normalizedLabel + fieldType) combination.
 * Tracks every value the user has ever filled into a field,
 * ranked by frequency and recency.
 *
 * keyPath: "fingerprint"  (e.g. "docs.google.com::full name::text")
 * index:   "by_domain"    (for querying all memories for a domain)
 *
 * Shape:
 * {
 *   fingerprint: 'docs.google.com::full name::text',
 *   domain:      'docs.google.com',
 *   label:       'full name',           ← normalized
 *   fieldType:   'text',
 *   values: [
 *     { value: 'Ayush Tiwari',  usedCount: 12, lastUsed: 1719820000000 },
 *     { value: 'A. Tiwari',     usedCount: 2,  lastUsed: 1719000000000 },
 *   ],
 *   confirmed:   false,    ← true once user explicitly confirmed this mapping
 *   createdAt:   timestamp,
 *   updatedAt:   timestamp,
 * }
 */

/**
 * PLATFORM_PATTERNS store
 * ───────────────────────
 * Learned selector → field-type mappings per domain.
 * Used to improve field detection on repeat visits.
 *
 * keyPath: "id"  (autoIncrement)
 * index:   "by_domain"
 *
 * Shape:
 * {
 *   id:              1,
 *   domain:          'docs.google.com',
 *   selectorPattern: 'input[jsname="YPqjbf"]',
 *   labelPattern:    'full name',
 *   fieldType:       'text',
 *   observedCount:   7,
 *   updatedAt:       timestamp,
 * }
 */
