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
