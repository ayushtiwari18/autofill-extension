/**
 * fieldScanner.js — DOM field discovery for SmartFill
 * ─────────────────────────────────────────────────────────
 * Scans the current page for fillable form fields.
 * Returns a list of FieldInfo objects, each with:
 *   { el, fingerprint, label, rawLabel, fieldType }
 *
 * Does NOT touch IDB. Does NOT fill anything.
 * Pure DOM → FieldInfo[] transform.
 */

import { fingerprintField } from '../engine/fingerprint.js';

// ───────────────────────────────────────────────────────────
// VISIBILITY CHECK
// ───────────────────────────────────────────────────────────

/**
 * Returns true if element is visible and interactable.
 * Skips hidden, disabled, readonly, aria-hidden=true.
 */
function isVisible(el) {
  if (!el || !el.getBoundingClientRect) return false;
  if (el.disabled)  return false;
  if (el.readOnly)  return false;
  if (el.getAttribute('aria-hidden') === 'true') return false;

  const style = window.getComputedStyle(el);
  if (style.display    === 'none')    return false;
  if (style.visibility === 'hidden')  return false;
  if (style.opacity    === '0')       return false;

  const rect = el.getBoundingClientRect();
  // Element must have some size (not zero-area)
  if (rect.width === 0 && rect.height === 0) return false;

  return true;
}

// ───────────────────────────────────────────────────────────
// FIELD SELECTORS
// ───────────────────────────────────────────────────────────

// CSS selectors for standard fillable inputs
const INPUT_SELECTOR = [
  'input[type="text"]',
  'input[type="email"]',
  'input[type="tel"]',
  'input[type="url"]',
  'input[type="number"]',
  'input[type="date"]',
  'input[type="search"]',
  'input:not([type])',          // bare <input> defaults to text
  'textarea',
  'select',
].join(',');

// ARIA role-based widgets (Google Forms, custom dropdowns)
const ROLE_SELECTOR = [
  'div[role="radiogroup"]',
  'div[role="group"]',
  'div[role="listbox"]',
  'div[role="combobox"]',
].join(',');

// ───────────────────────────────────────────────────────────
// SCAN PAGE
// ───────────────────────────────────────────────────────────

/**
 * Scan the entire document for visible, fillable fields.
 *
 * @param {string} [domain]  — defaults to window.location.hostname
 * @returns {FieldInfo[]}    — deduplicated by fingerprint
 *
 * @typedef {{ el: Element, fingerprint: string, label: string,
 *             rawLabel: string, fieldType: string }} FieldInfo
 */
export function scanFields(domain) {
  const d = domain || window.location.hostname;

  // Collect all candidate elements
  const candidates = [
    ...document.querySelectorAll(INPUT_SELECTOR),
    ...document.querySelectorAll(ROLE_SELECTOR),
  ];

  const seen        = new Set();   // deduplicate by fingerprint
  const fields      = [];

  for (const el of candidates) {
    if (!isVisible(el)) continue;

    const { fingerprint, label, rawLabel, fieldType } = fingerprintField(el, d);

    // Skip fields with no usable label (can't fingerprint them)
    if (!fingerprint) continue;

    // Deduplicate — same fingerprint = same logical field
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);

    fields.push({ el, fingerprint, label, rawLabel, fieldType });
  }

  console.log(`[Scanner] scanFields() → ${fields.length} fields on ${d}`);
  return fields;
}


/**
 * Observe DOM mutations and re-scan when new nodes are added.
 * Calls callback(newFields) with any newly discovered fields.
 *
 * Used for SPA forms that render after page load.
 *
 * @param {Function} callback     — called with FieldInfo[]
 * @param {string}   [domain]
 * @returns {MutationObserver}    — call .disconnect() to stop
 */
export function observeNewFields(callback, domain) {
  let debounceTimer = null;
  const knownFingerprints = new Set();

  // Seed with already-known fields
  scanFields(domain).forEach(f => knownFingerprints.add(f.fingerprint));

  const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const current = scanFields(domain);
      const newFields = current.filter(f => !knownFingerprints.has(f.fingerprint));
      if (newFields.length > 0) {
        newFields.forEach(f => knownFingerprints.add(f.fingerprint));
        console.log(`[Scanner] observeNewFields → ${newFields.length} new field(s)`);
        callback(newFields);
      }
    }, 400);
  });

  observer.observe(document.body, { childList: true, subtree: true });
  return observer;
}
