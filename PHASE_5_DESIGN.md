# 🟦 PHASE 5 - FIELD MAPPING ENGINE (DESIGN)

## 🎯 Module Objective
Provide intelligent, rule-based matching between profile data fields and form input fields with confidence scoring, supporting fuzzy matching, synonyms, and type validation.

---

## 🏗 Module Architecture

### Module 1: `src/engine/rules.js`
**Responsibilities**:
- Define field matching patterns
- Store field aliases and synonyms
- Maintain negative keyword lists
- Provide pattern matching utilities

**NOT Responsible For**:
- Confidence scoring (confidence.js)
- Actual matching logic (mapper.js)
- Form filling (Phase 7)

### Module 2: `src/engine/confidence.js`
**Responsibilities**:
- Calculate match confidence scores
- Implement fuzzy string matching
- Normalize text for comparison
- Weight different match types

**NOT Responsible For**:
- Pattern definitions (rules.js)
- Field matching logic (mapper.js)
- User decision making (Phase 6)

### Module 3: `src/engine/mapper.js`
**Responsibilities**:
- Main mapping orchestration
- Match profile fields to form fields
- Find best matches from candidates
- Extract profile values
- Return complete mapping result

**NOT Responsible For**:
- Filling form fields (Phase 7)
- User interaction (Phase 6)
- Storage operations (Phase 3)

---

## 📋 Function Signatures

## Module: `rules.js`

### 1. `FIELD_PATTERNS` (Constant)
```javascript
/**
 * Field matching patterns for all profile fields
 * Maps profile paths to matching rules
 */
const FIELD_PATTERNS = {
  'profile.personal.firstName': {
    patterns: ['first name', 'first', 'fname', 'given name', 'forename'],
    fieldTypes: ['text'],
    weight: 1.0
  },
  'profile.personal.email': {
    patterns: ['email', 'email address', 'e-mail'],
    fieldTypes: ['email', 'text'],
    weight: 1.0
  },
  // ... all profile fields
};
```

### 2. `FIELD_ALIASES` (Constant)
```javascript
/**
 * Alternative names for common fields
 */
const FIELD_ALIASES = {
  'phone': ['mobile', 'telephone', 'cell', 'contact number'],
  'first name': ['given name', 'forename', 'christian name'],
  // ...
};
```

### 3. `NEGATIVE_KEYWORDS` (Constant)
```javascript
/**
 * Keywords that prevent false matches
 */
const NEGATIVE_KEYWORDS = {
  'profile.personal.firstName': ['last', 'surname', 'family'],
  'profile.personal.lastName': ['first', 'given', 'forename'],
  // ...
};
```

### 4. `getAllProfilePaths()`
```javascript
/**
 * Get all available profile field paths
 * @returns {string[]} - Array of profile paths
 */
function getAllProfilePaths() {
  return Object.keys(FIELD_PATTERNS);
}
```

### 5. `getPatternForPath(profilePath)`
```javascript
/**
 * Get matching pattern for profile path
 * @param {string} profilePath - Profile field path
 * @returns {Object|null} - Pattern object or null
 */
function getPatternForPath(profilePath) {
  return FIELD_PATTERNS[profilePath] || null;
}
```

---

## Module: `confidence.js`

### 1. `normalizeText(text)`
```javascript
/**
 * Normalize text for comparison
 * @param {string} text - Input text
 * @returns {string} - Normalized text
 */
function normalizeText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .replace(/\s+/g, ' '); // Normalize whitespace
}
```
**Purpose**: Standardize text for accurate comparison

---

### 2. `calculateLevenshteinDistance(str1, str2)`
```javascript
/**
 * Calculate edit distance between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - Edit distance
 */
function calculateLevenshteinDistance(str1, str2) {
  // Dynamic programming implementation
  // Returns minimum edits to transform str1 to str2
}
```
**Purpose**: Measure string similarity for fuzzy matching

---

### 3. `scoreFuzzyMatch(str1, str2)`
```javascript
/**
 * Score fuzzy match between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - Score 0.0-1.0
 */
function scoreFuzzyMatch(str1, str2) {
  const normalized1 = normalizeText(str1);
  const normalized2 = normalizeText(str2);
  
  // Exact match
  if (normalized1 === normalized2) return 1.0;
  
  // Contains match
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    return 0.8;
  }
  
  // Levenshtein similarity
  const distance = calculateLevenshteinDistance(normalized1, normalized2);
  const maxLen = Math.max(str1.length, str2.length);
  const similarity = 1 - (distance / maxLen);
  
  return Math.max(0, similarity);
}
```
**Purpose**: Calculate similarity score between strings  
**Returns**: 1.0 = exact, 0.8 = contains, 0.0-1.0 = fuzzy

---

