/**
 * Autofill Executor
 * Programmatically fills form fields with matched profile values
 * Triggers proper DOM events for validation
 */

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Find form field element using multiple selector strategies
 * @param {Object} match - Match object with selector info
 * @returns {HTMLElement|null}
 */
function findElement(match) {
  // Strategy 1: Use provided CSS selector
  if (match.formFieldSelector) {
    try {
      const element = document.querySelector(match.formFieldSelector);
      if (element) return element;
    } catch (error) {
      console.warn('[Executor] Invalid selector:', match.formFieldSelector);
    }
  }
  
  // Strategy 2: Try ID selector
  if (match.formFieldId) {
    const element = document.getElementById(match.formFieldId);
    if (element) return element;
  }
  
  // Strategy 3: Try name attribute
  if (match.formFieldId) {
    try {
      const element = document.querySelector(`[name="${match.formFieldId}"]`);
      if (element) return element;
    } catch (error) {
      // Invalid name attribute, skip
    }
  }
  
  return null;
}

/**
 * Check if element is fillable
 * @param {HTMLElement} element
 * @returns {Object} { fillable: boolean, reason: string }
 */
function isElementFillable(element) {
  if (!element) {
    return { fillable: false, reason: 'Element not found' };
  }
  
  // Check if disabled
  if (element.disabled) {
    return { fillable: false, reason: 'Element is disabled' };
  }
  
  // Check if readonly
  if (element.readOnly) {
    return { fillable: false, reason: 'Element is read-only' };
  }
  
  // Check visibility - offsetWidth/offsetHeight
  if (element.offsetWidth === 0 || element.offsetHeight === 0) {
    return { fillable: false, reason: 'Element is hidden' };
  }
  
  // Check computed style
  try {
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') {
      return { fillable: false, reason: 'Element is hidden (CSS)' };
    }
  } catch (error) {
    // Style check failed, but element might still be fillable
  }
  
  // Check if file input (not supported due to security)
  if (element.type === 'file') {
    return { fillable: false, reason: 'File input not supported' };
  }
  
  return { fillable: true, reason: null };
}

/**
 * Set element value with type-specific handling
 * @param {HTMLElement} element
 * @param {any} value
 * @param {string} fieldType
 * @returns {boolean} success
 */
function setValue(element, value, fieldType) {
  try {
    // Handle empty values
    if (value === null || value === undefined || value === '') {
      return false;
    }
    
    // Convert arrays to strings (for skills)
    if (Array.isArray(value)) {
      value = value.join(', ');
    }
    
    // Convert to string
    const stringValue = String(value);
    
    // Type-specific setting
    const tagName = element.tagName.toLowerCase();
    
    if (tagName === 'select') {
      // Handle select elements
      const options = Array.from(element.options);
      const matchingOption = options.find(opt => 
        opt.value === stringValue || 
        opt.text === stringValue ||
        opt.value.toLowerCase() === stringValue.toLowerCase() ||
        opt.text.toLowerCase() === stringValue.toLowerCase()
      );
      
      if (matchingOption) {
        element.value = matchingOption.value;
        return true;
      } else {
        // No matching option found
        return false;
      }
    } else if (tagName === 'input' || tagName === 'textarea') {
      // Handle input and textarea
      element.value = stringValue;
      
      // Verify value was set
      if (element.value !== stringValue) {
        return false;
      }
      
      return true;
    } else {
      // Unknown element type
      element.value = stringValue;
      return true;
    }
    
  } catch (error) {
    console.error('[Executor] setValue error:', error);
    return false;
  }
}

/**
 * Trigger all necessary events on element
 * @param {HTMLElement} element
 */
