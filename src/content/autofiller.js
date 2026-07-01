/**
 * autofiller.js — SmartFill (Step 3: Adaptive Learning Loop)
 *
 * PRIMARY ENGINE:   mapper.js (Levenshtein confidence scoring)
 * FALLBACK ENGINE:  simpleMapper.js (keyword lookup)
 * MEMORY ENGINE:    idb.js field_memory (adaptive, per-field learning)
 *
 * Flow per field focus (updated):
 *   focus → check field_memory (getTopSuggestions)
 *         → memory hit  → showTooltip(memory value) → onAccept → fill → recordFill ✅
 *         → no memory   → runAutofill (mapper → simpleMapper fallback)
 *                       → showTooltip(profile value) → onAccept → fill → recordFill ✅
 *         → no match    → silent (no tooltip, no fill)
 *
 * recordFill is called ONLY on confirmed fills (user accepted or silent offscreen).
 * Rejected/dismissed suggestions are NOT recorded.
 */

import { loadProfile as loadProfileFromMatcher }  from './profileMatcher.js';
import { showTooltip, hideTooltip }                from './tooltip.js';
import { mapProfileToForm }                        from '../engine/mapper.js';
import { simpleMapProfileToForm }                  from '../engine/simpleMapper.js';
import { recordFill, getTopSuggestions }           from '../storage/idb.js';
import { buildFingerprint }                        from '../engine/fingerprint.js';

const DOMAIN     = window.location.hostname;
const IS_IFRAME  = window.self !== window.top;
const FRAME_TYPE = IS_IFRAME ? 'IFRAME' : 'TOP';

const CONFIDENCE_THRESHOLD = 0.55;
const FOCUS_DEBOUNCE_MS    = 300;

// ── Memory suggestion threshold ──────────────────────────────────────────────
// A memory hit is used directly (skipping mapper) only if it has been used
// at least this many times. Prevents a single accidental fill from dominating.
const MEMORY_MIN_USED = 1;

let _profileCache = null;
async function getProfile() {
  if (!_profileCache) {
    console.log(`[Autofiller][${FRAME_TYPE}] loading profile...`);
    _profileCache = await loadProfileFromMatcher();
    console.log(`[Autofiller][${FRAME_TYPE}] profile loaded — keys:`,
      Object.keys(_profileCache || {}).join(', ').slice(0, 120));
  }
  return _profileCache;
}

function handleSelectFill(el, value) {
  if (el.tagName === 'SELECT') {
    const opt = Array.from(el.options).find(o =>
      o.value.toLowerCase() === String(value).toLowerCase() ||
      o.text.toLowerCase()  === String(value).toLowerCase()
    );
    if (opt) {
      el.value = opt.value;
      el.dispatchEvent(new Event('change', { bubbles: true }));
      console.log(`[Autofiller][${FRAME_TYPE}] native <select> filled → "${opt.text}"`);
      return true;
    }
    console.warn(`[Autofiller][${FRAME_TYPE}] native <select> — no option matched "${value}"`);
    return false;
  }

  const container = el.closest('[role="listbox"]') || el;
  const options   = container.querySelectorAll('[role="option"], [data-value]');
  if (options.length === 0) {
    console.warn(`[Autofiller][${FRAME_TYPE}] no option elements found in select widget`);
    return false;
  }

  el.click();
  el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

  const norm = String(value).toLowerCase().trim();
  for (const opt of options) {
    const text = (opt.textContent || opt.getAttribute('data-value') || '').toLowerCase().trim();
    if (text === norm || text.includes(norm) || norm.includes(text)) {
      setTimeout(() => {
        opt.click();
        opt.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        console.log(`[Autofiller][${FRAME_TYPE}] custom listbox clicked → "${opt.textContent.trim()}"`);
      }, 150);
      return true;
    }
  }

  console.warn(`[Autofiller][${FRAME_TYPE}] custom listbox — no option matched "${value}"`);
  return false;
}

function showBadge(el) {
  if (el.parentElement?.querySelector('.sf-badge')) return;
  const badge = document.createElement('span');
  badge.className   = 'sf-badge';
  badge.textContent = 'SmartFill ✓';
  badge.style.cssText = [
    'position:absolute', 'right:8px', 'top:50%',
    'transform:translateY(-50%)', 'font-size:10px',
    'color:#22c55e', 'background:rgba(0,0,0,0.06)',
    'padding:2px 6px', 'border-radius:4px',
    'pointer-events:none', 'z-index:99999',
    'font-family:sans-serif', 'letter-spacing:0.3px',
  ].join(';');
  const parent = el.parentElement;
  if (parent) {
    if (getComputedStyle(parent).position === 'static')
      parent.style.position = 'relative';
    parent.appendChild(badge);
  }
  setTimeout(() => badge.remove(), 2500);
}

