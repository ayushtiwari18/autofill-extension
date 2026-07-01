# 🟦 PHASE 5 - FIELD MAPPING ENGINE (PLANNING)

## 📋 Objective
Build an intelligent field mapping engine that matches profile data fields to form input fields using rule-based pattern matching and confidence scoring, with support for fuzzy matching and historical learning.

## 🎯 Expected Output
1. **mapper.js** - Core mapping logic with confidence scoring
2. **rules.js** - Field matching rules and patterns
3. **confidence.js** - Confidence calculation algorithms
4. Match profile fields to form fields automatically
5. Generate confidence scores (0.0 - 1.0)
6. Handle ambiguous matches (multiple candidates)
7. Support for aliases and synonyms
8. Historical match learning (optional enhancement)

## 🧠 Mapping Strategy

### Matching Priority (Weighted)
1. **Label Text Match** (50% weight)
   - Exact match: 1.0
   - Case-insensitive match: 0.9
   - Fuzzy match: 0.6-0.8
   - Synonym match: 0.7

2. **Placeholder Text Match** (30% weight)
   - Same scoring as label

3. **Name/ID Attribute Match** (15% weight)
   - Exact match: 1.0
   - Contains keyword: 0.7

4. **aria-label Match** (5% weight)
   - Same scoring as label

### Confidence Threshold
- **High confidence**: score >= 0.8 (auto-fill)
- **Medium confidence**: 0.6 <= score < 0.8 (highlight for review)
- **Low confidence**: score < 0.6 (skip or manual selection)

## ⚠️ Risks Identified

### 1. Ambiguous Field Names
- **Risk**: "Name" could mean firstName, lastName, fullName
- **Mitigation**: Use context (nearby fields, form structure)
- **Fallback**: Present multiple options to user

### 2. International Variations
- **Risk**: Different label text in different languages/regions
- **Mitigation**: Support common aliases (e.g., "Mobile" = "Phone")
- **Limitation**: Phase 5 focuses on English only
- **TODO**: Multi-language support deferred to Phase 9

### 3. Custom Field Labels
- **Risk**: Non-standard labels ("Your digits" for phone)
- **Mitigation**: Fuzzy matching and keyword extraction
- **Stop Condition**: If matching accuracy < 50%, document and halt

### 4. Multiple Fields of Same Type
- **Risk**: "Phone 1", "Phone 2", "Emergency Phone"
- **Handling**: Match primary profile field to first occurrence
- **Note**: Multi-value fields deferred to Phase 9

### 5. Performance with Large Forms
- **Risk**: 100+ fields causing slow matching
- **Mitigation**: O(n*m) algorithm acceptable for typical forms
- **Stop Condition**: If matching > 1 second, optimize

### 6. False Positives
- **Risk**: Matching wrong fields (e.g., "Company Name" to "First Name")
- **Mitigation**: Negative keywords list, context checking
- **Validation**: Confidence threshold prevents bad matches

### 7. Dynamic Field Context
- **Risk**: Field meaning changes based on previous answers
- **Limitation**: Phase 5 uses static analysis only
- **TODO**: Context-aware mapping deferred to Phase 9

## 🔍 Edge Cases

### Edge Case 1: No Matches Found
- **Scenario**: Form has completely custom labels
- **Handling**: Return empty matches, notify user
- **UI**: "No automatic matches found. Manual fill required."

### Edge Case 2: All Low Confidence
- **Scenario**: All matches below 0.6 threshold
- **Handling**: Present all as suggestions, require user review
- **UI**: Highlight fields in yellow, show confidence scores

### Edge Case 3: Conflicting Matches
- **Scenario**: Two form fields match same profile field
- **Handling**: Choose highest confidence, flag conflict
- **Logging**: Document conflict for future improvement

### Edge Case 4: Missing Profile Data
- **Scenario**: Form expects "Middle Name" but profile has none
- **Handling**: Skip field, don't error
- **Note**: Never fill with empty string unless intentional

### Edge Case 5: Type Mismatch
- **Scenario**: Email field matched to phone number
- **Handling**: Validate field type before matching
- **Validation**: Email to email, phone to tel, etc.

### Edge Case 6: Nested Field Names
- **Scenario**: "Address Line 1", "Address Line 2"
- **Handling**: Match both to address field, split if needed
- **Note**: Address parsing logic in Phase 7

