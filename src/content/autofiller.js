/**
 * autofiller.js — SmartFill A6 (patched)
 * Full lifecycle logging for focus → match → tooltip → fill.
 *
 * Fix (Issue 2): nativeSet now fires a proper InputEvent with data
 * payload + KeyboardEvent pair so Angular/Polymer (Google Forms)
 * registers the programmatic value change in its internal model.
 *
 * Fix (Issue 3): el.focus() is called before nativeSet so Google
 * Forms activates the field's internal model before we write to it.
 * Without this the value is written to a dormant input that the
 * framework ignores.
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

/**
 * nativeSet — write a value into a framework-controlled input.
 *
 * Plain `el.value = x` is silently ignored by Angular/Polymer inputs
 * (like Google Forms) because they hold the true value in their
 * internal model. We must:
 *   1. Call focus() so the framework activates the field.
 *   2. Use the native HTMLInputElement setter to bypass any
 *      framework override of the value property.
 *   3. Fire an InputEvent (not a bare Event) with the data payload —
 *      Angular/Polymer listen for InputEvent.data, not generic 'input'.
 *   4. Fire a keydown+keyup pair — Google Forms' model update is
 *      gated on keyboard interaction.
 *   5. Fire 'change' to finalize.
 */
function nativeSet(el, value) {
  const str = String(value);
  const proto = el.tagName === 'TEXTAREA'
    ? window.HTMLTextAreaElement.prototype
    : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;

  // Step 1: activate the field so the framework initialises its model
  el.focus();

  // Step 2: write the value via the native setter
  if (setter) setter.call(el, str); else el.value = str;

  // Step 3: InputEvent with data payload (Angular/Polymer require this)
  el.dispatchEvent(new InputEvent('input', {
    bubbles: true,
    cancelable: true,
    data: str,
    inputType: 'insertText',
  }));

  // Step 4: keyboard events — Google Forms gates model update on these
  ['keydown', 'keyup'].forEach(evtName => {
    el.dispatchEvent(new KeyboardEvent(evtName, {
      bubbles: true,
      cancelable: true,
      key: str.slice(-1) || ' ',
      code: 'KeyA',
    }));
  });

  // Step 5: change event to finalize
  el.dispatchEvent(new Event('change', { bubbles: true }));

  console.log(`[Autofiller][${FRAME_TYPE}] nativeSet complete → "${str}" on ${el.tagName}`);
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
