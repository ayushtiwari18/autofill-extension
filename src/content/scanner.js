/**
 * Content Script Scanner
 * Detects and extracts metadata from forms on web pages
 * Read-only operations - never modifies DOM or reads field values
 */

// ============================================
// CONSTANTS
// ============================================
const SCAN_DELAY_MS = 500; // Debounce delay for MutationObserver
const MAX_RESCANS = 3; // Maximum re-scans per page
const FORM_FIELD_SELECTORS = 'input:not([type="submit"]):not([type="button"]), textarea, select';

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Check if element is visible to user
 * @param {HTMLElement} element - Element to check
 * @returns {boolean} - true if visible
 */
function isElementVisible(element) {
  if (!element) return false;
  
  const style = window.getComputedStyle(element);
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0' &&
    element.offsetWidth > 0 &&
    element.offsetHeight > 0
  );
}

/**
 * Check if input is a button or submit type
 * @param {HTMLInputElement} input - Input element
 * @returns {boolean} - true if button/submit
 */
function isButtonOrSubmit(input) {
  const type = input.type ? input.type.toLowerCase() : '';
  return type === 'submit' || type === 'button' || type === 'reset' || type === 'image';
}

/**
 * Generate unique ID for element
 * @param {string} prefix - ID prefix
 * @returns {string} - Unique ID
 */
function generateUniqueId(prefix = 'field') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Debounce function to limit execution rate
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function} - Debounced function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Check if page is ready for scanning
 * @returns {Promise<boolean>} - Resolves when page is ready
 */
function isPageReady() {
  return new Promise((resolve) => {
    if (document.readyState === 'complete') {
      resolve(true);
    } else {
      window.addEventListener('load', () => resolve(true), { once: true });
    }
  });
}

/**
 * Sanitize string for use in CSS selector
 * @param {string} str - String to sanitize
 * @returns {string} - Sanitized string
 */
function sanitizeSelectorString(str) {
  if (!str) return '';
  // Escape special characters for CSS selectors
  return str.replace(/(["'\\])/g, '\\$1');
}

// ============================================
// FORM DETECTION FUNCTIONS
// ============================================

/**
 * Detect all visible forms on the page
 * @returns {HTMLFormElement[]} - Array of form elements
 */
function detectForms() {
  const allForms = document.querySelectorAll('form');
  const visibleForms = [];
  
  allForms.forEach(form => {
    if (isElementVisible(form)) {
      visibleForms.push(form);
    }
  });
  
  // Also check for Google Forms iframes
  const iframes = document.querySelectorAll('iframe');
  iframes.forEach(iframe => {
    if (isElementVisible(iframe) && isGoogleFormsIframe(iframe)) {
      visibleForms.push(iframe);
    }
  });
  
  return visibleForms;
}

/**
 * Check if iframe is a Google Form
 * @param {HTMLIFrameElement} iframe - Iframe element
 * @returns {boolean} - true if Google Forms iframe
 */
function isGoogleFormsIframe(iframe) {
  const src = iframe.src || '';
  return src.includes('docs.google.com/forms');
}

/**
 * Identify the type of form
 * @param {HTMLElement} formElement - Form to identify
 * @returns {string} - "google-forms" | "generic" | "unknown"
 */
function identifyFormType(formElement) {
  // Check if it's an iframe (Google Forms)
  if (formElement.tagName === 'IFRAME') {
    if (isGoogleFormsIframe(formElement)) {
      return 'google-forms';
    }
    return 'unknown';
  }
  
  // Check for Google Forms indicators in the form element
  if (formElement.classList && formElement.classList.contains('freebirdForm')) {
    return 'google-forms';
  }
  
  // Check for Google Forms data attributes
  if (formElement.hasAttribute('data-freebird-form-id')) {
    return 'google-forms';
  }
  
  // Default to generic HTML form
  return 'generic';
}

/**
 * Detect if form contains CAPTCHA
 * @param {HTMLElement} formElement - Form to check
 * @returns {boolean} - true if CAPTCHA detected
 */
function detectCaptcha(formElement) {
  // Check for reCAPTCHA
  if (formElement.querySelector('.g-recaptcha') || 
      formElement.querySelector('iframe[src*="recaptcha"]')) {
    return true;
  }
  
  // Check for hCaptcha
  if (formElement.querySelector('.h-captcha') || 
      formElement.querySelector('iframe[src*="hcaptcha"]')) {
    return true;
  }
  
  // Check for CAPTCHA keywords in text content
  const formText = formElement.textContent.toLowerCase();
  if (formText.includes('captcha') || 
      formText.includes('recaptcha') || 
      formText.includes('hcaptcha')) {
    return true;
  }
  
  return false;
}

// ============================================
// FIELD METADATA EXTRACTION
// ============================================

/**
 * Find label associated with input field
 * @param {HTMLInputElement} inputElement - Input element
 * @returns {string|null} - Label text or null
 */
function findAssociatedLabel(inputElement) {
  try {
    // Method 1: <label for="input-id">Text</label>
    if (inputElement.id) {
      const label = document.querySelector(`label[for="${sanitizeSelectorString(inputElement.id)}"]`);
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
  } catch (error) {
    console.error('[Autofill Scanner] Error finding label:', error.message);
    return null;
  }
}

/**
 * Generate CSS selector for element
 * @param {HTMLElement} element - Element to target
 * @returns {string} - CSS selector
 */
function generateCSSSelector(element) {
  try {
    // Priority 1: ID
    if (element.id) {
      return `#${sanitizeSelectorString(element.id)}`;
    }
    
    // Priority 2: Name attribute
    if (element.name) {
      const tagName = element.tagName.toLowerCase();
      return `${tagName}[name="${sanitizeSelectorString(element.name)}"]`;
    }
    
    // Priority 3: Generate path-based selector
    const path = [];
    let current = element;
    
    while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      
      // Add nth-child if multiple siblings
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children);
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          selector += `:nth-child(${index})`;
        }
      }
      
      path.unshift(selector);
      current = current.parentElement;
    }
    
    return path.join(' > ');
  } catch (error) {
    console.error('[Autofill Scanner] Error generating selector:', error.message);
    return '';
  }
}

