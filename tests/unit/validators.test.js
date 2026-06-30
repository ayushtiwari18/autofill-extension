/**
 * Unit Tests: validators.js
 * Tests all utility validator and formatter functions.
 * Run with: npm test
 */

import {
  validateEmail,
  normalizePhone,
  validatePhone,
  validateURL,
  splitFullName,
  toTitleCase,
  validateYear,
  validateGPA,
  calculateCompleteness
} from '../../src/utils/validators.js';

import { MOCK_PROFILE, MOCK_PROFILE_MINIMAL } from '../fixtures/mockProfile.js';

// ─── validateEmail ────────────────────────────────────────────────────────────
describe('validateEmail', () => {
  test('valid email passes', () => {
    expect(validateEmail('ayush@example.com').valid).toBe(true);
    expect(validateEmail('user.name+tag@domain.co').valid).toBe(true);
  });

  test('invalid emails fail', () => {
    expect(validateEmail('notanemail').valid).toBe(false);
    expect(validateEmail('missing@domain').valid).toBe(false);
    expect(validateEmail('@nodomain.com').valid).toBe(false);
    expect(validateEmail('').valid).toBe(false);
    expect(validateEmail(null).valid).toBe(false);
  });
});

// ─── normalizePhone ───────────────────────────────────────────────────────────
describe('normalizePhone', () => {
  test('extracts digits from formatted numbers', () => {
    expect(normalizePhone('+91-9876543210')).toBe('919876543210');
    expect(normalizePhone('(123) 456-7890')).toBe('1234567890');
    expect(normalizePhone('123.456.7890')).toBe('1234567890');
  });

  test('returns empty string for null', () => {
    expect(normalizePhone(null)).toBe('');
    expect(normalizePhone('')).toBe('');
  });
});

// ─── validatePhone ────────────────────────────────────────────────────────────
describe('validatePhone', () => {
  test('valid phone numbers pass', () => {
    expect(validatePhone('+91-9876543210').valid).toBe(true);
    expect(validatePhone('1234567').valid).toBe(true);
  });

  test('too short phone fails', () => {
    expect(validatePhone('123').valid).toBe(false);
  });

  test('empty phone fails', () => {
    expect(validatePhone('').valid).toBe(false);
    expect(validatePhone(null).valid).toBe(false);
  });
});

// ─── validateURL ──────────────────────────────────────────────────────────────
describe('validateURL', () => {
  test('valid URLs pass', () => {
    expect(validateURL('https://linkedin.com/in/ayush').valid).toBe(true);
    expect(validateURL('http://example.com').valid).toBe(true);
  });

  test('invalid URLs fail', () => {
    expect(validateURL('linkedin.com').valid).toBe(false);
    expect(validateURL('ftp://file.txt').valid).toBe(false);
    expect(validateURL('').valid).toBe(false);
    expect(validateURL(null).valid).toBe(false);
  });
});

// ─── splitFullName ────────────────────────────────────────────────────────────
describe('splitFullName', () => {
  test('splits two-word name', () => {
    const result = splitFullName('Ayush Tiwari');
    expect(result.firstName).toBe('Ayush');
    expect(result.lastName).toBe('Tiwari');
  });

  test('handles single name', () => {
    const result = splitFullName('Cher');
    expect(result.firstName).toBe('Cher');
    expect(result.lastName).toBe('');
  });

  test('handles three-word name', () => {
    const result = splitFullName('John Michael Smith');
    expect(result.firstName).toBe('John');
    expect(result.lastName).toBe('Michael Smith');
  });

  test('handles null', () => {
    const result = splitFullName(null);
    expect(result.firstName).toBe('');
    expect(result.lastName).toBe('');
  });
});

// ─── toTitleCase ──────────────────────────────────────────────────────────────
describe('toTitleCase', () => {
  test('converts to title case', () => {
    expect(toTitleCase('computer science')).toBe('Computer Science');
    expect(toTitleCase('JOHN DOE')).toBe('John Doe');
  });

  test('handles empty string', () => {
    expect(toTitleCase('')).toBe('');
    expect(toTitleCase(null)).toBe('');
  });
});

// ─── validateYear ─────────────────────────────────────────────────────────────
describe('validateYear', () => {
  test('valid years pass', () => {
    expect(validateYear(2024).valid).toBe(true);
    expect(validateYear('2020').valid).toBe(true);
  });

  test('out of range years fail', () => {
    expect(validateYear(1800).valid).toBe(false);
    expect(validateYear(3000).valid).toBe(false);
  });

  test('non-numeric fails', () => {
    expect(validateYear('abc').valid).toBe(false);
  });
});

// ─── validateGPA ──────────────────────────────────────────────────────────────
describe('validateGPA', () => {
  test('valid GPAs pass', () => {
    expect(validateGPA(3.8).valid).toBe(true);
    expect(validateGPA('8.5').valid).toBe(true);
    expect(validateGPA(0).valid).toBe(true);
  });

  test('out of range GPA fails', () => {
    expect(validateGPA(11).valid).toBe(false);
    expect(validateGPA(-1).valid).toBe(false);
  });

  test('non-numeric GPA fails', () => {
    expect(validateGPA('abc').valid).toBe(false);
  });
});

// ─── calculateCompleteness ────────────────────────────────────────────────────
describe('calculateCompleteness', () => {
  test('full profile scores > 80%', () => {
    const score = calculateCompleteness(MOCK_PROFILE.profile);
    expect(score).toBeGreaterThan(80);
  });

  test('minimal profile scores low', () => {
    const score = calculateCompleteness(MOCK_PROFILE_MINIMAL.profile);
    expect(score).toBeLessThan(50);
  });

  test('null input returns 0', () => {
    expect(calculateCompleteness(null)).toBe(0);
    expect(calculateCompleteness({})).toBe(0);
  });
});
