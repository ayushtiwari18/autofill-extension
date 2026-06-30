/**
 * Mock Profile for Tests
 * A realistic, complete profile object used across all unit and E2E tests.
 * Matches the exact schema expected by profileStore.js and mapper.js
 */

export const MOCK_PROFILE = {
  version: '1.0',
  metadata: {
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  profile: {
    personal: {
      firstName: 'Ayush',
      lastName: 'Tiwari',
      email: 'ayush@example.com',
      phone: '+91-9876543210',
      address: '123 Main Street',
      city: 'Indore',
      state: 'Madhya Pradesh',
      zipCode: '452001',
      country: 'India'
    },
    education: {
      degree: 'Bachelor of Technology',
      major: 'Computer Science',
      university: 'IIT Indore',
      graduationYear: 2024,
      gpa: '8.5'
    },
    experience: {
      currentRole: 'Software Engineer',
      currentCompany: 'Tech Corp',
      yearsOfExperience: 2,
      skills: ['JavaScript', 'React', 'Node.js', 'Python', 'Git']
    },
    links: {
      linkedin: 'https://linkedin.com/in/ayushtiwari',
      github: 'https://github.com/ayushtiwari18',
      portfolio: 'https://ayushtiwari.dev',
      website: 'https://ayushtiwari.dev'
    },
    documents: {
      resume: null
    }
  }
};

/**
 * A minimal (incomplete) profile — for testing edge cases
 */
export const MOCK_PROFILE_MINIMAL = {
  version: '1.0',
  metadata: {
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  profile: {
    personal: {
      firstName: 'John',
      lastName: '',
      email: 'john@test.com',
      phone: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    },
    education: {
      degree: '',
      major: '',
      university: '',
      graduationYear: '',
      gpa: ''
    },
    experience: {
      currentRole: '',
      currentCompany: '',
      yearsOfExperience: '',
      skills: []
    },
    links: {
      linkedin: '',
      github: '',
      portfolio: '',
      website: ''
    },
    documents: {
      resume: null
    }
  }
};

/**
 * Sample scanned form data — mimics what scanner.js produces
 */
export const MOCK_FORM_DATA = {
  url: 'https://jobs.example.com/apply',
  title: 'Apply for Software Engineer',
  scannedAt: '2026-01-01T00:00:00.000Z',
  forms: [
    {
      id: 'application-form',
      type: 'generic',
      hasCaptcha: false,
      action: 'https://jobs.example.com/submit',
      method: 'POST',
      fields: [
        { id: 'firstName', name: 'firstName', type: 'text', label: 'First Name', placeholder: 'Enter first name', ariaLabel: null, required: true, value: '', selector: '#firstName' },
        { id: 'lastName', name: 'lastName', type: 'text', label: 'Last Name', placeholder: 'Enter last name', ariaLabel: null, required: true, value: '', selector: '#lastName' },
        { id: 'email', name: 'email', type: 'email', label: 'Email Address', placeholder: 'email@example.com', ariaLabel: null, required: true, value: '', selector: '#email' },
        { id: 'phone', name: 'phone', type: 'tel', label: 'Phone Number', placeholder: '+1 234-567-8900', ariaLabel: null, required: false, value: '', selector: '#phone' },
        { id: 'city', name: 'city', type: 'text', label: 'City', placeholder: 'Your city', ariaLabel: null, required: false, value: '', selector: '#city' },
        { id: 'linkedin', name: 'linkedin', type: 'url', label: 'LinkedIn Profile', placeholder: 'https://linkedin.com/in/...', ariaLabel: null, required: false, value: '', selector: '#linkedin' },
        { id: 'github', name: 'github', type: 'url', label: 'GitHub Profile', placeholder: 'https://github.com/...', ariaLabel: null, required: false, value: '', selector: '#github' },
        { id: 'university', name: 'university', type: 'text', label: 'University', placeholder: 'Your university', ariaLabel: null, required: false, value: '', selector: '#university' },
        { id: 'degree', name: 'degree', type: 'text', label: 'Degree', placeholder: 'e.g. Bachelor of Science', ariaLabel: null, required: false, value: '', selector: '#degree' },
        { id: 'currentRole', name: 'currentRole', type: 'text', label: 'Current Role', placeholder: 'Your job title', ariaLabel: null, required: false, value: '', selector: '#currentRole' },
        { id: 'yearsExp', name: 'yearsExp', type: 'number', label: 'Years of Experience', placeholder: '0', ariaLabel: null, required: false, value: '', selector: '#yearsExp' }
      ]
    }
  ]
};
