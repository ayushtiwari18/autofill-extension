/**
 * Confidence Scoring Module
 * Calculates match confidence between form fields and profile patterns
 */

// ============================================
// TEXT NORMALIZATION
// ============================================

/**
 * Normalize text for comparison
 * @param {string} text - Input text
 * @returns {string} - Normalized text
 */
export function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .replace(/\s+/g, ' '); // Normalize whitespace
}

// ============================================
// FUZZY MATCHING
// ============================================

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - Edit distance
 */
export function calculateLevenshteinDistance(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;
  
  // Create matrix
  const matrix = [];
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[len1][len2];
}

/**
 * Score fuzzy match between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - Score 0.0-1.0
 */
export function scoreFuzzyMatch(str1, str2) {
  if (!str1 || !str2) return 0;
  
  const normalized1 = normalizeText(str1);
  const normalized2 = normalizeText(str2);
  
  if (!normalized1 || !normalized2) return 0;
  
  // Exact match
  if (normalized1 === normalized2) return 1.0;
  
  // Contains match (substring)
  if (normalized1.includes(normalized2)) {
    return 0.85;
  }
  if (normalized2.includes(normalized1)) {
    return 0.85;
  }
  
  // Levenshtein similarity
  const distance = calculateLevenshteinDistance(normalized1, normalized2);
  const maxLen = Math.max(normalized1.length, normalized2.length);
  
  if (maxLen === 0) return 0;
  
  const similarity = 1 - (distance / maxLen);
  
  // Only return scores above threshold
  return similarity > 0.5 ? similarity : 0;
}

// ============================================
// MATCH SCORING
// ============================================

/**
 * Score a single match between form field and pattern
 * @param {Object} formField - Form field metadata
 * @param {Object} pattern - Field pattern from rules
 * @param {string} matchType - 'label', 'placeholder', 'name', 'ariaLabel'
 * @returns {number} - Score 0.0-1.0
 */
export function scoreMatch(formField, pattern, matchType) {
  // Weight for each match type
  const weights = {
    'label': 0.50,
    'placeholder': 0.30,
    'name': 0.15,
    'ariaLabel': 0.05
  };
  
  const weight = weights[matchType] || 0;
  const text = formField[matchType] || '';
  
  if (!text) return 0;
  
  // Find best pattern match
  let bestScore = 0;
  for (const patternText of pattern.patterns) {
    const score = scoreFuzzyMatch(text, patternText);
    if (score > bestScore) {
      bestScore = score;
    }
  }
  
  return bestScore * weight;
}

/**
 * Calculate overall confidence score for field match
 * @param {Object} formField - Form field metadata
 * @param {Object} pattern - Field pattern from rules
 * @param {string[]} negativeKeywords - Keywords to check against
 * @returns {Object} - { score, matchedOn, details }
 */
export function calculateConfidence(formField, pattern, negativeKeywords = []) {
  try {
    // Check negative keywords first
    const allText = [
      formField.label || '',
      formField.placeholder || '',
      formField.name || ''
    ].join(' ').toLowerCase();
    
    for (const keyword of negativeKeywords) {
      if (allText.includes(keyword.toLowerCase())) {
        return {
          score: 0,
          matchedOn: null,
          details: 'Negative keyword match'
        };
      }
    }
    
    // Calculate weighted scores for each attribute
    const labelScore = scoreMatch(formField, pattern, 'label');
    const placeholderScore = scoreMatch(formField, pattern, 'placeholder');
    const nameScore = scoreMatch(formField, pattern, 'name');
    const ariaScore = scoreMatch(formField, pattern, 'ariaLabel');
    
    const totalScore = labelScore + placeholderScore + nameScore + ariaScore;
    
    // Determine what attribute matched best
    let matchedOn = null;
    if (labelScore > 0.4) {
      matchedOn = 'label';
    } else if (placeholderScore > 0.2) {
      matchedOn = 'placeholder';
    } else if (nameScore > 0.1) {
      matchedOn = 'name';
    } else if (ariaScore > 0) {
      matchedOn = 'ariaLabel';
    }
    
    return {
      score: Math.min(totalScore, 1.0),
      matchedOn,
      details: {
        label: labelScore,
        placeholder: placeholderScore,
        name: nameScore,
        ariaLabel: ariaScore
      }
    };
  } catch (error) {
    console.error('[Confidence] Error calculating confidence:', error.message);
    return {
      score: 0,
      matchedOn: null,
      details: 'Error'
    };
  }
}
