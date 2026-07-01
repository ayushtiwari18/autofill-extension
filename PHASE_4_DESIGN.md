# 🟦 PHASE 4 - CONTENT SCRIPT SCANNER (DESIGN)

## 🎯 Module Objective
Provide read-only form detection and metadata extraction from web pages, communicating form structure to background script for processing, with support for dynamic content and multiple form types.

---

## 🏗 Module Architecture

### Module: `src/content/scanner.js`

**Responsibilities**:
- Detect forms on page load and dynamically
- Extract field metadata (labels, types, attributes)
- Identify form type (Google Forms, generic HTML)
- Detect CAPTCHA presence
- Handle dynamic DOM changes (MutationObserver)
- Send form data to background script
- Never modify DOM (read-only)
- Never read field values (privacy)

**NOT Responsible For**:
- Field value filling (Phase 7)
- Field type mapping/inference (Phase 5)
- User interaction/confirmation (Phase 6)
- Google Forms iframe content access (Phase 8)

---

## 📋 Function Signatures

### 1. `isPageReady()`
```javascript
/**
 * Check if page is ready for scanning
 * @returns {Promise<boolean>} - Resolves when page is ready
 */
function isPageReady() {
  return new Promise((resolve) => {
    if (document.readyState === 'complete') {
      resolve(true);
    } else {
      window.addEventListener('load', () => resolve(true));
    }
  });
}
```

**Purpose**: Ensure DOM is fully loaded before scanning  
**Returns**: Promise that resolves when ready

---

### 2. `detectForms()`
```javascript
/**
 * Detect all visible forms on the page
 * @returns {HTMLFormElement[]} - Array of form elements
 */
function detectForms() {
  // Implementation finds all <form> elements
  // Filters out hidden forms
  // Returns array of visible forms
}
```

**Purpose**: Find all scannable forms  
**Returns**: Array of form elements  
**Filters**: Excludes hidden forms (display:none, visibility:hidden)

---

### 3. `isElementVisible(element)`
```javascript
/**
 * Check if element is visible to user
 * @param {HTMLElement} element - Element to check
 * @returns {boolean} - true if visible
 */
function isElementVisible(element) {
  const style = window.getComputedStyle(element);
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0'
  );
}
```

**Purpose**: Filter hidden elements  
**Returns**: Boolean

---

### 4. `identifyFormType(formElement)`
```javascript
/**
 * Identify the type of form
 * @param {HTMLFormElement} formElement - Form to identify
 * @returns {string} - "google-forms" | "generic" | "unknown"
 */
function identifyFormType(formElement) {
  // Check for Google Forms indicators:
  // - iframe with src containing "docs.google.com/forms"
  // - class names containing "freebirdForm"
  // - data attributes
  
  // Default to "generic" for standard HTML forms
}
```

**Purpose**: Determine form type for adapter selection  
**Returns**: Form type string  
**Logic**:
- Google Forms: Check for iframe with "docs.google.com/forms"
- Generic: Standard HTML form
- Unknown: Non-standard structure

---

### 5. `detectCaptcha(formElement)`
```javascript
/**
 * Detect if form contains CAPTCHA
 * @param {HTMLFormElement} formElement - Form to check
 * @returns {boolean} - true if CAPTCHA detected
 */
function detectCaptcha(formElement) {
  // Check for CAPTCHA indicators:
  // - reCAPTCHA: div.g-recaptcha, iframe[src*="recaptcha"]
  // - hCaptcha: div.h-captcha, iframe[src*="hcaptcha"]
  // - Text content: keywords "captcha", "recaptcha", "hcaptcha"
}
```

**Purpose**: Flag forms with CAPTCHA (autofill should be disabled)  
**Returns**: Boolean  
**Detection**: Checks for common CAPTCHA services

---

### 6. `extractFieldMetadata(inputElement)`
```javascript
/**
 * Extract metadata from input field
 * @param {HTMLInputElement} inputElement - Input field
 * @returns {Object} - Field metadata object
 */
function extractFieldMetadata(inputElement) {
  return {
    id: inputElement.id || generateFieldId(),
    name: inputElement.name || '',
    type: inputElement.type || 'text',
    label: findAssociatedLabel(inputElement),
    placeholder: inputElement.placeholder || '',
    ariaLabel: inputElement.getAttribute('aria-label') || null,
    required: inputElement.required || inputElement.hasAttribute('required'),
    value: '', // NEVER read actual value (privacy)
    selector: generateCSSSelector(inputElement)
  };
}
```

**Purpose**: Extract field information for mapping  
**Returns**: Field metadata object  
**Important**: Never reads actual field values

---

