/**
 * Confidence Scoring Module
 * Calculates match confidence between form fields and profile patterns.
 *
 * PERF FIX: calculateLevenshteinDistance now uses a 2-row rolling Int16Array
 * instead of a full 2D matrix, eliminating heavy GC pressure in the content
 * script (previously 300 full matrix allocs per page scan).
 */

export function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Levenshtein distance — 2-row rolling array (O(min(m,n)) space).
 */
export function calculateLevenshteinDistance(str1, str2) {
  // Always iterate over the shorter string as the inner loop
  if (str1.length < str2.length) { const t = str1; str1 = str2; str2 = t; }

  const len1 = str1.length;
  const len2 = str2.length;

  if (len2 === 0) return len1;
  if (len1 === 0) return len2;

  // Two rows: prev and curr
  let prev = new Int16Array(len2 + 1);
  let curr = new Int16Array(len2 + 1);

  for (let j = 0; j <= len2; j++) prev[j] = j;

  for (let i = 1; i <= len1; i++) {
    curr[0] = i;
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        curr[j] = prev[j - 1];
      } else {
        curr[j] = 1 + Math.min(prev[j - 1], curr[j - 1], prev[j]);
      }
    }
    // Swap rows without allocation
    const tmp = prev; prev = curr; curr = tmp;
  }

  return prev[len2];
}

export function scoreFuzzyMatch(str1, str2) {
  if (!str1 || !str2) return 0;
  const normalized1 = normalizeText(str1);
  const normalized2 = normalizeText(str2);
  if (!normalized1 || !normalized2) return 0;
  if (normalized1 === normalized2) return 1.0;
  if (normalized1.includes(normalized2)) return 0.85;
  if (normalized2.includes(normalized1)) return 0.85;

  const distance = calculateLevenshteinDistance(normalized1, normalized2);
  const maxLen   = Math.max(normalized1.length, normalized2.length);
  if (maxLen === 0) return 0;
  const similarity = 1 - (distance / maxLen);
  return similarity > 0.5 ? similarity : 0;
}

export function scoreMatch(formField, pattern, matchType) {
  const weights = { label: 0.50, placeholder: 0.30, name: 0.15, ariaLabel: 0.05 };
  const weight  = weights[matchType] || 0;
  const text    = formField[matchType] || '';
  if (!text) return 0;

  let bestScore = 0;
  for (const patternText of pattern.patterns) {
    const score = scoreFuzzyMatch(text, patternText);
    if (score > bestScore) bestScore = score;
  }
  return bestScore * weight;
}

export function calculateConfidence(formField, pattern, negativeKeywords = []) {
  try {
    const allText = [
      formField.label || '',
      formField.placeholder || '',
      formField.name || ''
    ].join(' ').toLowerCase();

    for (const keyword of negativeKeywords) {
      if (allText.includes(keyword.toLowerCase())) {
        return { score: 0, matchedOn: null, details: 'Negative keyword match' };
      }
    }

    const labelScore       = scoreMatch(formField, pattern, 'label');
    const placeholderScore = scoreMatch(formField, pattern, 'placeholder');
    const nameScore        = scoreMatch(formField, pattern, 'name');
    const ariaScore        = scoreMatch(formField, pattern, 'ariaLabel');
    const totalScore       = labelScore + placeholderScore + nameScore + ariaScore;

    let matchedOn = null;
    if (labelScore > 0.4)       matchedOn = 'label';
    else if (placeholderScore > 0.2) matchedOn = 'placeholder';
    else if (nameScore > 0.1)   matchedOn = 'name';
    else if (ariaScore > 0)     matchedOn = 'ariaLabel';

    return {
      score: Math.min(totalScore, 1.0),
      matchedOn,
      details: { label: labelScore, placeholder: placeholderScore, name: nameScore, ariaLabel: ariaScore }
    };
  } catch (error) {
    console.error('[Confidence] Error calculating confidence:', error.message);
    return { score: 0, matchedOn: null, details: 'Error' };
  }
}
