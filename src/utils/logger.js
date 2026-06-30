/**
 * Unified Logger
 * Sends errors/logs from content script and background service worker
 * back to a visible place. In dev mode, also posts to the popup UI.
 *
 * Usage (anywhere in the extension):
 *   import { log, warn, error } from '../utils/logger.js';
 *   log('Scanner', 'Found 3 forms');
 *   error('Mapper', 'Failed to match field', err);
 */

const IS_DEV = typeof process !== 'undefined'
  ? process.env.NODE_ENV !== 'production'
  : true;

// ─── Context detection ──────────────────────────────────────────────────────
function getContext() {
  if (typeof window === 'undefined') return 'background';
  if (window.location && window.location.href.includes('chrome-extension')) return 'popup';
  return 'content';
}

// ─── Core log function ──────────────────────────────────────────────────────
function createLogEntry(level, module, message, data) {
  return {
    level,
    module,
    message,
    data: data || null,
    context: getContext(),
    timestamp: new Date().toISOString()
  };
}

function printToConsole(entry) {
  const prefix = `[${entry.context.toUpperCase()}][${entry.module}]`;
  const msg = `${prefix} ${entry.message}`;
  if (entry.level === 'error') {
    console.error(msg, entry.data || '');
  } else if (entry.level === 'warn') {
    console.warn(msg, entry.data || '');
  } else {
    console.log(msg, entry.data || '');
  }
}

// ─── Forward errors from content/background → popup ────────────────────────
function forwardToBackground(entry) {
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({
        type: 'LOGGER_ENTRY',
        entry
      }).catch(() => {}); // ignore if popup is closed
    }
  } catch (_) {}
}

// ─── Store in chrome.storage for popup to read on open ──────────────────────
async function persistError(entry) {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const result = await chrome.storage.local.get(['__autofill_logs']);
      const logs = result['__autofill_logs'] || [];
      logs.push(entry);
      // Keep last 50 errors only
      const trimmed = logs.slice(-50);
      await chrome.storage.local.set({ '__autofill_logs': trimmed });
    }
  } catch (_) {}
}

// ─── Public API ─────────────────────────────────────────────────────────────
export function log(module, message, data) {
  if (!IS_DEV) return;
  const entry = createLogEntry('info', module, message, data);
  printToConsole(entry);
}

export function warn(module, message, data) {
  const entry = createLogEntry('warn', module, message, data);
  printToConsole(entry);
  if (getContext() !== 'popup') forwardToBackground(entry);
}

export function error(module, message, data) {
  const entry = createLogEntry('error', module, message, data);
  printToConsole(entry);
  persistError(entry);
  if (getContext() !== 'popup') forwardToBackground(entry);
}

/**
 * Read all stored error logs (call from popup)
 * @returns {Promise<Array>}
 */
export async function readStoredLogs() {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const result = await chrome.storage.local.get(['__autofill_logs']);
      return result['__autofill_logs'] || [];
    }
  } catch (_) {}
  return [];
}

/**
 * Clear all stored logs
 */
export async function clearLogs() {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.remove(['__autofill_logs']);
    }
  } catch (_) {}
}