### Edge Case 7: Concatenated Fields
- **Scenario**: "Full Name" field expects firstName + lastName
- **Handling**: Detect and concatenate profile fields
- **Logic**: Pattern recognition for "full", "complete" keywords

### Edge Case 8: Dropdown/Select Fields
- **Scenario**: "Country" dropdown with specific options
- **Handling**: Match profile value to dropdown option
- **Fallback**: If no match, leave empty or select default

## 📁 Files to Create/Modify

### New Files
1. `src/engine/mapper.js` - Main mapping logic
2. `src/engine/rules.js` - Field matching rules and patterns
3. `src/engine/confidence.js` - Confidence scoring algorithms
4. `PHASE_5_DESIGN.md` - Design documentation

### Modified Files
- None (pure engine module, no external dependencies)

## 🏗️ Module Structure

```
src/engine/
├── mapper.js
│   ├── mapProfileToForm(profile, formData)
│   ├── matchField(formField, profileData)
│   ├── findBestMatch(formField, candidates)
│   └── getProfileFieldValue(profile, fieldPath)
│
├── rules.js
│   ├── FIELD_PATTERNS (mapping rules)
│   ├── FIELD_ALIASES (synonyms)
│   ├── NEGATIVE_KEYWORDS (exclusions)
│   └── matchPattern(text, pattern)
│
└── confidence.js
    ├── calculateConfidence(matches)
    ├── scoreLabelMatch(formLabel, profileLabel)
    ├── scoreFuzzyMatch(str1, str2)
    └── normalizeText(text)
```

## 📊 Data Structures

### Field Mapping Rule
```javascript
{
  profilePath: "profile.personal.firstName",
  patterns: ["first name", "first", "fname", "given name"],
  aliases: ["forename", "christian name"],
  negativeKeywords: ["last", "surname", "family"],
  fieldTypes: ["text", "input"],
  weight: 1.0
}
```

### Match Result
```javascript
{
  formFieldId: "firstName",
  formFieldSelector: "#firstName",
  profilePath: "profile.personal.firstName",
  profileValue: "John",
  confidence: 0.85,
  matchedOn: "label", // "label", "placeholder", "name", "aria-label"
  requiresReview: false
}
```

### Mapping Output
```javascript
{
  matches: [
    { formFieldId: "firstName", profilePath: "profile.personal.firstName", confidence: 0.9 },
    { formFieldId: "email", profilePath: "profile.personal.email", confidence: 1.0 }
  ],
  unmatchedFormFields: ["customField1"],
  unmatchedProfileFields: ["profile.personal.middleName"],
  overallConfidence: 0.82,
  requiresReview: false
}
```

## ✅ Validation Checklist

- [ ] Profile fields mapped to form fields
- [ ] Confidence scores calculated correctly
- [ ] High confidence matches auto-approved
- [ ] Low confidence matches flagged
- [ ] Type validation enforced
- [ ] Aliases and synonyms working
- [ ] Negative keywords preventing false positives
- [ ] Performance acceptable (< 1 second)
- [ ] No profile data leaked in logs
- [ ] Edge cases handled gracefully

## 🔐 Security Requirements

1. **No Data Logging**
   - Never log profile values
   - Only log field names and confidence scores
   - Sanitize all debug output

2. **Type Safety**
   - Validate field types before matching
   - Prevent type coercion surprises
   - Email validation, phone format checks

3. **No External Calls**
   - Pure function logic
   - No API requests
   - All processing client-side

## 🛑 Stop Conditions

### Immediate Stop Required If:
1. Matching accuracy < 50% on test forms
2. Performance > 2 seconds per form
3. False positive rate > 20%
4. Type mismatches occur
5. Profile values leaked in console

### Document as TODO If:
1. Multi-language support needed
2. Context-aware matching unclear
3. Multi-value field handling ambiguous
4. Historical learning implementation uncertain

## 🧪 Testing Strategy

### Test Case 1: Perfect Match
```javascript
formField: { label: "First Name", type: "text" }
profile: { personal: { firstName: "John" } }
Expected: confidence = 1.0
```

### Test Case 2: Fuzzy Match
```javascript
formField: { label: "Your First Name", type: "text" }
profile: { personal: { firstName: "John" } }
Expected: confidence >= 0.8
```

### Test Case 3: Synonym Match
```javascript
formField: { label: "Given Name", type: "text" }
profile: { personal: { firstName: "John" } }
Expected: confidence >= 0.7
```

