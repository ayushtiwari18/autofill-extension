/**
 * scanner.js — SmartFill A6 (updated)
 * Wires scanFields + observeNewFields + attachAllAutofillers.
 * Also injects tooltip.css once per page load.
 */

import { scanFields, observeNewFields } from './fieldScanner.js';
import { attachAllRecorders }           from './recorder.js';
import { attachAllAutofillers }         from './autofiller.js';

function injectTooltipStyles() {
  if (document.getElementById('sf-tooltip-styles')) return;
  const link = document.createElement('link');
  link.id   = 'sf-tooltip-styles';
  link.rel  = 'stylesheet';
  link.href = chrome.runtime.getURL('src/content/tooltip.css');
  (document.head || document.documentElement).appendChild(link);
}

export function initScanner(domain) {
  const d = domain || window.location.hostname;

  injectTooltipStyles();

  const initial = scanFields(d);
  attachAllRecorders(initial);
  attachAllAutofillers(initial);

  console.log(`[SmartFill] init complete — watching ${initial.length} field(s)`);

  observeNewFields((newFields) => {
    attachAllRecorders(newFields);
    attachAllAutofillers(newFields);
  }, d);
}
