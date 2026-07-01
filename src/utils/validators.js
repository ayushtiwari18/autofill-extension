/**
 * Validators & Formatters
 * Pure utility functions — no Chrome API dependencies.
 * Fully unit-testable with Jest.
 */

// ─── Email ───────────────────────────────────────────────────────────────────
/**
 * Validate an email address
 * @param {string} email
 * @returns {{ valid: boolean, reason: string|null }}
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, reason: 'Email is empty' };
  }
  const trimmed = email.trim();
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!pattern.test(trimmed)) {
    return { valid: false, reason: 'Invalid email format' };
  }
  return { valid: true, reason: null };
}

// ─── Phone ───────────────────────────────────────────────────────────────────
/**
 * Normalize a phone number to digits-only string
 * Accepts: +91-9876543210, (123) 456-7890, 123.456.7890, etc.
 * @param {string} phone
 * @returns {string} digits only, or original string if not recognizable
 */
export function normalizePhone(phone) {
  if (!phone || typeof phone !== 'string') return '';
  const digitsOnly = phone.replace(/[^\d]/g, '');
  return digitsOnly;
}

/**
 * Validate a phone number (international-friendly)
 * @param {string} phone
 * @returns {{ valid: boolean, reason: string|null }}
 */
export function validatePhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, reason: 'Phone is empty' };
  }
  const digits = normalizePhone(phone);
  if (digits.length < 7 || digits.length > 15) {
    return { valid: false, reason: 'Phone number must be 7-15 digits' };
  }
  return { valid: true, reason: null };
}

// ─── URL ─────────────────────────────────────────────────────────────────────
/**
 * Validate a URL (must start with http:// or https://)
 * @param {string} url
 * @returns {{ valid: boolean, reason: string|null }}
 */
export function validateURL(url) {
  if (!url || typeof url !== 'string') {
    return { valid: false, reason: 'URL is empty' };
  }
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { valid: false, reason: 'URL must start with http:// or https://' };
    }
    return { valid: true, reason: null };
  } catch {
    return { valid: false, reason: 'Invalid URL format' };
  }
}

// ─── Name ────────────────────────────────────────────────────────────────────
/**
 * Split a full name into first and last
 * @param {string} fullName
 * @returns {{ firstName: string, lastName: string }}
 */
export function splitFullName(fullName) {
  if (!fullName || typeof fullName !== 'string') {
    return { firstName: '', lastName: '' };
  }
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }
  const firstName = parts[0];
  const lastName = parts.slice(1).join(' ');
  return { firstName, lastName };
}

/**
 * Capitalize first letter of each word
 * @param {string} str
 * @returns {string}
 */
export function toTitleCase(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// ─── Year ────────────────────────────────────────────────────────────────────
/**
 * Validate a graduation year
 * @param {string|number} year
 * @returns {{ valid: boolean, reason: string|null }}
 */
export function validateYear(year) {
  const num = parseInt(year, 10);
  if (isNaN(num)) return { valid: false, reason: 'Not a valid year' };
  if (num < 1950 || num > 2060) {
    return { valid: false, reason: 'Year must be between 1950 and 2060' };
  }
  return { valid: true, reason: null };
}

// ─── GPA ─────────────────────────────────────────────────────────────────────
/**
 * Validate a GPA value (0.0 - 4.0 or 0 - 10 scale)
 * @param {string|number} gpa
 * @returns {{ valid: boolean, reason: string|null }}
 */
export function validateGPA(gpa) {
  const num = parseFloat(gpa);
  if (isNaN(num)) return { valid: false, reason: 'Not a valid GPA' };
  if (num < 0 || num > 10) {
    return { valid: false, reason: 'GPA must be between 0 and 10' };
  }
  return { valid: true, reason: null };
}

// ─── Profile completeness ────────────────────────────────────────────────────
/**
 * Calculate how complete a profile object is (0-100)
 * @param {Object} profileData - profile.profile object
 * @returns {number} percentage 0-100
 */
export function calculateCompleteness(profileData) {
  if (!profileData || typeof profileData !== 'object') return 0;

  let total = 0;
  let filled = 0;

  function traverse(obj) {
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
        traverse(val);
      } else {
        total++;
        if (Array.isArray(val) ? val.length > 0 : (val !== '' && val !== null && val !== undefined)) {
          filled++;
        }
      }
    }
  }

  traverse(profileData);
  return total === 0 ? 0 : Math.round((filled / total) * 100);
}
