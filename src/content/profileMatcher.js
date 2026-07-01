/**
 * profileMatcher.js — SmartFill A7
 *
 * loadProfile() now returns the full NESTED profile object
 * (profile.personal / .education / .experience / .links)
 * so simpleMapper.js can traverse it with get(p, 'personal', 'firstName').
 *
 * In DEV_MODE: returns DEV_PROFILE.profile (the nested subtree).
 * In PROD MODE: returns the IDB record's .profile subtree (or the record itself
 *               if it was saved flat).
 *
 * matchFieldToProfile() is kept for backwards-compat but the main
 * fill path now goes through simpleMapper → executor.
 */

import { getProfile as getIdbProfile } from '../storage/idb.js';
import { DEV_MODE, DEV_PROFILE }       from '../devData.js';

// ── LABEL_MAP kept for any code still using matchFieldToProfile() directly ───
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
 * flattenProfile — keeps the old flat shape for matchFieldToProfile().
 */
function flattenProfile(record) {
  if (!record) return {};
  const root = record.profile || record;
  const per = root.personal   || {};
  const edu = root.education  || {};
  const exp = root.experience || {};
  const lnk = root.links      || {};

  const p = {};
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
  p.skills       = Array.isArray(exp.skills) ? exp.skills.join(', ') : (exp.skills || '');
  p.linkedin     = lnk.linkedin        || '';
  p.github       = lnk.github          || '';
  p.portfolio    = lnk.portfolio || lnk.website || '';
  p.full_name    = [p.first_name, p.last_name].filter(Boolean).join(' ');

  // camelCase keys
  const CAMEL = ['fullName','firstName','lastName','email','phone',
    'city','state','country','college','degree','gradYear',
    'currentRole','currentCompany','skills','linkedin','github','portfolio'];
  for (const k of CAMEL) {
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

/**
 * loadProfile()
 *
 * Returns the NESTED profile subtree so simpleMapper.js can use
 * get(p, 'personal', 'firstName') etc.
 *
 * Shape returned:
 * {
 *   personal:   { firstName, lastName, email, phone, city, ... },
 *   education:  { university, degree, graduationYear, gpa, ... },
 *   experience: { currentRole, currentCompany, yearsOfExperience, skills },
 *   links:      { linkedin, github, portfolio, website }
 * }
 */
export async function loadProfile() {
  if (DEV_MODE) {
    console.log('[Profile] ⚡ DEV_MODE — returning DEV_PROFILE.profile (nested)');
    const nested = DEV_PROFILE.profile || DEV_PROFILE;
    console.log('[Profile] DEV nested keys:', Object.keys(nested).join(', '));
    return nested;
  }

  try {
    const record = await getIdbProfile();
    if (!record) {
      console.warn('[Profile] IDB empty — fill the Options page first');
      return {};
    }
    // Return the nested subtree; if the record was saved flat, wrap it
    const nested = record.profile || record;
    console.log('[Profile] IDB profile loaded — top-level keys:', Object.keys(nested).join(', '));
    return nested;
  } catch (e) {
    console.warn('[Profile] IDB load failed:', e.message);
    return {};
  }
}

/**
 * matchFieldToProfile — legacy flat matcher, kept for compatibility.
 * New code should use simpleMapper + loadProfile().
 */
export function matchFieldToProfile(fieldInfo, profile) {
  // If profile is nested (has .personal), flatten it first
  const flat = profile.personal ? flattenProfile({ profile }) : profile;
  const candidates = labelToProfileKey(fieldInfo.label);
  if (!candidates) return null;
  for (const key of candidates) {
    const val = flat[key];
    if (val !== undefined && val !== '') return String(val);
  }
  return null;
}
