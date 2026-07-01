/**
 * autofiller.js — SmartFill A6
 * Tooltip-first autofill on focus.
 */

import { matchFieldToProfile, loadProfile } from './profileMatcher.js';
import { showTooltip, hideTooltip }         from './tooltip.js';

const DOMAIN = window.location.hostname;

// Cache profile for the page lifetime
let _profileCache = null;
async function getProfile() {
  if (!_profileCache) _profileCache = await loadProfile();
  return _profileCache;
}

// React / Angular-safe value setter
function nativeSet(el, value) {
  const proto = el.tagName === 'TEXTAREA'
    ? window.HTMLTextAreaElement.prototype
    : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) setter.call(el, value); else el.value = value;
  el.dispatchEvent(new Event('input',  { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

// SmartFill ✓ badge (2.5s)
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

    // Check if field is visible enough for a tooltip
    const rect = el.getBoundingClientRect();
    const visible = rect.width > 0 && rect.height > 0 &&
                    rect.top < window.innerHeight && rect.bottom > 0;

    if (visible) {
      // Show suggestion tooltip — user clicks to accept
      showTooltip(el, { label: fieldInfo.label, value }, (accepted) => {
        console.log(`[Autofiller] filled "${fieldInfo.label}" → "${accepted}" on ${DOMAIN}`);
        nativeSet(el, accepted);
        showBadge(el);
      });
    } else {
      // Offscreen field (e.g. in shadow DOM) — silent fill
      console.log(`[Autofiller] filling (silent) "${fieldInfo.label}" → "${value}" on ${DOMAIN}`);
      nativeSet(el, value);
    }
  });

  // Hide tooltip when field loses focus (unless user is clicking the tip)
  el.addEventListener('blur', () => {
    setTimeout(() => hideTooltip(), 150);
  });
}

export function attachAllAutofillers(fields) {
  let count = 0;
  for (const f of fields) { attachAutofiller(f); count++; }
  if (count > 0) console.log(`[Autofiller] attached to ${count} field(s) on ${DOMAIN}`);
}
