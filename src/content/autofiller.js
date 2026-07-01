/**
 * autofiller.js — SmartFill A5
 * ─────────────────────────────────────────────────────────
 * Attaches focus listeners to scanned fields.
 * On focus:
 *   1. Matches field → profile value via profileMatcher
 *   2. If match found and field is still empty → fills it
 *   3. Dispatches native input + change events so React/Vue
 *      controlled components pick up the value
 *   4. Briefly shows an inline "SmartFill ✓" indicator
 *   5. Bails silently if field already has a value
 */

import { matchFieldToProfile, loadProfile } from './profileMatcher.js';

const DOMAIN = window.location.hostname;

// Cache profile for the lifetime of the content script
let _profileCache = null;
async function getProfile() {
  if (!_profileCache) _profileCache = await loadProfile();
  return _profileCache;
}

// ───────────────────────────────────────────────────────────
// Native value setter (bypasses React's synthetic events)
// ───────────────────────────────────────────────────────────

function nativeSet(el, value) {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype, 'value'
  )?.set || Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype, 'value'
  )?.set;

  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(el, value);
  } else {
    el.value = value;
  }

  el.dispatchEvent(new Event('input',  { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

// ───────────────────────────────────────────────────────────
// Ghost / indicator badge
// ───────────────────────────────────────────────────────────

function showBadge(el) {
  const existing = el.parentElement?.querySelector('.sf-badge');
  if (existing) return;

  const badge = document.createElement('span');
  badge.className    = 'sf-badge';
  badge.textContent  = 'SmartFill ✓';
  badge.style.cssText = [
    'position:absolute',
    'right:8px',
    'top:50%',
    'transform:translateY(-50%)',
    'font-size:10px',
    'color:#22c55e',
    'background:rgba(0,0,0,0.06)',
    'padding:2px 6px',
    'border-radius:4px',
    'pointer-events:none',
    'z-index:99999',
    'font-family:sans-serif',
    'letter-spacing:0.3px',
  ].join(';');

  // Ensure parent has position
  const parent = el.parentElement;
  if (parent) {
    const pos = getComputedStyle(parent).position;
    if (pos === 'static') parent.style.position = 'relative';
    parent.appendChild(badge);
  }

  setTimeout(() => badge.remove(), 2500);
}

// ───────────────────────────────────────────────────────────
// Core: attach focus listener to a single FieldInfo
// ───────────────────────────────────────────────────────────

const _attached = new WeakSet();

export function attachAutofiller(fieldInfo) {
  const el = fieldInfo.element;
  if (!el || _attached.has(el)) return;
  _attached.add(el);

  el.addEventListener('focus', async () => {
    // Skip if already has content
    if (el.value && el.value.trim() !== '') return;

    const profile = await getProfile();
    const value   = matchFieldToProfile(fieldInfo, profile);

    if (!value) return;

    console.log(`[Autofiller] filling "${fieldInfo.label}" → "${value}" on ${DOMAIN}`);

    nativeSet(el, value);
    showBadge(el);
  });
}

/**
 * Attach autofill-on-focus to an array of FieldInfo objects.
 * @param {import('./fieldScanner.js').FieldInfo[]} fields
 */
export function attachAllAutofillers(fields) {
  let count = 0;
  for (const f of fields) {
    attachAutofiller(f);
    count++;
  }
  if (count > 0) {
    console.log(`[Autofiller] attached to ${count} field(s) on ${DOMAIN}`);
  }
}