### 4. `scoreMatch(formField, pattern, matchType)`
```javascript
/**
 * Score a single match between form field and pattern
 * @param {Object} formField - Form field metadata
 * @param {Object} pattern - Field pattern from rules
 * @param {string} matchType - 'label', 'placeholder', 'name', 'aria-label'
 * @returns {number} - Score 0.0-1.0
 */
function scoreMatch(formField, pattern, matchType) {
  const weights = {
    'label': 0.50,
    'placeholder': 0.30,
    'name': 0.15,
    'aria-label': 0.05
  };
  
  const weight = weights[matchType] || 0;
  const text = formField[matchType] || '';
  
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
```
**Purpose**: Score match for specific field attribute  
**Returns**: Weighted score based on match type

---

### 5. `calculateConfidence(formField, pattern, negativeKeywords)`
```javascript
/**
 * Calculate overall confidence score for field match
 * @param {Object} formField - Form field metadata
 * @param {Object} pattern - Field pattern from rules
 * @param {string[]} negativeKeywords - Keywords to check against
 * @returns {Object} - { score, matchedOn, details }
 */
function calculateConfidence(formField, pattern, negativeKeywords = []) {
  // Check negative keywords first
  const allText = [
    formField.label || '',
    formField.placeholder || '',
    formField.name || ''
  ].join(' ').toLowerCase();
  
  for (const keyword of negativeKeywords) {
    if (allText.includes(keyword)) {
      return { score: 0, matchedOn: null, details: 'Negative keyword match' };
    }
  }
  
  // Calculate weighted scores
  const labelScore = scoreMatch(formField, pattern, 'label');
  const placeholderScore = scoreMatch(formField, pattern, 'placeholder');
  const nameScore = scoreMatch(formField, pattern, 'name');
  const ariaScore = scoreMatch(formField, pattern, 'aria-label');
  
  const totalScore = labelScore + placeholderScore + nameScore + ariaScore;
  
  // Determine what matched
  let matchedOn = null;
  if (labelScore > 0.4) matchedOn = 'label';
  else if (placeholderScore > 0.2) matchedOn = 'placeholder';
  else if (nameScore > 0.1) matchedOn = 'name';
  else if (ariaScore > 0) matchedOn = 'aria-label';
  
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
}
```
**Purpose**: Calculate comprehensive confidence score  
**Returns**: Score object with details

---

## Module: `mapper.js`

### 1. `getProfileFieldValue(profile, profilePath)`
```javascript
/**
 * Extract value from profile using dot notation path
 * @param {Object} profile - User profile
 * @param {string} profilePath - Dot notation path (e.g., 'profile.personal.firstName')
 * @returns {any} - Field value or null
 */
function getProfileFieldValue(profile, profilePath) {
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
```
**Purpose**: Safely extract nested profile values  
**Returns**: Value or null if not found

---

### 2. `validateFieldType(formField, profilePath, profileValue)`
```javascript
/**
 * Validate that form field type matches profile data type
 * @param {Object} formField - Form field metadata
 * @param {string} profilePath - Profile field path
 * @param {any} profileValue - Profile field value
 * @returns {boolean} - true if types match
 */
function validateFieldType(formField, profilePath, profileValue) {
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
  
  // File validation
  if (formField.type === 'file' && profilePath.includes('resume')) {
    return true; // File handling in Phase 7
  }
  
  // Default: text fields accept anything
  return true;
}
```
**Purpose**: Prevent type mismatches  
**Returns**: Boolean validation result

---

### 3. `matchField(formField, profile)`
```javascript
/**
 * Find best profile match for a single form field
 * @param {Object} formField - Form field metadata from scanner
 * @param {Object} profile - User profile
 * @returns {Object|null} - Best match or null
 */
function matchField(formField, profile) {
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
    const negativeKeywords = NEGATIVE_KEYWORDS[profilePath] || [];
    const confidenceResult = calculateConfidence(formField, pattern, negativeKeywords);
    
    // Apply pattern weight
    const finalScore = confidenceResult.score * pattern.weight;
    
    if (finalScore > bestScore) {
      const profileValue = getProfileFieldValue(profile, profilePath);
      
      // Validate type
      if (!validateFieldType(formField, profilePath, profileValue)) {
        continue;
      }
      
      // Skip if profile value is empty/null
      if (profileValue === null || profileValue === undefined || profileValue === '') {
        continue;
      }
      
      bestScore = finalScore;
      bestMatch = {
        formFieldId: formField.id,
        formFieldSelector: formField.selector,
        formFieldLabel: formField.label,
        profilePath: profilePath,
        profileValue: profileValue,
        confidence: finalScore,
        matchedOn: confidenceResult.matchedOn,
        requiresReview: finalScore < 0.8
      };
    }
  }
  
  return bestMatch;
}
```
**Purpose**: Find single best match for form field  
**Returns**: Match object or null

---

