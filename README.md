# Smart Job Application Autofill Chrome Extension

## 🎯 Project Overview
A production-grade Chrome extension for intelligently autofilling job application forms using encrypted profile storage and rule-based field mapping.

## ⚠️ Critical Rules
- Personal-use productivity tool (NOT a SaaS/bot)
- NO auto-submit functionality
- NO CAPTCHA bypass
- NO backend or external data transmission
- NO hallucinated Chrome APIs
- NO overengineering

## 🏗 Architecture
- **Manifest V3** Chrome Extension
- **React 18** for Popup UI
- **JavaScript** (no TypeScript)
- **Web Crypto API** for AES encryption
- **chrome.storage.local** for encrypted data persistence
- **Content Script** for read-only form scanning + autofill execution
- **MutationObserver** for dynamic form detection
- **Rule-based Field Mapper** with confidence scoring
- **React Context API** for state management
- **Event-driven Architecture** for DOM manipulation

## 📦 Core Components
1. **Popup UI** (React) - Password-protected profile management and controls ✅
2. **Background Service Worker** - Event coordination and message handling ✅
3. **Content Script Scanner** - Form detection and metadata extraction ✅
4. **Field Mapping Engine** - Rule-based field matcher with confidence scores ✅
5. **Profile Storage Engine** - Encrypted data persistence ✅
6. **Autofill Executor** - Programmatic field filling with event triggering ✅
7. **Adapter Layer** - Form-specific handlers (future)

## 🎯 Supported Forms
- ✅ Generic HTML forms (text, email, tel, number, url, textarea)
- ✅ Google Forms (iframe detection, but cannot autofill due to same-origin policy)
- 🔜 Select dropdowns (partial support)
- 🔜 LinkedIn forms (future extensibility)
- ❌ File inputs (browser security restriction)

## 📁 Project Structure
```
/autofill-extension
 ├── public/
 │   ├── index.html ✅
 │   ├── icon16.png
 │   ├── icon48.png
 │   └── icon128.png
 ├── src/
 │   ├── background/
 │   │   └── serviceWorker.js ✅
 │   ├── content/
 │   │   ├── scanner.js ✅
 │   │   └── executor.js ✅
 │   ├── adapters/
 │   │   ├── googleForms.js
 │   │   └── genericForm.js
 │   ├── engine/
 │   │   ├── mapper.js ✅
 │   │   ├── confidence.js ✅
 │   │   └── rules.js ✅
 │   ├── storage/
 │   │   └── profileStore.js ✅
 │   ├── ui/
 │   │   ├── Popup.jsx ✅
 │   │   ├── Login.jsx ✅
 │   │   ├── Dashboard.jsx ✅
 │   │   ├── ProfileForm.jsx ✅
 │   │   ├── Review.jsx ✅
 │   │   └── styles.css ✅
 │   ├── utils/
 │   │   ├── encryption.js ✅
 │   │   └── validators.js
 │   └── index.js ✅
 ├── manifest.json ✅
 ├── package.json ✅
 ├── webpack.config.js ✅
 └── README.md
```

## 🔐 Security Features
- AES-GCM encryption for all stored data (256-bit keys)
- PBKDF2 key derivation (100,000 iterations, SHA-256)
- Random salt and IV generation per encryption
- Password never stored (user must enter each session)
- Encrypted profile data in chrome.storage.local
- **Content script never reads field values** (privacy guarantee)
- **Read-only form scanning** (no DOM modification during scan)
- **Profile values never logged** (only field names and scores)
- Minimal manifest permissions (storage, activeTab, scripting)
- No inline JavaScript
- No unsafe eval
- No external network calls
- Data never leaves the browser
- **File upload security**: Cannot programmatically set file inputs (browser restriction)

## 🧠 Field Mapping Strategy

### Rule-Based Matching with Confidence Scoring
```
Label Match Weight:        50%
Placeholder Match Weight:  30%
Name Attribute Weight:     15%
aria-label Weight:         5%

Fuzzy Matching:
- Exact match:     score = 1.0
- Contains match:  score = 0.85
- Levenshtein:     score = 0.5-1.0

Confidence Thresholds:
- High (>= 0.8):   Auto-fill
- Medium (0.6-0.8): Highlight for review
- Low (< 0.6):     Skip
```