function fillElementDirectly(el, value) {
  const str = String(value);
  const tag  = el.tagName.toLowerCase();
  try {
    el.focus();
    const proto = tag === 'textarea'
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    if (desc && desc.set) {
      desc.set.call(el, str);
    } else {
      el.value = str;
    }
    el.dispatchEvent(new InputEvent('input', {
      bubbles: true, cancelable: true, data: str, inputType: 'insertText',
    }));
    ['keydown', 'keyup'].forEach(evtName => {
      el.dispatchEvent(new KeyboardEvent(evtName, {
        bubbles: true, cancelable: true,
        key: str.slice(-1) || ' ', code: 'KeyA',
      }));
    });
    el.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
    el.dispatchEvent(new Event('blur',   { bubbles: true, cancelable: true }));
    console.log(`[Autofiller][${FRAME_TYPE}] fillElementDirectly ✅ "${str}" → ${tag}`);
    return true;
  } catch (e) {
    console.error(`[Autofiller][${FRAME_TYPE}] fillElementDirectly error:`, e);
    return false;
  }
}

function buildSingleFieldFormData(fieldInfo, el) {
  return {
    url: window.location.href,
    forms: [{
      id: 'sf-single',
      hasCaptcha: false,
      type: null,
      fields: [{
        id:            el.id               || '',
        name:          el.name             || '',
        label:         fieldInfo.label     || '',
        ariaLabel:     fieldInfo.ariaLabel || el.getAttribute('aria-label') || '',
        placeholder:   el.placeholder      || fieldInfo.placeholder || '',
        type:          fieldInfo.type      || el.type || 'text',
        selector:      fieldInfo.selector  || '',
        selectorIndex: typeof fieldInfo.selectorIndex === 'number' ? fieldInfo.selectorIndex : 0,
      }],
    }],
  };
}

async function runAutofill(fieldInfo, el) {
  const rawProfile  = await getProfile();
  const formData    = buildSingleFieldFormData(fieldInfo, el);

  const innerProfile = rawProfile?.personal
    ? rawProfile
    : (rawProfile?.profile || rawProfile);

  console.log(`[Autofiller][${FRAME_TYPE}] mapper.js running for label="${fieldInfo.label}"`);
  const fuzzyResult = mapProfileToForm(innerProfile, formData);
  console.log(`[Autofiller][${FRAME_TYPE}] mapper result: ${
    fuzzyResult.matches.length} match(es), overallConfidence=${fuzzyResult.overallConfidence}`);

  if (fuzzyResult.matches.length > 0) {
    const match = fuzzyResult.matches[0];
    if (match.confidence >= CONFIDENCE_THRESHOLD) {
      console.log(`[Autofiller][${FRAME_TYPE}] ✅ fuzzy match → ` +
        `path="${match.profilePath}" value="${match.profileValue}" ` +
        `confidence=${match.confidence.toFixed(3)}`);
      return match;
    }
    console.log(`[Autofiller][${FRAME_TYPE}] ⚠ fuzzy match below threshold — trying fallback`);
  }

  console.log(`[Autofiller][${FRAME_TYPE}] simpleMapper fallback for label="${fieldInfo.label}"`);
  const simpleResult = simpleMapProfileToForm(innerProfile, formData);
  if (simpleResult.matches.length > 0) {
    const match = simpleResult.matches[0];
    console.log(`[Autofiller][${FRAME_TYPE}] ✅ simple fallback match → ` +
      `path="${match.profilePath}" value="${match.profileValue}"`);
    return { ...match, confidence: 0.60, matchedOn: 'keyword-fallback' };
  }

  console.warn(`[Autofiller][${FRAME_TYPE}] ❌ no match for label="${fieldInfo.label}"`);
  return null;
}

const _attached = new WeakSet();

