/**
 * hoverListener.js
 * ────────────────
 * Replaces the old focus→single-tooltip UX with hover→multi-suggestion card.
 *
 * FIX: onChoose callback now calls fillElementDirectly so clicking a
 * suggestion actually fills the field instead of just logging it.
 *
 * Behaviour:
 *  - Listens for mouseenter on every tracked field element
 *  - 300ms debounce prevents card flickering on fast mouse movement
 *  - Reads IDB field_memory via getTopSuggestions(fingerprint, 5)
 *  - Falls back to profileValue when IDB is empty
 *  - On mouseleave starts a 200ms grace timer
 */

import { getTopSuggestions }  from '../storage/idb.js';
import { SuggestionBox }      from './suggestionBox.js';

const TAG = '[HoverListener]';

const SHOW_DELAY_MS  = 300;
const LEAVE_GRACE_MS = 200;

const _showTimers = new WeakMap();
const _hideTimers = new WeakMap();

/**
 * Directly fill a form element, dispatching all React/Angular-compatible events.
 * Mirrors autofiller.js fillElementDirectly — kept local to avoid a circular dep.
 *
 * @param {HTMLElement} el
 * @param {string}      value
 */
function fillElementDirectly(el, value) {
  const str = String(value);
  const tag  = el.tagName.toLowerCase();
  try {
    el.focus();
    if (tag === 'select') {
      const opt = Array.from(el.options).find(
        o => o.value.toLowerCase() === str.toLowerCase() ||
             o.text.toLowerCase()  === str.toLowerCase()
      );
      if (opt) {
        el.value = opt.value;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
      return;
    }
    const proto = tag === 'textarea'
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    if (desc && desc.set) desc.set.call(el, str);
    else el.value = str;

    el.dispatchEvent(new InputEvent('input',  { bubbles: true, cancelable: true, data: str, inputType: 'insertText' }));
    el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: str.slice(-1) || ' ', code: 'KeyA' }));
    el.dispatchEvent(new KeyboardEvent('keyup',   { bubbles: true, cancelable: true, key: str.slice(-1) || ' ', code: 'KeyA' }));
    el.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    el.dispatchEvent(new Event('blur',   { bubbles: true, cancelable: true }));
    console.log(`${TAG} fillElementDirectly ✅ "${str}" → ${tag}`);
  } catch (e) {
    console.error(`${TAG} fillElementDirectly error:`, e);
  }
}

export function buildFingerprint(domain, label, fieldType) {
  const normalized = label.toLowerCase().trim();
  const fp = `${domain}::${normalized}::${fieldType}`;
  console.log(`${TAG} buildFingerprint → "${fp}"`);
  return fp;
}

/**
 * Attach hover listeners to an array of field descriptors.
 *
 * @param {Array<{
 *   el: HTMLElement,
 *   label: string,
 *   fieldType: string,
 *   profileValue?: string
 * }>} fields
 */
export function attachHoverListeners(fields) {
  const domain = window.location.hostname;
  console.log(`${TAG} attachHoverListeners → ${fields.length} field(s) on ${domain}`);

  fields.forEach(({ el, label, fieldType, profileValue }) => {
    console.log(`${TAG}   attaching to label="${label}" type=${fieldType} el=${el.tagName}`);

    el.addEventListener('mouseenter', () => {
      console.log(`${TAG} mouseenter → label="${label}"`);

      const hideTimer = _hideTimers.get(el);
      if (hideTimer) {
        clearTimeout(hideTimer);
        _hideTimers.delete(el);
      }

      const prevShow = _showTimers.get(el);
      if (prevShow) clearTimeout(prevShow);

      const timer = setTimeout(async () => {
        _showTimers.delete(el);

        const fingerprint = buildFingerprint(domain, label, fieldType);
        let suggestions;

        try {
          suggestions = await getTopSuggestions(fingerprint, 5);
          console.log(`${TAG} IDB returned ${suggestions.length} suggestion(s) for "${label}"`);
        } catch (err) {
          console.error(`${TAG} IDB read failed for "${label}"`, err);
          suggestions = [];
        }

        if (suggestions.length === 0 && profileValue) {
          suggestions = [{ value: profileValue, usedCount: 0, lastUsed: null, score: 0, source: 'profile' }];
        }

        if (suggestions.length === 0) {
          console.log(`${TAG} no suggestions for "${label}" — skipping box`);
          return;
        }

        // FIX: onChoose now actually fills the field
        SuggestionBox.showFor(el, suggestions, (chosenValue) => {
          console.log(`${TAG} user chose "${chosenValue}" for "${label}" — filling now`);
          fillElementDirectly(el, chosenValue);
        });

      }, SHOW_DELAY_MS);

      _showTimers.set(el, timer);
    });

    el.addEventListener('mouseleave', () => {
      const showTimer = _showTimers.get(el);
      if (showTimer) {
        clearTimeout(showTimer);
        _showTimers.delete(el);
      }

      const hideTimer = setTimeout(() => {
        _hideTimers.delete(el);
        if (!SuggestionBox.isHovered()) SuggestionBox.hide();
      }, LEAVE_GRACE_MS);

      _hideTimers.set(el, hideTimer);
    });
  });

  console.log(`${TAG} attachHoverListeners complete — ${fields.length} field(s) wired`);
}

export function detachHoverListener(el) {
  const s = _showTimers.get(el);
  const h = _hideTimers.get(el);
  if (s) { clearTimeout(s); _showTimers.delete(el); }
  if (h) { clearTimeout(h); _hideTimers.delete(el); }
}