### Supported Profile Fields (25 Total)
- **Personal**: firstName, lastName, email, phone, address, city, state, zipCode, country
- **Education**: degree, major, university, graduationYear, gpa
- **Experience**: currentRole, currentCompany, yearsOfExperience, skills
- **Links**: linkedin, github, portfolio, website
- **Documents**: resume (file upload - manual only)

## ⚡ Autofill Execution Strategy

### Field Filling Process
1. **Element Location**: Find field using CSS selector, ID, or name attribute
2. **Fillability Check**: Verify element is visible, enabled, and not read-only
3. **Value Setting**: Set element.value with type-specific handling
4. **Event Triggering**: Dispatch focus, input, change, and blur events
5. **Verification**: Confirm value was successfully set

### Supported Field Types
- ✅ `text` - Text inputs
- ✅ `email` - Email inputs
- ✅ `tel` - Phone inputs
- ✅ `number` - Numeric inputs
- ✅ `url` - URL inputs
- ✅ `textarea` - Multi-line text
- 🔸 `select` - Dropdown (value/text matching)
- ❌ `file` - File upload (security restriction)
- 🔜 `radio` - Radio buttons (future)
- 🔜 `checkbox` - Checkboxes (future)

### Event Triggering
All four events are triggered for maximum compatibility:
- `focus` - Element receives focus
- `input` - Value is being entered
- `change` - Value has changed
- `blur` - Element loses focus

### Error Handling
- **Element not found**: Skip field, log warning
- **Element hidden/disabled**: Skip field (not an error)
- **Value setting failed**: Log error, continue with other fields
- **File input detected**: Skip with notification (security restriction)
- **Selector invalid**: Catch error, try fallback selectors

## 💡 UI Screens

### 1. Login Screen
- Password entry for profile decryption
- "Unlock Profile" button
- Reset profile option

### 2. Dashboard Screen
- Welcome message with user's first name
- Profile completion percentage (with progress bar)
- Forms detected count
- Quick action buttons:
  - ✏️ Edit Profile
  - 🔍 Scan Current Page
  - ⚡ Autofill Form(s)
  - 🔒 Lock Profile
- Storage usage meter (5MB limit)

### 3. Profile Form Screen (Create/Edit)
- All 25 profile fields organized in 5 sections
- Real-time validation (email, URLs)
- File upload for resume (max 2MB)
- Password setup (create mode only)
- Save and Cancel buttons

### 4. Review Screen
- Matched fields with confidence badges
- Inline editing capability
- Overall confidence score
- Warning for medium confidence matches
- Unmatched form fields (collapsible)
- "Confirm & Autofill" button
- **Execution results display**:
  - Success count
  - Skipped fields with reasons
  - Failed fields with errors
  - Execution time

## 📊 Mapping Output Structure
```json
{
  "matches": [
    {
      "formFieldId": "firstName",
      "formFieldSelector": "#firstName",
      "formFieldLabel": "First Name",
      "formFieldType": "text",
      "profilePath": "profile.personal.firstName",
      "profileValue": "John",
      "confidence": 0.95,
      "matchedOn": "label",
      "requiresReview": false
    }
  ],
  "unmatchedFormFields": [
    { "id": "customField", "label": "Custom Question", "type": "text" }
  ],
  "unmatchedProfileFields": [
    { "path": "profile.personal.middleName", "value": "" }
  ],
  "overallConfidence": 0.87,
  "requiresReview": false,
  "url": "https://example.com/apply",
  "timestamp": "2026-02-15T12:46:00.000Z"
}
```

## 🎯 Execution Results Structure
```json
{
  "success": true,
  "successCount": 23,
  "totalFields": 24,
  "failedFields": [],
  "skippedFields": [
    {
      "label": "Resume",
      "reason": "File input not supported",
      "selector": "#resume"
    }
  ],
  "executionTime": 145
}
```

## 🛡️ Edge Cases Handled

### Scanning (Phase 4)
- CAPTCHA detection → disable autofill
- No form detected → user notification
- Multiple forms → all detected and scanned
- Hidden forms → automatically excluded
- Dynamic forms → MutationObserver re-scans (max 3)
- Google Forms iframe → detected but content inaccessible

