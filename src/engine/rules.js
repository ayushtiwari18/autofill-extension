/**
 * Field Mapping Rules
 * Defines patterns, aliases, and negative keywords for profile-to-form matching
 */

// ============================================
// FIELD PATTERNS
// ============================================

/**
 * Field matching patterns for all profile fields
 * Maps profile paths to matching rules
 */
export const FIELD_PATTERNS = {
  // Personal Information
  'profile.personal.firstName': {
    patterns: ['first name', 'first', 'fname', 'given name', 'forename'],
    fieldTypes: ['text'],
    weight: 1.0
  },
  'profile.personal.lastName': {
    patterns: ['last name', 'last', 'lname', 'surname', 'family name'],
    fieldTypes: ['text'],
    weight: 1.0
  },
  'profile.personal.email': {
    patterns: ['email', 'email address', 'e-mail', 'mail'],
    fieldTypes: ['email', 'text'],
    weight: 1.0
  },
  'profile.personal.phone': {
    patterns: ['phone', 'phone number', 'mobile', 'telephone', 'cell', 'contact number'],
    fieldTypes: ['tel', 'text'],
    weight: 1.0
  },
  'profile.personal.address': {
    patterns: ['address', 'street', 'street address', 'address line', 'location'],
    fieldTypes: ['text', 'textarea'],
    weight: 1.0
  },
  'profile.personal.city': {
    patterns: ['city', 'town'],
    fieldTypes: ['text'],
    weight: 1.0
  },
  'profile.personal.state': {
    patterns: ['state', 'province', 'region'],
    fieldTypes: ['text', 'select'],
    weight: 1.0
  },
  'profile.personal.zipCode': {
    patterns: ['zip', 'zip code', 'postal code', 'postcode', 'postal'],
    fieldTypes: ['text', 'number'],
    weight: 1.0
  },
  'profile.personal.country': {
    patterns: ['country', 'nation'],
    fieldTypes: ['text', 'select'],
    weight: 1.0
  },
  
  // Education
  'profile.education.degree': {
    patterns: ['degree', 'qualification', 'education level', 'highest degree'],
    fieldTypes: ['text', 'select'],
    weight: 1.0
  },
  'profile.education.major': {
    patterns: ['major', 'field of study', 'specialization', 'subject', 'area of study'],
    fieldTypes: ['text'],
    weight: 1.0
  },
  'profile.education.university': {
    patterns: ['university', 'college', 'school', 'institution', 'alma mater'],
    fieldTypes: ['text'],
    weight: 1.0
  },
  'profile.education.graduationYear': {
    patterns: ['graduation year', 'grad year', 'year of graduation', 'graduation date'],
    fieldTypes: ['text', 'number', 'date'],
    weight: 1.0
  },
  'profile.education.gpa': {
    patterns: ['gpa', 'grade point average', 'grades', 'cgpa'],
    fieldTypes: ['text', 'number'],
    weight: 1.0
  },
  
  // Experience
  'profile.experience.currentRole': {
    patterns: ['current role', 'job title', 'position', 'role', 'current position', 'title'],
    fieldTypes: ['text'],
    weight: 1.0
  },
  'profile.experience.currentCompany': {
    patterns: ['company', 'employer', 'organization', 'current company', 'current employer'],
    fieldTypes: ['text'],
    weight: 1.0
  },
  'profile.experience.yearsOfExperience': {
    patterns: ['years of experience', 'experience', 'years', 'work experience', 'total experience'],
    fieldTypes: ['text', 'number'],
    weight: 1.0
  },
  'profile.experience.skills': {
    patterns: ['skills', 'technical skills', 'expertise', 'competencies', 'abilities'],
    fieldTypes: ['text', 'textarea'],
    weight: 1.0
  },
  
  // Links
  'profile.links.linkedin': {
    patterns: ['linkedin', 'linkedin url', 'linkedin profile', 'linkedin link'],
    fieldTypes: ['url', 'text'],
    weight: 1.0
  },
  'profile.links.github': {
    patterns: ['github', 'github url', 'github profile', 'github link'],
    fieldTypes: ['url', 'text'],
    weight: 1.0
  },
  'profile.links.portfolio': {
    patterns: ['portfolio', 'portfolio url', 'portfolio link', 'work samples'],
    fieldTypes: ['url', 'text'],
    weight: 1.0
  },
  'profile.links.website': {
    patterns: ['website', 'personal website', 'url', 'web page', 'homepage'],
    fieldTypes: ['url', 'text'],
    weight: 1.0
  },
  
  // Documents
  'profile.documents.resume': {
    patterns: ['resume', 'cv', 'curriculum vitae', 'upload resume', 'attach resume'],
    fieldTypes: ['file'],
    weight: 1.0
  }
};

// ============================================
// FIELD ALIASES
// ============================================

/**
 * Alternative names for common fields
 */
export const FIELD_ALIASES = {
  'phone': ['mobile', 'telephone', 'cell', 'contact number', 'tel'],
  'first name': ['given name', 'forename', 'christian name'],
  'last name': ['surname', 'family name'],
  'email': ['e-mail', 'mail', 'email address'],
  'address': ['street', 'street address', 'location'],
  'zip': ['postal code', 'postcode', 'zip code'],
  'state': ['province', 'region'],
  'university': ['college', 'school', 'institution'],
  'degree': ['qualification', 'education level'],
  'major': ['field of study', 'specialization'],
  'company': ['employer', 'organization'],
  'role': ['job title', 'position', 'title'],
  'skills': ['technical skills', 'expertise'],
  'resume': ['cv', 'curriculum vitae']
};

// ============================================
// NEGATIVE KEYWORDS
// ============================================

/**
 * Keywords that prevent false matches
 */
export const NEGATIVE_KEYWORDS = {
  'profile.personal.firstName': ['last', 'surname', 'family'],
  'profile.personal.lastName': ['first', 'given', 'forename'],
  'profile.personal.email': ['phone', 'mobile', 'address'],
  'profile.personal.phone': ['email', 'mail'],
  'profile.personal.address': ['email', 'phone'],
  'profile.education.degree': ['major', 'university', 'year'],
  'profile.education.major': ['degree', 'university', 'year'],
  'profile.education.university': ['degree', 'major', 'year'],
  'profile.experience.currentRole': ['company', 'employer'],
  'profile.experience.currentCompany': ['role', 'title', 'position'],
  'profile.links.linkedin': ['github', 'portfolio'],
  'profile.links.github': ['linkedin', 'portfolio'],
  'profile.links.portfolio': ['linkedin', 'github']
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get all available profile field paths
 * @returns {string[]} - Array of profile paths
 */
export function getAllProfilePaths() {
  return Object.keys(FIELD_PATTERNS);
}

/**
 * Get matching pattern for profile path
 * @param {string} profilePath - Profile field path
 * @returns {Object|null} - Pattern object or null
 */
export function getPatternForPath(profilePath) {
  return FIELD_PATTERNS[profilePath] || null;
}

/**
 * Get negative keywords for profile path
 * @param {string} profilePath - Profile field path
 * @returns {string[]} - Array of negative keywords
 */
export function getNegativeKeywords(profilePath) {
  return NEGATIVE_KEYWORDS[profilePath] || [];
}

/**
 * Check if profile path exists
 * @param {string} profilePath - Profile field path
 * @returns {boolean} - true if path exists
 */
export function isValidProfilePath(profilePath) {
  return profilePath in FIELD_PATTERNS;
}
