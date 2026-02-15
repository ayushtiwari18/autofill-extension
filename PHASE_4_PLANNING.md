# 🟦 PHASE 4 - CONTENT SCRIPT SCANNER (PLANNING)

## 📋 Objective
Build a content script that safely detects and scans job application forms on web pages, extracting form field metadata without modifying the DOM, while handling dynamic content and edge cases.

## 🎯 Expected Output
1. **scanner.js** - Content script for form detection and analysis
2. Detect form elements on page load
3. Extract field metadata (label, placeholder, name, type, etc.)
4. Handle dynamic forms (MutationObserver)
5. Detect CAPTCHA presence
6. Identify form type (Google Forms vs generic HTML)
7. Send form data to background script
8. No DOM modification (read-only scanner)

## ⚠️ Risks Identified

### 1. Content Script Injection Timing
- **Risk**: Script runs before DOM is fully loaded
- **Mitigation**: Use document_end or document_idle in manifest
- **Validation**: Check document.readyState before scanning

### 2. Dynamic Form Rendering
- **Risk**: Forms rendered after initial page load (SPAs, AJAX)
- **Mitigation**: MutationObserver to detect DOM changes
- **Stop Condition**: If observer causes performance issues, document and halt

### 3. Shadow DOM
- **Risk**: Form fields inside shadow roots (Web Components)
- **Decision**: Basic shadow DOM support (single level)
- **Limitation**: Deep nested shadow roots out of scope for Phase 4
- **TODO**: Document shadow DOM limitations

### 4. Multiple Forms on Page
- **Risk**: Multiple forms detected (navigation, search, application)
- **Handling**: Return all forms, let user select which to autofill
- **UI Decision**: Phase 6 will handle form selection UI

### 5. CAPTCHA Detection
- **Risk**: CAPTCHA present, autofill should be disabled
- **Detection**: Check for common CAPTCHA indicators:
  - reCAPTCHA iframe/div
  - hCaptcha elements
  - Keywords: "captcha", "recaptcha", "hcaptcha"
- **Action**: Flag form as having CAPTCHA

### 6. Cross-Origin Iframes
- **Risk**: Forms inside cross-origin iframes (Google Forms)
- **Limitation**: Cannot access cross-origin iframe content
- **Decision**: Detect iframe, flag as Google Forms type
- **Note**: Google Forms adapter will handle iframe interaction (Phase 8)

### 7. Performance Impact
- **Risk**: Scanning large DOMs causes slowdown
- **Mitigation**: Limit scan depth, debounce MutationObserver
- **Stop Condition**: If scan > 500ms, document and optimize

### 8. Privacy and Security
- **Risk**: Scanning could expose sensitive data in console logs
- **Mitigation**: Never log field values, only metadata
- **Validation**: No sensitive data in console or messages

## 🔍 Edge Cases

### Edge Case 1: No Forms Detected
- **Scenario**: Page has no forms or non-standard form structure
- **Handling**: Return empty result, notify user
- **UI Message**: "No forms detected on this page"

### Edge Case 2: Form Without Submit Button
- **Scenario**: Multi-step forms, AJAX submission
- **Handling**: Still scan and provide data
- **Note**: No auto-submit anyway (global rule)

### Edge Case 3: Hidden Forms
- **Scenario**: Forms with display:none or visibility:hidden
- **Handling**: Skip hidden forms (not user-visible)
- **Validation**: Check computed styles

### Edge Case 4: Nested Forms
- **Scenario**: Forms within forms (invalid HTML but exists)
- **Handling**: Treat as separate forms
- **Validation**: Each form scanned independently

### Edge Case 5: Dynamic Field Addition
- **Scenario**: Conditional fields appearing after user interaction
- **Handling**: MutationObserver detects and re-scans
- **Limit**: Re-scan max 3 times to prevent infinite loops

### Edge Case 6: Label-less Fields
- **Scenario**: Input fields without associated labels
- **Handling**: Use placeholder, aria-label, or name attribute
- **Fallback**: Mark as "unknown" field type

### Edge Case 7: Custom Form Elements
- **Scenario**: Div-based inputs, contenteditable, custom components
- **Handling**: Phase 4 detects standard inputs only
- **TODO**: Document custom element limitations

### Edge Case 8: Same-Origin Iframes
- **Scenario**: Form inside same-origin iframe
- **Handling**: Attempt to scan iframe content
- **Validation**: Check iframe accessibility before scan

## 📁 Files to Create/Modify

### New Files
1. `src/content/scanner.js` - Main content script
2. `PHASE_4_DESIGN.md` - Design documentation

### Modified Files
1. `manifest.json` - Add content_scripts configuration
2. `src/background/serviceWorker.js` - Add message handler for scan results

## 🏗️ Module Structure

```
src/content/scanner.js
├── isPageReady()
├── detectForms()
├── scanForm(formElement)
├── extractFieldMetadata(inputElement)
├── detectCaptcha(formElement)
├── identifyFormType(formElement)
├── observeDOMChanges()
└── sendFormDataToBackground(formData)
```

## 📊 Form Data Structure (Output)

