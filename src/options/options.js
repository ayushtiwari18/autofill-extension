/**
 * options.js — SmartFill Profile Setup
 * ─────────────────────────────────────────────────────────
 * Saves / loads user profile to/from IDB (profile store).
 * Uses idb.js from A1. No build step. ES module.
 *
 * Profile fields (all optional strings):
 *   Personal: fullName, email, phone, dob, gender
 *   Contact:  address, city, state, pincode, country,
 *             linkedin, github, portfolio
 *   Education: college, degree, branch, gradYear, cgpa
 *   Experience: currentRole, currentCompany, experience,
 *               noticePeriod, skills, summary
 */

import { openDB, saveProfile, getProfile } from '../storage/idb.js';

// ───────────────────────────────────────────────────────────
// FIELD LIST — single source of truth
// ───────────────────────────────────────────────────────────

const FIELD_IDS = [
  'fullName', 'email', 'phone', 'dob', 'gender',
  'address', 'city', 'state', 'pincode', 'country',
  'linkedin', 'github', 'portfolio',
  'college', 'degree', 'branch', 'gradYear', 'cgpa',
  'currentRole', 'currentCompany', 'experience',
  'noticePeriod', 'skills', 'summary',
];

const PROFILE_ID = 'main';

// ───────────────────────────────────────────────────────────
// TOAST helper
// ───────────────────────────────────────────────────────────

let _toastTimer = null;

function showToast(msg, type = 'success') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = `toast show ${type}`;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => {
    el.className = 'toast';
  }, 2800);
}

// ───────────────────────────────────────────────────────────
// READ form → object
// ───────────────────────────────────────────────────────────

function readForm() {
  const data = { id: PROFILE_ID, updatedAt: new Date().toISOString() };
  FIELD_IDS.forEach(id => {
    const el = document.getElementById(id);
    data[id] = el ? el.value.trim() : '';
  });
  return data;
}

// ───────────────────────────────────────────────────────────
// WRITE object → form
// ───────────────────────────────────────────────────────────

function populateForm(profile) {
  if (!profile) return;
  FIELD_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (el && profile[id] !== undefined) el.value = profile[id];
  });
}

// ───────────────────────────────────────────────────────────
// SAVE handler
// ───────────────────────────────────────────────────────────

async function handleSave(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-save');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  try {
    const profile = readForm();
    await saveProfile(profile);
    showToast('✅ Profile saved successfully!', 'success');
  } catch (err) {
    console.error('[Options] Save error:', err);
    showToast('❌ Failed to save. Check console.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '💾 Save Profile';
  }
}

// ───────────────────────────────────────────────────────────
// RESET handler
// ───────────────────────────────────────────────────────────

function handleReset() {
  if (!confirm('Clear all fields? Your saved profile in the database will NOT be deleted.')) return;
  document.getElementById('profile-form').reset();
  showToast('Form cleared', 'info');
}

// ───────────────────────────────────────────────────────────
// INIT — open DB, load profile, wire events
// ───────────────────────────────────────────────────────────

async function init() {
  try {
    await openDB();
    const profile = await getProfile(PROFILE_ID);
    if (profile) {
      populateForm(profile);
      showToast('👋 Profile loaded', 'info');
    }
  } catch (err) {
    console.error('[Options] Init error:', err);
    showToast('⚠️ Could not load profile from database', 'error');
  }

  document.getElementById('profile-form').addEventListener('submit', handleSave);
  document.getElementById('btn-reset').addEventListener('click', handleReset);
}

document.addEventListener('DOMContentLoaded', init);
