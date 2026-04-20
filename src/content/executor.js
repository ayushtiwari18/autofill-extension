/**
 * Autofill Executor
 * Programmatically fills form fields with matched profile values
 * Triggers proper DOM events for validation
 */

// ============================================
// HELPER FUNCTIONS
// ============================================

function findElement(match) {
  console.log(`[Executor] findElement → label="${match.formFieldLabel}" selector="${match.formFieldSelector}" id="${match.formFieldId}"`);

  if (match.formFieldSelector) {
    try {
      const el = document.querySelector(match.formFieldSelector);
      if (el) { console.log(`  ✔ Found via CSS selector: ${match.formFieldSelector}`); return el; }
      else { console.warn(`  ✘ CSS selector found nothing: ${match.formFieldSelector}`); }
    } catch (e) { console.warn(`  ✘ Invalid CSS selector: ${match.formFieldSelector}`, e.message); }
  }

  if (match.formFieldId) {
    const el = document.getElementById(match.formFieldId);
    if (el) { console.log(`  ✔ Found via getElementById: #${match.formFieldId}`); return el; }
    else { console.warn(`  ✘ getElementById found nothing: #${match.formFieldId}`); }
  }

  if (match.formFieldId) {
    try {
      const el = document.querySelector(`[name="${match.formFieldId}"]`);
      if (el) { console.log(`  ✔ Found via [name] attribute: ${match.formFieldId}`); return el; }
      else { console.warn(`  ✘ [name] selector found nothing: ${match.formFieldId}`); }
    } catch (e) {}
  }

  console.error(`  ✘ Element NOT FOUND for field: "${match.formFieldLabel}"`);
  return null;
}

function isElementFillable(element) {
  if (!element) return { fillable: false, reason: 'Element not found' };
  if (element.disabled) { console.warn(`  ⚠ Element disabled: ${element.id || element.name}`); return { fillable: false, reason: 'Element is disabled' }; }
  if (element.readOnly) { console.warn(`  ⚠ Element readOnly: ${element.id || element.name}`); return { fillable: false, reason: 'Element is read-only' }; }
  if (element.offsetWidth === 0 || element.offsetHeight === 0) { console.warn(`  ⚠ Element hidden (zero size): ${element.id || element.name}`); return { fillable: false, reason: 'Element is hidden' }; }

  try {
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') {
      console.warn(`  ⚠ Element hidden (CSS): ${element.id || element.name} display=${style.display} visibility=${style.visibility}`);
      return { fillable: false, reason: 'Element is hidden (CSS)' };
    }
  } catch (e) {}

  if (element.type === 'file') {
    console.warn(`  ⚠ File input detected — skipping autofill (browser security restriction). Upload manually.`);
    return { fillable: false, reason: 'File input — upload manually in the form' };
  }

  return { fillable: true, reason: null };
}

function setValue(element, value, fieldType) {
  try {
    if (value === null || value === undefined || value === '') {
      console.warn(`  ⚠ setValue called with empty value for element: ${element.id || element.name}`);
      return false;
    }

    if (Array.isArray(value)) {
      console.log(`  ℹ Value is array [${value.join(', ')}] — joining with ", "`);
      value = value.join(', ');
    }

    const stringValue = String(value);
    const tagName = element.tagName.toLowerCase();
    console.log(`  ℹ setValue → tag=${tagName} type=${element.type} targetValue="${stringValue}"`);

    if (tagName === 'select') {
      const options = Array.from(element.options);
      const match = options.find(opt =>
        opt.value === stringValue ||
        opt.text === stringValue ||
        opt.value.toLowerCase() === stringValue.toLowerCase() ||
        opt.text.toLowerCase() === stringValue.toLowerCase()
      );
      if (match) {
        element.value = match.value;
        console.log(`  ✔ Select option matched: "${match.text}" (value="${match.value}")`);
        return true;
      } else {
        console.warn(`  ✘ No matching <option> for value "${stringValue}". Available options: [${options.map(o => o.value).join(', ')}]`);
        return false;
      }
    }

    if (tagName === 'input' || tagName === 'textarea') {
      // Try native setter first (works with React controlled inputs)
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        tagName === 'textarea' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype,
        'value'
      );

      if (nativeInputValueSetter && nativeInputValueSetter.set) {
        nativeInputValueSetter.set.call(element, stringValue);
        console.log(`  ℹ Native setter used for ${tagName}`);
      } else {
        element.value = stringValue;
        console.log(`  ℹ Direct .value assignment used for ${tagName}`);
      }

      const afterValue = element.value;
      if (afterValue !== stringValue) {
        console.error(`  ✘ setValue MISMATCH on ${tagName}#${element.id || element.name}`);
        console.error(`    Expected : "${stringValue}"`);
        console.error(`    Got      : "${afterValue}"`);
        console.error(`    Possible cause: React controlled input rejecting value, maxLength, or input type constraint`);
        return false;
      }

      console.log(`  ✔ Value confirmed set: "${afterValue}"`);
      return true;
    }

    element.value = stringValue;
    return true;

  } catch (error) {
    console.error('[Executor] setValue threw an error:', error);
    return false;
  }
}

