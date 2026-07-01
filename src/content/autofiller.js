/**
 * autofiller.js — SmartFill A6 (patched)
 * Full lifecycle logging for focus → match → tooltip → fill.
 */

import { matchFieldToProfile, loadProfile } from './profileMatcher.js';
import { showTooltip, hideTooltip }         from './tooltip.js';

const DOMAIN     = window.location.hostname;
const IS_IFRAME  = window.self !== window.top;
const FRAME_TYPE = IS_IFRAME ? 'IFRAME' : 'TOP';

let _profileCache = null;
async function getProfile() {
  if (!_profileCache) {
    console.log(`[Autofiller][${FRAME_TYPE}] loading profile from storage...`);
    _profileCache = await loadProfile();
    console.log(`[Autofiller][${FRAME_TYPE}] profile loaded:`, JSON.stringify(_profileCache).slice(0, 120));
  }
  return _profileCache;
}

function nativeSet(el, value) {
  const proto = el.tagName === 'TEXTAREA'
    ? window.HTMLTextAreaElement.prototype
    : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) setter.call(el, value); else el.value = value;
  el.dispatchEvent(new Event('input',  { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

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

  console.log(`[Autofiller][${FRAME_TYPE}] attachAutofiller → label="${fieldInfo.label}" el=${el.tagName} on ${DOMAIN}`);

  el.addEventListener('focus', async () => {
    console.log(`[Autofiller][${FRAME_TYPE}] FOCUS on label="${fieldInfo.label}" value="${el.value}"`);

    if (el.value && el.value.trim() !== '') {
      console.log(`[Autofiller][${FRAME_TYPE}] field already filled — skipping`);
      return;
    }

    const profile = await getProfile();
    console.log(`[Autofiller][${FRAME_TYPE}] matching label="${fieldInfo.label}" against profile...`);
    const value = matchFieldToProfile(fieldInfo, profile);
    console.log(`[Autofiller][${FRAME_TYPE}] match result → "${value}"`);

    if (!value) {
      console.warn(`[Autofiller][${FRAME_TYPE}] ⚠ no profile match for label="${fieldInfo.label}"`);
      return;
    }

    const rect = el.getBoundingClientRect();
    const visible = rect.width > 0 && rect.height > 0 &&
                    rect.top < window.innerHeight && rect.bottom > 0;

    console.log(`[Autofiller][${FRAME_TYPE}] field visible=${visible} rect=${JSON.stringify({top:Math.round(rect.top),w:Math.round(rect.width),h:Math.round(rect.height)})}`);

    if (visible) {
      console.log(`[Autofiller][${FRAME_TYPE}] showing tooltip for label="${fieldInfo.label}" value="${value}"`);
      showTooltip(el, { label: fieldInfo.label, value }, (accepted) => {
        console.log(`[Autofiller][${FRAME_TYPE}] ✅ filled "${fieldInfo.label}" → "${accepted}" on ${DOMAIN}`);
        nativeSet(el, accepted);
        showBadge(el);
      });
    } else {
      console.log(`[Autofiller][${FRAME_TYPE}] field offscreen — silent fill "${fieldInfo.label}" → "${value}"`);
      nativeSet(el, value);
    }
  });

  // Increased to 300ms so tooltip click can register before hide fires.
  // tooltip.js also sets _pendingHide = false on mousedown to cancel the timer.
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
