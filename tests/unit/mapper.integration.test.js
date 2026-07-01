/**
 * Integration Tests: mapper.js — simulates the EXACT index.html form
 * (First Name, Last Name, Email, Phone, LinkedIn, Skills)
 * These tests catch the two bugs that caused "No matching fields found":
 *   1. bestScore being locked when profileValue is null (now fixed)
 *   2. profile wrapper not being unwrapped before calling mapProfileToForm
 */

import { matchField, mapProfileToForm } from '../../src/engine/mapper.js';
import { MOCK_PROFILE } from '../fixtures/mockProfile.js';

// The inner profile object — what Dashboard.jsx now correctly passes
const profile = MOCK_PROFILE.profile;

// Mirrors the exact 6 fields in public/index.html
const INDEX_HTML_FORM_DATA = {
  url: 'file:///home/ayush5410/Desktop/index.html',
  title: 'Job Application',
  scannedAt: new Date().toISOString(),
  forms: [
    {
      id: 'job-application',
      type: 'generic',
      hasCaptcha: false,
      action: '',
      method: 'POST',
      fields: [
        { id: 'firstName',  name: 'firstName',  type: 'text',  label: 'First Name', placeholder: '',        ariaLabel: null, required: true,  value: '', selector: '#firstName'  },
        { id: 'lastName',   name: 'lastName',   type: 'text',  label: 'Last Name',  placeholder: '',        ariaLabel: null, required: true,  value: '', selector: '#lastName'   },
        { id: 'email',      name: 'email',      type: 'email', label: 'Email',      placeholder: '',        ariaLabel: null, required: true,  value: '', selector: '#email'      },
        { id: 'phone',      name: 'phone',      type: 'tel',   label: 'Phone',      placeholder: '',        ariaLabel: null, required: false, value: '', selector: '#phone'      },
        { id: 'linkedin',   name: 'linkedin',   type: 'text',  label: 'LinkedIn',   placeholder: '',        ariaLabel: null, required: false, value: '', selector: '#linkedin'   },
        { id: 'skills',     name: 'skills',     type: 'text',  label: 'Skills',     placeholder: '',        ariaLabel: null, required: false, value: '', selector: '#skills'     }
      ]
    }
  ]
};

describe('index.html form — full match integration', () => {
  let result;

  beforeAll(() => {
    result = mapProfileToForm(profile, INDEX_HTML_FORM_DATA);
  });

  test('returns a valid result object', () => {
    expect(result).toHaveProperty('matches');
    expect(result).toHaveProperty('unmatchedFormFields');
    expect(result).toHaveProperty('overallConfidence');
  });

  test('matches at least 4 of the 6 fields', () => {
    expect(result.matches.length).toBeGreaterThanOrEqual(4);
  });

  test('firstName field is matched to profile.personal.firstName', () => {
    const m = result.matches.find(m => m.formFieldId === 'firstName');
    expect(m).toBeDefined();
    expect(m.profilePath).toBe('profile.personal.firstName');
    expect(m.profileValue).toBe('Ayush');
    expect(m.confidence).toBeGreaterThanOrEqual(0.6);
  });

  test('lastName field is matched to profile.personal.lastName', () => {
    const m = result.matches.find(m => m.formFieldId === 'lastName');
    expect(m).toBeDefined();
    expect(m.profilePath).toBe('profile.personal.lastName');
    expect(m.profileValue).toBe('Tiwari');
  });

  test('email field is matched to profile.personal.email', () => {
    const m = result.matches.find(m => m.formFieldId === 'email');
    expect(m).toBeDefined();
    expect(m.profilePath).toBe('profile.personal.email');
    expect(m.profileValue).toBe('ayush@example.com');
  });

  test('phone field is matched to profile.personal.phone', () => {
    const m = result.matches.find(m => m.formFieldId === 'phone');
    expect(m).toBeDefined();
    expect(m.profilePath).toBe('profile.personal.phone');
  });

  test('no match should map to a null profileValue', () => {
    result.matches.forEach(m => {
      expect(m.profileValue).not.toBeNull();
      expect(m.profileValue).not.toBe('');
    });
  });

  test('overall confidence is > 0', () => {
    expect(result.overallConfidence).toBeGreaterThan(0);
  });
});

