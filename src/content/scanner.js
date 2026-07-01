/**
 * Content Script Scanner - Phase 8
 * Fix: records formFieldIndex so executor can querySelectorAll[index]
 * when multiple inputs share the same selector (Google Forms jsname=YPqjbf)
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

// ── Label Extraction ──────────────────────────────────────────────────────

function findAssociatedLabel(input) {
  const tag = `${input.tagName.toLowerCase()}#${input.id||'(no-id)'}[name=${input.name||'(no-name)'}]`;
  console.log(`[Scanner:label] Extracting label for ${tag}`);
  try {
    if (input.id) {
      const lbl = document.querySelector(`label[for="${sanitize(input.id)}"]`);
      if (lbl) { const t=lbl.textContent.trim(); if(t){ console.log(`  [M1] ✅ "${t}"`); return t; } }
      else console.log(`  [M1] ✗ no label[for] for id="${input.id}"`);
    } else console.log(`  [M1] ✗ input has no id`);

    const pLbl = input.closest('label');
    if (pLbl) { const t=pLbl.textContent.trim(); if(t){ console.log(`  [M2] ✅ "${t}"`); return t; } }
    else console.log(`  [M2] ✗ not inside label`);

    const al = input.getAttribute('aria-label');
    if (al?.trim()) { console.log(`  [M3] ✅ "${al.trim()}"`); return al.trim(); }
    else console.log(`  [M3] ✗ ${al===null?'not set':'empty'}`);

    const alb = input.getAttribute('aria-labelledby');
    if (alb) {
      const ids = alb.trim().split(/\s+/);
      console.log(`  [M4] ids: [${ids.join(', ')}]`);
      const texts = ids
        .map(id => { const el=document.getElementById(id); console.log(`    "${id}" → ${el?el.tagName+' text="'+el.textContent.trim().slice(0,60)+'"':'NOT FOUND'}`); return el; })
        .filter(Boolean).map(el=>el.textContent.trim()).filter(t=>t.length>0&&t.length<200);
      if (texts.length) { console.log(`  [M4] ✅ "${texts[0]}"`); return texts[0]; }
      else console.log(`  [M4] ✗ all IDs empty or missing`);
    } else console.log(`  [M4] ✗ no aria-labelledby`);

    let ancestor = input.parentElement;
    for (let d=0; d<12 && ancestor; d++) {
      for (const cls of GFORMS_TITLE_CLASSES) {
        const el = ancestor.querySelector('.'+cls);
        if (el) { const t=el.textContent.trim(); if(t){ console.log(`  [M5 cls=${cls} d=${d}] ✅ "${t}"`); return t; } }
      }
      ancestor = ancestor.parentElement;
    }
    console.log(`  [M5] ✗ no GForms class found`);

    let container = input.parentElement;
    for (let d=0; d<3 && container; d++) {
      const prev = container.previousElementSibling;
      if (prev) { const t=prev.textContent.trim(); if(t&&t.length>1&&t.length<100){ console.log(`  [M6 d=${d}] ✅ "${t}"`); return t; } }
      container = container.parentElement;
    }
    console.log(`  [M6] ✗ no usable prev sibling`);
    console.warn(`  ⚠️ ALL METHODS FAILED for ${tag}`);
    return null;
  } catch(e) { console.error(`  [label] Exception:`, e.message); return null; }
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
    while (cur && cur.nodeType===Node.ELEMENT_NODE && cur!==document.body) {
      let sel = cur.tagName.toLowerCase();
      const p = cur.parentElement;
      if (p) sel += `:nth-child(${Array.from(p.children).indexOf(cur)+1})`;
      path.unshift(sel);
      cur = cur.parentElement;
    }
    return path.join(' > ');
  } catch { return ''; }
}

// ── Field Metadata ────────────────────────────────────────────────────────
// selectorIndex = position of this input among ALL inputs matching the same selector
// This is what executor uses to pick the right element via querySelectorAll[index]

function buildSelectorIndex(input, selector) {
  try {
    if (!selector) return 0;
    const all = document.querySelectorAll(selector);
    const idx = Array.from(all).indexOf(input);
    return idx >= 0 ? idx : 0;
  } catch { return 0; }
}

function extractFieldMetadata(input) {
  try {
    const label = findAssociatedLabel(input);
    const selector = generateCSSSelector(input);
    const selectorIndex = buildSelectorIndex(input, selector);
    const meta = {
      id:             input.id || generateUniqueId('field'),
      name:           input.name || '',
      type:           input.type || 'text',
      label,
      placeholder:    input.placeholder || '',
      ariaLabel:      input.getAttribute('aria-label') || null,
      required:       input.required || input.hasAttribute('required'),
      value:          '',
      selector,
      selectorIndex   // ← KEY: the index among all elements matching this selector
    };
    console.log(`[Scanner:field] FINAL META →`, {
      label:         meta.label,
      selector:      meta.selector,
      selectorIndex: meta.selectorIndex,
      name:          meta.name,
      id:            meta.id
    });
    return meta;
  } catch(e) { console.error('[Scanner:field] error:', e.message); return null; }
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
  if (window.location.hostname === 'docs.google.com' && window.location.pathname.includes('/forms/')) return 'google-forms';
  return 'generic';
}

function detectCaptcha(el) {
  return !!el.querySelector('.g-recaptcha,.h-captcha,iframe[src*="recaptcha"],iframe[src*="hcaptcha"]');
}

function scanForm(formEl) {
  try {
    const id = formEl.id || generateUniqueId('form');
    const type = identifyFormType(formEl);
    console.log(`[Scanner:form] id="${id}" type=${type}`);
    if (type === 'google-forms' && formEl.tagName === 'IFRAME')
      return { id, type, hasCaptcha: false, fields: [], action: formEl.src||'', method: 'unknown' };

    const fields = [];
    formEl.querySelectorAll(FORM_FIELD_SELECTORS).forEach((input, idx) => {
      const visible = isElementVisible(input);
      const isBtn = isButtonOrSubmit(input);
      console.log(`[Scanner:form] Input[${idx}] type=${input.type} visible=${visible} isBtn=${isBtn}`);
      if (visible && !isBtn) {
        const meta = extractFieldMetadata(input);
        if (meta) fields.push(meta);
      }
    });
    console.log(`[Scanner:form] ${fields.length} field(s) extracted`);
    return { id, type, hasCaptcha: detectCaptcha(formEl), fields, action: formEl.action||'', method: (formEl.method||'GET').toUpperCase() };
  } catch(e) { console.error('[Scanner:form] error:', e.message); return null; }
}

function scanPage() {
  console.log('[Scanner:page] === scanPage() ===');
  const forms = detectForms();
  console.log(`[Scanner:page] ${forms.length} visible form(s)`);
  const scanned = [];
  forms.forEach(f => {
    const d = scanForm(f);
    if (d && (d.fields.length > 0 || d.type === 'google-forms')) scanned.push(d);
  });
  return { url: window.location.href, title: document.title, forms: scanned, scannedAt: new Date().toISOString() };
}

// ── Messaging ─────────────────────────────────────────────────────────────

function sendFormDataToBackground(data) {
  try { chrome.runtime.sendMessage({ type: 'FORM_DATA_SCANNED', data }); } catch {}
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Scanner:msg] Received:', message.action);
  switch (message.action) {
    case 'AUTOFILL': {
      console.log('[Scanner:msg] AUTOFILL — fields:', message.matches.length);
      message.matches.forEach((m, i) => {
        console.log(`  [${i}] label="${m.formFieldLabel}" selector="${m.formFieldSelector}" index=${m.formFieldIndex} value="${m.profileValue}"`);
      });
      try {
        const results = executeAutofill(message.matches);
        sendResponse({ success: true, results });
      } catch(e) {
        console.error('[Scanner:msg] executeAutofill threw:', e);
        sendResponse({ success: false, error: e.message });
      }
      return true;
    }
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
          n.nodeType===Node.ELEMENT_NODE &&
          (n.nodeName==='FORM' || (n.querySelectorAll && n.querySelectorAll('form').length>0))
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
    console.log('[Scanner] Page ready — initial scan');
    sendFormDataToBackground(scanPage());
    mutationObserver = observeDOMChanges();
    console.log('[Scanner] Init complete - Phase 8');
  } catch(e) { console.error('[Scanner] Init error:', e.message); }
}

init();
