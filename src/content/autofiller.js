/**
 * autofiller.js — SmartFill A5 (patched)
 * Autofill-on-focus from user profile.
 */

import { matchFieldToProfile, loadProfile } from './profileMatcher.js';

const DOMAIN = window.location.hostname;

let _profileCache = null;
async function getProfile() {
  if (!_profileCache) _profileCache = await loadProfile();
  return _profileCache;
}

function nativeSet(el, value) {
  const nativeInputValueSetter =
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,  'value')?.set ||
    Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value')?.set;

  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(el, value);
  } else {
    el.value = value;
  }
  el.dispatchEvent(new Event('input',  { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

function showBadge(el) {
  const existing = el.parentElement?.querySelector('.sf-badge');
  if (existing) return;

  const badge = document.createElement('span');
  badge.className    = 'sf-badge';
  badge.textContent  = 'SmartFill ✓';
  badge.style.cssText = [
    'position:absolute', 'right:8px', 'top:50%',
    'transform:translateY(-50%)', 'font-size:10px',
    'color:#22c55e', 'background:rgba(0,0,0,0.06)',
    'padding:2px 6px', 'border-radius:4px',
    'pointer-events:none', 'z-index:99999',
    'font-family:sans-serif', 'letter-spacing:0.3px',
  ].join(';');

  const parent = el.parentElement;
  if (parent) {
    const pos = getComputedStyle(parent).position;
    if (pos === 'static') parent.style.position = 'relative';
    parent.appendChild(badge);
  }
  setTimeout(() => badge.remove(), 2500);
}

const _attached = new WeakSet();

export function attachAutofiller(fieldInfo) {
  const el = fieldInfo.element || fieldInfo.el;
  if (!el || _attached.has(el)) return;
  _attached.add(el);

  el.addEventListener('focus', async () => {
    if (el.value && el.value.trim() !== '') return;

    const profile = await getProfile();
    const value   = matchFieldToProfile(fieldInfo, profile);

    if (!value) {
      console.log(`[Autofiller] no profile match for label: "${fieldInfo.label}" on ${DOMAIN}`);
      return;
    }

    console.log(`[Autofiller] filling "${fieldInfo.label}" → "${value}" on ${DOMAIN}`);
    nativeSet(el, value);
    showBadge(el);
  });
}

export function attachAllAutofillers(fields) {
  let count = 0;
  for (const f of fields) {
    attachAutofiller(f);
    count++;
  }
  if (count > 0) console.log(`[Autofiller] attached to ${count} field(s) on ${DOMAIN}`);
}