describe('profile wrapper regression — outer vs inner object', () => {
  test('passing inner profile (correct) produces matches', () => {
    const inner = MOCK_PROFILE.profile;
    const result = mapProfileToForm(inner, INDEX_HTML_FORM_DATA);
    expect(result.matches.length).toBeGreaterThan(0);
  });

  test('passing outer profile wrapper (wrong) produces 0 matches — confirms bug was real', () => {
    // The outer object has keys: version, metadata, profile
    // NOT personal/education/etc. — so every getProfileFieldValue returns null
    // and the fix in matchField (not locking bestScore on null) means no match is ever set
    const outer = MOCK_PROFILE; // { version, metadata, profile: {...} }
    const result = mapProfileToForm(outer, INDEX_HTML_FORM_DATA);
    expect(result.matches.length).toBe(0);
  });
});

describe('edge cases — empty / null profile values', () => {
  test('profile with all empty strings produces 0 matches', () => {
    const emptyProfile = {
      personal: { firstName: '', lastName: '', email: '', phone: '', address: '', city: '', state: '', zipCode: '', country: '' },
      education: { degree: '', major: '', university: '', graduationYear: '', gpa: '' },
      experience: { currentRole: '', currentCompany: '', yearsOfExperience: '', skills: [] },
      links: { linkedin: '', github: '', portfolio: '', website: '' },
      documents: { resume: null }
    };
    const result = mapProfileToForm(emptyProfile, INDEX_HTML_FORM_DATA);
    expect(result.matches.length).toBe(0);
  });

  test('profile with only firstName filled matches only firstName', () => {
    const sparseProfile = {
      personal: { firstName: 'Ayush', lastName: '', email: '', phone: '', address: '', city: '', state: '', zipCode: '', country: '' },
      education: { degree: '', major: '', university: '', graduationYear: '', gpa: '' },
      experience: { currentRole: '', currentCompany: '', yearsOfExperience: '', skills: [] },
      links: { linkedin: '', github: '', portfolio: '', website: '' },
      documents: { resume: null }
    };
    const result = mapProfileToForm(sparseProfile, INDEX_HTML_FORM_DATA);
    expect(result.matches.length).toBe(1);
    expect(result.matches[0].profilePath).toBe('profile.personal.firstName');
  });
});

describe('individual field matching — index.html labels', () => {
  const cases = [
    { field: { id: 'f1', name: 'firstName', type: 'text',  label: 'First Name', placeholder: '', ariaLabel: null, selector: '#f1' }, path: 'profile.personal.firstName' },
    { field: { id: 'f2', name: 'lastName',  type: 'text',  label: 'Last Name',  placeholder: '', ariaLabel: null, selector: '#f2' }, path: 'profile.personal.lastName'  },
    { field: { id: 'f3', name: 'email',     type: 'email', label: 'Email',      placeholder: '', ariaLabel: null, selector: '#f3' }, path: 'profile.personal.email'     },
    { field: { id: 'f4', name: 'phone',     type: 'tel',   label: 'Phone',      placeholder: '', ariaLabel: null, selector: '#f4' }, path: 'profile.personal.phone'     },
    { field: { id: 'f5', name: 'linkedin',  type: 'text',  label: 'LinkedIn',   placeholder: '', ariaLabel: null, selector: '#f5' }, path: 'profile.links.linkedin'     },
    { field: { id: 'f6', name: 'skills',    type: 'text',  label: 'Skills',     placeholder: '', ariaLabel: null, selector: '#f6' }, path: 'profile.experience.skills'  },
  ];

  cases.forEach(({ field, path }) => {
    test(`"${field.label}" (type=${field.type}) → ${path}`, () => {
      const result = matchField(field, profile);
      expect(result).not.toBeNull();
      expect(result.profilePath).toBe(path);
      expect(result.confidence).toBeGreaterThanOrEqual(0.6);
      expect(result.profileValue).toBeTruthy();
    });
  });
});
