/**
 * Content Script Scanner
 * Detects and extracts metadata from forms on web pages
 * Read-only — never modifies DOM or reads field values
 */

import { executeAutofill } from './executor.js';

const SCAN_DELAY_MS = 500;
const MAX_RESCANS = 3;
const FORM_FIELD_SELECTORS = 'input:not([type="submit"]):not([type="button"]):not([type="hidden"]), textarea, select';

let scanCount = 0;
let mutationObserver = null;

// ── Utilities ─────────────────────────────────────────────────────────────

function isElementVisible(el) {
  if (!el) return false;
  const s = window.getComputedStyle(el);
  return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0' && el.offsetWidth > 0 && el.offsetHeight > 0;
}

function isButtonOrSubmit(input) {
  return ['submit', 'button', 'reset', 'image', 'hidden'].includes((input.type || '').toLowerCase());
}

function generateUniqueId(prefix = 'field') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function debounce(func, wait) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => func(...args), wait); };
}

function isPageReady() {
  return new Promise(r => {
    if (document.readyState === 'complete') r(true);
    else window.addEventListener('load', () => r(true), { once: true });
  });
}

function sanitize(str) {
  return (str || '').replace(/(["'\\])/g, '\\$1');
}

// ── Google Forms title classes (try all versions) ───────────────────────
const GFORMS_TITLE_CLASSES = [
  'freebirdFormviewerComponentsQuestionBaseTitle',
  'exportItemTitle',
  'freebirdFormviewerViewItemsItemItemTitle',
  'M7eMe',
  'HoXoMd'
];

// ── Label Extraction ─────────────────────────────────────────────────────────

function findAssociatedLabel(input) {
  try {
    // M1: <label for="id">
    if (input.id) {
      const lbl = document.querySelector(`label[for="${sanitize(input.id)}"]`);
      if (lbl) { const t = lbl.textContent.trim(); if (t) return t; }
    }

    // M2: <label><input>
    const parentLbl = input.closest('label');
    if (parentLbl) { const t = parentLbl.textContent.trim(); if (t) return t; }

    // M3: aria-label directly on input
    const al = input.getAttribute('aria-label');
    if (al && al.trim()) return al.trim();

    // M4: aria-labelledby (space-separated IDs — Google Forms)
    const alb = input.getAttribute('aria-labelledby');
    if (alb) {
      const texts = alb.trim().split(/\s+/)
        .map(id => document.getElementById(id))
        .filter(Boolean)
        .map(el => el.textContent.trim())
        .filter(t => t.length > 0 && t.length < 200);
      if (texts.length > 0) return texts[0];
    }

    // M5: Walk up DOM looking for Google Forms title div (up to 12 levels)
    let ancestor = input.parentElement;
    for (let d = 0; d < 12 && ancestor; d++) {
      for (const cls of GFORMS_TITLE_CLASSES) {
        const el = ancestor.querySelector('.' + cls);
        if (el) { const t = el.textContent.trim(); if (t) return t; }
      }
      ancestor = ancestor.parentElement;
    }

    // M6: Walk up 3 levels ONLY, check previousElementSibling for short text
    // (NOT nextSibling — that would pick up the NEXT question's label)
    let container = input.parentElement;
    for (let d = 0; d < 3 && container; d++) {
      const prev = container.previousElementSibling;
      if (prev) {
        const t = prev.textContent.trim();
        if (t && t.length > 1 && t.length < 100) return t;
      }
      container = container.parentElement;
    }

    return null;
  } catch (e) {
    return null;
  }
}

// ── CSS Selector ──────────────────────────────────────────────────────────

function generateCSSSelector(el) {
  try {
    if (el.id) return `#${sanitize(el.id)}`;
    if (el.name) return `${el.tagName.toLowerCase()}[name="${sanitize(el.name)}"]`;
    const jsname = el.getAttribute('jsname');
    if (jsname) return `${el.tagName.toLowerCase()}[jsname="${jsname}"]`;
    // Path fallback
    const path = [];
    let cur = el;
    while (cur && cur.nodeType === Node.ELEMENT_NODE && cur !== document.body) {
      let sel = cur.tagName.toLowerCase();
      const parent = cur.parentElement;
      if (parent) {
        const idx = Array.from(parent.children).indexOf(cur) + 1;
        sel += `:nth-child(${idx})`;
      }
      path.unshift(sel);
      cur = cur.parentElement;
    }
    return path.join(' > ');
  } catch { return ''; }
}

// ── Field Metadata ─────────────────────────────────────────────────────────

function extractFieldMetadata(input) {
  try {
    const label = findAssociatedLabel(input);
    const meta = {
      id:          input.id || generateUniqueId('field'),
      name:        input.name || '',
      type:        input.type || 'text',
      label,
      placeholder: input.placeholder || '',
      ariaLabel:   input.getAttribute('aria-label') || null,
      required:    input.required || input.hasAttribute('required'),
      value:       '',
      selector:    generateCSSSelector(input)
    };
    console.log('[Scanner] Field:', {
      label: meta.label, name: meta.name, placeholder: meta.placeholder,
      ariaLabel: meta.ariaLabel, type: meta.type, selector: meta.selector
    });
    return meta;
  } catch (e) { return null; }
}

// ── Form Detection & Scanning ────────────────────────────────────────────

function detectForms() {
  const visible = [];
  document.querySelectorAll('form').forEach(f => { if (isElementVisible(f)) visible.push(f); });
  document.querySelectorAll('iframe').forEach(iframe => {
    if (isElementVisible(iframe) && (iframe.src || '').includes('docs.google.com/forms'))
      visible.push(iframe);
  });
  return visible;
}

function identifyFormType(el) {
  if (el.tagName === 'IFRAME') return 'google-forms';
  if (window.location.hostname === 'docs.google.com' && window.location.pathname.includes('/forms/'))
    return 'google-forms';
  return 'generic';
}

function detectCaptcha(el) {
  return !!el.querySelector('.g-recaptcha, .h-captcha, iframe[src*="recaptcha"], iframe[src*="hcaptcha"]');
}

function scanForm(formEl) {
  try {
    const id = formEl.id || generateUniqueId('form');
    const type = identifyFormType(formEl);
    if (type === 'google-forms' && formEl.tagName === 'IFRAME')
      return { id, type, hasCaptcha: false, fields: [], action: formEl.src || '', method: 'unknown' };

    const fields = [];
    formEl.querySelectorAll(FORM_FIELD_SELECTORS).forEach(input => {
      if (isElementVisible(input) && !isButtonOrSubmit(input)) {
        const meta = extractFieldMetadata(input);
        if (meta) fields.push(meta);
      }
    });
    return { id, type, hasCaptcha: detectCaptcha(formEl), fields, action: formEl.action || '', method: (formEl.method || 'GET').toUpperCase() };
  } catch (e) { return null; }
}

function scanPage() {
  const forms = detectForms();
  const scanned = [];
  forms.forEach(f => {
    const d = scanForm(f);
    if (d && (d.fields.length > 0 || d.type === 'google-forms')) scanned.push(d);
  });
  return { url: window.location.href, title: document.title, forms: scanned, scannedAt: new Date().toISOString() };
}

// ── Messaging ──────────────────────────────────────────────────────────────

function sendFormDataToBackground(data) {
  try { chrome.runtime.sendMessage({ type: 'FORM_DATA_SCANNED', data }); } catch (e) {}
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'AUTOFILL':
      try {
        const results = executeAutofill(message.matches);
        sendResponse({ success: true, results });
      } catch (e) {
        sendResponse({ success: false, error: e.message });
      }
      return true;
    case 'SCAN_PAGE': {
      const data = scanPage();
      sendFormDataToBackground(data);
      sendResponse({ success: true, data });
      return true;
    }
    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
  return false;
});

// ── MutationObserver ─────────────────────────────────────────────────────

const handleMutations = debounce(() => {
  if (scanCount < MAX_RESCANS) { scanCount++; sendFormDataToBackground(scanPage()); }
  else if (mutationObserver) mutationObserver.disconnect();
}, SCAN_DELAY_MS);

function observeDOMChanges() {
  try {
    const obs = new MutationObserver(muts => {
      const added = muts.some(m =>
        Array.from(m.addedNodes).some(n =>
          n.nodeType === Node.ELEMENT_NODE &&
          (n.nodeName === 'FORM' || (n.querySelectorAll && n.querySelectorAll('form').length > 0))
        )
      );
      if (added) handleMutations();
    });
    obs.observe(document.body, { childList: true, subtree: true });
    return obs;
  } catch { return null; }
}

// ── Init ───────────────────────────────────────────────────────────────────

async function init() {
  try {
    await isPageReady();
    sendFormDataToBackground(scanPage());
    mutationObserver = observeDOMChanges();
    console.log('[Autofill Scanner] Initialization complete - Phase 7');
  } catch (e) { console.error('[Scanner] Init error:', e.message); }
}

init();
