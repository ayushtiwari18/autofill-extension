/**
 * fieldScanner.js — DOM field discovery for SmartFill
 * ─────────────────────────────────────────────────────────
 * Scans the current page for visible, fillable form fields.
 * Returns a list of FieldInfo objects, each with:
 *   { el, fingerprint, label, rawLabel, fieldType, type, selector }
 *
 * Does NOT touch IDB. Does NOT fill anything.
 * Pure DOM → FieldInfo[] transform.
 *
 * FIXES:
 *   - Added `type` alias (same value as `fieldType`) so autofiller.js
 *     can read fieldInfo.type without getting undefined.
 *   - Added `selector` property (CSS path to the element) so executor.js
 *     findElement() can reliably locate the element via querySelector.
 *   - Skip SmartFill's own tooltip host element so it never enters the
 *     scan pipeline (prevents spurious re-map + IDB calls on every hover).
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
  if (rect.width === 0 && rect.height === 0) return false;

  return true;
}

// ───────────────────────────────────────────────────────────
// SMARTFILL SELF-EXCLUSION GUARD
// ───────────────────────────────────────────────────────────

/**
 * Returns true if `el` is a SmartFill-owned UI element that must never
 * enter the scan pipeline.
 *
 * Two conditions (either is sufficient):
 *   1. The element carries `data-sf-tooltip-host` — the Shadow DOM host
 *      injected by tooltip.js.
 *   2. The fingerprinted label starts with "smartfill" — catches any
 *      future SmartFill-owned widgets whose host attribute may differ.
 *
 * @param {Element} el
 * @param {string}  label  — normalised label already derived by fingerprintField
 * @returns {boolean}
 */
function isSmartFillOwned(el, label) {
  if (el.hasAttribute('data-sf-tooltip-host')) return true;
  if (label && label.toLowerCase().startsWith('smartfill')) return true;
  return false;
}

// ───────────────────────────────────────────────────────────
// FIELD SELECTORS
// ───────────────────────────────────────────────────────────

const INPUT_SELECTOR = [
  'input[type="text"]',
  'input[type="email"]',
  'input[type="tel"]',
  'input[type="url"]',
  'input[type="number"]',
  'input[type="date"]',
  'input[type="search"]',
  'input:not([type])',
  'textarea',
  'select',
].join(',');

const ROLE_SELECTOR = [
  'div[role="radiogroup"]',
  'div[role="group"]',
  'div[role="listbox"]',
  'div[role="combobox"]',
].join(',');

// ───────────────────────────────────────────────────────────
// CSS SELECTOR BUILDER
// ───────────────────────────────────────────────────────────

/**
 * Build a short, unique CSS selector for `el`.
 * Priority: #id → [name] → nth-of-type path (max 4 ancestors).
 */
function buildSelector(el) {
  if (el.id) return `#${CSS.escape(el.id)}`;

  if (el.name) {
    const tag = el.tagName.toLowerCase();
    return `${tag}[name="${CSS.escape(el.name)}"]`;
  }

  const parts = [];
  let node = el;
  let depth = 0;
  while (node && node !== document.body && depth < 4) {
    const tag = node.tagName.toLowerCase();
    const siblings = node.parentElement
      ? Array.from(node.parentElement.children).filter(c => c.tagName === node.tagName)
      : [];
    if (siblings.length > 1) {
      const idx = siblings.indexOf(node) + 1;
      parts.unshift(`${tag}:nth-of-type(${idx})`);
    } else {
      parts.unshift(tag);
    }
    node = node.parentElement;
    depth++;
  }
  return parts.join(' > ');
}

// ───────────────────────────────────────────────────────────
// SCAN PAGE
// ───────────────────────────────────────────────────────────

/**
 * Scan the entire document for visible, fillable fields.
 * SmartFill's own UI elements are excluded via isSmartFillOwned().
 *
 * @param {string} [domain]  — defaults to window.location.hostname
 * @returns {FieldInfo[]}    — deduplicated by fingerprint
 *
 * @typedef {{
 *   el:          Element,
 *   fingerprint: string,
 *   label:       string,
 *   rawLabel:    string,
 *   fieldType:   string,
 *   type:        string,   // alias of fieldType — consumed by autofiller.js
 *   selector:    string,   // CSS path — consumed by executor.js findElement()
 * }} FieldInfo
 */
export function scanFields(domain) {
  const d = domain || window.location.hostname;

  const candidates = [
    ...document.querySelectorAll(INPUT_SELECTOR),
    ...document.querySelectorAll(ROLE_SELECTOR),
  ];

  const seen   = new Set();
  const fields = [];

  for (const el of candidates) {
    if (!isVisible(el)) continue;

    const { fingerprint, label, rawLabel, fieldType } = fingerprintField(el, d);

    // Skip fields with no usable label
    if (!fingerprint) continue;

    // ── Self-exclusion: skip SmartFill's own UI elements ──────────────
    if (isSmartFillOwned(el, label)) continue;

    // Deduplicate by fingerprint
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);

    fields.push({
      el,
      fingerprint,
      label,
      rawLabel,
      fieldType,
      type:     fieldType,
      selector: buildSelector(el),
    });
  }

  console.log(`[Scanner] scanFields() → ${fields.length} fields on ${d}`);
  return fields;
}


/**
 * Observe DOM mutations and re-scan when new nodes are added.
 * Calls callback(newFields) with any newly discovered fields.
 *
 * @param {Function} callback  — called with FieldInfo[]
 * @param {string}   [domain]
 * @returns {MutationObserver} — call .disconnect() to stop
 */
export function observeNewFields(callback, domain) {
  let debounceTimer = null;
  const knownFingerprints = new Set();

  scanFields(domain).forEach(f => knownFingerprints.add(f.fingerprint));

  const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const current   = scanFields(domain);
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
