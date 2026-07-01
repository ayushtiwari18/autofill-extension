/**
 * Integration Tests: confidence.js + rules.js
 * Tests the scoring pipeline against real HTML label texts from index.html.
 * These would have caught the matchedOn threshold issue early.
 */

import { calculateConfidence } from '../../src/engine/confidence.js';
import { getPatternForPath, getNegativeKeywords } from '../../src/engine/rules.js';

// Helper — run calculateConfidence for a given profilePath and form field attrs
function score(profilePath, field) {
  const pattern = getPatternForPath(profilePath);
  const negatives = getNegativeKeywords(profilePath);
  const result = calculateConfidence(field, pattern, negatives);
  return result.score * pattern.weight;
}

const plainTextField = (label, name, placeholder = '') => ({
  id: name, name, type: 'text', label, placeholder, ariaLabel: null
});

describe('confidence scoring — index.html field labels', () => {
  test('"First Name" label scores >= 0.6 for firstName path', () => {
    expect(score('profile.personal.firstName', plainTextField('First Name', 'firstName'))).toBeGreaterThanOrEqual(0.6);
  });

  test('"Last Name" label scores >= 0.6 for lastName path', () => {
    expect(score('profile.personal.lastName', plainTextField('Last Name', 'lastName'))).toBeGreaterThanOrEqual(0.6);
  });

  test('"Email" label scores >= 0.6 for email path (type=email)', () => {
    const field = { id: 'e', name: 'email', type: 'email', label: 'Email', placeholder: '', ariaLabel: null };
    expect(score('profile.personal.email', field)).toBeGreaterThanOrEqual(0.6);
  });

  test('"Phone" label scores >= 0.6 for phone path (type=tel)', () => {
    const field = { id: 'p', name: 'phone', type: 'tel', label: 'Phone', placeholder: '', ariaLabel: null };
    expect(score('profile.personal.phone', field)).toBeGreaterThanOrEqual(0.6);
  });

  test('"LinkedIn" label scores >= 0.6 for linkedin path', () => {
    expect(score('profile.links.linkedin', plainTextField('LinkedIn', 'linkedin'))).toBeGreaterThanOrEqual(0.6);
  });

  test('"Skills" label scores >= 0.6 for skills path', () => {
    expect(score('profile.experience.skills', plainTextField('Skills', 'skills'))).toBeGreaterThanOrEqual(0.6);
  });
});

describe('negative keyword guards', () => {
  test('"Last Name" field scores 0 against firstName (negative: last)', () => {
    const s = score('profile.personal.firstName', plainTextField('Last Name', 'lastName'));
    expect(s).toBe(0);
  });

  test('"First Name" field scores 0 against lastName (negative: first)', () => {
    const s = score('profile.personal.lastName', plainTextField('First Name', 'firstName'));
    expect(s).toBe(0);
  });

  test('email field not confused with phone (negative: phone in email)', () => {
    const field = { id: 'p', name: 'phone', type: 'tel', label: 'Phone Number', placeholder: '', ariaLabel: null };
    const s = score('profile.personal.email', field);
    expect(s).toBe(0);
  });
});

describe('label with colon (real HTML labels)', () => {
  test('"First Name:" (with colon) still scores >= 0.6', () => {
    // normalizeText strips special chars including colon
    expect(score('profile.personal.firstName', plainTextField('First Name:', 'firstName'))).toBeGreaterThanOrEqual(0.6);
  });

  test('"Email:" (with colon) still scores >= 0.6', () => {
    const field = { id: 'e', name: 'email', type: 'email', label: 'Email:', placeholder: '', ariaLabel: null };
    expect(score('profile.personal.email', field)).toBeGreaterThanOrEqual(0.6);
  });
});
