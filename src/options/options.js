/**
 * options.js — SmartFill Profile Setup
 * ─────────────────────────────────────────────────────────
 * Saves / loads user profile to/from IDB (profile store).
 * Loaded by dist/options/options.html at runtime.
 * Imports from dist/storage/idb.js (copied by webpack CopyPlugin).
 *
 * Profile is saved in NESTED format matching schema.js:
 *   { personal, education, experience, links }
 *
 * Note: openDB() is internal to idb.js — it is called automatically
 * on first saveProfile/getProfile call. Do NOT import it.
 */

import { saveProfile, getProfile } from '../storage/idb.js';

// ── Helpers ─────────────────────────────────────────────────────────

/** Read a form field value by element id, trimmed. Returns '' if missing. */
const g = id => {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
};

/** Set a form field value by element id. Skips if element missing or value undefined. */
const s = (id, val) => {
  const el = document.getElementById(id);
  if (el && val !== undefined && val !== null) el.value = val;
};

// ── Toast ────────────────────────────────────────────────────────────

let _toastTimer = null;
function showToast(msg, type = 'success') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = `toast show ${type}`;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { el.className = 'toast'; }, 2800);
}

// ── Form helpers ────────────────────────────────────────────────────

/**
 * Read form fields and return a NESTED profile object matching schema.js.
 *
 * Schema shape (from schema.js):
 * {
 *   key: 'user_profile',
 *   personal:   { fullName, firstName, lastName, email, phone, dob, gender,
 *                 address, city, state, zipCode, pincode, country },
 *   education:  { university, college, degree, branch, major,
 *                 graduationYear, gradYear, gpa, cgpa },
 *   experience: { currentCompany, currentRole, yearsOfExperience, experience,
 *                 noticePeriod, skills },
 *   links:      { linkedin, github, portfolio, website },
 *   summary:    string,
 *   updatedAt:  timestamp
 * }
 */
function readForm() {
  const fullName = g('fullName');
  const nameParts = fullName.split(' ').filter(Boolean);
  const firstName = nameParts[0] || '';
  const lastName  = nameParts.slice(1).join(' ') || '';

  return {
    personal: {
      fullName,
      firstName,
      lastName,
      email:    g('email'),
      phone:    g('phone'),
      dob:      g('dob'),
      gender:   g('gender'),
      address:  g('address'),
      city:     g('city'),
      state:    g('state'),
      pincode:  g('pincode'),
      zipCode:  g('pincode'),   // alias for schema compat
      country:  g('country'),
    },
    education: {
      college:          g('college'),
      university:       g('college'),   // alias for schema compat
      degree:           g('degree'),
      branch:           g('branch'),
      major:            g('branch'),    // alias for schema compat
      gradYear:         g('gradYear'),
      graduationYear:   g('gradYear'),  // alias for schema compat
      cgpa:             g('cgpa'),
      gpa:              g('cgpa'),      // alias for schema compat
    },
    experience: {
      currentRole:          g('currentRole'),
      currentCompany:       g('currentCompany'),
      experience:           g('experience'),
      yearsOfExperience:    g('experience'),  // alias for schema compat
      noticePeriod:         g('noticePeriod'),
      skills:               g('skills'),
    },
    links: {
      linkedin:  g('linkedin'),
      github:    g('github'),
      portfolio: g('portfolio'),
      website:   g('portfolio'),  // alias for schema compat
    },
    summary: g('summary'),
  };
}

/**
 * Populate form fields from a saved nested profile object.
 * Handles both nested (new) and flat (legacy) formats gracefully.
 */
function populateForm(profile) {
  if (!profile) return;

  // ── Nested format (new, matches schema.js) ──
  if (profile.personal) {
    s('fullName',       profile.personal.fullName
                        || [profile.personal.firstName, profile.personal.lastName].filter(Boolean).join(' '));
    s('email',          profile.personal.email);
    s('phone',          profile.personal.phone);
    s('dob',            profile.personal.dob);
    s('gender',         profile.personal.gender);
    s('address',        profile.personal.address);
    s('city',           profile.personal.city);
    s('state',          profile.personal.state);
    s('pincode',        profile.personal.pincode || profile.personal.zipCode);
    s('country',        profile.personal.country);
  }

  if (profile.education) {
    s('college',   profile.education.college  || profile.education.university);
    s('degree',    profile.education.degree);
    s('branch',    profile.education.branch   || profile.education.major);
    s('gradYear',  profile.education.gradYear || profile.education.graduationYear);
    s('cgpa',      profile.education.cgpa     || profile.education.gpa);
  }

  if (profile.experience) {
    s('currentRole',    profile.experience.currentRole);
    s('currentCompany', profile.experience.currentCompany);
    s('experience',     profile.experience.experience || profile.experience.yearsOfExperience);
    s('noticePeriod',   profile.experience.noticePeriod);
    s('skills',         profile.experience.skills);
  }

  if (profile.links) {
    s('linkedin',  profile.links.linkedin);
    s('github',    profile.links.github);
    s('portfolio', profile.links.portfolio || profile.links.website);
  }

  s('summary', profile.summary);

  // ── Legacy flat format fallback (if old data exists) ──
  if (!profile.personal) {
    s('fullName',       profile.fullName);
    s('email',          profile.email);
    s('phone',          profile.phone);
    s('dob',            profile.dob);
    s('gender',         profile.gender);
    s('address',        profile.address);
    s('city',           profile.city);
    s('state',          profile.state);
    s('pincode',        profile.pincode);
    s('country',        profile.country);
    s('linkedin',       profile.linkedin);
    s('github',         profile.github);
    s('portfolio',      profile.portfolio);
    s('college',        profile.college);
    s('degree',         profile.degree);
    s('branch',         profile.branch);
    s('gradYear',       profile.gradYear);
    s('cgpa',           profile.cgpa);
    s('currentRole',    profile.currentRole);
    s('currentCompany', profile.currentCompany);
    s('experience',     profile.experience);
    s('noticePeriod',   profile.noticePeriod);
    s('skills',         profile.skills);
    s('summary',        profile.summary);
  }
}

// ── Handlers ───────────────────────────────────────────────────────

async function handleSave(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-save');
  btn.disabled = true;
  btn.textContent = 'Saving…';
  try {
    const profile = readForm();
    await saveProfile(profile);
    console.log('[Options] Profile saved to IDB:', profile);
    showToast('✅ Profile saved successfully!', 'success');
  } catch (err) {
    console.error('[Options] Save error:', err);
    showToast('❌ Failed to save. Check console.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '💾 Save Profile';
  }
}

function handleReset() {
  if (!confirm('Clear all fields? Your saved profile in the database will NOT be deleted.')) return;
  document.getElementById('profile-form').reset();
  showToast('Form cleared', 'info');
}

// ── Init ─────────────────────────────────────────────────────────────

async function init() {
  try {
    const profile = await getProfile();
    if (profile) {
      populateForm(profile);
      showToast('👋 Profile loaded', 'info');
      console.log('[Options] Profile loaded from IDB:', profile);
    }
  } catch (err) {
    console.error('[Options] Init error:', err);
    showToast('⚠️ Could not load profile from database', 'error');
  }
  document.getElementById('profile-form').addEventListener('submit', handleSave);
  document.getElementById('btn-reset').addEventListener('click', handleReset);
}

document.addEventListener('DOMContentLoaded', init);
