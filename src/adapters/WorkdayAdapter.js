/**
 * Workday ATS Adapter
 * Workday is used by hundreds of large companies for job applications.
 * It uses Angular with specific data-automation-id attributes that are stable.
 */

export const WorkdayAdapter = {
  name: 'WorkdayAdapter',

  /**
   * Match Workday application URLs
   * @param {string} url
   * @returns {boolean}
   */
  matches(url) {
    if (!url) return false;
    return (
      url.includes('myworkdayjobs.com') ||
      url.includes('wd3.myworkday.com') ||
      url.includes('wd5.myworkday.com') ||
      url.includes('workday.com/en-us/applications')
    );
  },

  /**
   * Workday uses data-automation-id attributes as stable selectors.
   * These are consistent across all companies using Workday.
   */
  AUTOMATION_ID_MAP: {
    'legalNameSection_firstName': 'profile.personal.firstName',
    'legalNameSection_lastName': 'profile.personal.lastName',
    'email': 'profile.personal.email',
    'phone-number': 'profile.personal.phone',
    'addressSection_city': 'profile.personal.city',
    'addressSection_countryRegion': 'profile.personal.state',
    'addressSection_postalCode': 'profile.personal.zipCode',
    'addressSection_country': 'profile.personal.country',
    'linkedIn': 'profile.links.linkedin',
    'website': 'profile.links.website',
    'github': 'profile.links.github',
    'yearsOfExperience': 'profile.experience.yearsOfExperience',
    'jobTitle': 'profile.experience.currentRole',
    'company': 'profile.experience.currentCompany',
    'school': 'profile.education.university',
    'degree': 'profile.education.degree',
    'major': 'profile.education.major',
    'graduationDate': 'profile.education.graduationYear',
    'gpa': 'profile.education.gpa',
  },

  /**
   * Workday label text mappings (fallback when automation-id isn't available)
   */
  LABEL_MAP: {
    'first name': 'profile.personal.firstName',
    'last name': 'profile.personal.lastName',
    'email': 'profile.personal.email',
    'city': 'profile.personal.city',
    'state': 'profile.personal.state',
    'postal code': 'profile.personal.zipCode',
    'country': 'profile.personal.country',
    'phone number': 'profile.personal.phone',
    'linkedin url': 'profile.links.linkedin',
    'portfolio url': 'profile.links.portfolio',
    'job title': 'profile.experience.currentRole',
    'company name': 'profile.experience.currentCompany',
    'years of experience': 'profile.experience.yearsOfExperience',
    'university': 'profile.education.university',
    'degree': 'profile.education.degree',
    'field of study': 'profile.education.major',
    'gpa': 'profile.education.gpa',
  },

  /**
   * Enhance a form field with Workday-specific context
   * @param {Object} field - Raw field from scanner
   * @returns {Object} - Enhanced field with Workday hints
   */
  enhanceField(field) {
    const enhanced = { ...field };

    // Try automation-id match first (most reliable for Workday)
    const automationId = field.id || '';
    if (this.AUTOMATION_ID_MAP[automationId]) {
      enhanced._adapterHint = this.AUTOMATION_ID_MAP[automationId];
      enhanced._adapterName = this.name;
      return enhanced;
    }

    // Fallback: label text match
    const labelKey = (field.label || field.ariaLabel || field.placeholder || '').toLowerCase().trim();
    if (this.LABEL_MAP[labelKey]) {
      enhanced._adapterHint = this.LABEL_MAP[labelKey];
      enhanced._adapterName = this.name;
    }

    return enhanced;
  }
};