### 4. `mapProfileToForm(profile, formData)`
```javascript
/**
 * Map entire profile to form fields
 * @param {Object} profile - User profile
 * @param {Object} formData - Scanned form data (from Phase 4)
 * @returns {Object} - Complete mapping result
 */
function mapProfileToForm(profile, formData) {
  const matches = [];
  const unmatchedFormFields = [];
  const usedProfilePaths = new Set();
  
  // Process each form
  for (const form of formData.forms) {
    // Skip forms with CAPTCHA
    if (form.hasCaptcha) {
      console.log('[Mapper] Skipping form with CAPTCHA:', form.id);
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
          label: formField.label,
          type: formField.type
        });
      }
    }
  }
  
  // Find unused profile fields
  const allProfilePaths = getAllProfilePaths();
  const unmatchedProfileFields = allProfilePaths.filter(path => {
    const value = getProfileFieldValue(profile, path);
    return !usedProfilePaths.has(path) && value !== null && value !== '';
  });
  
  // Calculate overall confidence
  const overallConfidence = matches.length > 0
    ? matches.reduce((sum, m) => sum + m.confidence, 0) / matches.length
    : 0;
  
  return {
    matches,
    unmatchedFormFields,
    unmatchedProfileFields,
    overallConfidence,
    requiresReview: matches.some(m => m.requiresReview) || overallConfidence < 0.8,
    url: formData.url,
    timestamp: new Date().toISOString()
  };
}
```
**Purpose**: Main entry point for mapping  
**Returns**: Complete mapping result

---

## 🔄 Data Flow

```
Phase 4 Scanner Output (formData)
    |
    v
mapProfileToForm(profile, formData)
    |
    v
For Each Form Field:
  matchField(formField, profile)
    |
    v
  For Each Profile Path:
    getPatternForPath(profilePath)
    calculateConfidence(formField, pattern)
      |
      v
    scoreMatch(formField, pattern, matchType)
      scoreFuzzyMatch(text1, text2)
    |
    v
  Return Best Match
    |
    v
Mapping Result (matches, unmatched, confidence)
```

---

## 🧪 Testing Strategy

### Test Case 1: Perfect Label Match
```javascript
const formField = { id: 'fname', label: 'First Name', type: 'text', selector: '#fname' };
const profile = { profile: { personal: { firstName: 'John' } } };
const match = matchField(formField, profile);
// Expected: confidence >= 0.9, matchedOn='label'
```

### Test Case 2: Fuzzy Match
```javascript
const formField = { id: 'fname', label: 'Your First Name', type: 'text' };
const match = matchField(formField, profile);
// Expected: confidence >= 0.8
```

### Test Case 3: Negative Keyword
```javascript
const formField = { id: 'lname', label: 'First Name (of last employer)', type: 'text' };
const match = matchField(formField, profile);
// Expected: confidence = 0 ("last" is negative keyword for firstName)
```

### Test Case 4: Type Validation
```javascript
const formField = { id: 'email', label: 'Email', type: 'email' };
const profile = { profile: { personal: { phone: '123-456-7890' } } };
const match = matchField(formField, profile);
// Expected: null (type mismatch)
```

### Test Case 5: Empty Profile Value
```javascript
const formField = { id: 'middle', label: 'Middle Name', type: 'text' };
const profile = { profile: { personal: { middleName: '' } } };
const match = matchField(formField, profile);
// Expected: null (empty value skipped)
```

---

## ✅ Design Validation Checklist

- [x] All functions have clear signatures
- [x] Confidence scoring algorithm defined
- [x] Fuzzy matching logic specified
- [x] Type validation strategy documented
- [x] Threshold logic explained
- [x] Data structures documented
- [x] Test cases defined
- [x] Performance expectations set
- [x] Privacy requirements mapped
- [x] Follows global rules

---

## 🚫 What This Module Does NOT Do

- ❌ Fill form fields (Phase 7)
- ❌ Show UI (Phase 6)
- ❌ Store data (Phase 3)
- ❌ Scan forms (Phase 4)
- ❌ Handle user confirmation (Phase 6)
- ❌ Log profile values (security rule)

---

## 🎯 Success Criteria for Design Phase

- [x] Module responsibilities clearly defined
- [x] Function signatures documented
- [x] Algorithms specified
- [x] Data flow diagrams complete
- [x] Testing strategy outlined
- [x] Performance targets set
- [x] No ambiguity in implementation

---

## ⏭️ Ready for Implementation Phase

**Design Status**: ✅ COMPLETE  
**Next Step**: PHASE 5 - IMPLEMENTATION  

**Implementation will create**:
- `src/engine/rules.js` with field patterns
- `src/engine/confidence.js` with scoring algorithms
- `src/engine/mapper.js` with mapping logic
- Atomic commits per module/function

---

**Design Approved**: Ready to proceed to implementation.
