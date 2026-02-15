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

## 📦 Core Components
1. **Popup UI** (React) - Profile management and controls
2. **Background Service Worker** - Event coordination
3. **Content Script** - Form scanning (read-only)
4. **Field Mapping Engine** - Rule-based field matcher
5. **Profile Storage Engine** - Encrypted data persistence
6. **Adapter Layer** - Form-specific handlers (Google Forms, Generic HTML)

## 🎯 Supported Forms
- ✅ Google Forms
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
 │   │   └── serviceWorker.js
 │   ├── content/
 │   │   └── scanner.js
 │   ├── adapters/
 │   │   ├── googleForms.js
 │   │   └── genericForm.js
 │   ├── engine/
 │   │   ├── mapper.js
 │   │   ├── confidence.js
 │   │   └── rules.js
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
- Minimal manifest permissions (storage, activeTab, scripting)
- No inline JavaScript
- No unsafe eval
- No external network calls
- Data never leaves the browser

## 🧠 Field Mapping Strategy
Rule-based matching with confidence scoring:
```
Priority: Label text → Placeholder → aria-label → name attribute
Confidence = labelMatch(0.5) + placeholderMatch(0.3) + historyMatch(0.2)
Threshold: score >= 0.6
```

## 📊 Data Storage Schema (Version 1.0)
```json
{
  "version": "1.0",
  "profile": {
    "personal": {
      "firstName": "",
      "lastName": "",
      "email": "",
      "phone": "",
      "address": "",
      "city": "",
      "state": "",
      "zipCode": "",
      "country": ""
    },
    "education": {
      "degree": "",
      "major": "",
      "university": "",
      "graduationYear": "",
      "gpa": ""
    },
    "experience": {
      "currentRole": "",
      "currentCompany": "",
      "yearsOfExperience": "",
      "skills": []
    },
    "links": {
      "linkedin": "",
      "github": "",
      "portfolio": "",
      "website": ""
    },
    "documents": {
      "resume": null
    }
  },
  "metadata": {
    "createdAt": "",
    "updatedAt": ""
  }
}
```

## 🛡️ Edge Cases Handled
- CAPTCHA detection → disable autofill
- No form detected → user notification
- Multiple forms → user selection UI
- Corrupted encrypted data → reset with warning
- Storage quota exceeded → clear error message
- Pre-filled fields → no override without confirmation
- Missing resume input → skip gracefully
- Dynamic rendering delays → observer pattern

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

### 📍 Current Status: PHASE 3 COMPLETE ✅

### Upcoming Phases
- [ ] Phase 4: Content script scanner
- [ ] Phase 5: Field mapping engine
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

## 📄 License
MIT License - Personal use productivity tool

---

**Built with clarity over speed, correctness over cleverness, simplicity over complexity.**