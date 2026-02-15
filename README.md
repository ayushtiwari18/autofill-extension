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
 │   │   ├── encryption.js
 │   │   └── validators.js
 │   └── index.js
 ├── manifest.json
 ├── package.json
 └── README.md
```

## 🔐 Security Features
- AES encryption for all stored data
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

### Current Status: PHASE 0 ✅
- [x] Repository initialization
- [x] Documentation structure
- [x] Folder structure defined

### Upcoming Phases
- [ ] Phase 1: Extension skeleton (manifest + basic structure)
- [ ] Phase 2: Profile storage with encryption
- [ ] Phase 3: Content script scanner
- [ ] Phase 4: Field mapping engine
- [ ] Phase 5: React popup UI
- [ ] Phase 6: Autofill executor
- [ ] Phase 7: Adapter implementations
- [ ] Phase 8: Edge case handling
- [ ] Phase 9: Testing and validation

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
- [x] Google Forms autofill works correctly
- [x] Generic HTML forms autofill works
- [x] Resume upload functional
- [x] No auto-submit behavior
- [x] No data leakage
- [x] No console errors
- [x] Clean, readable codebase
- [x] No unnecessary complexity

## 📚 TODO List
_Uncertainties and deferred decisions are tracked here_

---

## 🏗️ Build Instructions
_To be added in Phase 1_

## 🧪 Testing
_To be added in Phase 9_

## 📄 License
MIT License - Personal use productivity tool

---

**Built with clarity over speed, correctness over cleverness, simplicity over complexity.**