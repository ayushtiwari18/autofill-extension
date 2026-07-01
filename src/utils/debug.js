/**
 * Debug Logger Utility
 * Central logging system for the Autofill Extension
 * Provides colored, timestamped, labeled console output
 * for every module so silent failures become visible.
 *
 * HOW TO USE:
 *   import { log, warn, error, group, groupEnd, table } from '../utils/debug.js';
 *   log('Scanner', 'Form detected', { id: 'form-1', fields: 5 });
 *   warn('Executor', 'Element not found', { selector: '#name' });
 *   error('Mapper', 'Profile value missing', { path: 'personal.firstName' });
 */

// ============================================
// CONFIGURATION
// ============================================

/**
 * Master switch — set to false to silence all debug logs
 * in production. Keep true during development and testing.
 */
const DEBUG_ENABLED = true;

/**
 * Module-level switches — disable noisy modules individually
 * without turning off everything else.
 * Set a module to false to silence only that module.
 */
const MODULE_ENABLED = {
  Scanner:       true,
  Executor:      true,
  Mapper:        true,
  Confidence:    true,
  Rules:         true,
  ProfileStore:  true,
  ServiceWorker: true,
  Popup:         true,
  Dashboard:     true,
  Review:        true,
  Encryption:    true,
  General:       true,
};

// ============================================
// STYLES (DevTools Console Colors)
// ============================================

const STYLES = {
  // Module label badges
  Scanner:       'background:#1d4ed8;color:#fff;padding:2px 6px;border-radius:4px;font-weight:bold;',
  Executor:      'background:#7c3aed;color:#fff;padding:2px 6px;border-radius:4px;font-weight:bold;',
  Mapper:        'background:#0f766e;color:#fff;padding:2px 6px;border-radius:4px;font-weight:bold;',
  Confidence:    'background:#b45309;color:#fff;padding:2px 6px;border-radius:4px;font-weight:bold;',
  Rules:         'background:#475569;color:#fff;padding:2px 6px;border-radius:4px;font-weight:bold;',
  ProfileStore:  'background:#0369a1;color:#fff;padding:2px 6px;border-radius:4px;font-weight:bold;',
  ServiceWorker: 'background:#4d7c0f;color:#fff;padding:2px 6px;border-radius:4px;font-weight:bold;',
  Popup:         'background:#9f1239;color:#fff;padding:2px 6px;border-radius:4px;font-weight:bold;',
  Dashboard:     'background:#6b21a8;color:#fff;padding:2px 6px;border-radius:4px;font-weight:bold;',
  Review:        'background:#0e7490;color:#fff;padding:2px 6px;border-radius:4px;font-weight:bold;',
  Encryption:    'background:#1e293b;color:#fff;padding:2px 6px;border-radius:4px;font-weight:bold;',
  General:       'background:#374151;color:#fff;padding:2px 6px;border-radius:4px;font-weight:bold;',

  // Log level indicators
  INFO:    'color:#3b82f6;font-weight:bold;',
  WARN:    'color:#f59e0b;font-weight:bold;',
  ERROR:   'color:#ef4444;font-weight:bold;',
  SUCCESS: 'color:#22c55e;font-weight:bold;',

  // Timestamp
  TIME:    'color:#94a3b8;font-size:11px;',

  // Data payload
  DATA:    'color:#e2e8f0;',
};

// ============================================
// INTERNAL HELPERS
// ============================================

/**
 * Get HH:MM:SS.mmm timestamp string
 */
function getTimestamp() {
  const now = new Date();
  const h  = String(now.getHours()).padStart(2, '0');
  const m  = String(now.getMinutes()).padStart(2, '0');
  const s  = String(now.getSeconds()).padStart(2, '0');
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  return `${h}:${m}:${s}.${ms}`;
}

/**
 * Check whether this log should be printed
 * @param {string} module
 */
function shouldLog(module) {
  if (!DEBUG_ENABLED) return false;
  const key = module in MODULE_ENABLED ? module : 'General';
  return MODULE_ENABLED[key] !== false;
}

/**
 * Core print function used by all exported helpers
 * @param {string} level    - 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS'
 * @param {string} module   - Module name (Scanner, Executor, etc.)
 * @param {string} message  - Human-readable message
 * @param {any}    data     - Optional data to print (object, array, string)
 */
