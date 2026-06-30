/**
 * Unit Tests: confidence.js
 * Tests the fuzzy matching and confidence scoring engine.
 * Run with: npm test
 */

import {
  normalizeText,
  calculateLevenshteinDistance,
  scoreFuzzyMatch,
  scoreMatch,
  calculateConfidence
} from '../../src/engine/confidence.js';

// ─── normalizeText ────────────────────────────────────────────────────────────
describe('normalizeText', () => {
  test('lowercases text', () => {
    expect(normalizeText('First Name')).toBe('first name');
  });

  test('removes special characters', () => {
    expect(normalizeText('E-Mail!')).toBe('email');
  });

  test('trims whitespace', () => {
    expect(normalizeText('  city  ')).toBe('city');
  });

  test('collapses multiple spaces', () => {
    expect(normalizeText('first   name')).toBe('first name');
  });

  test('handles null/undefined gracefully', () => {
    expect(normalizeText(null)).toBe('');
    expect(normalizeText(undefined)).toBe('');
  });
});

// ─── calculateLevenshteinDistance ────────────────────────────────────────────
describe('calculateLevenshteinDistance', () => {
  test('identical strings = 0', () => {
    expect(calculateLevenshteinDistance('email', 'email')).toBe(0);
  });

  test('single char difference = 1', () => {
    expect(calculateLevenshteinDistance('email', 'emeil')).toBe(1);
  });

  test('completely different = high distance', () => {
    const dist = calculateLevenshteinDistance('abc', 'xyz');
    expect(dist).toBe(3);
  });

  test('empty strings', () => {
    expect(calculateLevenshteinDistance('', '')).toBe(0);
    expect(calculateLevenshteinDistance('abc', '')).toBe(3);
  });
});

// ─── scoreFuzzyMatch ──────────────────────────────────────────────────────────
describe('scoreFuzzyMatch', () => {
  test('exact match = 1.0', () => {
    expect(scoreFuzzyMatch('email', 'email')).toBe(1.0);
  });

  test('substring match scores 0.85', () => {
    expect(scoreFuzzyMatch('email address', 'email')).toBe(0.85);
  });

  test('typo still scores > 0.5', () => {
    const score = scoreFuzzyMatch('frist name', 'first name');
    expect(score).toBeGreaterThan(0.5);
  });

  test('completely different strings = 0', () => {
    const score = scoreFuzzyMatch('banana', 'zipcode');
    expect(score).toBe(0);
  });

  test('null inputs return 0', () => {
    expect(scoreFuzzyMatch(null, 'email')).toBe(0);
    expect(scoreFuzzyMatch('email', null)).toBe(0);
  });
});

// ─── calculateConfidence ──────────────────────────────────────────────────────
describe('calculateConfidence', () => {
  const emailPattern = {
    patterns: ['email', 'email address', 'e-mail', 'mail'],
    fieldTypes: ['email', 'text'],
    weight: 1.0
  };

  const firstNamePattern = {
    patterns: ['first name', 'first', 'fname', 'given name'],
    fieldTypes: ['text'],
    weight: 1.0
  };

  test('email field matches email pattern with high confidence', () => {
    const field = { label: 'Email Address', placeholder: '', name: 'email', ariaLabel: null, type: 'email' };
    const result = calculateConfidence(field, emailPattern, []);
    expect(result.score).toBeGreaterThan(0.5);
    expect(result.matchedOn).toBeTruthy();
  });

  test('first name field matches first name pattern', () => {
    const field = { label: 'First Name', placeholder: 'Enter first name', name: 'firstName', ariaLabel: null, type: 'text' };
    const result = calculateConfidence(field, firstNamePattern, ['last', 'surname']);
    expect(result.score).toBeGreaterThan(0.4);
  });

  test('negative keyword kills score', () => {
    // "last name" field should NOT match first name pattern
    const field = { label: 'Last Name', placeholder: '', name: 'lastName', ariaLabel: null, type: 'text' };
    const result = calculateConfidence(field, firstNamePattern, ['last', 'surname']);
    expect(result.score).toBe(0);
  });

  test('score is capped at 1.0', () => {
    const field = { label: 'Email', placeholder: 'email', name: 'email', ariaLabel: 'email', type: 'email' };
    const result = calculateConfidence(field, emailPattern, []);
    expect(result.score).toBeLessThanOrEqual(1.0);
  });

  test('unrelated field gets near-zero score', () => {
    const field = { label: 'Favourite Color', placeholder: 'red', name: 'color', ariaLabel: null, type: 'text' };
    const result = calculateConfidence(field, emailPattern, []);
    expect(result.score).toBeLessThan(0.1);
  });
});