### 7. `findAssociatedLabel(inputElement)`
```javascript
/**
 * Find label associated with input field
 * @param {HTMLInputElement} inputElement - Input element
 * @returns {string|null} - Label text or null
 */
function findAssociatedLabel(inputElement) {
  // Method 1: <label for="input-id">Text</label>
  if (inputElement.id) {
    const label = document.querySelector(`label[for="${inputElement.id}"]`);
    if (label) return label.textContent.trim();
  }
  
  // Method 2: <label><input></label>
  const parentLabel = inputElement.closest('label');
  if (parentLabel) return parentLabel.textContent.trim();
  
  // Method 3: aria-labelledby
  const labelledBy = inputElement.getAttribute('aria-labelledby');
  if (labelledBy) {
    const labelElement = document.getElementById(labelledBy);
    if (labelElement) return labelElement.textContent.trim();
  }
  
  return null;
}
```

**Purpose**: Find label text for field identification  
**Returns**: Label text or null  
**Methods**: Tries multiple label association strategies

---

### 8. `generateCSSSelector(element)`
```javascript
/**
 * Generate unique CSS selector for element
 * @param {HTMLElement} element - Element to target
 * @returns {string} - CSS selector
 */
function generateCSSSelector(element) {
  // Priority:
  // 1. ID: #elementId
  // 2. Name: input[name="elementName"]
  // 3. Path: form > div:nth-child(2) > input
  
  if (element.id) return `#${element.id}`;
  if (element.name) return `input[name="${element.name}"]`;
  
  // Fallback: generate path-based selector
  return generatePathSelector(element);
}
```

**Purpose**: Create selector for later element targeting  
**Returns**: CSS selector string  
**Usage**: Phase 7 will use this to find fields for filling

---

### 9. `scanForm(formElement)`
```javascript
/**
 * Scan a single form and extract all metadata
 * @param {HTMLFormElement} formElement - Form to scan
 * @returns {Object} - Form data object
 */
function scanForm(formElement) {
  const formId = formElement.id || generateFormId();
  const formType = identifyFormType(formElement);
  const hasCaptcha = detectCaptcha(formElement);
  
  // Find all input fields
  const fields = [];
  const inputSelectors = 'input, textarea, select';
  const inputs = formElement.querySelectorAll(inputSelectors);
  
  inputs.forEach(input => {
    if (isElementVisible(input) && !isButtonOrSubmit(input)) {
      fields.push(extractFieldMetadata(input));
    }
  });
  
  return {
    id: formId,
    type: formType,
    hasCaptcha,
    fields,
    action: formElement.action || '',
    method: formElement.method || 'GET'
  };
}
```

**Purpose**: Complete form analysis  
**Returns**: Form data object  
**Process**: Extracts all field metadata from form

---

### 10. `scanPage()`
```javascript
/**
 * Scan entire page for forms
 * @returns {Object} - Page scan result
 */
function scanPage() {
  const forms = detectForms();
  const scannedForms = forms.map(form => scanForm(form));
  
  return {
    url: window.location.href,
    title: document.title,
    forms: scannedForms,
    scannedAt: new Date().toISOString()
  };
}
```

**Purpose**: Entry point for page scanning  
**Returns**: Complete page data  
**Usage**: Called on page load and after DOM changes

---

### 11. `observeDOMChanges()`
```javascript
/**
 * Watch for dynamic form additions/changes
 * @returns {MutationObserver} - Observer instance
 */