function triggerEvents(element) {
  try {
    // Focus event (some forms need this first)
    const focusEvent = new Event('focus', { 
      bubbles: true, 
      cancelable: true 
    });
    element.dispatchEvent(focusEvent);
    
    // Input event (for live validation)
    const inputEvent = new Event('input', { 
      bubbles: true, 
      cancelable: true 
    });
    element.dispatchEvent(inputEvent);
    
    // Change event (for form state)
    const changeEvent = new Event('change', { 
      bubbles: true, 
      cancelable: true 
    });
    element.dispatchEvent(changeEvent);
    
    // Blur event (for on-exit validation)
    const blurEvent = new Event('blur', { 
      bubbles: true, 
      cancelable: true 
    });
    element.dispatchEvent(blurEvent);
    
  } catch (error) {
    console.error('[Executor] Event trigger error:', error);
  }
}

/**
 * Fill a single form field
 * @param {Object} match - Match object
 * @returns {Object} { success: boolean, reason: string, skipped: boolean }
 */
function fillSingleField(match) {
  // Find element
  const element = findElement(match);
  
  if (!element) {
    return { 
      success: false, 
      reason: 'Element not found',
      label: match.formFieldLabel,
      skipped: false
    };
  }
  
  // Check if fillable
  const { fillable, reason } = isElementFillable(element);
  
  if (!fillable) {
    return { 
      success: false, 
      reason: reason,
      label: match.formFieldLabel,
      skipped: true // Mark as skipped, not failed
    };
  }
  
  // Set value
  const valueSet = setValue(element, match.profileValue, match.formFieldType);
  
  if (!valueSet) {
    return { 
      success: false, 
      reason: 'Failed to set value',
      label: match.formFieldLabel,
      skipped: false
    };
  }
  
  // Trigger events
  triggerEvents(element);
  
  // Success
  return { 
    success: true, 
    reason: null,
    label: match.formFieldLabel,
    skipped: false
  };
}

// ============================================
// MAIN EXECUTION FUNCTION
// ============================================

/**
 * Execute autofill for all matched fields
 * @param {Array} matches - Array of match objects
 * @returns {Object} Execution results
 */
export function executeAutofill(matches) {
  const startTime = Date.now();
  
  console.log(`[Executor] Starting autofill for ${matches.length} fields`);
  
  // Validate input
  if (!Array.isArray(matches) || matches.length === 0) {
    console.error('[Executor] Invalid matches array');
    return {
      success: false,
      successCount: 0,
      totalFields: 0,
      failedFields: [],
      skippedFields: [],
      executionTime: 0,
      error: 'Invalid matches array'
    };
  }
  
  // Results tracking
  const results = {
    successCount: 0,
    failedFields: [],
    skippedFields: []
  };
  
  // Process each match
  matches.forEach((match, index) => {
    console.log(`[Executor] Processing field ${index + 1}/${matches.length}: ${match.formFieldLabel}`);
    
    const result = fillSingleField(match);
    
    if (result.success) {
      results.successCount++;
      console.log(`  ✅ Filled: ${match.formFieldLabel}`);
    } else if (result.skipped) {
      results.skippedFields.push({
        label: result.label,
        reason: result.reason,
        selector: match.formFieldSelector
      });
      console.log(`  ⏭️ Skipped: ${match.formFieldLabel} (${result.reason})`);
    } else {
      results.failedFields.push({
        label: result.label,
        reason: result.reason,
        selector: match.formFieldSelector
      });
      console.log(`  ❌ Failed: ${match.formFieldLabel} (${result.reason})`);
    }
  });
  
  const executionTime = Date.now() - startTime;
  
  // Summary
  console.log(`[Executor] Autofill complete:`);
  console.log(`  Success: ${results.successCount}/${matches.length}`);
  console.log(`  Failed: ${results.failedFields.length}`);
  console.log(`  Skipped: ${results.skippedFields.length}`);
  console.log(`  Time: ${executionTime}ms`);
  
  return {
    success: results.successCount > 0,
    successCount: results.successCount,
    totalFields: matches.length,
    failedFields: results.failedFields,
    skippedFields: results.skippedFields,
    executionTime
  };
}
