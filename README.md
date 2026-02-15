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
- **React** for Popup UI
- **JavaScript** (no TypeScript)
- **Web Crypto API** for AES encryption
- **chrome.storage.local** for encrypted data persistence
- **Content Script** for read-only form scanning
- **MutationObserver** for dynamic form detection
- **Rule-based Field Mapper** with confidence scoring

## 📦 Core Components
1. **Popup UI** (React) - Profile management and controls
2. **Background Service Worker** - Event coordination and message handling
3. **Content Script Scanner** - Form detection and metadata extraction
4. **Field Mapping Engine** - Rule-based field matcher with confidence scores
5. **Profile Storage Engine** - Encrypted data persistence
6. **Adapter Layer** - Form-specific handlers (Google Forms, Generic HTML)

## 🎯 Supported Forms
- ✅ Google Forms (iframe detection)
- ✅ Generic HTML forms
- 🔜 LinkedIn (future extensibility)

## 📁 Project Structure
```
/autofill-extension
 ├── public/
 │   ├── index.html
 │   ├── icon16.png
 │   ├── icon48.png
 │   └── icon128.png
 ├── src/
 │   ├── background/
 │   │   └── serviceWorker.js ✅
 │   ├── content/
 │   │   └── scanner.js ✅
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
 │   │   ├── Popup.jsx
 │   │   ├── Review.jsx
 │   │   └── ProfileForm.jsx
 │   ├── utils/
 │   │   ├── encryption.js ✅
 │   │   └── validators.js
 │   └── index.js
 ├── manifest.json
 ├── package.json
 ├── webpack.config.js
 └── README.md
```

## 🔐 Security Features
- AES-GCM encryption for all stored data (256-bit keys)
- PBKDF2 key derivation (100,000 iterations, SHA-256)
- Random salt and IV generation per encryption
- Password never stored (user must enter each session)
- Encrypted profile data in chrome.storage.local
- **Content script never reads field values** (privacy guarantee)
- **Read-only form scanning** (no DOM modification)
- **Profile values never logged** (only field names and scores)
- Minimal manifest permissions (storage, activeTab, scripting)
- No inline JavaScript
- No unsafe eval
- No external network calls
- Data never leaves the browser

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
- **Documents**: resume (file upload)

## 📊 Mapping Output Structure
```json
{
  "matches": [
    {
      "formFieldId": "firstName",
      "formFieldSelector": "#firstName",
      "formFieldLabel": "First Name",
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

## 🛡️ Edge Cases Handled
- CAPTCHA detection → disable autofill
- No form detected → user notification
- Multiple forms → user selection UI
- Hidden forms → automatically excluded
- Dynamic forms → MutationObserver re-scans (max 3)
- Google Forms iframe → detected but content inaccessible
- Ambiguous field names → best match with confidence score
- Type mismatches → validation prevents bad matches
- Empty profile values → skipped automatically
- Negative keywords → prevent false positives
- Array values (skills) → joined with commas
- Corrupted encrypted data → reset with warning
- Storage quota exceeded → clear error message

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

### 📍 Current Status: PHASE 5 COMPLETE ✅

### Upcoming Phases
- [ ] Phase 6: React popup UI (full)
- [ ] Phase 7: Autofill executor
- [ ] Phase 8: Adapter implementations
- [ ] Phase 9: Edge case handling
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
- [ ] Google Forms autofill works correctly
- [ ] Generic HTML forms autofill works
- [ ] Resume upload functional
- [ ] No auto-submit behavior
- [ ] No data leakage
- [ ] No console errors
- [ ] Clean, readable codebase
- [ ] No unnecessary complexity

## 📚 TODO List
_Uncertainties and deferred decisions are tracked here_

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
- Clicking icon opens popup
- No console errors in popup or background service worker
- Check console: Right-click extension popup → Inspect → Console

### Clean Build
```bash
# Remove dist folder
npm run clean

# Rebuild
npm run build
```

## 🧪 Testing Modules

### Phase 2: Encryption Module
```javascript
import { encrypt, decrypt } from './src/utils/encryption.js';

const data = { test: 'data' };
const password = 'SecurePass123';
const encrypted = await encrypt(data, password);
const decrypted = await decrypt(encrypted, password);
console.log(decrypted); // { test: 'data' }
```

### Phase 3: Profile Storage
```javascript
import { initializeProfile, saveProfile, loadProfile } from './src/storage/profileStore.js';

const profile = initializeProfile();
profile.profile.personal.firstName = 'John';
await saveProfile(profile, 'password123');

const loaded = await loadProfile('password123');
console.log(loaded.profile.personal.firstName); // 'John'
```

### Phase 4: Form Scanner
```javascript
// Scanner runs automatically on page load
// Open browser console on any page with forms
// Look for: "[Autofill Scanner] Found X form(s)"

// Check background service worker console:
// chrome://extensions/ → Service Worker → Inspect
// Should see: "Forms scanned on [URL]: X form(s)"
```

### Phase 5: Field Mapper
```javascript
import { mapProfileToForm } from './src/engine/mapper.js';
import { loadProfile } from './src/storage/profileStore.js';

// Load profile
const profile = await loadProfile('password123');

// Get form data from scanner (via background script)
// formData = { url, title, forms: [...] }

// Map profile to form
const mapping = mapProfileToForm(profile, formData);
console.log(`Matched ${mapping.matches.length} fields`);
console.log(`Overall confidence: ${mapping.overallConfidence}`);
```

## 📄 License
MIT License - Personal use productivity tool

---

**Built with clarity over speed, correctness over cleverness, simplicity over complexity.**