function print(level, module, message, data) {
  if (!shouldLog(module)) return;

  const ts        = getTimestamp();
  const modStyle  = STYLES[module] || STYLES.General;
  const lvlStyle  = STYLES[level]  || STYLES.INFO;
  const levelIcon = { INFO: 'ℹ️', WARN: '⚠️', ERROR: '❌', SUCCESS: '✅' }[level] || '•';

  // Build the format string and args for console.log
  const fmt  = `%c${ts}%c %c${module}%c ${levelIcon} ${message}`;
  const args = [
    STYLES.TIME,  '',
    modStyle,     '',
    fmt
  ];

  // Rewrite to plain approach for broader DevTools compat
  if (data !== undefined) {
    switch (level) {
      case 'ERROR': console.error(`[${ts}] [${module}] ${levelIcon} ${message}`, data); break;
      case 'WARN':  console.warn(`[${ts}] [${module}] ${levelIcon} ${message}`, data);  break;
      default:      console.log(`[${ts}] [${module}] ${levelIcon} ${message}`, data);   break;
    }
  } else {
    switch (level) {
      case 'ERROR': console.error(`[${ts}] [${module}] ${levelIcon} ${message}`); break;
      case 'WARN':  console.warn(`[${ts}] [${module}] ${levelIcon} ${message}`);  break;
      default:      console.log(`[${ts}] [${module}] ${levelIcon} ${message}`);   break;
    }
  }
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Log a regular info message.
 * Use for: field detected, form scanned, mapping started, fill attempted.
 *
 * @param {string} module  - e.g. 'Scanner'
 * @param {string} message - e.g. 'Form detected'
 * @param {any}   [data]   - e.g. { id: 'form-1', fields: 5 }
 */
export function log(module, message, data) {
  print('INFO', module, message, data);
}

/**
 * Log a success event.
 * Use for: field filled successfully, profile loaded, mapping complete.
 *
 * @param {string} module
 * @param {string} message
 * @param {any}   [data]
 */
export function success(module, message, data) {
  print('SUCCESS', module, message, data);
}

/**
 * Log a warning — something was skipped or unexpected but not fatal.
 * Use for: disabled field skipped, no match found, CAPTCHA detected.
 *
 * @param {string} module
 * @param {string} message
 * @param {any}   [data]
 */
export function warn(module, message, data) {
  print('WARN', module, message, data);
}

/**
 * Log an error — something failed and needs attention.
 * Use for: element not found, selector invalid, setValue failed.
 *
 * @param {string} module
 * @param {string} message
 * @param {any}   [data]
 */
export function error(module, message, data) {
  print('ERROR', module, message, data);
}

/**
 * Start a collapsible console group.
 * Use before processing a form or a batch of fields.
 *
 * @param {string} module
 * @param {string} label  - Group title shown in DevTools
 */
export function group(module, label) {
  if (!shouldLog(module)) return;
  console.groupCollapsed(`[${module}] 📂 ${label}`);
}

/**
 * End a collapsible console group.
 */
export function groupEnd(module) {
  if (!shouldLog(module)) return;
  console.groupEnd();
}

/**
 * Print a data table — great for showing all detected fields at once.
 *
 * @param {string} module
 * @param {string} label
 * @param {Array|Object} data
 */
export function table(module, label, data) {
  if (!shouldLog(module)) return;
  console.log(`[${getTimestamp()}] [${module}] 📊 ${label}`);
  console.table(data);
}

/**
 * Log the start of a pipeline step with a divider line.
 * Use at the beginning of scanPage(), executeAutofill(), mapProfileToForm().
 *
 * @param {string} module
 * @param {string} stepName - e.g. 'SCAN PAGE', 'EXECUTE AUTOFILL'
 */
export function step(module, stepName) {
  if (!shouldLog(module)) return;
  const ts = getTimestamp();
  console.log(`[${ts}] [${module}] ──────────── ${stepName} ────────────`);
}

/**
 * Log a key-value pair cleanly — useful for individual field attribute logging.
 *
 * @param {string} module
 * @param {string} label   - e.g. 'Field'
 * @param {Object} kvPairs - e.g. { id: 'email', type: 'email', label: 'Email Address' }
 */
export function kv(module, label, kvPairs) {
  if (!shouldLog(module)) return;
  const ts = getTimestamp();
  const pairs = Object.entries(kvPairs)
    .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
    .join('  |  ');
  console.log(`[${ts}] [${module}]   ${label}: ${pairs}`);
}
