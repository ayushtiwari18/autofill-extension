# 🟦 PHASE 7 - AUTOFILL EXECUTOR (PLANNING)

## 📋 Objective
Implement the autofill execution logic in the content script that receives matched field data from the popup and programmatically fills form fields with proper event handling and validation.

## 🎯 Expected Output
1. Content script AUTOFILL message handler
2. Field filling logic for all input types
3. File upload handling (resume)
4. Event triggering (change, input, blur)
5. Error handling and validation
6. Success/failure reporting back to popup
7. No auto-submit (user must submit manually)
8. Privacy guarantees maintained

## 📐 Core Requirements

### 1. Supported Field Types
- `text` - Text inputs (name, address, etc.)
- `email` - Email inputs
- `tel` - Phone number inputs
- `number` - Numeric inputs (year, experience)
- `url` - URL inputs (LinkedIn, GitHub)
- `textarea` - Multi-line text (skills)
- `file` - File upload (resume) - **SPECIAL HANDLING**
- `select` - Dropdowns (future)
- `radio` - Radio buttons (future)
- `checkbox` - Checkboxes (future)

### 2. Field Selection Strategy
Use selector priority:
1. ID selector (`#firstName`)
2. Name selector (`[name="firstName"]`)
3. CSS selector (from scanner)

### 3. Value Setting Process
```javascript
1. Find element by selector
2. Check if element is visible and enabled
3. Set value programmatically
4. Trigger events (input, change, blur)
5. Validate value was set
6. Log success/failure
```

### 4. Event Triggering
Many modern forms use JavaScript validation that relies on events:
- `input` event - Fired during typing
- `change` event - Fired when value changes
- `blur` event - Fired when field loses focus

**All three events must be triggered** for maximum compatibility.

## ⚠️ Risks Identified

### 1. File Upload Limitations
- **Risk**: Chrome extensions cannot programmatically set `<input type="file">` values for security reasons
- **Mitigation**: Detect file inputs, skip them, notify user they must upload manually
- **Stop Condition**: If file upload is required for autofill to be useful

### 2. Shadow DOM Forms
- **Risk**: Some forms use Shadow DOM (not accessible from content script)
- **Mitigation**: Attempt to access shadow roots, skip if inaccessible
- **Limitation**: Google Forms use iframes (already detected in Phase 4)

### 3. Dynamic Form Validation
- **Risk**: Forms may have custom validation that prevents programmatic filling
- **Mitigation**: Trigger all standard events, log failures
- **Fallback**: User can manually fill failed fields

### 4. Race Conditions
- **Risk**: Page JavaScript may modify fields after we set them
- **Mitigation**: Wait for page to be fully loaded, delay if needed
- **Stop Condition**: If frequent overwrites detected

### 5. Visibility Checks
- **Risk**: Hidden fields should not be filled
- **Mitigation**: Check `offsetWidth`, `offsetHeight`, computed style
- **Edge Case**: Fields hidden then shown by JavaScript

### 6. Read-only and Disabled Fields
- **Risk**: Attempting to fill disabled/readonly fields
- **Mitigation**: Check `disabled` and `readOnly` attributes before filling
- **Skip**: Log and skip these fields

### 7. Type Mismatches
- **Risk**: Setting wrong value type (e.g., string in number input)
- **Mitigation**: Type validation before setting (already in Phase 5)
- **Fallback**: Skip on validation error

## 🔍 Edge Cases

### Edge Case 1: Field Not Found
- **Scenario**: Selector doesn't match any element
- **Handling**: Log warning, skip field, continue with others
- **Report**: Include in failure list sent to popup

### Edge Case 2: Field Disabled or Hidden
- **Scenario**: Field exists but is disabled or hidden
- **Handling**: Skip field, log reason
- **Report**: Not counted as error

### Edge Case 3: Value Setting Fails
- **Scenario**: Value set but element.value returns different value
- **Handling**: Retry once, then skip
- **Report**: Include in failure list

