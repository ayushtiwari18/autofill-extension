/**
 * hoverListener.js
 * ────────────────
 * Replaces the old focus→single-tooltip UX with hover→multi-suggestion card.
 *
 * Behaviour:
 *  - Listens for mouseenter on every tracked field element
 *  - 300ms debounce prevents card flickering on fast mouse movement
 *  - Builds fingerprint: "domain::normalizedLabel::fieldType"
 *  - Reads IDB field_memory via getTopSuggestions(fingerprint, 5)
 *  - If memory has entries  → passes them to SuggestionBox.showFor()
 *  - If memory is empty     → falls back to profileValue (from autofiller match)
 *    and wraps it as a single 'profile' source suggestion
 *  - On mouseleave starts a 200ms grace timer; cancelled if mouse re-enters
 *    either the field or the suggestion box
 *
 * Usage:
 *   import { attachHoverListeners } from './hoverListener.js';
 *   attachHoverListeners(fields);   // fields = array of { el, label, fieldType, profileValue }
 */

import { getTopSuggestions } from '../storage/idb.js';
import { SuggestionBox }     from './suggestionBox.js';

const TAG = '[HoverListener]';

// How long (ms) to wait before showing the box after mouseenter
const SHOW_DELAY_MS  = 300;
// How long (ms) to keep the box open after the mouse leaves the field
const LEAVE_GRACE_MS = 200;

// Tracks per-element timers so we can cancel them
const _showTimers  = new WeakMap();  // el → setTimeout id (show)
const _hideTimers  = new WeakMap();  // el → setTimeout id (hide)

/**
 * Build the fingerprint key used to look up field_memory in IDB.
 * Format: "domain::normalizedLabel::fieldType"
 *
 * @param {string} domain
 * @param {string} label
 * @param {string} fieldType
 * @returns {string}
 */
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

    // ── mouseenter: schedule show ────────────────────────────────────────
    el.addEventListener('mouseenter', () => {
      console.log(`${TAG} mouseenter → label="${label}"`);

      // Cancel any pending hide for this element
      const hideTimer = _hideTimers.get(el);
      if (hideTimer) {
        clearTimeout(hideTimer);
        _hideTimers.delete(el);
        console.log(`${TAG}   cancelled pending hide for "${label}"`);
      }

      // Cancel any previous pending show (re-hover before delay fired)
      const prevShow = _showTimers.get(el);
      if (prevShow) clearTimeout(prevShow);

      const timer = setTimeout(async () => {
        _showTimers.delete(el);
        console.log(`${TAG} SHOW_DELAY elapsed → loading suggestions for "${label}"`);

        const fingerprint = buildFingerprint(domain, label, fieldType);
        let suggestions;

        try {
          suggestions = await getTopSuggestions(fingerprint, 5);
          console.log(`${TAG} IDB returned ${suggestions.length} suggestion(s) for "${label}"`);
        } catch (err) {
          console.error(`${TAG} IDB read failed for "${label}"`, err);
          suggestions = [];
        }

        // Fallback: if IDB has nothing, wrap the profile value as a single suggestion
        if (suggestions.length === 0 && profileValue) {
          console.log(`${TAG} no IDB memory — falling back to profileValue="${profileValue}" for "${label}"`);
          suggestions = [{
            value:     profileValue,
            usedCount: 0,
            lastUsed:  null,
            score:     0,
            source:    'profile',
          }];
        }

        if (suggestions.length === 0) {
          console.log(`${TAG} no suggestions at all for "${label}" — skipping box`);
          return;
        }

        console.log(
          `${TAG} showing SuggestionBox for "${label}" with ${suggestions.length} item(s):`,
          suggestions.map(s => `"${s.value}" (${s.source})`)
        );

        SuggestionBox.showFor(el, suggestions, (chosenValue) => {
          console.log(`${TAG} user chose "${chosenValue}" for field "${label}"`);
        });

      }, SHOW_DELAY_MS);

      _showTimers.set(el, timer);
    });

    // ── mouseleave: schedule hide (with grace period) ─────────────────────
    el.addEventListener('mouseleave', () => {
      console.log(`${TAG} mouseleave → label="${label}" — starting ${LEAVE_GRACE_MS}ms grace timer`);

      // Cancel pending show if mouse leaves before delay fires
      const showTimer = _showTimers.get(el);
      if (showTimer) {
        clearTimeout(showTimer);
        _showTimers.delete(el);
        console.log(`${TAG}   cancelled pending show for "${label}" (left before delay)`);
      }

      const hideTimer = setTimeout(() => {
        _hideTimers.delete(el);
        console.log(`${TAG} grace elapsed → hiding SuggestionBox for "${label}"`);
        // Only hide if SuggestionBox isn't currently being hovered itself
        if (!SuggestionBox.isHovered()) {
          SuggestionBox.hide();
        } else {
          console.log(`${TAG}   SuggestionBox is hovered — not hiding`);
        }
      }, LEAVE_GRACE_MS);

      _hideTimers.set(el, hideTimer);
    });
  });

  console.log(`${TAG} attachHoverListeners complete — ${fields.length} field(s) wired`);
}

/**
 * Remove hover listeners from a single element (call when field is removed from DOM).
 * @param {HTMLElement} el
 */
export function detachHoverListener(el) {
  console.log(`${TAG} detachHoverListener → el=${el.tagName}`);
  const s = _showTimers.get(el);
  const h = _hideTimers.get(el);
  if (s) { clearTimeout(s); _showTimers.delete(el); }
  if (h) { clearTimeout(h); _hideTimers.delete(el); }
  // Note: removeEventListener requires references — callers should use AbortController
  // if they need full cleanup. Timer cleanup above prevents ghost shows/hides.
}
