# ⚡ Smart Job Application Autofill

A Chrome Extension (Manifest V3) that intelligently autofills job application forms using an encrypted local profile.

> **Status:** Core engine complete. Adapters, tests, and utils added in latest commit. Build and load to use.

---

## 🚀 Quick Start (3 steps)

```bash
# 1. Install dependencies
npm install

# 2. Install Playwright browsers (for E2E tests)
npx playwright install chromium

# 3. Build the extension
npm run build
```

Then in Chrome:
1. Go to `chrome://extensions`
2. Enable **Developer Mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `dist/` folder
5. Pin the extension → click the ⚡ icon

---

## 🧪 Running Tests

### Unit Tests (no browser needed — instant)
```bash
npm test
```
Tests the engine: confidence scoring, field matching, validators.
Expected output: **~45 tests, all passing**.

### Test with Coverage Report
```bash
npm run test:coverage
```

### Watch Mode (auto-reruns on file save)
```bash
npm run test:watch
```

### E2E Tests (full Chrome extension test)
```bash
# Must build first!
npm run build
npm run test:e2e
```
Opens Chrome automatically, loads the extension, tests the form fill flow.

---

## 📁 Project Structure

```
autofill-extension/
├── src/
│   ├── background/
│   │   └── serviceWorker.js      # MV3 service worker — badge updates, message routing
│   ├── content/
│   │   ├── scanner.js            # Scans page for forms, MutationObserver for SPAs
│   │   └── executor.js           # Fills form fields, React-aware native setter
│   ├── engine/
│   │   ├── confidence.js         # Levenshtein fuzzy matching + weighted scoring
│   │   ├── mapper.js             # Profile-to-form field mapping engine
│   │   └── rules.js              # Field pattern registry + negative keywords
│   ├── adapters/
│   │   ├── index.js              # Adapter registry — auto-selects by URL
│   │   ├── GenericAdapter.js     # Fallback for any website
│   │   ├── LinkedInAdapter.js    # LinkedIn Easy Apply specific mappings
│   │   └── WorkdayAdapter.js     # Workday ATS specific mappings
│   ├── storage/
│   │   └── profileStore.js       # AES-GCM encrypted profile storage
│   ├── ui/
│   │   ├── Popup.jsx             # Root React component + screen router
│   │   ├── Dashboard.jsx         # Main dashboard — scan + autofill buttons
│   │   ├── Login.jsx             # Password unlock screen
│   │   ├── ProfileForm.jsx       # Create/edit profile form with auto-draft
│   │   ├── Review.jsx            # Review matches before filling
│   │   └── styles.css            # All UI styles
│   └── utils/
│       ├── logger.js             # Unified error logger across all contexts
│       └── validators.js         # Email, phone, URL, name validators
├── tests/
│   ├── fixtures/
│   │   └── mockProfile.js        # Realistic test profile + mock form data
│   ├── unit/
│   │   ├── confidence.test.js    # 20 tests for fuzzy matching engine
│   │   ├── mapper.test.js        # 15 tests for field mapper
│   │   ├── rules.test.js         # 10 tests for rules registry
│   │   └── validators.test.js    # 15 tests for utility validators
│   └── e2e/
│       ├── playwright.config.js  # Playwright config — loads extension in Chrome
│       └── autofill.test.js      # Full E2E: load → scan → fill → verify
├── public/
│   ├── index.html                # Popup HTML shell
│   ├── test-form.html            # Realistic job form for testing
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── manifest.json                 # MV3 manifest
├── webpack.config.js             # Bundles popup.js, background.js, content.js
├── jest.config.js                # Jest config — unit tests only
├── babel.config.js               # Shared Babel config for Webpack + Jest
└── package.json
```

---

## 🐛 Debugging

The extension has 3 separate JS contexts. Here's where to find errors:

| Context | Where to see errors |
|---|---|
| **Popup UI** | Right-click extension icon → Inspect |
| **Background** | `chrome://extensions` → click "Service Worker" |
| **Content Script** | F12 on any webpage → Console tab |

All errors are also stored in `chrome.storage.local` under `__autofill_logs`.
Read them from the popup console: `chrome.storage.local.get('__autofill_logs', console.log)`

---

## 🗺️ What's Planned Next

- [ ] `Review.jsx` — field-by-field override before filling
- [ ] `GreenhouseAdapter.js` — Greenhouse ATS support
- [ ] `LeverAdapter.js` — Lever ATS support
- [ ] Multi-profile support (switch between profiles)
- [ ] Profile import/export
- [ ] Cover letter template with profile variable substitution

---

## 🔐 Privacy

- All data stored **locally** in `chrome.storage.local` — never sent to any server
- Profile encrypted with **AES-GCM** using a key derived from your password
- Content script **never reads** existing form values — write-only
- No analytics, no tracking, no network requests
