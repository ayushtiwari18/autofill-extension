/**
 * fingerprint.js — Label normalizer + field fingerprinter
 * ─────────────────────────────────────────────────────────
 * Pure utility module. Zero DOM dependencies. Zero IDB dependencies.
 * Import anywhere — content scripts, background, options, tests.
 *
 * Exports:
 *   normalizeLabel(rawLabel)              → string
 *   buildFingerprint(domain, label, type) → string
 *   fingerprintField(element, domain)     → { fingerprint, label, fieldType }
 */


// ═══════════════════════════════════════════════════════════════════════════
// NORMALIZE LABEL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Normalize a raw field label into a stable, lowercase key.
 *
 * Rules applied in order:
 *  1. Coerce to string, handle null/undefined → empty string
 *  2. Lowercase
 *  3. Strip trailing markers: *, (required), (optional), required, optional
 *  4. Strip full parenthetical clauses: (anything inside)
 *  5. Strip leading/trailing punctuation noise: : ; - _
 *  6. Collapse multiple whitespace → single space
 *  7. Trim
 *
 * Examples:
 *  "Full Name *"                        → "full name"
 *  "Email Address   (Write your Email) *" → "email address"
 *  "Contact Number *"                   → "contact number"
 *  "  Phone (required)  "               → "phone"
 *  "What is your LinkedIn URL?"         → "what is your linkedin url?"
 *  ""                                   → ""
 *  null / undefined                     → ""
 *
 * @param {*} rawLabel
 * @returns {string}
 */
export function normalizeLabel(rawLabel) {
  if (rawLabel === null || rawLabel === undefined) return '';

  let s = String(rawLabel);

  // Step 1 — lowercase
  s = s.toLowerCase();

  // Step 2 — strip trailing required/optional markers (before or after *)
  //  e.g. "name (required)", "name *", "name * (required)", "name(optional)"
  s = s.replace(/\s*\(required\)\s*/gi, ' ');
  s = s.replace(/\s*\(optional\)\s*/gi, ' ');
  s = s.replace(/\brequired\b/gi, '');
  s = s.replace(/\boptional\b/gi, '');
  s = s.replace(/\s*\*\s*$/,      '');
  s = s.replace(/^\s*\*\s*/,      '');

  // Step 3 — strip ALL parenthetical clauses: (anything)
  //  e.g. "email address (write your correct email)"
  s = s.replace(/\([^)]*\)/g, '');

  // Step 4 — strip leading/trailing noise punctuation
  s = s.replace(/^[:\-_;]+/, '').replace(/[:\-_;]+$/, '');

  // Step 5 — collapse whitespace
  s = s.replace(/\s+/g, ' ');

  // Step 6 — trim
  s = s.trim();

  return s;
}


// ═══════════════════════════════════════════════════════════════════════════
// FIELD TYPE DETECTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Determine the logical field type from a DOM element.
 * Returns a stable string used in fingerprints.
 *
 * Handles:
 *  - <input type="text|email|tel|number|url|date|...">
 *  - <textarea>
 *  - <select>
 *  - div[role="radiogroup"]  (Google Forms MCQ)
 *  - div[role="group"]       (Google Forms checkbox)
 *
 * @param {Element} el
 * @returns {string}  one of: text | email | tel | number | url | date |
 *                            textarea | select | radio | checkbox | unknown
 */
export function detectFieldType(el) {
  if (!el || !el.tagName) return 'unknown';

  const tag  = el.tagName.toLowerCase();
  const role = (el.getAttribute('role') || '').toLowerCase();

  if (tag === 'textarea')  return 'textarea';
  if (tag === 'select')    return 'select';

  // Google Forms custom role-based widgets
  if (role === 'radiogroup') return 'radio';
  if (role === 'group')      return 'checkbox';
  if (role === 'listbox')    return 'select';

  if (tag === 'input') {
    const type = (el.type || 'text').toLowerCase();
    // Map all text-like types → 'text' for simpler fingerprinting
    if (['text', 'search', 'password'].includes(type)) return 'text';
    if (type === 'email')    return 'email';
    if (type === 'tel')      return 'tel';
    if (type === 'number')   return 'number';
    if (type === 'url')      return 'url';
    if (type === 'date')     return 'date';
    if (type === 'checkbox') return 'checkbox';
    if (type === 'radio')    return 'radio';
    return type; // fallback: use whatever type attr says
  }

  return 'unknown';
}


