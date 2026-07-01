/**
 * fingerprint.js — Label normalizer + field fingerprinter
 * ─────────────────────────────────────────────────────────
 * Pure utility module. Zero DOM dependencies. Zero IDB dependencies.
 *
 * Exports:
 *   normalizeLabel(rawLabel)              → string
 *   buildFingerprint(domain, label, type) → string
 *   fingerprintField(element, domain)     → { fingerprint, label, fieldType }
 */


// ═══════════════════════════════════════════════════════════════════════════
// NORMALIZE LABEL
// ═══════════════════════════════════════════════════════════════════════════

export function normalizeLabel(rawLabel) {
  if (rawLabel === null || rawLabel === undefined) return '';

  let s = String(rawLabel);
  s = s.toLowerCase();
  s = s.replace(/\s*\(required\)\s*/gi, ' ');
  s = s.replace(/\s*\(optional\)\s*/gi, ' ');
  s = s.replace(/\brequired\b/gi, '');
  s = s.replace(/\boptional\b/gi,  '');
  s = s.replace(/\([^)]*\)/g, '');
  s = s.replace(/\*/g, '');
  s = s.replace(/^[:\-_;]+/, '').replace(/[:\-_;]+$/, '');
  s = s.replace(/\s+/g, ' ');
  s = s.trim();
  return s;
}


// ═══════════════════════════════════════════════════════════════════════════
// FIELD TYPE DETECTION
// ═══════════════════════════════════════════════════════════════════════════

export function detectFieldType(el) {
  if (!el || !el.tagName) return 'unknown';
  const tag  = el.tagName.toLowerCase();
  const role = (el.getAttribute('role') || '').toLowerCase();

  if (tag === 'textarea')  return 'textarea';
  if (tag === 'select')    return 'select';
  if (role === 'radiogroup') return 'radio';
  if (role === 'group')      return 'checkbox';
  if (role === 'listbox')    return 'select';

  if (tag === 'input') {
    const type = (el.type || 'text').toLowerCase();
    if (['text', 'search', 'password'].includes(type)) return 'text';
    if (type === 'email')    return 'email';
    if (type === 'tel')      return 'tel';
    if (type === 'number')   return 'number';
    if (type === 'url')      return 'url';
    if (type === 'date')     return 'date';
    if (type === 'checkbox') return 'checkbox';
    if (type === 'radio')    return 'radio';
    return type;
  }
  return 'unknown';
}


// ═══════════════════════════════════════════════════════════════════════════
// BUILD FINGERPRINT
// ═══════════════════════════════════════════════════════════════════════════

export function buildFingerprint(domain, rawLabel, fieldType) {
  const label = normalizeLabel(rawLabel);
  if (!label) return '';
  const d = (domain || 'unknown').toLowerCase().trim();
  const t = (fieldType || 'text').toLowerCase().trim();
  return `${d}::${label}::${t}`;
}


// ═══════════════════════════════════════════════════════════════════════════
// LABEL EXTRACTION  ──  Multi-strategy, Google Forms aware
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Extract label text from a DOM field element.
 *
 * Strategies (in priority order):
 *  S1  — aria-labelledby on the element itself
 *  S1b — aria-labelledby / aria-label on ANCESTOR wrappers (Google Forms
 *          puts the label on a parent div, not the <input>)
 *  S2  — aria-label on the element
 *  S3  — <label for="id"> association
 *  S4  — closest ancestor <label>
 *  S4b — preceding siblings / nearby heading text (Google Forms question
 *          title is a sibling div, not a <label>)
 *  S5  — placeholder
 *  S6  — name / id as last resort
 */
export function extractLabelText(el) {
  if (!el) return '';

  // S1 — aria-labelledby on element
  const labelledBy = el.getAttribute('aria-labelledby');
  if (labelledBy) {
    const texts = labelledBy.trim().split(/\s+/)
      .map(id => document.getElementById(id))
      .filter(Boolean)
      .map(n => n.textContent.trim())
      .filter(Boolean);
    if (texts.length) return texts.join(' ');
  }

  // S2 — aria-label on element
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel && ariaLabel.trim()) return ariaLabel.trim();

  // S3 — <label for="id">
  if (el.id) {
    const lbl = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
    if (lbl) return lbl.textContent.trim();
  }

  // S4 — closest ancestor <label>
  const parentLabel = el.closest('label');
  if (parentLabel) {
    const clone = parentLabel.cloneNode(true);
    clone.querySelectorAll('input,select,textarea').forEach(n => n.remove());
    const t = clone.textContent.trim();
    if (t) return t;
  }

  // S1b — Walk UP ancestors looking for aria-labelledby / aria-label
  //        (Google Forms: label is on a parent wrapper div)
  let ancestor = el.parentElement;
  for (let i = 0; i < 6 && ancestor; i++) {
    const alb = ancestor.getAttribute('aria-labelledby');
    if (alb) {
      const texts = alb.trim().split(/\s+/)
        .map(id => document.getElementById(id))
        .filter(Boolean)
        .map(n => n.textContent.trim())
        .filter(Boolean);
      if (texts.length) return texts.join(' ');
    }
    const al = ancestor.getAttribute('aria-label');
    if (al && al.trim()) return al.trim();
    ancestor = ancestor.parentElement;
  }

  // S4b — Look at preceding siblings for a question-title element.
  //        Google Forms renders:  <div class="...">Question text</div>
  //                               <div class="..."><input ...></div>
  //        We walk up to the closest block-level container, then look
  //        for preceding sibling text nodes / divs / spans.
  const container = el.closest('div,li,fieldset,section') || el.parentElement;
  if (container && container.parentElement) {
    const siblings = Array.from(container.parentElement.children);
    const idx = siblings.indexOf(container);
    // Inspect up to 3 preceding siblings
    for (let j = idx - 1; j >= 0 && j >= idx - 3; j--) {
      const sib = siblings[j];
      const txt = sib.textContent.trim();
      // Accept if it looks like a question title (not too long, not empty)
      if (txt && txt.length > 0 && txt.length < 120) {
        return txt;
      }
    }
  }

  // S5 — placeholder
  const placeholder = el.getAttribute('placeholder');
  if (placeholder && placeholder.trim()) return placeholder.trim();

  // S6 — name / id
  return el.name || el.id || '';
}


// ═══════════════════════════════════════════════════════════════════════════
// FINGERPRINT A DOM FIELD  (convenience wrapper)
// ═══════════════════════════════════════════════════════════════════════════

export function fingerprintField(el, domain) {
  const d          = domain || (typeof window !== 'undefined' ? window.location.hostname : 'unknown');
  const rawLabel   = extractLabelText(el);
  const fieldType  = detectFieldType(el);
  const label      = normalizeLabel(rawLabel);
  const fingerprint = buildFingerprint(d, rawLabel, fieldType);
  return { fingerprint, label, fieldType, rawLabel };
}

export default { normalizeLabel, detectFieldType, buildFingerprint, extractLabelText, fingerprintField };
