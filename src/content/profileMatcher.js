/**
 * profileMatcher.js — SmartFill A6 (dev-mode patched)
 *
 * In DEV_MODE=true, loadProfile() injects DEV_PROFILE directly instead
 * of relying on IndexedDB. This means you never need to fill the Options
 * page during development — just run npm run build and reload.
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
 */

import { getProfile } from '../storage/idb.js';
import { DEV_MODE, DEV_PROFILE } from '../devData.js';

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
 * Flatten the nested IDB/DEV profile record into a single-level object.
 * Works for both DEV_PROFILE shape and the live IDB shape.
 */
function flattenProfile(record) {
  if (!record) return {};

  // DEV_PROFILE wraps everything under a `profile` key
  const root = record.profile || record;

  const p = {};
  const per = root.personal   || {};
  const edu = root.education  || {};
  const exp = root.experience || {};
  const lnk = root.links      || {};

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

  // synthesise full_name from parts
  p.full_name = [p.first_name, p.last_name].filter(Boolean).join(' ');

  // also copy flat camelCase keys (Options page writes these directly)
  const CAMEL_KEYS = [
    'fullName','firstName','lastName','email','phone',
    'city','state','country','college','degree','gradYear',
    'currentRole','currentCompany','skills',
    'linkedin','github','portfolio',
  ];
  for (const k of CAMEL_KEYS) {
    if (root[k] !== undefined && root[k] !== '') p[k] = root[k];
  }
  if (!p.full_name && root.fullName) p.full_name = root.fullName;

  return p;
}

export function labelToProfileKey(label) {
  const norm = label.trim().toLowerCase();
  for (const entry of LABEL_MAP) {
    if (entry.keys.some(k => norm.includes(k) || k.includes(norm))) {
      return entry.profile;
    }
  }
  return null;
}

export async function loadProfile() {
  // ── DEV MODE: bypass IDB entirely, use devData.js ────────────────
  if (DEV_MODE) {
    console.log('[Profile] ⚡ DEV_MODE=true — using DEV_PROFILE (bypassing IDB)');
    const flat = flattenProfile(DEV_PROFILE);
    const keys = Object.keys(flat).filter(k => flat[k] !== '');
    console.log(`[Profile] DEV_PROFILE flattened → ${keys.length} key(s):`, keys);
    console.log('[Profile] DEV_PROFILE values:', JSON.stringify(flat).slice(0, 200));
    return flat;
  }

  // ── PRODUCTION MODE: load from IndexedDB ─────────────────────────
  try {
    const record = await getProfile();
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
  for (const key of candidates) {
    const val = profile[key];
    if (val !== undefined && val !== '') return String(val);
  }
  return null;
}