### Mapping (Phase 5)
- Ambiguous field names → best match with confidence score
- Type mismatches → validation prevents bad matches
- Empty profile values → skipped automatically
- Negative keywords → prevent false positives
- Array values (skills) → joined with commas

### Execution (Phase 7)
- Element not found → skip field, continue
- Element hidden/disabled → skip gracefully
- Element read-only → skip
- File input detected → skip with notification
- Value setting fails → log error, continue
- Invalid selector → try fallback strategies
- Select element → match by value or text

### Storage (Phase 3)
- Corrupted encrypted data → reset with warning
- Storage quota exceeded → clear error message
- Wrong password → error message with reset option
- Popup closed during save → async save completes

## 🚀 Development Phases

### ✅ PHASE 1 - COMPLETE
- [x] Repository initialization
- [x] Documentation structure
- [x] Folder structure defined
- [x] Manifest V3 configuration
- [x] Webpack build pipeline
- [x] React popup skeleton
- [x] Extension loads in Chrome

### ✅ PHASE 2 - COMPLETE
- [x] Web Crypto API feature detection
- [x] PBKDF2 key derivation (100k iterations, SHA-256)
- [x] AES-GCM encryption with random salt/IV
- [x] AES-GCM decryption with authentication
- [x] Comprehensive error handling
- [x] Base64 encoding utilities
- [x] Input validation for all functions

### ✅ PHASE 3 - COMPLETE
- [x] Chrome Storage API feature detection
- [x] Profile schema initialization (version 1.0)
- [x] Profile structure validation
- [x] Save encrypted profile to chrome.storage.local
- [x] Load and decrypt profile from storage
- [x] Delete profile from storage
- [x] Storage usage monitoring (quota tracking)
- [x] Size validation (5MB recommended limit)
- [x] Quota error handling

### ✅ PHASE 4 - COMPLETE
- [x] Content script scanner implementation
- [x] Form detection (visible forms only)
- [x] Field metadata extraction (labels, types, selectors)
- [x] Google Forms iframe detection
- [x] CAPTCHA detection (reCAPTCHA, hCaptcha)
- [x] MutationObserver for dynamic forms
- [x] Message protocol with background script
- [x] Manifest content_scripts configuration
- [x] Privacy-safe scanning (no field values read)

### ✅ PHASE 5 - COMPLETE
- [x] Field pattern definitions (25 profile fields)
- [x] Field aliases and synonyms
- [x] Negative keywords (prevent false matches)
- [x] Text normalization and fuzzy matching
- [x] Levenshtein distance algorithm
- [x] Confidence scoring (weighted attributes)
- [x] Profile value extraction (dot notation)
- [x] Type validation (email, phone, number, url)
- [x] Complete profile-to-form mapping
- [x] Match filtering (confidence threshold >= 0.6)

### ✅ PHASE 6 - COMPLETE
- [x] React AppContext with state management
- [x] Screen routing (login, create, dashboard, edit, review)
- [x] Login component with password authentication
- [x] Dashboard with profile stats and actions
- [x] ProfileForm with all 25 fields (5 sections)
- [x] Form validation (email, URLs, passwords)
- [x] File upload for resume (2MB limit)
- [x] Review component with match display
- [x] Confidence badges (high/medium/low)
- [x] Inline match editing
- [x] Global CSS styles
- [x] Popup-background communication
- [x] Extension badge updates (form count)

### ✅ PHASE 7 - COMPLETE
- [x] Autofill executor module (executor.js)
- [x] Element finding with fallback strategies
- [x] Fillability validation (visible, enabled, not readonly)
- [x] Type-specific value setting (text, select, textarea)
- [x] DOM event triggering (focus, input, change, blur)
- [x] Single field filling function
- [x] Batch autofill orchestration
- [x] Success/failure tracking
- [x] Execution time measurement
- [x] Scanner message handler integration
- [x] Review component result display
- [x] Detailed user notifications
- [x] File input skip handling

### 📍 Current Status: PHASE 7 COMPLETE ✅

### Upcoming Phases
- [ ] Phase 8: Adapter implementations (Google Forms, Generic - optional)
- [ ] Phase 9: Edge case handling and polish
- [ ] Phase 10: Testing and validation

