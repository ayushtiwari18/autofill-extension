/**
 * scanner.js — SmartFill A6 (debug + self-init)
 * Full lifecycle logging. Calls initScanner() immediately on load.
 *
 * Fix (Issue 1): domain is now forwarded to attachAllRecorders()
 * so Recorder no longer logs "attached on undefined".
 */

import { scanFields, observeNewFields } from './fieldScanner.js';
import { attachAllRecorders }           from './fillRecorder.js';
import { attachAllAutofillers }         from './autofiller.js';

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

function initScanner(domain) {
  const d = domain || window.location.hostname;

  console.log(`[SmartFill][${FRAME_TYPE}] ── initScanner START ── url: ${FRAME_URL}`);
  console.log(`[SmartFill][${FRAME_TYPE}] document.readyState = ${document.readyState}`);
  console.log(`[SmartFill][${FRAME_TYPE}] domain = ${d}`);

  injectTooltipStyles();

  const initial = scanFields(d);
  console.log(`[SmartFill][${FRAME_TYPE}] initial scan → ${initial.length} field(s)`);

  if (initial.length > 0) {
    initial.forEach((f, i) =>
      console.log(`[SmartFill][${FRAME_TYPE}]   field[${i}] label="${f.label}" type=${f.fieldType} el=${f.el.tagName}`)
    );
  } else {
    console.warn(`[SmartFill][${FRAME_TYPE}] ⚠ No fields on initial scan — MutationObserver will catch dynamic fields`);
  }

  // FIX (Issue 1): pass domain to attachAllRecorders so Recorder logs the
  // correct hostname instead of "undefined".
  attachAllRecorders(initial, d);
  attachAllAutofillers(initial);

  console.log(`[SmartFill][${FRAME_TYPE}] init complete — watching for new fields...`);

  observeNewFields((newFields) => {
    console.log(`[SmartFill][${FRAME_TYPE}] MutationObserver → ${newFields.length} new field(s)`);
    newFields.forEach((f, i) =>
      console.log(`[SmartFill][${FRAME_TYPE}]   newField[${i}] label="${f.label}" type=${f.fieldType}`)
    );
    // FIX (Issue 1): also pass domain for newly discovered fields
    attachAllRecorders(newFields, d);
    attachAllAutofillers(newFields);
  }, d);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initScanner());
} else {
  initScanner();
}
