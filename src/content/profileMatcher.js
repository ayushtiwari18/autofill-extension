/**
 * profileMatcher.js — SmartFill A6 (fixed)
 * Maps field fingerprint label → profile key → value.
 *
 * Profile is stored in IndexedDB via idb.js (same DB the Options page writes to).
 * The IDB record has a nested shape; we flatten it here for easy key lookup.
 *
 * IDB nested shape → flattened keys used in LABEL_MAP:
 *   personal.firstName  → first_name
 *   personal.lastName   → last_name
 *   personal.email      → email
 *   personal.phone      → phone
 *   personal.city       → city
 *   personal.state      → state
 *   personal.country    → country
 *   education.university → college
 *   education.degree    → degree
 *   education.graduationYear → grad_year
 *   experience.currentRole   → job_position
 *   experience.currentCompany → company
 *   experience.skills        → skills
 *   links.linkedin      → linkedin
 *   links.github        → github
 *   links.portfolio     → portfolio
 *
 * Options page uses camelCase field IDs (fullName, gradYear, etc.) —
 * those are also mapped below via the options_flat path.
 */

import { getProfile } from '../storage/idb.js';

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
  { keys: ['skills', 'key skills', 'technical skills',
           'areas of expertise'],
    profile: ['skills'] },
  { keys: ['job position', 'position', 'role', 'current role',
           'designation', 'job title', 'title'],
    profile: ['job_position', 'currentRole'] },
  { keys: ['company', 'current company', 'organisation', 'organization'],
    profile: ['company', 'currentCompany'] },
];

/**
 * Flatten the nested IDB profile record into a single-level object.
 * Also copies top-level camelCase keys from the Options form directly.
 */
function flattenProfile(record) {
  if (!record) return {};
  const p = {};

  // ── nested IDB shape ──────────────────────────────────────────────
  const per = record.personal  || {};
  const edu = record.education || {};
  const exp = record.experience|| {};
  const lnk = record.links     || {};

  p.first_name   = per.firstName       || '';
  p.last_name    = per.lastName        || '';
  p.email        = per.email           || '';
  p.phone        = per.phone           || '';
  p.city         = per.city            || '';
  p.state        = per.state           || '';
  p.country      = per.country         || '';

  p.college      = edu.university      || '';
  p.university   = edu.university      || '';
  p.degree       = edu.degree          || '';
  p.grad_year    = edu.graduationYear  || '';

  p.job_position = exp.currentRole     || '';
  p.company      = exp.currentCompany  || '';
  p.skills       = Array.isArray(exp.skills)
                     ? exp.skills.join(', ')
                     : (exp.skills || '');

  p.linkedin     = lnk.linkedin        || '';
  p.github       = lnk.github          || '';
  p.portfolio    = lnk.portfolio || lnk.website || '';

  // ── synthesise full_name from parts if not stored directly ───────
  p.full_name = [p.first_name, p.last_name].filter(Boolean).join(' ');

  // ── also copy flat camelCase keys that Options page writes directly ──
  // (handles the case where options.js flat-saves fields like
  //  fullName, email, phone, etc. at the top level of the record)
  const CAMEL_KEYS = [
    'fullName','firstName','lastName','email','phone',
    'city','state','country','college','degree','gradYear',
    'currentRole','currentCompany','skills',
    'linkedin','github','portfolio',
  ];
  for (const k of CAMEL_KEYS) {
    if (record[k] !== undefined && record[k] !== '') p[k] = record[k];
  }

  // build full_name from camelCase too
  if (!p.full_name && record.fullName) p.full_name = record.fullName;

  return p;
}

export function labelToProfileKey(label) {
  const norm = label.trim().toLowerCase();
  for (const entry of LABEL_MAP) {
    if (entry.keys.some(k => norm.includes(k) || k.includes(norm))) {
      return entry.profile; // array of candidate keys
    }
  }
  return null;
}

export async function loadProfile() {
  try {
    const record = await getProfile();   // reads from IndexedDB (same as Options page)
    if (!record) {
      console.warn('[Profile] IDB profile is empty — please fill out the Options page first');
      return {};
    }
    const flat = flattenProfile(record);
    const keys = Object.keys(flat).filter(k => flat[k] !== '');
    console.log(`[Profile] loaded and flattened ${keys.length} key(s) from IDB`);
    return flat;
  } catch (e) {
    console.warn('[Profile] Failed to load IDB profile:', e.message);
    return {};
  }
}

export function matchFieldToProfile(fieldInfo, profile) {
  const candidates = labelToProfileKey(fieldInfo.label);
  if (!candidates) return null;
  // try each candidate key in order until we find a non-empty value
  for (const key of candidates) {
    const val = profile[key];
    if (val !== undefined && val !== '') return String(val);
  }
  return null;
}