export function attachAutofiller(fieldInfo) {
  const el = fieldInfo.element || fieldInfo.el;
  if (!el || _attached.has(el)) return;
  _attached.add(el);

  const isSelect = fieldInfo.type === 'select' || el.tagName === 'SELECT' ||
                   el.getAttribute('role') === 'listbox';

  // ── Build a stable fingerprint for this field ─────────────────────────────
  // Format: "docs.google.com::email address::text"
  // Used as the key into field_memory for adaptive learning.
  const fingerprint = buildFingerprint(
    DOMAIN,
    fieldInfo.label || fieldInfo.ariaLabel || '',
    fieldInfo.type  || el.type || 'text'
  );

  console.log(`[Autofiller][${FRAME_TYPE}] attachAutofiller → ` +
    `label="${fieldInfo.label}" el=${el.tagName} type=${fieldInfo.type} ` +
    `fingerprint="${fingerprint}" on ${DOMAIN}`);

  // ── Duplicate-suggestion guard ────────────────────────────────────────────
  let _tooltipActive     = false;
  let _focusDebounceTimer = null;

  el.addEventListener('focus', () => {
    clearTimeout(_focusDebounceTimer);
    _focusDebounceTimer = setTimeout(async () => {

      if (_tooltipActive) {
        console.log(`[Autofiller][${FRAME_TYPE}] tooltip already active — skipping duplicate focus for "${fieldInfo.label}"`);
        return;
      }

      console.log(`[Autofiller][${FRAME_TYPE}] FOCUS → label="${fieldInfo.label}" value="${el.value}"`);

      if (!isSelect && el.value && el.value.trim() !== '') {
        console.log(`[Autofiller][${FRAME_TYPE}] already filled — skipping`);
        return;
      }

      // ── STEP 1: Check field_memory FIRST ─────────────────────────────────
      // If the user has filled this exact field before (same domain+label+type),
      // use their past answer directly — no mapper needed.
      let memorySuggestion = null;
      if (fingerprint) {
        try {
          const topSuggestions = await getTopSuggestions(fingerprint, 1);
          if (topSuggestions.length > 0 && topSuggestions[0].usedCount >= MEMORY_MIN_USED) {
            memorySuggestion = topSuggestions[0];
            console.log(`[Autofiller][${FRAME_TYPE}] 🧠 memory hit → "${memorySuggestion.value}" ` +
              `(usedCount=${memorySuggestion.usedCount} score=${memorySuggestion.score?.toFixed(3)})`);
          }
        } catch (memErr) {
          console.warn(`[Autofiller][${FRAME_TYPE}] memory lookup failed (non-fatal):`, memErr);
        }
      }

      // ── STEP 2: Resolve the value to suggest ─────────────────────────────
      // Memory hit → use it. Otherwise fall through to mapper.
      const suggestionValue = memorySuggestion?.value ?? null;
      const suggestionSource = memorySuggestion ? 'memory' : 'profile';

      let matchValue = suggestionValue;
      if (!matchValue) {
        const match = await runAutofill(fieldInfo, el);
        if (!match) return;
        matchValue = match.profileValue;
      }

      // ── STEP 3: Fill or show tooltip ──────────────────────────────────────
      const rect    = el.getBoundingClientRect();
      const visible = rect.width > 0 && rect.height > 0 &&
                      rect.top < window.innerHeight && rect.bottom > 0;

      if (isSelect) {
        console.log(`[Autofiller][${FRAME_TYPE}] SELECT fill → "${matchValue}" (source: ${suggestionSource})`);
        const ok = handleSelectFill(el, matchValue);
        if (ok) {
          showBadge(el);
          // Record the fill
          if (fingerprint) {
            recordFill({
              fingerprint,
              domain:    DOMAIN,
              label:     fieldInfo.label || '',
              fieldType: fieldInfo.type  || 'select',
              value:     matchValue,
            }).catch(e => console.warn(`[Autofiller][${FRAME_TYPE}] recordFill error:`, e));
          }
        }
        return;
      }

      if (visible) {
        _tooltipActive = true;
        const tooltipIcon = suggestionSource === 'memory' ? '🧠' : '💡';
        console.log(`[Autofiller][${FRAME_TYPE}] showing tooltip (${tooltipIcon} ${suggestionSource}) for label="${fieldInfo.label}"`);

        showTooltip(
          el,
          { label: fieldInfo.label, value: matchValue, icon: tooltipIcon },
          (accepted) => {
            console.log(`[Autofiller][${FRAME_TYPE}] ✅ accepted → "${fieldInfo.label}" = "${accepted}" (source: ${suggestionSource})`);
            const ok = fillElementDirectly(el, accepted);
            if (ok) {
              showBadge(el);
              // ── Record this fill into field_memory ──────────────────────
              if (fingerprint) {
                recordFill({
                  fingerprint,
                  domain:    DOMAIN,
                  label:     fieldInfo.label || '',
                  fieldType: fieldInfo.type  || el.type || 'text',
                  value:     accepted,
                }).catch(e => console.warn(`[Autofiller][${FRAME_TYPE}] recordFill error:`, e));
              }
            }
            _tooltipActive = false;
          }
        );
      } else {
        // Silent fill for offscreen fields — always record
        console.log(`[Autofiller][${FRAME_TYPE}] offscreen — silent fill "${fieldInfo.label}" → "${matchValue}" (source: ${suggestionSource})`);
        const ok = fillElementDirectly(el, matchValue);
        if (ok && fingerprint) {
          recordFill({
            fingerprint,
            domain:    DOMAIN,
            label:     fieldInfo.label || '',
            fieldType: fieldInfo.type  || el.type || 'text',
            value:     matchValue,
          }).catch(e => console.warn(`[Autofiller][${FRAME_TYPE}] recordFill error:`, e));
        }
      }

    }, FOCUS_DEBOUNCE_MS);
  });

  el.addEventListener('blur', () => {
    clearTimeout(_focusDebounceTimer);
    _tooltipActive = false;
    setTimeout(() => hideTooltip(), 300);
  });
}

export function attachAllAutofillers(fields) {
  console.log(`[Autofiller][${FRAME_TYPE}] attachAllAutofillers → ${fields.length} field(s)`);
  let attached = 0;
  for (const f of fields) {
    try { attachAutofiller(f); attached++; } catch (e) {
      console.error(`[Autofiller][${FRAME_TYPE}] error attaching to "${f.label}":`, e);
    }
  }
  console.log(`[Autofiller][${FRAME_TYPE}] attached ${attached}/${fields.length}`);
}