function observeDOMChanges() {
  let scanCount = 0;
  const MAX_SCANS = 3;
  
  const observer = new MutationObserver((mutations) => {
    // Check if forms were added
    const formsAdded = mutations.some(mutation => {
      return Array.from(mutation.addedNodes).some(node => {
        return node.nodeName === 'FORM' || 
               (node.querySelectorAll && node.querySelectorAll('form').length > 0);
      });
    });
    
    if (formsAdded && scanCount < MAX_SCANS) {
      scanCount++;
      debounce(() => {
        const pageData = scanPage();
        sendFormDataToBackground(pageData);
      }, 500)();
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  return observer;
}
```

**Purpose**: Handle dynamic form rendering  
**Returns**: MutationObserver instance  
**Limit**: Max 3 re-scans to prevent infinite loops  
**Debounce**: 500ms delay to batch changes

---

### 12. `sendFormDataToBackground(pageData)`
```javascript
/**
 * Send scan results to background script
 * @param {Object} pageData - Scanned page data
 * @returns {Promise<void>}
 */
function sendFormDataToBackground(pageData) {
  return chrome.runtime.sendMessage({
    type: 'FORM_DATA_SCANNED',
    data: pageData
  });
}
```

**Purpose**: Communicate with background script  
**Message Type**: FORM_DATA_SCANNED  
**Returns**: Promise

---

## 📡 Message Protocol

### Content Script → Background Script

```javascript
{
  type: 'FORM_DATA_SCANNED',
  data: {
    url: "https://example.com/apply",
    title: "Job Application",
    forms: [
      {
        id: "application-form",
        type: "generic",
        hasCaptcha: false,
        fields: [
          {
            id: "firstName",
            name: "firstName",
            type: "text",
            label: "First Name",
            placeholder: "Enter first name",
            ariaLabel: null,
            required: true,
            value: "",
            selector: "#firstName"
          }
        ],
        action: "/submit",
        method: "POST"
      }
    ],
    scannedAt: "2026-02-15T12:30:00.000Z"
  }
}
```

### Background Script Response (Future)
```javascript
{
  type: 'SCAN_ACKNOWLEDGED',
  formsCount: 1
}
```

---

## 🔄 Data Flow

### Initial Scan Flow
```
Page Load
    |
    v
isPageReady()
    |
    v
scanPage()
    |
    v
detectForms()
    |
    v
For Each Form:
  - identifyFormType()
  - detectCaptcha()
  - scanForm()
    - extractFieldMetadata()
    - findAssociatedLabel()
    |
    v
sendFormDataToBackground()
```

### Dynamic Change Flow
```
DOM Mutation
    |
    v
MutationObserver Triggered
    |
    v
Check if forms added
    |
    v
Debounce (500ms)
    |
    v
scanPage()
    |
    v
sendFormDataToBackground()
```

---

## 🛡 Security Design

### 1. Read-Only Guarantee
- **Never** modify DOM
- **Never** call element.value setter
- **Never** dispatch events
- Only query methods used

### 2. Privacy Protection
- **Never** read field.value
- **Never** log user input
- Only extract structure, not data

### 3. Safe Selectors
- Sanitize IDs before using in selectors
- Escape special characters
- Validate selector strings

### 4. Error Boundaries
- Wrap all operations in try-catch
- Never crash page on error
- Log errors to console (not field values)

---

## ⚠️ Error Handling Strategy

### Error Types

1. **Page Not Ready**
   - Wait for load event
   - Timeout after 10 seconds

2. **No Forms Found**
   - Return empty forms array
   - Don't throw error

3. **Inaccessible Elements**
   - Skip element
   - Continue scanning

4. **Message Send Failure**
   - Log error
   - Don't retry (avoid spam)

5. **Observer Error**
   - Disconnect observer
   - Log error

### Error Logging
```javascript
console.error('[Autofill Scanner]', errorMessage);
// Never log sensitive data
```

---

## 🧪 Testing Strategy

### Test Case 1: Simple HTML Form
```html
<form action="/submit" method="POST">
  <label for="name">Name</label>
  <input id="name" name="name" type="text" required>
  <button type="submit">Submit</button>
</form>
```
**Expected**: 1 form, 1 field, type="generic"

### Test Case 2: Google Forms (iframe)
```html
<iframe src="https://docs.google.com/forms/d/e/.../viewform"></iframe>
```
**Expected**: 1 form, type="google-forms"

### Test Case 3: Form with CAPTCHA
```html
<form>
  <input name="email" type="email">
  <div class="g-recaptcha"></div>
  <button>Submit</button>
</form>
```
**Expected**: hasCaptcha=true

### Test Case 4: Hidden Form
```html
<form style="display:none">
  <input name="hidden" type="text">
</form>
```
**Expected**: 0 forms detected

### Test Case 5: Dynamic Form
```javascript
setTimeout(() => {
  const form = document.createElement('form');
  document.body.appendChild(form);
}, 2000);
```
**Expected**: MutationObserver triggers re-scan

---

## 📊 Performance Expectations

### Scan Performance
- **Simple form** (< 10 fields): < 50ms
- **Complex form** (50+ fields): < 200ms
- **Multiple forms** (5 forms): < 500ms
- **Maximum allowed**: 2000ms (2 seconds)

### MutationObserver
- **Debounce delay**: 500ms
- **Max re-scans**: 3 per page
- **Observer disconnect**: After max scans reached

---

## ✅ Design Validation Checklist

- [x] All functions have clear signatures
- [x] Message protocol defined
- [x] Data structures documented
- [x] Error handling strategy defined
- [x] Privacy requirements mapped
- [x] Performance expectations set
- [x] MutationObserver strategy designed
- [x] Test cases defined
- [x] No DOM modification
- [x] Follows global rules

---

## 🚫 What This Module Does NOT Do

- ❌ Fill form fields (Phase 7)
- ❌ Map field types (Phase 5)
- ❌ Show UI (Phase 6)
- ❌ Access Google Forms iframe content (Phase 8)
- ❌ Submit forms (never - global rule)
- ❌ Read field values (privacy rule)

---

## 🎯 Success Criteria for Design Phase

- [x] Module responsibilities clearly defined
- [x] Function signatures documented
- [x] Data flow diagrams complete
- [x] Message protocol defined
- [x] Security design validated
- [x] Testing strategy outlined
- [x] Performance targets set
- [x] No ambiguity in implementation

---

## ⏭️ Ready for Implementation Phase

**Design Status**: ✅ COMPLETE  
**Next Step**: PHASE 4 - IMPLEMENTATION  

**Implementation will create**:
- `src/content/scanner.js` with all functions
- Update `manifest.json` with content_scripts
- Update `src/background/serviceWorker.js` with message handler
- Atomic commits per function/responsibility

---

**Design Approved**: Ready to proceed to implementation.
