/**
 * autofiller.js — SmartFill A7
 *
 * Wired to simpleMapper + executor for end-to-end filling.
 *
 * Flow on field focus:
 *   1. Load profile (DEV or IDB)
 *   2. Build a single-field formData stub
 *   3. simpleMapProfileToForm() → produces a match with profileValue
 *   4. executeAutofill([match]) → nativeSet + full event sequence
 *
 * Handles:
 *   - <input> / <textarea>  via executor nativeSet
 *   - Native <select>        via executor setValue
 *   - Google Forms custom SELECT (DIV role=listbox) via handleSelectFill
 */

import { loadProfile as loadProfileFromMatcher } from './profileMatcher.js';
import { showTooltip, hideTooltip }               from './tooltip.js';
import { simpleMapProfileToForm }                  from '../engine/simpleMapper.js';
import { executeAutofill }                         from './executor.js';

const DOMAIN     = window.location.hostname;
const IS_IFRAME  = window.self !== window.top;
const FRAME_TYPE = IS_IFRAME ? 'IFRAME' : 'TOP';

// ── Profile cache ────────────────────────────────────────────────────────────
let _profileCache = null;
async function getProfile() {
  if (!_profileCache) {
    console.log(`[Autofiller][${FRAME_TYPE}] loading profile...`);
    _profileCache = await loadProfileFromMatcher();
    console.log(`[Autofiller][${FRAME_TYPE}] profile loaded — keys:`, Object.keys(_profileCache || {}).join(', ').slice(0, 120));
  }
  return _profileCache;
}

// ── Google Forms custom SELECT handler ───────────────────────────────────────
// Google Forms renders dropdowns as <div role="listbox"> with <div role="option">
// children. Clicking the wrapper opens it, then we click the matching option.
function handleSelectFill(el, value) {
  // Try native <select> first
  if (el.tagName === 'SELECT') {
    const opt = Array.from(el.options).find(o =>
      o.value.toLowerCase() === String(value).toLowerCase() ||
      o.text.toLowerCase()  === String(value).toLowerCase()
    );
    if (opt) {
      el.value = opt.value;
      el.dispatchEvent(new Event('change', { bubbles: true }));
      console.log(`[Autofiller][${FRAME_TYPE}] native <select> filled → "${opt.text}"`);
      return true;
    }
    console.warn(`[Autofiller][${FRAME_TYPE}] native <select> — no option matched "${value}"`);
    return false;
  }

  // Google Forms custom listbox: find the wrapper div with role=listbox
  // and click the matching option child
  const container = el.closest('[role="listbox"]') || el;
  const options = container.querySelectorAll('[role="option"], [data-value]');
  if (options.length === 0) {
    console.warn(`[Autofiller][${FRAME_TYPE}] no option elements found in select widget`);
    return false;
  }

  // Open the dropdown by clicking the container
  el.click();
  el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

  // Find and click the matching option
  const norm = String(value).toLowerCase().trim();
  for (const opt of options) {
    const text = (opt.textContent || opt.getAttribute('data-value') || '').toLowerCase().trim();
    if (text === norm || text.includes(norm) || norm.includes(text)) {
      setTimeout(() => {
        opt.click();
        opt.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        console.log(`[Autofiller][${FRAME_TYPE}] custom listbox clicked option → "${opt.textContent.trim()}"`);
      }, 150);
      return true;
    }
  }

  console.warn(`[Autofiller][${FRAME_TYPE}] custom listbox — no option matched "${value}"`);
  return false;
}

// ── Badge ─────────────────────────────────────────────────────────────────────
function showBadge(el) {
  if (el.parentElement?.querySelector('.sf-badge')) return;
  const badge = document.createElement('span');
  badge.className   = 'sf-badge';
  badge.textContent = 'SmartFill ✓';
  badge.style.cssText = [
    'position:absolute','right:8px','top:50%',
    'transform:translateY(-50%)','font-size:10px',
    'color:#22c55e','background:rgba(0,0,0,0.06)',
    'padding:2px 6px','border-radius:4px',
    'pointer-events:none','z-index:99999',
    'font-family:sans-serif','letter-spacing:0.3px',
  ].join(';');
  const parent = el.parentElement;
  if (parent) {
    if (getComputedStyle(parent).position === 'static')
      parent.style.position = 'relative';
    parent.appendChild(badge);
  }
  setTimeout(() => badge.remove(), 2500);
}