### Edge Case 4: Multiple Matching Elements
- **Scenario**: Selector matches multiple elements
- **Handling**: Fill first visible element only
- **Log**: Warning about multiple matches

### Edge Case 5: File Upload Field
- **Scenario**: Field type is "file"
- **Handling**: Skip with notification
- **Message**: "Resume upload must be done manually"

### Edge Case 6: Page Navigation During Fill
- **Scenario**: User navigates away while autofill in progress
- **Handling**: Stop execution immediately
- **Cleanup**: No cleanup needed (just stop)

### Edge Case 7: Iframe Forms
- **Scenario**: Form is inside an iframe
- **Handling**: Scanner already detects and skips (Phase 4)
- **Report**: No action taken by executor

## 📊 Execution Flow

```
1. Popup sends AUTOFILL message with matches array
   ↓
2. Content script receives message
   ↓
3. Validate matches array
   ↓
4. For each match:
   a. Find element by selector
   b. Check visibility and enabled state
   c. Validate field type
   d. Set value
   e. Trigger events (input, change, blur)
   f. Verify value was set
   g. Record success/failure
   ↓
5. Collect results:
   - successCount: number of fields filled
   - failedFields: array of failed field details
   - skippedFields: array of skipped field details
   ↓
6. Send response to popup:
   - success: boolean
   - message: string
   - details: { successCount, failedFields, skippedFields }
   ↓
7. Popup displays success/failure notification
```

## 🛡️ Privacy Guarantees

1. **Only fill fields in matches array** - No exploration of other fields
2. **No reading of existing values** - Only writing
3. **No form submission** - User must click submit
4. **No CAPTCHA bypass attempts** - Skip forms with CAPTCHA
5. **No network requests** - All operations local
6. **No logging of filled values** - Only field names and success/failure

## 📁 Files to Create/Modify

### New Files
1. `src/content/executor.js` - Main autofill executor
2. `PHASE_7_DESIGN.md` - Design documentation

### Modified Files
- `src/content/scanner.js` - Add AUTOFILL message handler
- `src/ui/Review.jsx` - Handle executor response
- `manifest.json` - Ensure content script has necessary permissions

## 🔧 Implementation Strategy

### Module Structure
```javascript
// executor.js
export const fillField = (element, value, fieldType) => {
  // Fill single field with event triggering
};

export const findElement = (selector) => {
  // Find element with fallback selectors
};

export const isElementFillable = (element) => {
  // Check if element can be filled
};

export const triggerEvents = (element) => {
  // Trigger input, change, blur events
};

export const executeAutofill = (matches) => {
  // Main autofill orchestration
};
```

## 📝 Detailed Function Specifications

### Function 1: `findElement(match)`
**Purpose**: Locate form field element using selector

**Input**:
```javascript
{
  formFieldSelector: "#firstName",
  formFieldId: "firstName",
  formFieldLabel: "First Name"
}
```

**Logic**:
1. Try CSS selector first
2. Fallback to ID selector
3. Fallback to name attribute
4. Return null if not found

**Output**: `HTMLElement | null`

### Function 2: `isElementFillable(element)`
**Purpose**: Check if element can and should be filled

**Checks**:
- Element exists
- Element is visible (offsetWidth > 0, offsetHeight > 0)
- Element is not disabled
- Element is not readonly
- Element type is supported

**Output**: `{ fillable: boolean, reason: string }`

### Function 3: `fillField(element, value, fieldType)`
**Purpose**: Set field value and trigger events

**Logic**:
```javascript
1. Validate value format matches fieldType
2. Set element.value = value
3. For select elements: set selectedIndex
4. Trigger input event
5. Trigger change event
6. Trigger blur event
7. Verify value was set
8. Return success/failure
```

**Output**: `{ success: boolean, error: string | null }`

### Function 4: `triggerEvents(element)`
**Purpose**: Trigger all necessary DOM events

**Events**:
```javascript
// Input event (for live validation)
const inputEvent = new Event('input', { bubbles: true });
element.dispatchEvent(inputEvent);

// Change event (for form state)
const changeEvent = new Event('change', { bubbles: true });
element.dispatchEvent(changeEvent);

// Blur event (for on-exit validation)
const blurEvent = new Event('blur', { bubbles: true });
element.dispatchEvent(blurEvent);
```