function triggerEvents(element) {
  try {
    console.log(`  ℹ Triggering events on ${element.tagName.toLowerCase()}#${element.id || element.name || '(no id)'}`);
    ['focus', 'input', 'change', 'blur'].forEach(eventName => {
      const event = new Event(eventName, { bubbles: true, cancelable: true });
      element.dispatchEvent(event);
    });
    // Also fire React-style synthetic event
    const reactInputEvent = new InputEvent('input', { bubbles: true, cancelable: true, data: element.value });
    element.dispatchEvent(reactInputEvent);
    console.log(`  ✔ Events fired: focus, input, change, blur + synthetic InputEvent`);
  } catch (error) {
    console.error('[Executor] Event trigger error:', error);
  }
}

function fillSingleField(match) {
  console.log(`\n[Executor] ── Field: "${match.formFieldLabel}" ──`);
  console.log(`  profileValue : ${JSON.stringify(match.profileValue)}`);
  console.log(`  formFieldType: ${match.formFieldType}`);

  const element = findElement(match);
  if (!element) return { success: false, reason: 'Element not found', label: match.formFieldLabel, skipped: false };

  const { fillable, reason } = isElementFillable(element);
  if (!fillable) return { success: false, reason, label: match.formFieldLabel, skipped: true };

  const valueSet = setValue(element, match.profileValue, match.formFieldType);
  if (!valueSet) return { success: false, reason: 'Failed to set value', label: match.formFieldLabel, skipped: false };

  triggerEvents(element);
  return { success: true, reason: null, label: match.formFieldLabel, skipped: false };
}

// ============================================
// MAIN EXECUTION FUNCTION
// ============================================

export function executeAutofill(matches) {
  const startTime = Date.now();
  console.log(`\n[Executor] ════════ Starting autofill for ${matches.length} fields ════════`);

  if (!Array.isArray(matches) || matches.length === 0) {
    console.error('[Executor] Invalid or empty matches array');
    return { success: false, successCount: 0, totalFields: 0, failedFields: [], skippedFields: [], executionTime: 0, error: 'Invalid matches array' };
  }

  const results = { successCount: 0, failedFields: [], skippedFields: [] };

  matches.forEach((match, index) => {
    console.log(`\n[Executor] Processing field ${index + 1}/${matches.length}: ${match.formFieldLabel}`);
    const result = fillSingleField(match);

    if (result.success) {
      results.successCount++;
      console.log(`  ✅ Filled: ${match.formFieldLabel}`);
    } else if (result.skipped) {
      results.skippedFields.push({ label: result.label, reason: result.reason, selector: match.formFieldSelector });
      console.log(`  ⏭️ Skipped: ${match.formFieldLabel} — ${result.reason}`);
    } else {
      results.failedFields.push({ label: result.label, reason: result.reason, selector: match.formFieldSelector });
      console.log(`  ❌ Failed: ${match.formFieldLabel} — ${result.reason}`);
    }
  });

  const executionTime = Date.now() - startTime;
  console.log(`\n[Executor] ════════ Autofill complete ════════`);
  console.log(`  ✅ Success : ${results.successCount}/${matches.length}`);
  console.log(`  ❌ Failed  : ${results.failedFields.length}`, results.failedFields.length ? results.failedFields : '');
  console.log(`  ⏭️ Skipped : ${results.skippedFields.length}`, results.skippedFields.length ? results.skippedFields : '');
  console.log(`  ⏱ Time    : ${executionTime}ms`);

  return {
    success: results.successCount > 0,
    successCount: results.successCount,
    totalFields: matches.length,
    failedFields: results.failedFields,
    skippedFields: results.skippedFields,
    executionTime
  };
}
