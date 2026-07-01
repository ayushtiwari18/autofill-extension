/**
 * devData.js — SmartFill dev/test stub
 * ─────────────────────────────────────────────────────────
 * DEV_MODE is true ONLY in non-production builds.
 * In `npm run build` (--mode production) NODE_ENV = 'production',
 * so DEV_MODE is always false and this file's profile data is
 * tree-shaken out entirely by webpack.
 *
 * Safe to commit — contains no real personal data.
 */

export const DEV_MODE =
  typeof process !== 'undefined' && process.env.NODE_ENV !== 'production';

export const DEV_PROFILE = {
  version: '1.0',
  metadata: {
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-07-02T00:00:00.000Z',
  },
  profile: {
    personal: {
      firstName:   'Test',
      lastName:    'User',
      email:       'test@example.com',
      phone:       '+91-9000000000',
      address:     '42 Dev Lane, Test Nagar',
      city:        'Indore',
      state:       'Madhya Pradesh',
      zipCode:     '452001',
      country:     'India',
    },
    education: {
      degree:          'Bachelor of Technology',
      major:           'Computer Science and Engineering',
      university:      'Test University',
      graduationYear:  '2025',
      gpa:             '8.0',
    },
    experience: {
      currentRole:        'Software Engineer',
      currentCompany:     'Test Corp',
      yearsOfExperience:  '1',
      skills: ['JavaScript', 'React', 'Node.js', 'Python', 'TypeScript'],
    },
    links: {
      linkedin:  'https://linkedin.com/in/testuser',
      github:    'https://github.com/testuser',
      portfolio: 'https://testuser.dev',
      website:   'https://testuser.dev',
    },
    documents: {
      resume: null,
    },
  },
};
