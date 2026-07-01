/**
 * scanner.js — SmartFill content script entry point
 * ─────────────────────────────────────────────────────────
 * Injected into every page via manifest content_scripts.
 * Bundled by Webpack into dist/content.js.
 *
 * Responsibilities (Phase 1):
 *   1. Scan page for fillable fields (fieldScanner.js)
 *   2. Attach record-on-fill listeners (fillRecorder.js)
 *   3. Watch for SPA navigation / late-rendered forms
 *
 * Phase 2 will add: autofill on focus, suggestion tooltip.
 */

import { scanFields, observeNewFields } from './fieldScanner.js';
import { attachAllRecorders }           from './fillRecorder.js';

const DOMAIN = window.location.hostname;

// ───────────────────────────────────────────────────────────
// INIT
// ───────────────────────────────────────────────────────────

function init() {
  console.log(`[SmartFill] content script loaded on ${DOMAIN}`);

  // Initial scan
  const fields = scanFields(DOMAIN);
  attachAllRecorders(fields, DOMAIN);

  // Watch for SPA / lazy-rendered fields
  observeNewFields((newFields) => {
    attachAllRecorders(newFields, DOMAIN);
  }, DOMAIN);

  console.log(`[SmartFill] init complete — watching ${fields.length} field(s)`);
}

// Run after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