### Function 5: `executeAutofill(matches)`
**Purpose**: Main orchestration function

**Steps**:
1. Validate matches array
2. Initialize results tracking
3. Iterate through matches
4. Call findElement, isElementFillable, fillField for each
5. Collect results
6. Return summary

**Output**:
```javascript
{
  success: boolean,
  successCount: number,
  failedFields: [
    { label: "Field Name", reason: "Not found" }
  ],
  skippedFields: [
    { label: "Resume", reason: "File upload not supported" }
  ]
}
```

## 🧪 Testing Strategy

### Manual Tests

**Test 1: Basic Text Fields**
1. Create HTML page with text inputs
2. Scan page
3. Trigger autofill
4. Verify all text fields filled
5. Check browser console for events

**Test 2: Different Input Types**
1. Create form with email, tel, number, url
2. Trigger autofill
3. Verify all types filled correctly
4. Check validation not triggered

**Test 3: Hidden Fields**
1. Create form with display:none field
2. Trigger autofill
3. Verify hidden field skipped
4. Verify visible fields filled

**Test 4: Disabled Fields**
1. Create form with disabled input
2. Trigger autofill
3. Verify disabled field skipped

**Test 5: File Upload**
1. Create form with file input
2. Trigger autofill
3. Verify file input skipped
4. Verify notification sent to user

**Test 6: Error Handling**
1. Create form with invalid selector
2. Trigger autofill
3. Verify graceful skip
4. Verify other fields still filled

**Test 7: Event Triggering**
1. Create form with JavaScript validation on blur
2. Trigger autofill
3. Verify validation fires
4. Verify no validation errors

## ✅ Success Criteria for Phase 7

- [ ] Autofill executor implemented
- [ ] All supported field types can be filled
- [ ] Events properly triggered
- [ ] File uploads gracefully skipped
- [ ] Hidden/disabled fields skipped
- [ ] Success/failure reported to popup
- [ ] No auto-submit behavior
- [ ] No reading of existing values
- [ ] No console errors during fill
- [ ] Clean, readable code
- [ ] All global rules followed

## 🔄 Dependencies

### Depends On:
- Phase 4 ✅ (Content script structure)
- Phase 5 ✅ (Match format)
- Phase 6 ✅ (Popup UI triggers autofill)

### Required By:
- Phase 8 (Adapter implementations)

## 📋 Out of Scope for Phase 7

- ❌ Auto-submit functionality
- ❌ CAPTCHA solving
- ❌ File upload automation (impossible)
- ❌ Select/radio/checkbox (Phase 8)
- ❌ Multi-page forms
- ❌ Form-specific adapters (Phase 8)

## 🎯 File Upload Limitation Notice

**IMPORTANT**: Due to browser security restrictions, Chrome extensions **cannot programmatically set file input values**. This is by design to prevent malicious extensions from uploading arbitrary files.

**Workarounds Considered**:
1. ❌ DataTransfer API - Still blocked by security
2. ❌ Simulate click + dialog - Cannot control file dialog
3. ❌ Blob injection - Blocked by browser

**Accepted Solution**:
- Detect file inputs in matches
- Skip them during autofill
- Display notification: "Resume must be uploaded manually"
- Continue filling other fields

**User Experience**:
1. User clicks "Confirm & Autofill"
2. All text fields fill automatically
3. Notification: "23 of 24 fields filled. Resume must be uploaded manually."
4. User clicks file input and uploads resume
5. User submits form

---

## ⏭️ Next Steps After Planning Approval

1. Move to PHASE 7 - DESIGN
2. Define exact executor module structure
3. Specify message protocol
4. Design error handling strategy
5. Commit design document
6. Move to PHASE 7 - IMPLEMENTATION

---

**Status**: ⏸️ AWAITING APPROVAL TO PROCEED TO DESIGN PHASE
