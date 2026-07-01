/**
 * profileMatcher.js — SmartFill profile loader
 * ─────────────────────────────────────────────────────────
 * FIXED: loadProfile() now reads from IndexedDB (idb.js) in production.
 * Previously this file imported from devData.js in both modes, meaning
 * the real profile saved by the user via ProfileForm was NEVER used.
 *
 * Flow:
 *   DEV_MODE = true  → returns DEV_PROFILE.profile (fast, no IDB call)
 *   DEV_MODE = false → reads from idb.getProfile(), returns .profile subtree
 *
 * The returned value is always the INNER profile object
 * (profile.personal / .education / .experience / .links)
 * so simpleMapper.js get(p, 'personal', 'firstName') works directly.
 *
 * matchFieldToProfile() is kept for any legacy callers.
 */

import { getProfile as idbGetProfile } from '../storage/idb.js';
import { DEV_MODE, DEV_PROFILE }       from '../devData.js';

// ── LABEL_MAP — kept for matchFieldToProfile() backwards compat ────────────
const LABEL_MAP = [
  { keys: ['full name', 'full_name', 'your name', 'name'],
    profile: ['full_name', 'fullName'] },
  { keys: ['first name', 'first_name', 'given name'],
    profile: ['first_name', 'firstName'] },
  { keys: ['last name', 'last_name', 'surname', 'family name'],
    profile: ['last_name', 'lastName'] },
  { keys: ['email', 'e-mail', 'email address', 'mail'],
    profile: ['email'] },
  { keys: ['phone', 'mobile', 'contact', 'phone number',
           'mobile number', 'contact number'],
    profile: ['phone'] },
  { keys: ['college', 'university', 'institution', 'school',
           'college name', 'university name'],
    profile: ['college', 'university'] },
  { keys: ['degree', 'qualification', 'education',
           'highest qualification'],
    profile: ['degree'] },
  { keys: ['graduation year', 'grad year', 'passing year',
           'year of passing', 'year of graduation'],
    profile: ['grad_year', 'gradYear'] },
  { keys: ['city', 'town', 'current city', 'location'],
    profile: ['city'] },
  { keys: ['state', 'province', 'region'],
    profile: ['state'] },
  { keys: ['country', 'nation'],
    profile: ['country'] },
  { keys: ['linkedin', 'linkedin profile', 'linkedin url'],
    profile: ['linkedin'] },
  { keys: ['github', 'github profile', 'github url'],
    profile: ['github'] },
  { keys: ['portfolio', 'portfolio url', 'website', 'personal url'],
    profile: ['portfolio'] },
  { keys: ['skills', 'key skills', 'technical skills', 'areas of expertise'],
    profile: ['skills'] },
  { keys: ['job position', 'position', 'role', 'current role',
           'designation', 'job title', 'title'],
    profile: ['job_position', 'currentRole'] },
  { keys: ['company', 'current company', 'organisation', 'organization'],
    profile: ['company', 'currentCompany'] },
];

/**
 * flattenProfile — used only by matchFieldToProfile() for legacy callers.
 * Produces the old flat shape from the nested IDB record.
 */
function flattenProfile(record) {
  if (!record) return {};
  const root = record.profile || record;
  const per = root.personal   || {};
  const edu = root.education  || {};
  const exp = root.experience || {};
  const lnk = root.links      || {};

  return {
    first_name:    per.firstName       || '',
    last_name:     per.lastName        || '',
    full_name:     `${per.firstName || ''} ${per.lastName || ''}`.trim(),
    email:         per.email           || '',
    phone:         per.phone           || '',
    city:          per.city            || '',
    state:         per.state           || '',
    country:       per.country         || '',
    college:       edu.university      || '',
    university:    edu.university      || '',
    degree:        edu.degree          || '',
    major:         edu.major           || '',
    grad_year:     edu.graduationYear  || '',
    gradYear:      edu.graduationYear  || '',
    gpa:           edu.gpa             || '',
    currentRole:   exp.currentRole     || '',
    job_position:  exp.currentRole     || '',
    currentCompany: exp.currentCompany || '',
    company:       exp.currentCompany  || '',
    skills:        Array.isArray(exp.skills) ? exp.skills.join(', ') : '',
    linkedin:      lnk.linkedin        || '',
    github:        lnk.github          || '',
    portfolio:     lnk.portfolio       || '',
  };
}

// ── Profile cache ───────────────────────────────────────────────────────────
let _profileCache = null;

/**
 * loadProfile()
 * ─────────────
 * Returns the INNER profile object (the .profile subtree).
 * This is what simpleMapper.js expects:
 *   { personal: {...}, education: {...}, experience: {...}, links: {...} }
 *
 * In DEV_MODE: returns DEV_PROFILE.profile instantly from memory.
 * In PROD:     reads from IndexedDB on first call, then caches.
 *
 * @returns {Promise<object>}
 */
export async function loadProfile() {
  // DEV shortcut — always returns hardcoded data, skips IDB entirely
  if (DEV_MODE) {
    return DEV_PROFILE.profile;
  }

  // Use cache after first IDB read (stays fresh for the page session)
  if (_profileCache) return _profileCache;

  try {
    const record = await idbGetProfile();
    if (!record) {
      console.warn('[ProfileMatcher] No profile in IDB — user needs to set up profile');
      return {};
    }
    // Return the inner subtree so simpleMapper.js traversal works
    _profileCache = record.profile || record;
    console.log('[ProfileMatcher] Profile loaded from IDB — keys:', Object.keys(_profileCache));
    return _profileCache;
  } catch (err) {
    console.error('[ProfileMatcher] IDB read failed:', err);
    return {};
  }
}

/**
 * invalidateProfileCache()
 * Call this after the user saves a new profile so the content script
 * picks up the fresh data on next focus/hover.
 */
export function invalidateProfileCache() {
  _profileCache = null;
  console.log('[ProfileMatcher] profile cache invalidated');
}

/**
 * matchFieldToProfile() — legacy helper kept for backwards compat.
 * Used by any code that still does a direct label → value lookup.
 *
 * @param {string} label    — normalised field label
 * @param {object} record   — full IDB record (with .profile wrapper)
 * @returns {string|null}
 */
export function matchFieldToProfile(label, record) {
  if (!label || !record) return null;
  const flat = flattenProfile(record);
  const norm = label.toLowerCase().trim();

  for (const { keys, profile: profileKeys } of LABEL_MAP) {
    if (keys.some(k => norm.includes(k))) {
      for (const pk of profileKeys) {
        if (flat[pk]) return flat[pk];
      }
    }
  }
  return null;
}