### Test Case 4: Ambiguous Field
```javascript
formField: { label: "Name", type: "text" }
profile: { personal: { firstName: "John", lastName: "Doe" } }
Expected: Multiple candidates, requires review
```

### Test Case 5: Type Mismatch
```javascript
formField: { label: "Email", type: "email" }
profile: { personal: { phone: "123-456-7890" } }
Expected: No match (type validation fails)
```

### Test Case 6: No Match
```javascript
formField: { label: "Favorite Color", type: "text" }
profile: { personal: { ... } }
Expected: unmatchedFormFields includes this field
```

## 📊 Field Mapping Rules (Core Set)

### Personal Information
- **First Name**: patterns: ["first name", "first", "fname", "given name", "forename"]
- **Last Name**: patterns: ["last name", "last", "lname", "surname", "family name"]
- **Full Name**: patterns: ["full name", "name", "complete name"]
- **Email**: patterns: ["email", "email address", "e-mail"]
- **Phone**: patterns: ["phone", "phone number", "mobile", "telephone", "cell"]
- **Address**: patterns: ["address", "street", "address line", "location"]
- **City**: patterns: ["city", "town"]
- **State**: patterns: ["state", "province", "region"]
- **ZIP**: patterns: ["zip", "zip code", "postal code", "postcode"]
- **Country**: patterns: ["country", "nation"]

### Education
- **Degree**: patterns: ["degree", "qualification", "education level"]
- **Major**: patterns: ["major", "field of study", "specialization", "subject"]
- **University**: patterns: ["university", "college", "school", "institution"]
- **GPA**: patterns: ["gpa", "grade point average", "grades"]
- **Graduation Year**: patterns: ["graduation year", "grad year", "year of graduation"]

### Experience
- **Current Role**: patterns: ["current role", "job title", "position", "role"]
- **Company**: patterns: ["company", "employer", "organization", "current company"]
- **Years of Experience**: patterns: ["years of experience", "experience", "years"]
- **Skills**: patterns: ["skills", "technical skills", "expertise"]

### Links
- **LinkedIn**: patterns: ["linkedin", "linkedin url", "linkedin profile"]
- **GitHub**: patterns: ["github", "github url", "github profile"]
- **Portfolio**: patterns: ["portfolio", "portfolio url", "website"]
- **Website**: patterns: ["website", "personal website", "url"]

### Documents
- **Resume**: patterns: ["resume", "cv", "curriculum vitae"], type: "file"

## 🎯 Success Criteria for Phase 5

- [ ] `mapper.js` created with core mapping logic
- [ ] `rules.js` created with field patterns
- [ ] `confidence.js` created with scoring algorithms
- [ ] Profile fields mapped to form fields accurately
- [ ] Confidence scores calculated correctly
- [ ] Threshold logic working (high/medium/low)
- [ ] Type validation enforced
- [ ] Performance acceptable (< 1 second)
- [ ] No false positives from test cases
- [ ] Code is simple and maintainable
- [ ] All global rules followed

## 🔄 Dependencies

### Depends On:
- Phase 3 ✅ (profile structure)
- Phase 4 ✅ (form field metadata)

### Required By:
- Phase 6 (Popup UI - display matches for review)
- Phase 7 (Autofill Executor - use matches to fill)

## 📝 Notes

- This is a pure logic module (no UI, no DOM access)
- Focus on accuracy over speed (but < 1 second)
- Conservative confidence scoring (avoid false positives)
- Return all data needed for user review
- Document any uncertain matches clearly

## 🎯 Out of Scope for Phase 5

- ❌ Multi-language support (Phase 9)
- ❌ Context-aware mapping (Phase 9)
- ❌ Historical learning/ML (Phase 9)
- ❌ Multi-value fields (Phase 9)
- ❌ UI for reviewing matches (Phase 6)
- ❌ Actual form filling (Phase 7)
- ❌ Dropdown option matching (Phase 7)

---

## ⏭️ Next Steps After Planning Approval

1. Move to PHASE 5 - DESIGN
2. Define exact function signatures
3. Design matching algorithms
4. Define confidence scoring formulas
5. Map all field patterns
6. Commit design document
7. Move to PHASE 5 - IMPLEMENTATION

---

**Status**: ⏸️ AWAITING APPROVAL TO PROCEED TO DESIGN PHASE
