/**
 * Content Script Scanner
 * Detects and extracts metadata from forms on web pages
 * Read-only operations - never modifies DOM or reads field values
 */

import { executeAutofill } from './executor.js';

const SCAN_DELAY_MS = 500;
const MAX_RESCANS = 3;
const FORM_FIELD_SELECTORS = 'input:not([type="submit"]):not([type="button"]):not([type="hidden"]), textarea, select';

let scanCount = 0;
let mutationObserver = null;

// ── Utilities ────────────────────────────────────────────────────────────────

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

function isButtonOrSubmit(input) {
  const type = (input.type || '').toLowerCase();
  return ['submit', 'button', 'reset', 'image', 'hidden'].includes(type);
}

function generateUniqueId(prefix = 'field') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

function isPageReady() {
  return new Promise(resolve => {
    if (document.readyState === 'complete') resolve(true);
    else window.addEventListener('load', () => resolve(true), { once: true });
  });
}

function sanitizeSelectorString(str) {
  return (str || '').replace(/(["'\\])/g, '\\$1');
}

// ── Form Detection ────────────────────────────────────────────────────────────

function detectForms() {
  const visible = [];
  document.querySelectorAll('form').forEach(f => { if (isElementVisible(f)) visible.push(f); });
  // Google Forms iframes (embedded on other pages)
  document.querySelectorAll('iframe').forEach(iframe => {
    if (isElementVisible(iframe) && (iframe.src || '').includes('docs.google.com/forms'))
      visible.push(iframe);
  });
  return visible;
}

function identifyFormType(formElement) {
  if (formElement.tagName === 'IFRAME') return 'google-forms';
  // Google Forms direct page — has freebirdForm class or data attribute
  if (formElement.classList && (
    formElement.classList.contains('freebirdFormviewerViewFormCard') ||
    formElement.classList.contains('freebirdForm')
  )) return 'google-forms';
  // URL-based detection (direct Google Forms page)
  if (window.location.hostname === 'docs.google.com' &&
      window.location.pathname.includes('/forms/')) return 'google-forms';
  return 'generic';
}

function detectCaptcha(formElement) {
  return !!(formElement.querySelector('.g-recaptcha, .h-captcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"]'));
}

// ── Label Extraction ──────────────────────────────────────────────────────────

/**
 * Google Forms question title CSS classes (varies by GForms version)
 * We try all of them.
 */
const GFORMS_TITLE_CLASSES = [
  'freebirdFormviewerComponentsQuestionBaseTitle',
  'exportItemTitle',
  'freebirdFormviewerViewItemsItemItemTitle',
  'M7eMe',   // older GForms
  'HoXoMd',  // newer GForms question text wrapper
];

function findAssociatedLabel(inputElement) {
  try {
    // ── Method 1: <label for="id"> ──────────────────────────────────────────
    if (inputElement.id) {
      const label = document.querySelector(`label[for="${sanitizeSelectorString(inputElement.id)}"]`);
      if (label) {
        const text = label.textContent.trim();
        if (text) return text;
      }
    }

    // ── Method 2: <label><input></label> ────────────────────────────────────
    const parentLabel = inputElement.closest('label');
    if (parentLabel) {
      const text = parentLabel.textContent.trim();
      if (text) return text;
    }

    // ── Method 3: aria-label attribute directly on input ────────────────────
    const ariaLabel = inputElement.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.trim()) return ariaLabel.trim();

    // ── Method 4: aria-labelledby (single OR space-separated multiple IDs) ──
    // Google Forms uses space-separated: aria-labelledby="id1 id2 id3"
    const labelledBy = inputElement.getAttribute('aria-labelledby');
    if (labelledBy) {
      const ids = labelledBy.trim().split(/\s+/);
      const texts = ids
        .map(id => document.getElementById(id))
        .filter(Boolean)
        .map(el => el.textContent.trim())
        .filter(t => t.length > 0);
      if (texts.length > 0) return texts[0]; // first id is usually the question
    }

    // ── Method 5: Walk up DOM looking for Google Forms title div ────────────
    let ancestor = inputElement.parentElement;
    for (let depth = 0; depth < 12 && ancestor; depth++) {
      for (const cls of GFORMS_TITLE_CLASSES) {
        const titleEl = ancestor.querySelector('.' + cls);
        if (titleEl) {
          const text = titleEl.textContent.trim();
          if (text) return text;
        }
      }
      ancestor = ancestor.parentElement;
    }

    // ── Method 6: Walk up DOM, find first sibling/cousin div with text ───────
    // Generic fallback: go up 5 levels, look for a non-empty div/span
    // that precedes the input's container and looks like a label
    let container = inputElement.parentElement;
    for (let depth = 0; depth < 6 && container; depth++) {
      const prev = container.previousElementSibling;
      if (prev) {
        const text = prev.textContent.trim();
        // Ignore very long text (probably page content, not a label)
        if (text && text.length > 0 && text.length < 120) return text;
      }
      container = container.parentElement;
    }

    return null;
  } catch (error) {
    console.error('[Scanner] findAssociatedLabel error:', error.message);
    return null;
  }
}

// ── CSS Selector Generation ───────────────────────────────────────────────────

function generateCSSSelector(element) {
  try {
    if (element.id) return `#${sanitizeSelectorString(element.id)}`;
    if (element.name) return `${element.tagName.toLowerCase()}[name="${sanitizeSelectorString(element.name)}"]`;
    // Google Forms: use jsname or data-initial-value as selector hook
    const jsname = element.getAttribute('jsname');
    if (jsname) return `${element.tagName.toLowerCase()}[jsname="${jsname}"]`;

    // Path-based fallback
    const path = [];
    let current = element;
    while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.body) {
      let sel = current.tagName.toLowerCase();
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children);
        if (siblings.length > 1) sel += `:nth-child(${siblings.indexOf(current) + 1})`;
      }
      path.unshift(sel);
      current = current.parentElement;
    }
    return path.join(' > ');
  } catch (e) {
    return '';
  }
}