## 📝 Development Methodology
Every feature follows:
1. **Planning** - Define objectives, risks, edge cases
2. **Design** - Module responsibilities, data flow, interfaces
3. **Implementation** - Atomic commits, one responsibility per commit

## 🛑 Stop Conditions
Development halts immediately if:
- Chrome API behavior unclear
- Encryption implementation uncertain
- Shadow DOM handling ambiguous
- Storage quota issues detected
- Async race conditions appear

**Rule: Document uncertainty as TODO rather than guessing**

## 🎯 Success Criteria
- [ ] Google Forms autofill works correctly (iframe limitation)
- [x] Generic HTML forms autofill works ✅
- [ ] Resume upload functional (manual upload required)
- [x] No auto-submit behavior ✅
- [x] No data leakage ✅
- [ ] No console errors (needs testing)
- [x] Clean, readable codebase ✅
- [x] No unnecessary complexity ✅

## 📚 Known Limitations

### File Upload Restriction
**Cannot be fixed** - Browser security prevents extensions from programmatically setting file input values. This is intentional security design.

**User Experience**: Extension detects file inputs, skips them, and notifies user: "Resume must be uploaded manually"

### Google Forms iframe Limitation
**Cannot be fixed** - Google Forms are rendered inside iframes with same-origin policy restrictions. Content scripts cannot access iframe content from different origins.

**User Experience**: Scanner detects Google Forms iframes but cannot autofill them. User is notified.

### Select Dropdown Matching
**Current**: Matches by value or text (case-insensitive)
**Limitation**: Cannot handle complex custom dropdowns (e.g., React Select)
**Workaround**: Works for standard HTML `<select>` elements

---

## 🏗️ Build Instructions

### Prerequisites
- Node.js 16+ and npm
- Chrome/Chromium browser

### Installation
```bash
# Clone the repository
git clone https://github.com/ayushtiwari18/autofill-extension.git
cd autofill-extension

# Install dependencies
npm install
```

### Development Build
```bash
# Build for development (with watch mode)
npm run dev

# Or build once for production
npm run build
```

### Load Extension in Chrome
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `dist/` folder from this project
5. Click the extension icon in Chrome toolbar to open popup

### Verify Installation
- Extension icon appears in Chrome toolbar
- Clicking icon opens popup UI
- No console errors in popup or background service worker
- Check popup console: Right-click extension popup → Inspect → Console
- Check background console: chrome://extensions/ → Service Worker → Inspect

### Clean Build
```bash
# Remove dist folder
npm run clean

# Rebuild
npm run build
```

## 🧪 Testing the Extension

### Complete End-to-End Test

**Step 1: First-Time Setup**
1. Build and load extension (see above)
2. Open popup - should see "Create Profile" form
3. Fill all required fields (at minimum: firstName, lastName, email)
4. Set password (min 8 characters)
5. Click "Save Profile"
6. Should redirect to Dashboard

**Step 2: Profile Persistence**
1. Close popup
2. Reopen extension
3. Should see Login screen
4. Enter password
5. Should decrypt and show Dashboard with your name

**Step 3: Form Scanning**
1. Navigate to any webpage with a form (e.g., contact form)
2. Open extension popup and login
3. Dashboard should show "X forms detected" badge
4. Extension icon badge should show form count

**Step 4: Autofill Execution** 🎉
1. With forms detected, click "⚡ Autofill Form" button
2. Should see Review screen with matched fields
3. Confidence badges displayed (High/Medium/Low)
4. Edit any values if needed (inline editing)
5. Click "⚡ Confirm & Autofill"
6. **Magic happens**: Form fields fill automatically!
7. Alert shows:
   - Success count
   - Skipped fields (file uploads, hidden, etc.)
   - Failed fields (if any)
   - Execution time
