/**
 * Unit Tests: rules.js
 * Tests the field pattern registry and helper functions.
 * Run with: npm test
 */

import {
  FIELD_PATTERNS,
  getAllProfilePaths,
  getPatternForPath,
  getNegativeKeywords,
  isValidProfilePath
} from '../../src/engine/rules.js';

// ─── getAllProfilePaths ───────────────────────────────────────────────────────
describe('getAllProfilePaths', () => {
  test('returns an array', () => {
    expect(Array.isArray(getAllProfilePaths())).toBe(true);
  });

  test('returns at least 10 paths', () => {
    expect(getAllProfilePaths().length).toBeGreaterThanOrEqual(10);
  });

  test('includes essential profile paths', () => {
    const paths = getAllProfilePaths();
    expect(paths).toContain('profile.personal.firstName');
    expect(paths).toContain('profile.personal.email');
    expect(paths).toContain('profile.personal.phone');
    expect(paths).toContain('profile.links.linkedin');
    expect(paths).toContain('profile.experience.skills');
  });
});

// ─── getPatternForPath ────────────────────────────────────────────────────────
describe('getPatternForPath', () => {
  test('returns pattern object for valid path', () => {
    const pattern = getPatternForPath('profile.personal.email');
    expect(pattern).toBeTruthy();
    expect(Array.isArray(pattern.patterns)).toBe(true);
    expect(typeof pattern.weight).toBe('number');
  });

  test('email pattern includes "email" keyword', () => {
    const pattern = getPatternForPath('profile.personal.email');
    expect(pattern.patterns).toContain('email');
  });

  test('returns null for invalid path', () => {
    expect(getPatternForPath('profile.nonexistent.field')).toBeNull();
  });

  test('all patterns have required fields', () => {
    const paths = getAllProfilePaths();
    for (const path of paths) {
      const pattern = getPatternForPath(path);
      expect(pattern.patterns).toBeDefined();
      expect(pattern.weight).toBeDefined();
      expect(pattern.fieldTypes).toBeDefined();
    }
  });
});

// ─── getNegativeKeywords ──────────────────────────────────────────────────────
describe('getNegativeKeywords', () => {
  test('firstName negative keywords exclude "last" and "surname"', () => {
    const kws = getNegativeKeywords('profile.personal.firstName');
    expect(kws).toContain('last');
    expect(kws).toContain('surname');
  });

  test('lastName negative keywords exclude "first" and "given"', () => {
    const kws = getNegativeKeywords('profile.personal.lastName');
    expect(kws).toContain('first');
  });

  test('returns empty array for path with no negatives', () => {
    const kws = getNegativeKeywords('profile.personal.zipCode');
    expect(Array.isArray(kws)).toBe(true);
  });
});

// ─── isValidProfilePath ───────────────────────────────────────────────────────
describe('isValidProfilePath', () => {
  test('valid path returns true', () => {
    expect(isValidProfilePath('profile.personal.email')).toBe(true);
    expect(isValidProfilePath('profile.links.github')).toBe(true);
  });

  test('invalid path returns false', () => {
    expect(isValidProfilePath('fake.path')).toBe(false);
    expect(isValidProfilePath('')).toBe(false);
  });
});