// ═══════════════════════════════════════════════════════════════════════════
// BUILD FINGERPRINT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build a stable fingerprint string from components.
 *
 * Format: "domain::normalizedLabel::fieldType"
 * Examples:
 *   "docs.google.com::full name::text"
 *   "linkedin.com::phone number::tel"
 *   "forms.gle::email address::email"
 *
 * @param {string} domain     — e.g. "docs.google.com" (window.location.hostname)
 * @param {string} rawLabel   — raw label string (will be normalized here)
 * @param {string} fieldType  — from detectFieldType()
 * @returns {string}          — fingerprint, or empty string if label is empty
 */
export function buildFingerprint(domain, rawLabel, fieldType) {
  const label = normalizeLabel(rawLabel);
  if (!label) return '';

  const d = (domain || 'unknown').toLowerCase().trim();
  const t = (fieldType || 'text').toLowerCase().trim();

  return `${d}::${label}::${t}`;
}


// ═══════════════════════════════════════════════════════════════════════════
// FINGERPRINT A DOM FIELD (convenience wrapper)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Extract label text from a DOM field element using multiple strategies.
 * Same M1→M4 approach as the existing scanner, but standalone here.
 *
 * Strategies (in order):
 *  S1 — aria-labelledby → find referenced element text
 *  S2 — aria-label attribute
 *  S3 — <label for="id"> association
 *  S4 — closest parent label text
 *  S5 — placeholder attribute
 *  S6 — name / id attribute as last resort
 *
 * @param {Element} el
 * @returns {string}  raw label (not yet normalized)
 */
export function extractLabelText(el) {
  if (!el) return '';

  // S1 — aria-labelledby (most reliable, used by Google Forms)
  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy) {
    const parts = labelledBy.trim().split(/\s+/);
    const texts = parts
      .map(id => document.getElementById(id))
      .filter(Boolean)
      .map(node => node.textContent.trim())
      .filter(Boolean);
    if (texts.length) return texts.join(' ');
  }

  // S2 — aria-label
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel && ariaLabel.trim()) return ariaLabel.trim();

  // S3 — <label for="id">
  if (el.id) {
    const label = document.querySelector(`label[for="${el.id}"]`);
    if (label) return label.textContent.trim();
  }

  // S4 — closest ancestor <label>
  const parentLabel = el.closest('label');
  if (parentLabel) {
    // Clone to avoid including the input's own value
    const clone = parentLabel.cloneNode(true);
    clone.querySelectorAll('input,select,textarea').forEach(n => n.remove());
    const t = clone.textContent.trim();
    if (t) return t;
  }

  // S5 — placeholder
  const placeholder = el.getAttribute('placeholder');
  if (placeholder && placeholder.trim()) return placeholder.trim();

  // S6 — name or id
  return el.name || el.id || '';
}


/**
 * Full convenience function: given a DOM element + current domain,
 * returns everything needed to query IDB.
 *
 * @param {Element} el
 * @param {string}  domain  — defaults to window.location.hostname
 * @returns {{ fingerprint: string, label: string, fieldType: string, rawLabel: string }}
 *          Returns fingerprint='' if no usable label found.
 */
export function fingerprintField(el, domain) {
  const d         = domain || (typeof window !== 'undefined' ? window.location.hostname : 'unknown');
  const rawLabel  = extractLabelText(el);
  const fieldType = detectFieldType(el);
  const label     = normalizeLabel(rawLabel);
  const fingerprint = buildFingerprint(d, rawLabel, fieldType);

  return { fingerprint, label, fieldType, rawLabel };
}


// Default export — named object for easy destructuring
export default {
  normalizeLabel,
  detectFieldType,
  buildFingerprint,
  extractLabelText,
  fingerprintField,
};
