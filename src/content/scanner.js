/**
 * Content Script Scanner - Phase 7 with full debug logging
 */

import { executeAutofill } from './executor.js';

const SCAN_DELAY_MS = 500;
const MAX_RESCANS = 3;
const FORM_FIELD_SELECTORS = 'input:not([type="submit"]):not([type="button"]):not([type="hidden"]), textarea, select';

let scanCount = 0;
let mutationObserver = null;

const GFORMS_TITLE_CLASSES = [
  'freebirdFormviewerComponentsQuestionBaseTitle',
  'exportItemTitle',
  'freebirdFormviewerViewItemsItemItemTitle',
  'M7eMe',
  'HoXoMd'
];

function isElementVisible(el) {
  if (!el) return false;
  const s = window.getComputedStyle(el);
  return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0'
    && el.offsetWidth > 0 && el.offsetHeight > 0;
}
function isButtonOrSubmit(input) {
  return ['submit','button','reset','image','hidden'].includes((input.type||'').toLowerCase());
}
function generateUniqueId(p='field') { return `${p}-${Date.now()}-${Math.random().toString(36).substr(2,9)}`; }
function debounce(fn, w) { let t; return (...a) => { clearTimeout(t); t = setTimeout(()=>fn(...a), w); }; }
function isPageReady() {
  return new Promise(r => {
    if (document.readyState === 'complete') r(true);
    else window.addEventListener('load', () => r(true), { once: true });
  });
}
function sanitize(s) { return (s||'').replace(/(["'\\])/g,'\\$1'); }

// ── Label Extraction with full trace ──────────────────────────────────────

function findAssociatedLabel(input) {
  const tag = `${input.tagName.toLowerCase()}#${input.id||'(no-id)'}[name=${input.name||'(no-name)'}]`;
  console.log(`[Scanner:label] Extracting label for ${tag}`);

  try {
    // M1: <label for="id">
    if (input.id) {
      const lbl = document.querySelector(`label[for="${sanitize(input.id)}"]`);
      if (lbl) {
        const t = lbl.textContent.trim();
        if (t) { console.log(`  [M1 label[for]] ✅ "${t}"`); return t; }
      } else { console.log(`  [M1 label[for]] ✗ no element found for id="${input.id}"`); }
    } else { console.log(`  [M1 label[for]] ✗ input has no id`); }

    // M2: closest <label>
    const pLbl = input.closest('label');
    if (pLbl) {
      const t = pLbl.textContent.trim();
      if (t) { console.log(`  [M2 closest label] ✅ "${t}"`); return t; }
    } else { console.log(`  [M2 closest label] ✗ not inside a label`); }

    // M3: aria-label attribute
    const al = input.getAttribute('aria-label');
    if (al && al.trim()) { console.log(`  [M3 aria-label] ✅ "${al.trim()}"`); return al.trim(); }
    else { console.log(`  [M3 aria-label] ✗ ${al === null ? 'not set' : 'empty'}`); }

    // M4: aria-labelledby (space-separated IDs)
    const alb = input.getAttribute('aria-labelledby');
    if (alb) {
      const ids = alb.trim().split(/\s+/);
      console.log(`  [M4 aria-labelledby] ids: [${ids.join(', ')}]`);
      const texts = ids
        .map(id => { const el = document.getElementById(id); console.log(`    id="${id}" → el=${el ? el.tagName+'.'+el.className.slice(0,40) : 'NOT FOUND'}, text="${el ? el.textContent.trim().slice(0,60) : ''}"`); return el; })
        .filter(Boolean)
        .map(el => el.textContent.trim())
        .filter(t => t.length > 0 && t.length < 200);
      if (texts.length > 0) { console.log(`  [M4 aria-labelledby] ✅ "${texts[0]}"`); return texts[0]; }
      else { console.log(`  [M4 aria-labelledby] ✗ all IDs empty or not found`); }
    } else { console.log(`  [M4 aria-labelledby] ✗ attribute not set`); }

    // M5: Walk up DOM for GForms title class
    let ancestor = input.parentElement;
    for (let d = 0; d < 12 && ancestor; d++) {
      for (const cls of GFORMS_TITLE_CLASSES) {
        const el = ancestor.querySelector('.' + cls);
        if (el) {
          const t = el.textContent.trim();
          if (t) { console.log(`  [M5 GForms class .${cls} depth=${d}] ✅ "${t}"`); return t; }
        }
      }
      ancestor = ancestor.parentElement;
    }
    console.log(`  [M5 GForms class walk] ✗ no title class found in 12 levels`);

    // M6: previousElementSibling up 3 levels
    let container = input.parentElement;
    for (let d = 0; d < 3 && container; d++) {
      const prev = container.previousElementSibling;
      if (prev) {
        const t = prev.textContent.trim();
        console.log(`  [M6 prevSibling depth=${d}] text="${t.slice(0,80)}"`);
        if (t && t.length > 1 && t.length < 100) { console.log(`  [M6] ✅ "${t}"`); return t; }
      } else { console.log(`  [M6 prevSibling depth=${d}] no previous sibling`); }
      container = container.parentElement;
    }
    console.log(`  [M6] ✗ no usable previous sibling`);

    console.warn(`  ⚠️ ALL METHODS FAILED for ${tag}`);
    return null;
  } catch (e) {
    console.error(`  [label] Exception:`, e.message);
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
    const path = [];
    let cur = el;
    while (cur && cur.nodeType === Node.ELEMENT_NODE && cur !== document.body) {
      let sel = cur.tagName.toLowerCase();
      const parent = cur.parentElement;
      if (parent) sel += `:nth-child(${Array.from(parent.children).indexOf(cur)+1})`;
      path.unshift(sel);
      cur = cur.parentElement;
    }
    return path.join(' > ');
  } catch { return ''; }
}

// ── Field Metadata ────────────────────────────────────────────────────────

function extractFieldMetadata(input) {
  try {
    const label = findAssociatedLabel(input);
    const ariaLabel = input.getAttribute('aria-label') || null;
    const meta = {
      id:          input.id || generateUniqueId('field'),
      name:        input.name || '',
      type:        input.type || 'text',
      label,
      placeholder: input.placeholder || '',
      ariaLabel,
      required:    input.required || input.hasAttribute('required'),
      value:       '',
      selector:    generateCSSSelector(input)
    };
    console.log(`[Scanner:field] FINAL META →`, {
      label:       meta.label,
      ariaLabel:   meta.ariaLabel,
      placeholder: meta.placeholder,
      name:        meta.name,
      id:          meta.id,
      type:        meta.type,
      selector:    meta.selector
    });
    return meta;
  } catch (e) {
    console.error('[Scanner:field] extractFieldMetadata error:', e.message);
    return null;
  }
}

// ── Form Detection & Scanning ─────────────────────────────────────────────

function detectForms() {
  const visible = [];
  document.querySelectorAll('form').forEach(f => { if (isElementVisible(f)) visible.push(f); });
  document.querySelectorAll('iframe').forEach(iframe => {
    if (isElementVisible(iframe) && (iframe.src||'').includes('docs.google.com/forms')) visible.push(iframe);
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
  return !!el.querySelector('.g-recaptcha,.h-captcha,iframe[src*="recaptcha"],iframe[src*="hcaptcha"]');
}

function scanForm(formEl) {
  try {
    const id = formEl.id || generateUniqueId('form');
    const type = identifyFormType(formEl);
    console.log(`[Scanner:form] Scanning form id="${id}" type=${type}`);
    if (type === 'google-forms' && formEl.tagName === 'IFRAME')
      return { id, type, hasCaptcha: false, fields: [], action: formEl.src||'', method: 'unknown' };

    const fields = [];
    const inputs = formEl.querySelectorAll(FORM_FIELD_SELECTORS);
    console.log(`[Scanner:form] Found ${inputs.length} raw inputs (before visibility filter)`);
    inputs.forEach((input, idx) => {
      const visible = isElementVisible(input);
      const isBtn = isButtonOrSubmit(input);
      console.log(`[Scanner:form] Input[${idx}] type=${input.type} id=${input.id} name=${input.name} visible=${visible} isBtn=${isBtn}`);
      if (visible && !isBtn) {
        const meta = extractFieldMetadata(input);
        if (meta) fields.push(meta);
      }
    });
    console.log(`[Scanner:form] Extracted ${fields.length} field(s)`);
    return { id, type, hasCaptcha: detectCaptcha(formEl), fields, action: formEl.action||'', method: (formEl.method||'GET').toUpperCase() };
  } catch (e) {
    console.error('[Scanner:form] scanForm error:', e.message);
    return null;
  }
}

function scanPage() {
  console.log('[Scanner:page] === scanPage() called ===');
  const forms = detectForms();
  console.log(`[Scanner:page] ${forms.length} visible form(s) detected`);
  const scanned = [];
  forms.forEach(f => {
    const d = scanForm(f);
    if (d && (d.fields.length > 0 || d.type === 'google-forms')) scanned.push(d);
  });
  console.log(`[Scanner:page] Final: ${scanned.length} form(s) with fields`);
  return { url: window.location.href, title: document.title, forms: scanned, scannedAt: new Date().toISOString() };
}

// ── Messaging ─────────────────────────────────────────────────────────────

function sendFormDataToBackground(data) {
  try { chrome.runtime.sendMessage({ type: 'FORM_DATA_SCANNED', data }); } catch (e) {}
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Scanner:msg] Received:', message.action);
  switch (message.action) {
    case 'AUTOFILL':
      console.log('[Scanner:msg] AUTOFILL — matches to fill:', message.matches.length);
      message.matches.forEach((m, i) => {
        console.log(`  Match[${i}]: label="${m.formFieldLabel}" selector="${m.formFieldSelector}" value="${m.profileValue}"`);
      });
      try {
        const results = executeAutofill(message.matches);
        console.log('[Scanner:msg] executeAutofill result:', results);
        sendResponse({ success: true, results });
      } catch (e) {
        console.error('[Scanner:msg] executeAutofill threw:', e);
        sendResponse({ success: false, error: e.message });
      }
      return true;
    case 'SCAN_PAGE': {
      console.log('[Scanner:msg] Manual SCAN_PAGE requested');
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

// ── MutationObserver ──────────────────────────────────────────────────────

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

// ── Init ──────────────────────────────────────────────────────────────────

async function init() {
  try {
    await isPageReady();
    console.log('[Scanner] Page ready — running initial scan');
    sendFormDataToBackground(scanPage());
    mutationObserver = observeDOMChanges();
    console.log('[Scanner] Init complete - Phase 7');
  } catch (e) { console.error('[Scanner] Init error:', e.message); }
}

init();
