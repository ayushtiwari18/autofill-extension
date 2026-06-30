/**
 * Unit Tests: mapper.js
 * Tests profile-to-form field matching logic.
 * Run with: npm test
 */

import { matchField, mapProfileToForm, getProfileFieldValue } from '../../src/engine/mapper.js';
import { MOCK_PROFILE, MOCK_FORM_DATA } from '../fixtures/mockProfile.js';

const profile = MOCK_PROFILE.profile;

// ─── getProfileFieldValue ─────────────────────────────────────────────────────
describe('getProfileFieldValue', () => {
  test('retrieves nested value correctly', () => {
    expect(getProfileFieldValue(profile, 'personal.firstName')).toBe('Ayush');
    expect(getProfileFieldValue(profile, 'personal.email')).toBe('ayush@example.com');
  });

  test('returns null for missing path', () => {
    expect(getProfileFieldValue(profile, 'personal.nonexistent')).toBeNull();
  });

  test('returns array for skills', () => {
    const skills = getProfileFieldValue(profile, 'experience.skills');
    expect(Array.isArray(skills)).toBe(true);
    expect(skills.length).toBeGreaterThan(0);
  });
});

// ─── matchField ───────────────────────────────────────────────────────────────
describe('matchField', () => {
  test('matches first name field correctly', () => {
    const field = { id: 'fn', name: 'firstName', type: 'text', label: 'First Name', placeholder: '', ariaLabel: null, selector: '#fn' };
    const result = matchField(field, profile);
    expect(result).not.toBeNull();
    expect(result.profilePath).toBe('profile.personal.firstName');
    expect(result.profileValue).toBe('Ayush');
  });

  test('matches email field correctly', () => {
    const field = { id: 'em', name: 'email', type: 'email', label: 'Email Address', placeholder: 'email@example.com', ariaLabel: null, selector: '#em' };
    const result = matchField(field, profile);
    expect(result).not.toBeNull();
    expect(result.profilePath).toBe('profile.personal.email');
    expect(result.profileValue).toBe('ayush@example.com');
  });

  test('matches LinkedIn URL field', () => {
    const field = { id: 'li', name: 'linkedin', type: 'url', label: 'LinkedIn Profile', placeholder: '', ariaLabel: null, selector: '#li' };
    const result = matchField(field, profile);
    expect(result).not.toBeNull();
    expect(result.profilePath).toBe('profile.links.linkedin');
  });

  test('does NOT match last name to first name', () => {
    const field = { id: 'ln', name: 'lastName', type: 'text', label: 'Last Name', placeholder: '', ariaLabel: null, selector: '#ln' };
    const result = matchField(field, profile);
    // Should match lastName, NOT firstName
    if (result) {
      expect(result.profilePath).not.toBe('profile.personal.firstName');
      expect(result.profilePath).toBe('profile.personal.lastName');
    }
  });

  test('returns null for unrecognizable field', () => {
    const field = { id: 'xx', name: 'favColor', type: 'text', label: 'Favourite Color', placeholder: '', ariaLabel: null, selector: '#xx' };
    const result = matchField(field, profile);
    expect(result).toBeNull();
  });

  test('matched result has required properties', () => {
    const field = { id: 'em2', name: 'email', type: 'email', label: 'Email', placeholder: '', ariaLabel: null, selector: '#em2' };
    const result = matchField(field, profile);
    expect(result).toHaveProperty('formFieldId');
    expect(result).toHaveProperty('profileValue');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('requiresReview');
  });
});

// ─── mapProfileToForm ─────────────────────────────────────────────────────────
describe('mapProfileToForm', () => {
  test('returns a valid mapping result object', () => {
    const result = mapProfileToForm(profile, MOCK_FORM_DATA);
    expect(result).toHaveProperty('matches');
    expect(result).toHaveProperty('unmatchedFormFields');
    expect(result).toHaveProperty('overallConfidence');
    expect(result).toHaveProperty('requiresReview');
  });

  test('finds matches for the mock form', () => {
    const result = mapProfileToForm(profile, MOCK_FORM_DATA);
    expect(result.matches.length).toBeGreaterThan(0);
  });

  test('overall confidence is between 0 and 1', () => {
    const result = mapProfileToForm(profile, MOCK_FORM_DATA);
    expect(result.overallConfidence).toBeGreaterThanOrEqual(0);
    expect(result.overallConfidence).toBeLessThanOrEqual(1);
  });

  test('skips CAPTCHA forms', () => {
    const formWithCaptcha = {
      ...MOCK_FORM_DATA,
      forms: [{ ...MOCK_FORM_DATA.forms[0], hasCaptcha: true }]
    };
    const result = mapProfileToForm(profile, formWithCaptcha);
    expect(result.matches.length).toBe(0);
  });

  test('handles empty profile gracefully', () => {
    const result = mapProfileToForm({}, MOCK_FORM_DATA);
    expect(result).toHaveProperty('matches');
    expect(result.matches.length).toBe(0);
  });

  test('handles empty form data gracefully', () => {
    const result = mapProfileToForm(profile, { forms: [], url: '' });
    expect(result.matches.length).toBe(0);
  });
});