// ── Field Metadata Extraction ─────────────────────────────────────────────────

function extractFieldMetadata(inputElement) {
  try {
    const label = findAssociatedLabel(inputElement);
    const ariaLabel = inputElement.getAttribute('aria-label') || null;
    const meta = {
      id: inputElement.id || generateUniqueId('field'),
      name: inputElement.name || '',
      type: inputElement.type || 'text',
      label,
      placeholder: inputElement.placeholder || '',
      ariaLabel,
      required: inputElement.required || inputElement.hasAttribute('required'),
      value: '',
      selector: generateCSSSelector(inputElement)
    };
    console.log('[Scanner] Field extracted:', {
      label: meta.label,
      name: meta.name,
      placeholder: meta.placeholder,
      ariaLabel: meta.ariaLabel,
      type: meta.type,
      selector: meta.selector
    });
    return meta;
  } catch (e) {
    console.error('[Scanner] extractFieldMetadata error:', e.message);
    return null;
  }
}

// ── Form Scanning ─────────────────────────────────────────────────────────────

function scanForm(formElement) {
  try {
    const formId = formElement.id || generateUniqueId('form');
    const formType = identifyFormType(formElement);
    const hasCaptcha = detectCaptcha(formElement);

    if (formType === 'google-forms' && formElement.tagName === 'IFRAME') {
      return { id: formId, type: formType, hasCaptcha, fields: [], action: formElement.src || '', method: 'unknown' };
    }

    const fields = [];
    formElement.querySelectorAll(FORM_FIELD_SELECTORS).forEach(input => {
      if (isElementVisible(input) && !isButtonOrSubmit(input)) {
        const meta = extractFieldMetadata(input);
        if (meta) fields.push(meta);
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
  } catch (e) {
    console.error('[Scanner] scanForm error:', e.message);
    return null;
  }
}

function scanPage() {
  try {
    const forms = detectForms();
    const scannedForms = [];
    forms.forEach(form => {
      const data = scanForm(form);
      if (data && (data.fields.length > 0 || data.type === 'google-forms'))
        scannedForms.push(data);
    });
    return { url: window.location.href, title: document.title, forms: scannedForms, scannedAt: new Date().toISOString() };
  } catch (e) {
    return { url: window.location.href, title: document.title, forms: [], scannedAt: new Date().toISOString() };
  }
}

// ── Communication ─────────────────────────────────────────────────────────────

function sendFormDataToBackground(pageData) {
  try {
    chrome.runtime.sendMessage({ type: 'FORM_DATA_SCANNED', data: pageData });
  } catch (e) {
    console.error('[Scanner] sendFormDataToBackground error:', e.message);
  }
}

function handleAutofillMessage(message, sendResponse) {
  try {
    const results = executeAutofill(message.matches);
    sendResponse({ success: true, results });
  } catch (e) {
    sendResponse({ success: false, error: e.message });
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'AUTOFILL':
      handleAutofillMessage(message, sendResponse);
      return true;
    case 'SCAN_PAGE': {
      const pageData = scanPage();
      sendFormDataToBackground(pageData);
      sendResponse({ success: true, data: pageData });
      return true;
    }
    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
  return false;
});

// ── MutationObserver ──────────────────────────────────────────────────────────

const handleMutations = debounce(() => {
  if (scanCount < MAX_RESCANS) {
    scanCount++;
    const pageData = scanPage();
    sendFormDataToBackground(pageData);
  } else {
    if (mutationObserver) mutationObserver.disconnect();
  }
}, SCAN_DELAY_MS);

function observeDOMChanges() {
  try {
    const observer = new MutationObserver(mutations => {
      const formsAdded = mutations.some(m =>
        Array.from(m.addedNodes).some(n =>
          n.nodeType === Node.ELEMENT_NODE &&
          (n.nodeName === 'FORM' || (n.querySelectorAll && n.querySelectorAll('form').length > 0))
        )
      );
      if (formsAdded) handleMutations();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return observer;
  } catch (e) {
    return null;
  }
}

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  try {
    await isPageReady();
    const pageData = scanPage();
    sendFormDataToBackground(pageData);
    mutationObserver = observeDOMChanges();
    console.log('[Autofill Scanner] Initialization complete - Phase 7');
  } catch (e) {
    console.error('[Scanner] Init error:', e.message);
  }
}

init();
