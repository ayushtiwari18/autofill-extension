/**
 * fillRecorder.js — Record every user fill to IDB
 * ─────────────────────────────────────────────────────────
 * Attaches a 'change' listener to each scanned field.
 * On change: debounces 600ms then calls recordFill() to
 * write/update the field_memory entry in IDB.
 *
 * This is how SmartFill LEARNS what you type into each field.
 * After enough fills, it can suggest values (Phase 2).
 *
 * Does NOT read from IDB — write-only from content script.
 */

import { recordFill } from '../storage/idb.js';

const DEBOUNCE_MS = 600;

// WeakMap — stores pending debounce timer per element
const _timers = new WeakMap();

/**
 * Attach a record-on-change listener to a single FieldInfo.
 * Safe to call multiple times — replaces existing listener via
 * the WeakMap debounce.
 *
 * @param {{ el: Element, fingerprint: string, label: string,
 *           rawLabel: string, fieldType: string }} fieldInfo
 * @param {string} domain
 */
export function attachRecorder(fieldInfo, domain) {
  const { el, fingerprint, label, fieldType } = fieldInfo;
  if (!el || !fingerprint) return;

  const handler = () => {
    // Debounce — cancel previous pending write for this element
    clearTimeout(_timers.get(el));

    _timers.set(el, setTimeout(async () => {
      const value = getFieldValue(el);
      if (!value) return;  // skip empty fills

      try {
        await recordFill({ fingerprint, domain, label, fieldType, value });
        console.log(`[Recorder] recorded: "${value}" → ${fingerprint}`);
      } catch (err) {
        console.error('[Recorder] recordFill failed:', err);
      }
    }, DEBOUNCE_MS));
  };

  // 'change' fires on blur-after-edit for inputs/selects/textareas
  el.addEventListener('change', handler);

  // For text inputs also listen to 'input' so we catch programmatic fills
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
    el.addEventListener('input', handler);
  }
}

/**
 * Attach recorders to all fields in a FieldInfo array.
 *
 * @param {FieldInfo[]} fields
 * @param {string}      domain
 */
export function attachAllRecorders(fields, domain) {
  fields.forEach(f => attachRecorder(f, domain));
  console.log(`[Recorder] attached to ${fields.length} field(s) on ${domain}`);
}

// ───────────────────────────────────────────────────────────
// VALUE EXTRACTION
// ───────────────────────────────────────────────────────────

/**
 * Extract the current value from any supported field type.
 * Returns empty string if nothing useful is selected/entered.
 *
 * @param {Element} el
 * @returns {string}
 */
export function getFieldValue(el) {
  if (!el) return '';
  const tag  = el.tagName.toLowerCase();
  const role = (el.getAttribute('role') || '').toLowerCase();

  // Standard inputs & textarea
  if (tag === 'input' || tag === 'textarea') {
    return (el.value || '').trim();
  }

  // <select>
  if (tag === 'select') {
    return el.options[el.selectedIndex]?.text?.trim() || el.value.trim() || '';
  }

  // Google Forms radiogroup — find checked radio inside
  if (role === 'radiogroup') {
    const checked = el.querySelector('input[type="radio"]:checked');
    return checked ? (checked.value || checked.closest('label')?.textContent?.trim() || '') : '';
  }

  // Google Forms checkbox group — collect all checked values
  if (role === 'group') {
    const checked = [...el.querySelectorAll('input[type="checkbox"]:checked')];
    return checked.map(c => c.value || c.closest('label')?.textContent?.trim() || '').filter(Boolean).join(', ');
  }

  return (el.textContent || '').trim();
}
