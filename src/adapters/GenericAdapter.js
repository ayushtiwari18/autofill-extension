/**
 * Generic Adapter
 * Fallback adapter for any website not covered by a specific adapter.
 * Applies general heuristics to improve field detection.
 */

export const GenericAdapter = {
  name: 'GenericAdapter',

  /**
   * This adapter matches ALL URLs (it's the fallback)
   * @param {string} url
   * @returns {boolean}
   */
  matches(url) {
    return true;
  },

  /**
   * Enhance a form field with additional context clues
   * Generic adapter checks common patterns across all sites
   * @param {Object} field - Raw field from scanner
   * @returns {Object} - Enhanced field
   */
  enhanceField(field) {
    const enhanced = { ...field };

    // ── Infer label from name attribute if label is missing ──────────────────
    if (!enhanced.label && enhanced.name) {
      enhanced.label = this._nameToLabel(enhanced.name);
    }

    // ── Infer label from id if still missing ─────────────────────────────────
    if (!enhanced.label && enhanced.id) {
      enhanced.label = this._nameToLabel(enhanced.id);
    }

    // ── Infer type from name/label if type is generic "text" ─────────────────
    if (enhanced.type === 'text') {
      enhanced.type = this._inferType(enhanced);
    }

    return enhanced;
  },

  /**
   * Convert camelCase or snake_case name to readable label
   * e.g. "firstName" → "First Name", "first_name" → "First Name"
   * @param {string} name
   * @returns {string}
   */
  _nameToLabel(name) {
    if (!name) return '';
    return name
      .replace(/([A-Z])/g, ' $1')           // camelCase → words
      .replace(/[_-]+/g, ' ')               // snake_case / kebab-case → words
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^\w/, c => c.toUpperCase()); // capitalize first letter
  },

  /**
   * Infer a more specific input type from the field's name/label/placeholder
   * @param {Object} field
   * @returns {string}
   */
  _inferType(field) {
    const text = [
      field.name || '',
      field.label || '',
      field.placeholder || ''
    ].join(' ').toLowerCase();

    if (/email|e-mail/.test(text)) return 'email';
    if (/phone|mobile|tel|cell/.test(text)) return 'tel';
    if (/url|link|website|linkedin|github|portfolio/.test(text)) return 'url';
    if (/year|graduation|dob|birth/.test(text)) return 'number';
    if (/password|passwd/.test(text)) return 'password';

    return 'text';
  }
};
