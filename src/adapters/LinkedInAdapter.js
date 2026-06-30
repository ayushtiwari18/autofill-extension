/**
 * LinkedIn Easy Apply Adapter
 * Provides LinkedIn-specific field selectors and label overrides.
 * LinkedIn uses React with dynamically generated class names, so we
 * target stable data-test-ids and aria-labels.
 */

export const LinkedInAdapter = {
  name: 'LinkedInAdapter',

  /**
   * Match LinkedIn job application URLs
   * @param {string} url
   * @returns {boolean}
   */
  matches(url) {
    if (!url) return false;
    return url.includes('linkedin.com');
  },

  /**
   * Known LinkedIn Easy Apply field mappings
   * Maps aria-label / placeholder text to canonical profile paths
   */
  FIELD_MAP: {
    'first name': 'profile.personal.firstName',
    'last name': 'profile.personal.lastName',
    'email address': 'profile.personal.email',
    'phone number': 'profile.personal.phone',
    'mobile phone number': 'profile.personal.phone',
    'city': 'profile.personal.city',
    'linkedin profile': 'profile.links.linkedin',
    'website': 'profile.links.website',
    'portfolio': 'profile.links.portfolio',
    'github': 'profile.links.github',
    'years of experience': 'profile.experience.yearsOfExperience',
    'current company': 'profile.experience.currentCompany',
    'current title': 'profile.experience.currentRole',
    'school': 'profile.education.university',
    'degree': 'profile.education.degree',
    'field of study': 'profile.education.major',
    'graduation year': 'profile.education.graduationYear',
    'gpa': 'profile.education.gpa',
  },

  /**
   * Enhance a form field with LinkedIn-specific context
   * @param {Object} field - Raw field from scanner
   * @returns {Object} - Enhanced field with LinkedIn hints
   */
  enhanceField(field) {
    const enhanced = { ...field };

    // Normalize the label for lookup
    const labelKey = (field.label || field.ariaLabel || field.placeholder || '').toLowerCase().trim();

    // Add a LinkedIn-specific hint for the mapper to use
    if (this.FIELD_MAP[labelKey]) {
      enhanced._adapterHint = this.FIELD_MAP[labelKey];
      enhanced._adapterName = this.name;
    }

    // LinkedIn wraps some inputs with specific data attributes
    // Promote ariaLabel to label if label is missing
    if (!enhanced.label && enhanced.ariaLabel) {
      enhanced.label = enhanced.ariaLabel;
    }

    return enhanced;
  }
};