// ── Core: run the full match → fill pipeline for one field ───────────────────
async function runAutofill(fieldInfo, el) {
  const rawProfile = await getProfile();

  // Build a minimal formData object for simpleMapper
  const formData = {
    url: window.location.href,
    forms: [{
      id: 'sf-single',
      hasCaptcha: false,
      fields: [{
        id:            el.id         || '',
        name:          el.name       || '',
        label:         fieldInfo.label        || '',
        ariaLabel:     fieldInfo.ariaLabel    || el.getAttribute('aria-label') || '',
        placeholder:   el.placeholder         || fieldInfo.placeholder || '',
        type:          fieldInfo.type         || el.type || 'text',
        selector:      fieldInfo.selector     || '',
        selectorIndex: typeof fieldInfo.selectorIndex === 'number' ? fieldInfo.selectorIndex : 0,
      }]
    }]
  };

  // simpleMapper expects the NESTED profile (profile.personal / .education etc)
  // rawProfile is the full DEV_PROFILE.profile object or IDB record
  const innerProfile = rawProfile.personal ? rawProfile : (rawProfile.profile || rawProfile);

  console.log(`[Autofiller][${FRAME_TYPE}] simpleMapper running for label="${fieldInfo.label}"`);
  const result = simpleMapProfileToForm(innerProfile, formData);
  console.log(`[Autofiller][${FRAME_TYPE}] simpleMapper result:`, result.matches.length, 'match(es)');

  if (!result.matches.length) {
    console.warn(`[Autofiller][${FRAME_TYPE}] ⚠ no match found for label="${fieldInfo.label}"`);
    return null;
  }

  const match = result.matches[0];
  console.log(`[Autofiller][${FRAME_TYPE}] matched → profilePath="${match.profilePath}" value="${match.profileValue}"`);
  return match;
}

// ── WeakSet to avoid double-attaching ────────────────────────────────────────
const _attached = new WeakSet();

export function attachAutofiller(fieldInfo) {
  const el = fieldInfo.element || fieldInfo.el;
  if (!el || _attached.has(el)) return;
  _attached.add(el);

  const isSelect = fieldInfo.type === 'select' || el.tagName === 'SELECT' ||
                   el.getAttribute('role') === 'listbox';

  console.log(`[Autofiller][${FRAME_TYPE}] attachAutofiller → label="${fieldInfo.label}" el=${el.tagName} type=${fieldInfo.type} on ${DOMAIN}`);

  el.addEventListener('focus', async () => {
    console.log(`[Autofiller][${FRAME_TYPE}] FOCUS on label="${fieldInfo.label}" current value="${el.value}"`);

    // Skip already-filled text inputs
    if (!isSelect && el.value && el.value.trim() !== '') {
      console.log(`[Autofiller][${FRAME_TYPE}] already filled — skipping`);
      return;
    }

    const match = await runAutofill(fieldInfo, el);
    if (!match) return;

    const rect    = el.getBoundingClientRect();
    const visible = rect.width > 0 && rect.height > 0 &&
                    rect.top < window.innerHeight && rect.bottom > 0;

    if (isSelect) {
      // Select fields: fill directly without tooltip
      console.log(`[Autofiller][${FRAME_TYPE}] SELECT fill → "${match.profileValue}"`);
      const ok = handleSelectFill(el, match.profileValue);
      if (ok) showBadge(el);
      return;
    }

    if (visible) {
      console.log(`[Autofiller][${FRAME_TYPE}] showing tooltip for label="${fieldInfo.label}"`);
      showTooltip(el, { label: fieldInfo.label, value: match.profileValue }, (accepted) => {
        console.log(`[Autofiller][${FRAME_TYPE}] ✅ user accepted → filling "${fieldInfo.label}" = "${accepted}"`);
        // Update match value in case user edited it in the tooltip
        match.profileValue = accepted;
        executeAutofill([match]);
        showBadge(el);
      });
    } else {
      console.log(`[Autofiller][${FRAME_TYPE}] offscreen — silent fill "${fieldInfo.label}" → "${match.profileValue}"`);
      executeAutofill([match]);
    }
  });

  el.addEventListener('blur', () => {
    setTimeout(() => hideTooltip(), 300);
  });
}

export function attachAllAutofillers(fields) {
  console.log(`[Autofiller][${FRAME_TYPE}] attachAllAutofillers → ${fields.length} field(s)`);
  let count = 0;
  for (const f of fields) { attachAutofiller(f); count++; }
  if (count > 0) console.log(`[Autofiller][${FRAME_TYPE}] attached listeners to ${count} field(s)`);
}
