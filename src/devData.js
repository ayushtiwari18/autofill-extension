/**
 * DEV DATA — Ayush's test profile
 * Used for fast testing without filling the profile form manually.
 *
 * DEV_MODE is now gated by NODE_ENV — it is NEVER true in production builds.
 * To force dev mode locally: set DEV_MODE = true manually here (revert before pushing).
 */

export const DEV_MODE = typeof process !== 'undefined' && process.env.NODE_ENV !== 'production';

export const DEV_PROFILE = {
  version: '1.0',
  metadata: {
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z'
  },
  profile: {
    personal: {
      firstName: 'Ayush',
      lastName: 'Tiwari',
      email: 'dev@example.com',
      phone: '+91-9999999999',
      address: '123 Main Street, Indore',
      city: 'Indore',
      state: 'Madhya Pradesh',
      zipCode: '452001',
      country: 'India'
    },
    education: {
      degree: 'Bachelor of Technology',
      major: 'Computer Science and Engineering',
      university: 'IIT Indore',
      graduationYear: '2024',
      gpa: '8.5'
    },
    experience: {
      currentRole: 'Software Engineer',
      currentCompany: 'Tech Corp',
      yearsOfExperience: '2',
      skills: ['JavaScript', 'React', 'Node.js', 'Python', 'Git', 'TypeScript']
    },
    links: {
      linkedin: 'https://linkedin.com/in/ayushtiwari18',
      github: 'https://github.com/ayushtiwari18',
      portfolio: 'https://ayushtiwari.dev',
      website: 'https://ayushtiwari.dev'
    },
    documents: {
      resume: null
    }
  }
};
