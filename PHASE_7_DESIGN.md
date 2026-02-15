# 🟦 PHASE 7 - AUTOFILL EXECUTOR (DESIGN)

## 🎯 Module Objective
Implement the autofill execution engine that programmatically fills form fields with matched profile values, triggering proper DOM events while maintaining privacy and security guarantees.

---

## 🏗 Architecture Overview

### Module Location
`src/content/executor.js` - New module imported by `scanner.js`

### Message Flow
```
Review.jsx (Popup)
  ↓ chrome.tabs.sendMessage()
  ↓ { action: 'AUTOFILL', matches: [...] }
  ↓
scanner.js (Content Script)
  ↓ chrome.runtime.onMessage handler
  ↓ calls executeAutofill(matches)
  ↓
executor.js
  ↓ fills each field
  ↓ returns results
  ↓
scanner.js
  ↓ sends response
  ↓
Review.jsx
  ↓ displays success/failure
```

---

## 📝 Module Interface

### Main Function: `executeAutofill(matches)`

**Input**:
```javascript
matches = [
  {
    formFieldId: "firstName",
    formFieldSelector: "#firstName",
    formFieldLabel: "First Name",
    formFieldType: "text",
    profileValue: "John",
    confidence: 0.95
  },
  // ... more matches
]
```

**Output**:
```javascript
{
  success: true,
  successCount: 23,
  totalFields: 24,
  failedFields: [],
  skippedFields: [
    {
      label: "Resume",
      reason: "File upload not supported",
      selector: "#resume"
    }
  ],
  executionTime: 145 // milliseconds
}
```

---

## 🛠️ Helper Functions

### 1. `findElement(match)`

**Purpose**: Locate form field element

```javascript
/**
 * Find form field element using multiple selector strategies
 * @param {Object} match - Match object with selector info
 * @returns {HTMLElement|null}
 */
function findElement(match) {
  // Strategy 1: Use provided selector
  if (match.formFieldSelector) {
    const element = document.querySelector(match.formFieldSelector);
    if (element) return element;
  }
  
  // Strategy 2: Try ID selector
  if (match.formFieldId) {
    const element = document.getElementById(match.formFieldId);
    if (element) return element;
  }
  
  // Strategy 3: Try name attribute
  if (match.formFieldId) {
    const element = document.querySelector(`[name="${match.formFieldId}"]`);
    if (element) return element;
  }
  
  return null;
}
```

---

### 2. `isElementFillable(element)`

**Purpose**: Validate element can be filled

```javascript
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
  
  // Check visibility
  if (element.offsetWidth === 0 || element.offsetHeight === 0) {
    return { fillable: false, reason: 'Element is hidden' };
  }
  
  // Check computed style
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') {
    return { fillable: false, reason: 'Element is hidden (CSS)' };
  }
  
  // Check if file input (not supported)
  if (element.type === 'file') {
    return { fillable: false, reason: 'File input not supported' };
  }
  
  return { fillable: true, reason: null };
}
```

---

### 3. `setValue(element, value, fieldType)`

**Purpose**: Set field value based on type

```javascript
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
    
    // Type-specific setting
    switch (element.tagName.toLowerCase()) {
      case 'input':
      case 'textarea':
        element.value = String(value);
        break;
        
      case 'select':
        // Find matching option
        const options = Array.from(element.options);
        const matchingOption = options.find(opt => 
          opt.value === value || opt.text === value
        );
        if (matchingOption) {
          element.value = matchingOption.value;
        } else {
          return false; // No matching option
        }
        break;
        
      default:
        element.value = String(value);
    }
    
    // Verify value was set
    if (element.value !== String(value)) {
      // For select, check if any option is selected
      if (element.tagName.toLowerCase() === 'select' && element.selectedIndex >= 0) {
        return true;
      }
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.error('[Executor] setValue error:', error);
    return false;
  }
}
```

---

### 4. `triggerEvents(element)`

**Purpose**: Trigger DOM events for validation