```javascript
{
  url: "https://example.com/apply",
  title: "Job Application",
  forms: [
    {
      id: "unique-form-id",
      type: "generic" | "google-forms" | "unknown",
      hasCaptcha: false,
      fields: [
        {
          id: "field-id",
          name: "firstName",
          type: "text",
          label: "First Name",
          placeholder: "Enter your first name",
          ariaLabel: null,
          required: true,
          value: "", // Always empty (never read existing values)
          selector: "#firstName" // CSS selector for targeting
        }
      ],
      action: "/submit",
      method: "POST"
    }
  ],
  scannedAt: "2026-02-15T12:30:00Z"
}
```

## ✅ Validation Checklist

- [ ] Content script injected correctly
- [ ] Forms detected on page load
- [ ] Field metadata extracted completely
- [ ] CAPTCHA detection working
- [ ] Google Forms vs generic HTML differentiation
- [ ] MutationObserver handling dynamic content
- [ ] No DOM modification (read-only)
- [ ] No field values read (privacy)
- [ ] Hidden forms excluded
- [ ] Performance acceptable (< 500ms scan)

## 🔐 Security Requirements

1. **Read-Only Operations**
   - Never modify DOM
   - Never read field values
   - Only extract metadata

2. **Privacy**
   - No logging of field values
   - No logging of user data
   - Only structural information extracted

3. **Minimal Permissions**
   - Use activeTab (user must click extension)
   - No host permissions by default
   - No persistent access

4. **Safe Communication**
   - Use chrome.runtime.sendMessage
   - Validate all data before sending
   - No eval or unsafe operations

## 🛑 Stop Conditions

### Immediate Stop Required If:
1. DOM manipulation occurs unintentionally
2. Field values accidentally logged
3. Performance > 2 seconds per scan
4. MutationObserver causes infinite loops
5. Cross-origin access attempted
6. Security policy violations detected

### Document as TODO If:
1. Shadow DOM handling unclear
2. Custom form element detection uncertain
3. Iframe accessibility ambiguous
4. Performance optimization needed

## 🧪 Testing Strategy (for this phase)

### Manual Testing Required:
1. Test on simple HTML form
2. Test on Google Forms
3. Test on dynamic form (add fields after load)
4. Test on page with CAPTCHA
5. Test on page with multiple forms
6. Test on page with no forms
7. Test on page with hidden forms
8. Measure scan performance

### Test Pages:
- Simple HTML form: Create test.html
- Google Forms: Real Google Form
- Dynamic: React/Vue form
- CAPTCHA: Page with reCAPTCHA

### Performance Testing:
1. Measure time from injection to scan complete
2. Ensure < 500ms on typical forms
3. Monitor MutationObserver overhead

## 🎯 Field Types to Detect

### Input Types:
- text
- email
- tel (phone)
- url
- number
- date
- file (resume upload)
- textarea
- select (dropdown)
- radio
- checkbox

### Field Identification:
- Labels (associated via for attribute)
- Placeholders
- aria-label / aria-labelledby
- name attribute
- id attribute

## 📏 Scope Limitations for Phase 4

### In Scope:
- ✅ Standard HTML forms
- ✅ Basic Google Forms detection (iframe)
- ✅ Dynamic form detection (MutationObserver)
- ✅ CAPTCHA detection
- ✅ Multiple form handling
- ✅ Standard input types

### Out of Scope:
- ❌ Deep shadow DOM traversal (defer to Phase 9)
- ❌ Custom form components (defer to Phase 9)
- ❌ Form filling logic (Phase 7)
- ❌ Google Forms iframe interaction (Phase 8)
- ❌ Field mapping logic (Phase 5)
- ❌ UI for form selection (Phase 6)

## 📊 Success Criteria for Phase 4

- [ ] `scanner.js` created with all functions
- [ ] Forms detected on page load
- [ ] Field metadata extracted accurately
- [ ] CAPTCHA detection working
- [ ] Dynamic forms handled (MutationObserver)
- [ ] No DOM modification
- [ ] No privacy leaks
- [ ] Performance acceptable
- [ ] Code is simple and readable
- [ ] All global rules followed

## 🔄 Dependencies

### Depends On:
- Phase 1 ✅ (project structure)
- Manifest configuration

### Required By:
- Phase 5 (Field Mapping Engine - will use scanner output)
- Phase 7 (Autofill Executor - needs field selectors)
- Phase 8 (Adapter implementations)

## 📝 Notes

- This is a pure detection/scanning module
- No autofill logic in this phase
- Focus on accurate form detection
- Keep scanner lightweight and fast
- Communicate with background script via messages

## 🎯 Out of Scope for Phase 4

- ❌ Field value filling (Phase 7)
- ❌ Field type inference/mapping (Phase 5)
- ❌ User confirmation UI (Phase 6)
- ❌ Google Forms iframe manipulation (Phase 8)
- ❌ Form submission (never - global rule)

---

## ⏭️ Next Steps After Planning Approval

1. Move to PHASE 4 - DESIGN
2. Define exact function signatures
3. Define message protocol with background script
4. Define data structures
5. Design MutationObserver strategy
6. Commit design document
7. Move to PHASE 4 - IMPLEMENTATION

---

**Status**: ⏸️ AWAITING APPROVAL TO PROCEED TO DESIGN PHASE
