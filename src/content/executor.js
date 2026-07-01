/**
 * Autofill Executor - Phase 8
 * Key fix: use querySelectorAll[index] when selector matches multiple elements
 * (Google Forms uses jsname="YPqjbf" on ALL inputs)
 *
 * Fix (Issue 4): triggerEvents() now fires a proper InputEvent with data
 * payload + KeyboardEvent pair, matching the same fix applied to
 * autofiller.js nativeSet(). Bare Event('input') is not enough for
 * Angular/Polymer-controlled inputs like Google Forms.
 */

// ─── helpers ────────────────────────────────────────────────────────────────

function findElement(match) {
  const { formFieldLabel, formFieldSelector, formFieldId, formFieldIndex } = match;
  console.log(`[Executor] findElement → label="${formFieldLabel}" selector="${formFieldSelector}" index=${formFieldIndex ?? 'n/a'}`);

  if (formFieldSelector) {
    try {
      const all = document.querySelectorAll(formFieldSelector);
      console.log(`  ℹ querySelectorAll("${formFieldSelector}") → ${all.length} element(s)`);

      if (all.length === 1) {
        console.log(`  ✔ Unique selector — using element directly`);
        return all[0];
      }

      if (all.length > 1) {
        if (typeof formFieldIndex === 'number' && formFieldIndex < all.length) {
          const el = all[formFieldIndex];
          console.log(`  ✔ Ambiguous selector — picked index [${formFieldIndex}]:`, el.outerHTML.slice(0, 120));
          return el;
        }
        console.warn(`  ⚠ Ambiguous selector but no index — falling back to [0]`);
        return all[0];
      }

      console.warn(`  ✘ selector found nothing: ${formFieldSelector}`);
    } catch (e) {
      console.warn(`  ✘ Invalid CSS selector: ${formFieldSelector}`, e.message);
    }
  }

  if (formFieldId) {
    const el = document.getElementById(formFieldId);
    if (el) { console.log(`  ✔ getElementById: #${formFieldId}`); return el; }
    try {
      const el2 = document.querySelector(`[name="${formFieldId}"]`);
      if (el2) { console.log(`  ✔ [name] fallback: ${formFieldId}`); return el2; }
    } catch {}
  }

  console.error(`  ✘ Element NOT FOUND for: "${formFieldLabel}"`);
  return null;
}

function isElementFillable(element) {
  if (!element) return { fillable: false, reason: 'Element not found' };
  if (element.disabled) return { fillable: false, reason: 'Element is disabled' };
  if (element.readOnly) return { fillable: false, reason: 'Element is read-only' };
  if (element.offsetWidth === 0 || element.offsetHeight === 0) return { fillable: false, reason: 'Element is hidden' };
  try {
    const s = window.getComputedStyle(element);
    if (s.display === 'none' || s.visibility === 'hidden') return { fillable: false, reason: 'Element is hidden (CSS)' };
  } catch {}
  if (element.type === 'file') return { fillable: false, reason: 'File input — upload manually' };
  return { fillable: true, reason: null };
}

function setValue(element, value) {
  try {
    if (value === null || value === undefined || value === '') {
      console.warn(`  ⚠ Empty value — skipping`);
      return false;
    }
    if (Array.isArray(value)) value = value.join(', ');
    const str = String(value);
    const tag = element.tagName.toLowerCase();
    console.log(`  ℹ setValue → tag=${tag} type=${element.type} value="${str}"`);

    if (tag === 'select') {
      const opt = Array.from(element.options).find(o =>
        o.value === str || o.text === str ||
        o.value.toLowerCase() === str.toLowerCase() ||
        o.text.toLowerCase() === str.toLowerCase()
      );
      if (opt) { element.value = opt.value; console.log(`  ✔ Select matched: "${opt.text}"`); return true; }
      console.warn(`  ✘ No option matched "${str}"`);
      return false;
    }

    if (tag === 'input' || tag === 'textarea') {
      // Step 1: activate the field so the framework initialises its model
      element.focus();

      const proto = tag === 'textarea' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      const desc = Object.getOwnPropertyDescriptor(proto, 'value');
      if (desc && desc.set) {
        desc.set.call(element, str);
        console.log(`  ℹ Native setter used`);
      } else {
        element.value = str;
        console.log(`  ℹ Direct .value assignment`);
      }
      if (element.value !== str) {
        console.error(`  ✘ Value mismatch — expected "${str}" got "${element.value}"`);
        return false;
      }
      console.log(`  ✔ Value confirmed: "${element.value}"`);
      return true;
    }

    element.value = str;
    return true;
  } catch (e) {
    console.error('[Executor] setValue error:', e);
    return false;
  }
}

