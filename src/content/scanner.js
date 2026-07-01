/**
 * scanner.js — SmartFill content script entry point
 * Full lifecycle logging. Calls initScanner() immediately on load.
 *
 * Fix (Issue 1): domain is forwarded to attachAllRecorders().
 * Fix (Issue 2): attachHoverListeners() is now wired in after profile match.
 */

import { scanFields, observeNewFields } from './fieldScanner.js';
import { attachAllRecorders }           from './fillRecorder.js';
import { attachAllAutofillers }         from './autofiller.js';
import { attachHoverListeners }         from './hoverListener.js';
import { loadProfile }                  from './profileMatcher.js';
import { mapProfileToForm }             from '../engine/mapper.js';
import { simpleMapProfileToForm }       from '../engine/simpleMapper.js';

const FRAME_URL  = window.location.href;
const IS_IFRAME  = window.self !== window.top;
const FRAME_TYPE = IS_IFRAME ? 'IFRAME' : 'TOP';

function injectTooltipStyles() {
  if (document.getElementById('sf-tooltip-styles')) return;
  const link = document.createElement('link');
  link.id   = 'sf-tooltip-styles';
  link.rel  = 'stylesheet';
  link.href = chrome.runtime.getURL('content/tooltip.css');
  (document.head || document.documentElement).appendChild(link);
  console.log(`[SmartFill][${FRAME_TYPE}] tooltip.css injected`);
}

/**
 * Build hover-listener field descriptors by pre-resolving profile values.
 * Each field gets a `profileValue` so hoverListener can show a fallback
 * even when IDB field_memory is empty.
 */
async function buildHoverFields(fields, profile) {
  if (!profile || fields.length === 0) return fields;

  const mappedFields = fields.map(function(f) {
    return {
      id:            f.el.id            || '',
      name:          f.el.name          || '',
      label:         f.label            || '',
      ariaLabel:     f.el.getAttribute('aria-label') || '',
      placeholder:   f.el.placeholder   || '',
      type:          f.type             || f.el.type || 'text',
      selector:      f.selector         || '',
      selectorIndex: 0,
    };
  });

  const formData = {
    url: window.location.href,
    forms: [
      {
        id: 'sf-hover-scan',
        hasCaptcha: false,
        type: null,
        fields: mappedFields,
      },
    ],
  };

  // Try primary mapper first, fall back to simpleMapper
  let result = mapProfileToForm(profile, formData);
  if (!result.matches.length) result = simpleMapProfileToForm(profile, formData);

  // Build a label->value lookup from match results
  const valueMap = {};
  for (const m of result.matches) {
    valueMap[m.formFieldLabel] = m.profileValue;
  }

  return fields.map(function(f) {
    return {
      el:           f.el,
      label:        f.label,
      fieldType:    f.fieldType,
      profileValue: valueMap[f.label] || null,
    };
  });
}

async function initScanner(domain) {
  const d = domain || window.location.hostname;

  console.log('[SmartFill][' + FRAME_TYPE + '] initScanner START url: ' + FRAME_URL);
  console.log('[SmartFill][' + FRAME_TYPE + '] document.readyState = ' + document.readyState);
  console.log('[SmartFill][' + FRAME_TYPE + '] domain = ' + d);

  injectTooltipStyles();

  const initial = scanFields(d);
  console.log('[SmartFill][' + FRAME_TYPE + '] initial scan -> ' + initial.length + ' field(s)');

  if (initial.length > 0) {
    initial.forEach(function(f, i) {
      console.log('[SmartFill][' + FRAME_TYPE + ']   field[' + i + '] label="' + f.label + '" type=' + f.fieldType + ' el=' + f.el.tagName);
    });
  } else {
    console.warn('[SmartFill][' + FRAME_TYPE + '] No fields on initial scan - MutationObserver will catch dynamic fields');
  }

  attachAllRecorders(initial, d);
  attachAllAutofillers(initial);

  // Wire hover listeners with pre-resolved profile values
  try {
    const profile     = await loadProfile();
    const hoverFields = await buildHoverFields(initial, profile);
    attachHoverListeners(hoverFields);
    console.log('[SmartFill][' + FRAME_TYPE + '] hoverListeners attached - ' + hoverFields.length + ' field(s)');
  } catch (e) {
    console.error('[SmartFill][' + FRAME_TYPE + '] hoverListener setup failed:', e);
  }

  console.log('[SmartFill][' + FRAME_TYPE + '] init complete - watching for new fields...');

  observeNewFields(async function(newFields) {
    console.log('[SmartFill][' + FRAME_TYPE + '] MutationObserver -> ' + newFields.length + ' new field(s)');
    newFields.forEach(function(f, i) {
      console.log('[SmartFill][' + FRAME_TYPE + ']   newField[' + i + '] label="' + f.label + '" type=' + f.fieldType);
    });
    attachAllRecorders(newFields, d);
    attachAllAutofillers(newFields);

    try {
      const profile     = await loadProfile();
      const hoverFields = await buildHoverFields(newFields, profile);
      attachHoverListeners(hoverFields);
    } catch (e) {
      console.error('[SmartFill][' + FRAME_TYPE + '] hoverListener setup failed for new fields:', e);
    }
  }, d);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() { initScanner(); });
} else {
  initScanner();
}