```javascript
/**
 * Trigger all necessary events on element
 * @param {HTMLElement} element
 */
function triggerEvents(element) {
  try {
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
    
    // Focus event (some forms need this first)
    const focusEvent = new Event('focus', { 
      bubbles: true, 
      cancelable: true 
    });
    element.dispatchEvent(focusEvent);
    
  } catch (error) {
    console.error('[Executor] Event trigger error:', error);
  }
}
```

---

### 5. `fillSingleField(match)`

**Purpose**: Fill one field completely

```javascript
/**
 * Fill a single form field
 * @param {Object} match - Match object
 * @returns {Object} { success: boolean, reason: string }
 */
function fillSingleField(match) {
  // Find element
  const element = findElement(match);
  
  if (!element) {
    return { 
      success: false, 
      reason: 'Element not found',
      label: match.formFieldLabel
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
      label: match.formFieldLabel
    };
  }
  
  // Trigger events
  triggerEvents(element);
  
  // Success
  return { 
    success: true, 
    reason: null,
    label: match.formFieldLabel
  };
}
```

---

## 🔄 Main Execution Function

### `executeAutofill(matches)`

```javascript
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
```

---

## 🔌 Integration with scanner.js

### Update scanner.js message handler

```javascript
// In scanner.js
import { executeAutofill } from './executor.js';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Scanner] Received message:', message.action);
  
  switch (message.action) {
    case 'SCAN_PAGE':
      // Existing scan logic
      break;
      
    case 'AUTOFILL':
      handleAutofill(message, sendResponse);
      return true; // Keep channel open for async
      
    default:
      console.log('[Scanner] Unknown action:', message.action);
  }
});

function handleAutofill(message, sendResponse) {
  try {
    // Execute autofill
    const results = executeAutofill(message.matches);
    
    // Send success response
    sendResponse({
      success: true,
      results: results
    });
    
  } catch (error) {
    console.error('[Scanner] Autofill error:', error);
    
    // Send error response
    sendResponse({
      success: false,
      error: error.message
    });
  }
}
```

---

## 📊 Error Handling Strategy

### Error Categories

1. **Not Found** - Element doesn't exist
   - Action: Skip field, log warning
   - User notification: Include in failed fields list

2. **Not Fillable** - Element exists but can't be filled
   - Action: Skip field, log reason
   - User notification: Include in skipped fields list

3. **Value Setting Failed** - Couldn't set value
   - Action: Retry once, then skip
   - User notification: Include in failed fields list

4. **File Upload** - File input detected
   - Action: Skip field
   - User notification: Special message about manual upload

5. **Validation Error** - After-fill validation failed
   - Action: Leave value as-is (let user see validation)
   - User notification: Not tracked as error

---

## ✅ Design Validation Checklist

- [x] Main function signature defined
- [x] Helper functions specified
- [x] Element finding strategy clear
- [x] Fillability checks complete
- [x] Value setting logic type-safe
- [x] Event triggering comprehensive
- [x] Error handling robust
- [x] Integration point defined
- [x] Privacy guarantees maintained
- [x] No overengineering

---

## 🚫 What This Module Does NOT Do

- ❌ Auto-submit forms
- ❌ Handle CAPTCHA
- ❌ Upload files
- ❌ Read existing field values
- ❌ Modify forms outside matches array
- ❌ Make network requests
- ❌ Handle multi-page forms

---

## 🎯 Success Criteria for Design Phase

- [x] All functions specified
- [x] Input/output types defined
- [x] Error handling planned
- [x] Integration clear
- [x] Privacy maintained
- [x] No ambiguity in implementation

---

## ⏭️ Ready for Implementation Phase

**Design Status**: ✅ COMPLETE  
**Next Step**: PHASE 7 - IMPLEMENTATION  

**Implementation will create**:
- `src/content/executor.js` (complete module)
- Update `src/content/scanner.js` (add AUTOFILL handler)
- Update `src/ui/Review.jsx` (handle response)
- Atomic commits per function

---

**Design Approved**: Ready to proceed to implementation.