/**
 * triggerEvents — fire the full event sequence needed for
 * Angular/Polymer (Google Forms) to register a programmatic fill.
 *
 * Fix (Issue 4): replaced bare Event('input') with:
 *   - InputEvent with data payload (Angular/Polymer listen to InputEvent.data)
 *   - KeyboardEvent keydown+keyup pair (Google Forms model update is
 *     gated on keyboard interaction)
 *   - Event('change') to finalize
 */
function triggerEvents(element) {
  try {
    const str = String(element.value || '');

    // InputEvent with data payload — required for Angular/Polymer
    element.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      data: str,
      inputType: 'insertText',
    }));

    // Keyboard events — Google Forms gates model update on these
    ['keydown', 'keyup'].forEach(evtName => {
      element.dispatchEvent(new KeyboardEvent(evtName, {
        bubbles: true,
        cancelable: true,
        key: str.slice(-1) || ' ',
        code: 'KeyA',
      }));
    });

    // change + blur to finalize
    element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    element.dispatchEvent(new Event('blur',   { bubbles: true, cancelable: true }));

    console.log(`  ✔ Events fired: InputEvent(data), keydown, keyup, change, blur`);
  } catch (e) {
    console.error('[Executor] triggerEvents error:', e);
  }
}

function fillSingleField(match) {
  console.log(`\n[Executor] ── Field: "${match.formFieldLabel}" (index=${match.formFieldIndex ?? 'n/a'}) ──`);
  console.log(`  value: ${JSON.stringify(match.profileValue)}`);

  const el = findElement(match);
  if (!el) return { success: false, reason: 'Element not found', label: match.formFieldLabel };

  const { fillable, reason } = isElementFillable(el);
  if (!fillable) return { success: false, reason, label: match.formFieldLabel, skipped: true };

  const ok = setValue(el, match.profileValue);
  if (!ok) return { success: false, reason: 'setValue failed', label: match.formFieldLabel };

  triggerEvents(el);
  console.log(`  ✅ Filled: "${match.formFieldLabel}"`);
  return { success: true, label: match.formFieldLabel };
}

// ─── main export ────────────────────────────────────────────────────────────

export function executeAutofill(matches) {
  const t0 = Date.now();
  console.log(`\n[Executor] ════════ autofill START — ${matches.length} field(s) ════════`);

  if (!Array.isArray(matches) || matches.length === 0) {
    console.error('[Executor] Empty matches array');
    return { success: false, successCount: 0, totalFields: 0, failedFields: [], skippedFields: [], executionTime: 0 };
  }

  const failed = [], skipped = [];
  let ok = 0;

  matches.forEach((match, i) => {
    console.log(`\n[Executor] ── ${i+1}/${matches.length}: "${match.formFieldLabel}" ──`);
    const r = fillSingleField(match);
    if (r.success) ok++;
    else if (r.skipped) skipped.push(r);
    else failed.push(r);
  });

  const ms = Date.now() - t0;
  console.log(`\n[Executor] ════════ autofill DONE ════════`);
  console.log(`  ✅ ${ok}/${matches.length} filled  ❌ ${failed.length} failed  ⏭ ${skipped.length} skipped  ⏱ ${ms}ms`);
  if (failed.length) console.error('  Failed:', failed.map(f => f.label));

  return { success: ok > 0, successCount: ok, totalFields: matches.length, failedFields: failed, skippedFields: skipped, executionTime: ms };
}
