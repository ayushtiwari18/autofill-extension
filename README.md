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
 │   │   └── profileStore.js
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

## 📊 Data Storage Schema
```json
{
  "version": "1.0",
  "profile": {
    "personal": {},
    "education": {},
    "links": {},
    "documents": {}
  }
}
```

## 🛡️ Edge Cases Handled
- CAPTCHA detection → disable autofill
- No form detected → user notification
- Multiple forms → user selection UI
- Corrupted encrypted data → reset with warning
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

### 📍 Current Status: PHASE 2 COMPLETE ✅

### Upcoming Phases
- [ ] Phase 3: Profile storage engine
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
- Clicking icon opens popup with "Phase 1 Complete ✓" message
- No console errors in popup or background service worker
- Check console: Right-click extension popup → Inspect → Console

### Clean Build
```bash
# Remove dist folder
npm run clean

# Rebuild
npm run build
```

## 🧪 Testing Phase 2 Encryption Module

To test the encryption utilities in browser console:

```javascript
// Import the module (after building)
import { isWebCryptoAvailable, encrypt, decrypt } from './src/utils/encryption.js';

// Test 1: Feature detection
console.log('Web Crypto available:', isWebCryptoAvailable());

// Test 2: Encrypt and decrypt
const testData = { name: 'John Doe', email: 'test@example.com' };
const password = 'SecurePassword123';

const encrypted = await encrypt(testData, password);
console.log('Encrypted:', encrypted);

const decrypted = await decrypt(encrypted, password);
console.log('Decrypted:', decrypted);

// Test 3: Wrong password (should throw error)
try {
  await decrypt(encrypted, 'WrongPassword');
} catch (error) {
  console.log('Expected error:', error.message);
}
```

## 📄 License
MIT License - Personal use productivity tool

---

**Built with clarity over speed, correctness over cleverness, simplicity over complexity.**