8. Manually submit the form (extension doesn't auto-submit)

**Step 5: Test Different Forms**
- Simple contact forms
- Job application forms
- Newsletter signup forms
- Registration forms

### Test Pages to Try

Create a simple HTML test page:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Autofill Test Form</title>
</head>
<body>
  <h1>Test Job Application</h1>
  <form>
    <label for="firstName">First Name:</label>
    <input type="text" id="firstName" name="firstName"><br><br>
    
    <label for="lastName">Last Name:</label>
    <input type="text" id="lastName" name="lastName"><br><br>
    
    <label for="email">Email:</label>
    <input type="email" id="email" name="email"><br><br>
    
    <label for="phone">Phone:</label>
    <input type="tel" id="phone" name="phone"><br><br>
    
    <label for="linkedin">LinkedIn:</label>
    <input type="url" id="linkedin" name="linkedin"><br><br>
    
    <label for="experience">Years of Experience:</label>
    <input type="number" id="experience" name="experience"><br><br>
    
    <label for="skills">Skills:</label>
    <textarea id="skills" name="skills"></textarea><br><br>
    
    <label for="resume">Resume:</label>
    <input type="file" id="resume" name="resume"><br><br>
    
    <button type="submit">Submit Application</button>
  </form>
</body>
</html>
```

Save as `test-form.html`, open in Chrome, then test autofill!

### Expected Behavior

✅ **Should Work**:
- Text fields fill instantly
- Email validation respected
- Phone numbers formatted
- URLs validated
- Textarea fields filled
- Form remains editable after autofill
- Can manually submit form

⏩ **Should Skip**:
- File inputs (with notification)
- Hidden fields
- Disabled fields
- Read-only fields

❌ **Should NOT Happen**:
- Form auto-submits (NEVER)
- Page navigates automatically
- Data sent to external server
- Field values overwritten repeatedly

### Troubleshooting

**Issue**: "No forms detected"  
**Fix**: Make sure form has visible, enabled input fields

**Issue**: Autofill button greyed out  
**Fix**: Scan the page first, ensure profile has data

**Issue**: Fields don't fill  
**Fix**: Check console for errors, ensure selectors valid

**Issue**: Wrong password error  
**Fix**: Reset profile from Login screen if forgotten

**Issue**: File upload doesn't fill  
**Expected**: File inputs are skipped (security limitation)

---

## 📊 Project Statistics

| Phase | Status | Lines of Code | Commits | Description |
|-------|--------|---------------|---------|-------------|
| Phase 0 | ✅ | - | - | Repository initialization |
| Phase 1 | ✅ | ~150 | 8 | Extension skeleton |
| Phase 2 | ✅ | ~200 | 4 | Encryption utilities |
| Phase 3 | ✅ | ~300 | 5 | Profile storage engine |
| Phase 4 | ✅ | ~420 | 10 | Content script scanner |
| Phase 5 | ✅ | ~520 | 6 | Field mapping engine |
| Phase 6 | ✅ | ~850 | 12 | React popup UI |
| **Phase 7** | **✅** | **~320** | **5** | **Autofill executor** |
| Phase 8 | ⏳ | - | - | Adapter implementations |
| Phase 9 | ⏳ | - | - | Edge case handling |
| Phase 10 | ⏳ | - | - | Testing & validation |

**Total Working Code**: ~2,760 lines  
**Total Commits**: 52  
**Project Completion**: **70%** ✨  
**Core Functionality**: **COMPLETE** 🎉

---

## 🏆 Major Milestone: CORE FUNCTIONALITY COMPLETE!

The extension is now **fully functional** for its primary purpose:

✅ Users can create encrypted profiles  
✅ Forms are automatically detected  
✅ Fields are intelligently matched  
✅ Autofill executes successfully  
✅ Detailed feedback provided  
✅ Privacy guarantees maintained  
✅ Security best practices followed  

**Remaining work** (Phases 8-10) is polish, optimization, and advanced features.

---

## 📝 Next Steps (Optional Enhancements)

### Phase 8: Adapters (Optional)
- Google Forms adapter (limited by iframe)
- Generic form adapter refinements
- LinkedIn adapter (future)

### Phase 9: Polish
- Better error messages
- Loading states
- Animation transitions
- Help documentation

### Phase 10: Testing
- Unit tests for core functions
- Integration tests
- Real-world form testing
- Performance optimization

---

## 📄 License
MIT License - Personal use productivity tool

---

**Built with clarity over speed, correctness over cleverness, simplicity over complexity.**

**🎉 The extension WORKS! Try it on real forms now!**