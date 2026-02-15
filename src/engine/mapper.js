/**
 * Field Mapper Module
 * Maps profile data to form fields using pattern matching and confidence scoring
 */

import {
  getAllProfilePaths,
  getPatternForPath,
  getNegativeKeywords
} from './rules.js';

import { calculateConfidence } from './confidence.js';

// ============================================
// PROFILE VALUE EXTRACTION
// ============================================

/**
 * Extract value from profile using dot notation path
 * @param {Object} profile - User profile
 * @param {string} profilePath - Dot notation path (e.g., 'profile.personal.firstName')
 * @returns {any} - Field value or null
 */
export function getProfileFieldValue(profile, profilePath) {
  try {
    const keys = profilePath.split('.');
    let value = profile;
    
    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return null;
      }
    }
    
    return value;
  } catch (error) {
    console.error('[Mapper] Error extracting profile value:', error.message);
    return null;
  }
}

// ============================================
// TYPE VALIDATION
// ============================================

/**
 * Validate that form field type matches profile data type
 * @param {Object} formField - Form field metadata
 * @param {string} profilePath - Profile field path
 * @param {any} profileValue - Profile field value
 * @returns {boolean} - true if types match
 */
export function validateFieldType(formField, profilePath, profileValue) {
  try {
    // Skip validation if value is null/undefined
    if (profileValue === null || profileValue === undefined) {
      return false;
    }
    
    // Email validation
    if (formField.type === 'email' && profilePath.includes('email')) {
      return typeof profileValue === 'string' && profileValue.includes('@');
    }
    
    // Phone validation
    if (formField.type === 'tel' && profilePath.includes('phone')) {
      return typeof profileValue === 'string';
    }
    
    // Number validation
    if (formField.type === 'number') {
      return !isNaN(profileValue);
    }
    
    // URL validation
    if (formField.type === 'url') {
      return typeof profileValue === 'string' && 
             (profileValue.startsWith('http://') || profileValue.startsWith('https://'));
    }
    
    // File validation
    if (formField.type === 'file' && profilePath.includes('resume')) {
      return true; // File handling deferred to Phase 7
    }
    
    // Select/dropdown - validate value exists
    if (formField.type === 'select' || formField.type === 'select-one') {
      return typeof profileValue === 'string' && profileValue.length > 0;
    }
    
    // Textarea
    if (formField.type === 'textarea') {
      return typeof profileValue === 'string' || Array.isArray(profileValue);
    }
    
    // Default: text fields accept anything
    return typeof profileValue === 'string' || typeof profileValue === 'number';
  } catch (error) {
    console.error('[Mapper] Error validating field type:', error.message);
    return false;
  }
}

// ============================================
// FIELD MATCHING
// ============================================

/**
 * Find best profile match for a single form field
 * @param {Object} formField - Form field metadata from scanner
 * @param {Object} profile - User profile
 * @returns {Object|null} - Best match or null
 */
export function matchField(formField, profile) {
  try {
    const allPaths = getAllProfilePaths();
    let bestMatch = null;
    let bestScore = 0;
    
    for (const profilePath of allPaths) {
      const pattern = getPatternForPath(profilePath);
      if (!pattern) continue;
      
      // Check field type compatibility
      if (pattern.fieldTypes && !pattern.fieldTypes.includes(formField.type)) {
        continue;
      }
      
      // Calculate confidence
      const negativeKeywords = getNegativeKeywords(profilePath);
      const confidenceResult = calculateConfidence(formField, pattern, negativeKeywords);
      
      // Apply pattern weight
      const finalScore = confidenceResult.score * pattern.weight;
      
      if (finalScore > bestScore) {
        const profileValue = getProfileFieldValue(profile, profilePath);
        
        // Validate type
        if (!validateFieldType(formField, profilePath, profileValue)) {
          continue;
        }
        
        // Skip if profile value is empty
        if (profileValue === null || profileValue === undefined || profileValue === '') {
          continue;
        }
        
        // Special handling for arrays (skills)
        let displayValue = profileValue;
        if (Array.isArray(profileValue)) {
          displayValue = profileValue.join(', ');
        }
        
        bestScore = finalScore;
        bestMatch = {
          formFieldId: formField.id,
          formFieldSelector: formField.selector,
          formFieldLabel: formField.label || formField.placeholder || formField.name,
          formFieldType: formField.type,
          profilePath: profilePath,
          profileValue: displayValue,
          confidence: finalScore,
          matchedOn: confidenceResult.matchedOn,
          requiresReview: finalScore < 0.8
        };
      }
    }
    
    return bestMatch;
  } catch (error) {
    console.error('[Mapper] Error matching field:', error.message);
    return null;
  }
}

// ============================================
// COMPLETE MAPPING
// ============================================

/**
 * Map entire profile to form fields
 * @param {Object} profile - User profile
 * @param {Object} formData - Scanned form data (from Phase 4)
 * @returns {Object} - Complete mapping result
 */
export function mapProfileToForm(profile, formData) {
  try {
    const matches = [];
    const unmatchedFormFields = [];
    const usedProfilePaths = new Set();
    
    // Validate inputs
    if (!profile || !formData || !formData.forms) {
      return {
        matches: [],
        unmatchedFormFields: [],
        unmatchedProfileFields: [],
        overallConfidence: 0,
        requiresReview: true,
        url: formData?.url || '',
        timestamp: new Date().toISOString(),
        error: 'Invalid input data'
      };
    }
    
    // Process each form
    for (const form of formData.forms) {
      // Skip forms with CAPTCHA
      if (form.hasCaptcha) {
        console.log('[Mapper] Skipping form with CAPTCHA:', form.id);
        continue;
      }
      
      // Skip Google Forms (cannot fill iframes)
      if (form.type === 'google-forms') {
        console.log('[Mapper] Skipping Google Forms iframe:', form.id);
        continue;
      }
      
      // Match each field
      for (const formField of form.fields) {
        const match = matchField(formField, profile);
        
        if (match && match.confidence >= 0.6) {
          matches.push(match);
          usedProfilePaths.add(match.profilePath);
        } else {
          unmatchedFormFields.push({
            id: formField.id,
            label: formField.label || formField.placeholder || formField.name,
            type: formField.type,
            selector: formField.selector
          });
        }
      }
    }
    
    // Find unused profile fields (have values but not matched)
    const allProfilePaths = getAllProfilePaths();
    const unmatchedProfileFields = [];
    
    for (const path of allProfilePaths) {
      if (!usedProfilePaths.has(path)) {
        const value = getProfileFieldValue(profile, path);
        if (value !== null && value !== undefined && value !== '' && 
            (!Array.isArray(value) || value.length > 0)) {
          unmatchedProfileFields.push({
            path: path,
            value: Array.isArray(value) ? value.join(', ') : value
          });
        }
      }
    }
    
    // Calculate overall confidence
    const overallConfidence = matches.length > 0
      ? matches.reduce((sum, m) => sum + m.confidence, 0) / matches.length
      : 0;
    
    return {
      matches,
      unmatchedFormFields,
      unmatchedProfileFields,
      overallConfidence: Math.round(overallConfidence * 100) / 100,
      requiresReview: matches.some(m => m.requiresReview) || overallConfidence < 0.8,
      url: formData.url,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('[Mapper] Error mapping profile to form:', error.message);
    return {
      matches: [],
      unmatchedFormFields: [],
      unmatchedProfileFields: [],
      overallConfidence: 0,
      requiresReview: true,
      url: formData?.url || '',
      timestamp: new Date().toISOString(),
      error: error.message
    };
  }
}