/**
 * Extract metadata from input field
 * @param {HTMLInputElement} inputElement - Input field
 * @returns {Object} - Field metadata object
 */
function extractFieldMetadata(inputElement) {
  try {
    return {
      id: inputElement.id || generateUniqueId('field'),
      name: inputElement.name || '',
      type: inputElement.type || 'text',
      label: findAssociatedLabel(inputElement),
      placeholder: inputElement.placeholder || '',
      ariaLabel: inputElement.getAttribute('aria-label') || null,
      required: inputElement.required || inputElement.hasAttribute('required'),
      value: '', // NEVER read actual value (privacy requirement)
      selector: generateCSSSelector(inputElement)
    };
  } catch (error) {
    console.error('[Autofill Scanner] Error extracting field metadata:', error.message);
    return null;
  }
}

// ============================================
// FORM SCANNING
// ============================================

/**
 * Scan a single form and extract all metadata
 * @param {HTMLFormElement} formElement - Form to scan
 * @returns {Object} - Form data object
 */
function scanForm(formElement) {
  try {
    const formId = formElement.id || generateUniqueId('form');
    const formType = identifyFormType(formElement);
    const hasCaptcha = detectCaptcha(formElement);
    
    // For Google Forms iframes, can't access internal fields
    if (formType === 'google-forms' && formElement.tagName === 'IFRAME') {
      return {
        id: formId,
        type: formType,
        hasCaptcha,
        fields: [], // Cannot access iframe content
        action: formElement.src || '',
        method: 'unknown'
      };
    }
    
    // Find all input fields
    const fields = [];
    const inputs = formElement.querySelectorAll(FORM_FIELD_SELECTORS);
    
    inputs.forEach(input => {
      if (isElementVisible(input) && !isButtonOrSubmit(input)) {
        const fieldMetadata = extractFieldMetadata(input);
        if (fieldMetadata) {
          fields.push(fieldMetadata);
        }
      }
    });
    
    return {
      id: formId,
      type: formType,
      hasCaptcha,
      fields,
      action: formElement.action || '',
      method: (formElement.method || 'GET').toUpperCase()
    };
  } catch (error) {
    console.error('[Autofill Scanner] Error scanning form:', error.message);
    return null;
  }
}

/**
 * Scan entire page for forms
 * @returns {Object} - Page scan result
 */
function scanPage() {
  try {
    const forms = detectForms();
    const scannedForms = [];
    
    forms.forEach(form => {
      const formData = scanForm(form);
      if (formData && formData.fields.length > 0 || formData.type === 'google-forms') {
        scannedForms.push(formData);
      }
    });
    
    return {
      url: window.location.href,
      title: document.title,
      forms: scannedForms,
      scannedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('[Autofill Scanner] Error scanning page:', error.message);
    return {
      url: window.location.href,
      title: document.title,
      forms: [],
      scannedAt: new Date().toISOString()
    };
  }
}
