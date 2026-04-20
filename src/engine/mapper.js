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

export function validateFieldType(formField, profilePath, profileValue) {
  try {
    if (profileValue === null || profileValue === undefined) return false;

    // Arrays (skills) — valid if non-empty
    if (Array.isArray(profileValue)) {
      const valid = profileValue.length > 0;
      if (!valid) console.log(`[Mapper]     ❌ Array value is empty for path: ${profilePath}`);
      return valid;
    }

    if (formField.type === 'email' && profilePath.includes('email'))
      return typeof profileValue === 'string' && profileValue.includes('@');
    if (formField.type === 'tel' && profilePath.includes('phone'))
      return typeof profileValue === 'string';
    if (formField.type === 'number')
      return !isNaN(profileValue);
    if (formField.type === 'url')
      return typeof profileValue === 'string' &&
             (profileValue.startsWith('http://') || profileValue.startsWith('https://'));
    if (formField.type === 'file' && profilePath.includes('resume'))
      return true;
    if (formField.type === 'select' || formField.type === 'select-one')
      return typeof profileValue === 'string' && profileValue.length > 0;
    if (formField.type === 'textarea')
      return typeof profileValue === 'string' || Array.isArray(profileValue);

    return typeof profileValue === 'string' || typeof profileValue === 'number';
  } catch (error) {
    console.error('[Mapper] Error validating field type:', error.message);
    return false;
  }
}

// ============================================
// FIELD MATCHING
// ============================================

export function matchField(formField, profile) {
  try {
    console.log('[Mapper] Matching field:', {
      name: formField.name,
      label: formField.label,
      placeholder: formField.placeholder,
      type: formField.type
    });

    const allPaths = getAllProfilePaths();
    let bestMatch = null;
    let bestScore = 0;

    for (const profilePath of allPaths) {
      const pattern = getPatternForPath(profilePath);
      if (!pattern) continue;

      if (pattern.fieldTypes && !pattern.fieldTypes.includes(formField.type)) continue;

      const negativeKeywords = getNegativeKeywords(profilePath);
      const confidenceResult = calculateConfidence(formField, pattern, negativeKeywords);
      const finalScore = confidenceResult.score * pattern.weight;
      const matchedStr = confidenceResult.matchedOn || 'none';

      console.log(`[Mapper]   ${profilePath}: score=${finalScore.toFixed(3)}, matched=${matchedStr}`);

      if (finalScore > bestScore) {
        const profileValue = getProfileFieldValue(profile, profilePath);

        // ── Empty / null guard ──────────────────────────────────────────────
        if (profileValue === null || profileValue === undefined) {
          console.log(`[Mapper]     ❌ Profile value is null/undefined for: ${profilePath}`);
          continue;
        }
        if (!Array.isArray(profileValue) && profileValue === '') {
          console.log(`[Mapper]     ❌ Profile value is empty string for: ${profilePath}`);
          continue;
        }
        if (Array.isArray(profileValue) && profileValue.length === 0) {
          console.log(`[Mapper]     ❌ Skills array is empty for: ${profilePath} — add skills to your profile`);
          continue;
        }
        // ────────────────────────────────────────────────────────────────────

        if (!validateFieldType(formField, profilePath, profileValue)) {
          console.log(`[Mapper]     ❌ Type validation failed for: ${profilePath}`);
          continue;
        }

        const displayValue = Array.isArray(profileValue)
          ? profileValue.join(', ')
          : profileValue;

        console.log(`[Mapper]     ✅ BEST MATCH! path=${profilePath} value="${displayValue}"`);

        bestScore = finalScore;
        bestMatch = {
          formFieldId: formField.id,
          formFieldSelector: formField.selector,
          formFieldLabel: formField.label || formField.placeholder || formField.name,
          formFieldType: formField.type,
          profilePath,
          profileValue: displayValue,
          confidence: finalScore,
          matchedOn: matchedStr,
          requiresReview: finalScore < 0.8
        };
      }
    }

    if (bestMatch) console.log(`[Mapper] ✅ Field matched:`, bestMatch);
    else console.log(`[Mapper] ❌ No match found for field: "${formField.label || formField.name}"`);

    return bestMatch;
  } catch (error) {
    console.error('[Mapper] Error matching field:', error.message);
    return null;
  }
}

// ============================================
// COMPLETE MAPPING
// ============================================

export function mapProfileToForm(profile, formData) {
  try {
    console.log('[Mapper] Starting mapping with profile:', profile);
    console.log('[Mapper] Form data:', formData);

    const matches = [];
    const unmatchedFormFields = [];
    const usedProfilePaths = new Set();

    if (!profile || !formData || !formData.forms) {
      console.error('[Mapper] Invalid input data');
      return { matches: [], unmatchedFormFields: [], unmatchedProfileFields: [], overallConfidence: 0, requiresReview: true, url: formData?.url || '', timestamp: new Date().toISOString(), error: 'Invalid input data' };
    }

    console.log(`[Mapper] Processing ${formData.forms.length} form(s)`);

    for (const form of formData.forms) {
      if (form.hasCaptcha) { console.log('[Mapper] Skipping CAPTCHA form:', form.id); continue; }
      if (form.type === 'google-forms') { console.log('[Mapper] Skipping Google Forms iframe:', form.id); continue; }

      console.log(`[Mapper] Processing form "${form.id}" with ${form.fields.length} field(s)`);

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

    console.log(`[Mapper] ${matches.length} match(es), ${unmatchedFormFields.length} unmatched`);

    const allProfilePaths = getAllProfilePaths();
    const unmatchedProfileFields = [];
    for (const path of allProfilePaths) {
      if (!usedProfilePaths.has(path)) {
        const value = getProfileFieldValue(profile, path);
        if (value !== null && value !== undefined && value !== '' &&
            (!Array.isArray(value) || value.length > 0)) {
          unmatchedProfileFields.push({ path, value: Array.isArray(value) ? value.join(', ') : value });
        }
      }
    }

    const overallConfidence = matches.length > 0
      ? matches.reduce((sum, m) => sum + m.confidence, 0) / matches.length
      : 0;

    const result = {
      matches,
      unmatchedFormFields,
      unmatchedProfileFields,
      overallConfidence: Math.round(overallConfidence * 100) / 100,
      requiresReview: matches.some(m => m.requiresReview) || overallConfidence < 0.8,
      url: formData.url,
      timestamp: new Date().toISOString()
    };

    console.log('[Mapper] Mapping complete:', result);
    return result;
  } catch (error) {
    console.error('[Mapper] Error mapping profile to form:', error.message);
    return { matches: [], unmatchedFormFields: [], unmatchedProfileFields: [], overallConfidence: 0, requiresReview: true, url: formData?.url || '', timestamp: new Date().toISOString(), error: error.message };
  }
}
