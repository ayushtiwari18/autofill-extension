# 🟦 PHASE 3 - PROFILE STORAGE ENGINE (DESIGN)

## 🎯 Module Objective
Provide secure profile storage management using chrome.storage.local with encryption from Phase 2, ensuring data integrity, quota management, and reliable save/load operations.

---

## 🏗 Module Architecture

### Module: `src/storage/profileStore.js`

**Responsibilities**:
- Feature detection for Chrome Storage API
- Initialize default profile structure
- Save encrypted profile to chrome.storage.local
- Load and decrypt profile from chrome.storage.local
- Delete profile from storage
- Monitor storage usage
- Validate profile schema before save
- Handle storage quota limits

**NOT Responsible For**:
- Password management (UI responsibility)
- Password validation (validators.js responsibility)
- Profile form rendering (React components responsibility)
- Autofill logic (content script/engine responsibility)

---

## 📋 Function Signatures

### 1. `isChromeStorageAvailable()`
```javascript
/**
 * Check if Chrome Storage API is available
 * @returns {boolean} - true if chrome.storage.local is available
 */
function isChromeStorageAvailable() {
  return (
    typeof chrome !== 'undefined' &&
    chrome.storage &&
    chrome.storage.local &&
    typeof chrome.storage.local.get === 'function' &&
    typeof chrome.storage.local.set === 'function'
  );
}
```

**Purpose**: Detect Chrome Storage support before operations  
**Returns**: Boolean (no errors thrown)  
**Usage**: Call before any storage operation

---

### 2. `initializeProfile()`
```javascript
/**
 * Create empty profile structure with default values
 * @returns {Object} - Empty profile with version 1.0 schema
 */
function initializeProfile() {
  return {
    version: "1.0",
    profile: {
      personal: {
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        state: "",
        zipCode: "",
        country: ""
      },
      education: {
        degree: "",
        major: "",
        university: "",
        graduationYear: "",
        gpa: ""
      },
      experience: {
        currentRole: "",
        currentCompany: "",
        yearsOfExperience: "",
        skills: []
      },
      links: {
        linkedin: "",
        github: "",
        portfolio: "",
        website: ""
      },
      documents: {
        resume: null
      }
    },
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  };
}
```

**Purpose**: Provide default profile structure  
**Returns**: Profile object (not async)  
**Usage**: First-time setup or after profile reset

---

### 3. `validateProfile(profile)`
```javascript
/**
 * Validate profile structure matches expected schema
 * @param {Object} profile - Profile object to validate
 * @returns {boolean} - true if valid, false otherwise
 */
function validateProfile(profile) {
  // Implementation validates:
  // - version field exists
  // - profile object exists
  // - all required top-level fields present (personal, education, etc.)
  // - Does NOT validate field values (empty allowed)
}
```

**Purpose**: Ensure profile structure integrity before save  
**Returns**: Boolean  
**Validation**: Structure only, not content

---

### 4. `calculateProfileSize(encryptedData)`
```javascript
/**
 * Calculate size of encrypted profile data in bytes
 * @param {Object} encryptedData - Encrypted profile { salt, iv, ciphertext }
 * @returns {number} - Size in bytes
 */
function calculateProfileSize(encryptedData) {
  // Calculate size of JSON.stringify(encryptedData)
  // Used for quota validation
}
```

**Purpose**: Pre-validate size before storage  
**Returns**: Number (bytes)  
**Threshold**: Warn if > 5MB

---

### 5. `saveProfile(profile, password)`
```javascript
/**
 * Save encrypted profile to chrome.storage.local
 * @param {Object} profile - Profile object to save
 * @param {string} password - Encryption password
 * @returns {Promise<void>} - Resolves on success
 * @throws {Error} - If save fails, quota exceeded, or invalid profile
 */
export async function saveProfile(profile, password) {
  // Implementation in implementation phase
}
```

**Input Validation**:
- `profile`: Must be valid profile object (validateProfile)
- `password`: Non-empty string (checked by encryption.js)

**Process**:
1. Check Chrome Storage API availability
2. Validate profile structure
3. Update metadata.updatedAt timestamp
4. Encrypt profile using encryption.encrypt()
5. Calculate encrypted data size
6. Validate size < 5MB (recommended limit)
7. Save to chrome.storage.local with key `autofill_extension_profile`
8. Handle quota errors

**Error Scenarios**:
- Chrome Storage unavailable → Error: "Chrome Storage API not available"
- Invalid profile structure → Error: "Invalid profile structure"
- Encryption fails → Propagate error from encryption.js
- Quota exceeded → Error: "Storage quota exceeded - reduce profile size"
- Profile too large → Error: "Profile size exceeds recommended limit (5MB)"

---

### 6. `loadProfile(password)`
```javascript
/**
 * Load and decrypt profile from chrome.storage.local
 * @param {string} password - Decryption password
 * @returns {Promise<Object|null>} - Decrypted profile or null if none exists
 * @throws {Error} - If decryption fails or wrong password
 */
export async function loadProfile(password) {
  // Implementation in implementation phase
}
```

**Input Validation**:
- `password`: Non-empty string (checked by encryption.js)

**Process**:
1. Check Chrome Storage API availability
2. Retrieve data from chrome.storage.local (key: `autofill_extension_profile`)
3. If no data exists, return null
4. Decrypt using encryption.decrypt()
5. Validate decrypted profile structure
6. Return profile object

**Return Values**:
- `null`: No profile stored (first use)
- `Object`: Decrypted profile

**Error Scenarios**:
- Chrome Storage unavailable → Error: "Chrome Storage API not available"
- Wrong password → Error from encryption.decrypt()
- Corrupted data → Error from encryption.decrypt()
- Invalid decrypted structure → Error: "Stored profile data is corrupted"

---

### 7. `deleteProfile()`
```javascript
/**
 * Delete profile from chrome.storage.local
 * @returns {Promise<void>} - Resolves on success
 * @throws {Error} - If deletion fails
 */
export async function deleteProfile() {
  // Implementation in implementation phase
}
```

**Process**:
1. Check Chrome Storage API availability
2. Remove key `autofill_extension_profile` from chrome.storage.local
3. Resolve on success

**Error Scenarios**:
- Chrome Storage unavailable → Error: "Chrome Storage API not available"

---

### 8. `getStorageUsage()`
```javascript
/**
 * Get current storage usage information
 * @returns {Promise<Object>} - { bytesInUse, quotaBytes, percentUsed }
 * @throws {Error} - If storage API unavailable
 */
export async function getStorageUsage() {
  // Implementation in implementation phase
}
```

**Purpose**: Monitor storage consumption  
**Returns**:
```javascript
{
  bytesInUse: 1234567,      // bytes used by profile
  quotaBytes: 10485760,     // total quota (10MB)
  percentUsed: 11.77        // percentage
}
```

**Error Scenarios**:
- Chrome Storage unavailable → Error: "Chrome Storage API not available"

---

## 🔄 Data Flow

### Save Profile Flow
```
Profile Object (plaintext)
      |
      v
Validate Structure
      |
      v
Update metadata.updatedAt
      |
      v
Encrypt (encryption.encrypt)
      |
      v
{ salt, iv, ciphertext }
      |
      v
Calculate Size
      |
      v
Validate < 5MB
      |
      v
chrome.storage.local.set()
      |
      v
Stored Encrypted Data
```

### Load Profile Flow
```
chrome.storage.local.get()
      |
      v
Encrypted Data or null
      |
      v
(if null) → Return null
      |
      v
Decrypt (encryption.decrypt)
      |
      v
Profile Object (plaintext)
      |
      v
Validate Structure
      |
      v
Return Profile
```

### Delete Profile Flow
```
chrome.storage.local.remove()
      |
      v
Key Deleted
      |
      v
Resolve
```

---

## 🛡 Security Design

### 1. Data at Rest
- **Always encrypted** in chrome.storage.local
- Format: `{ salt, iv, ciphertext }` (from Phase 2)
- Cannot be read without password

### 2. Data in Memory
- **Plaintext only during operation**
- No caching of decrypted profile
- Caller must manage decrypted data lifetime

### 3. Password Handling
- **Never stored** by this module
- Passed as parameter to save/load
- Immediately passed to encryption functions
- No logging of password

### 4. Storage Key
- **Namespaced**: `autofill_extension_profile`
- Prevents collision with other extensions
- Single key per extension instance

---

## ⚠️ Error Handling Strategy

### Error Types

1. **API Unavailable**
   - Scenario: Chrome Storage API not present
   - Response: Throw clear error immediately
   - Message: "Chrome Storage API is not available"

2. **Validation Errors**
   - Scenario: Invalid profile structure
   - Response: Throw before encryption
   - Message: "Invalid profile structure"

3. **Quota Errors**
   - Scenario: Storage quota exceeded
   - Response: Catch chrome.storage error
   - Message: "Storage quota exceeded - reduce profile size"

4. **Encryption Errors**
   - Scenario: Encryption/decryption fails
   - Response: Propagate error from encryption.js
   - Message: (From encryption module)

5. **Corrupted Data**
   - Scenario: Stored data invalid after decryption
   - Response: Validate and throw
   - Message: "Stored profile data is corrupted"

### Error Propagation
- All functions throw errors (no silent failures)
- Caller (React UI) handles errors
- Errors include actionable messages
- No sensitive data in error messages

---

## 🧪 Interface Testing Strategy

### Test Cases (Manual for Phase 3)

**Test 1: First Use (No Profile)**
```javascript
const profile = await loadProfile('password');
console.log('Profile:', profile);
// Expected: null
```

**Test 2: Save and Load**
```javascript
const newProfile = initializeProfile();
newProfile.profile.personal.firstName = 'John';
newProfile.profile.personal.email = 'john@example.com';

await saveProfile(newProfile, 'SecurePass123');
const loaded = await loadProfile('SecurePass123');
console.log('Loaded:', loaded.profile.personal.firstName);
// Expected: 'John'
```

**Test 3: Wrong Password**
```javascript
try {
  await loadProfile('WrongPassword');
} catch (error) {
  console.log('Expected error:', error.message);
  // Expected: Decryption error
}
```

**Test 4: Delete Profile**
```javascript
await deleteProfile();
const afterDelete = await loadProfile('password');
console.log('After delete:', afterDelete);
// Expected: null
```

**Test 5: Storage Usage**
```javascript
const usage = await getStorageUsage();
console.log('Storage:', usage);
// Expected: { bytesInUse, quotaBytes, percentUsed }
```

**Test 6: Large Profile**
```javascript
const largeProfile = initializeProfile();
largeProfile.profile.documents.resume = 'base64...very long string';
await saveProfile(largeProfile, 'password');
// Check if size warning/error occurs
```

---

## 🔗 Module Dependencies

### External Dependencies
- **chrome.storage.local** (Chrome Extension API)
  - Native browser API
  - Available in Manifest V3
  - Quota: 10MB (QUOTA_BYTES)

### Internal Dependencies
- **src/utils/encryption.js** (Phase 2)
  - `encrypt(data, password)`
  - `decrypt(encryptedData, password)`

### Consumers (Future)
- `src/ui/Popup.jsx` (Phase 6)
- `src/ui/ProfileForm.jsx` (Phase 6)
- Any module needing profile data

---

## 📐 Code Structure

```javascript
// src/storage/profileStore.js

import { encrypt, decrypt } from '../utils/encryption.js';

// ============================================
// CONSTANTS
// ============================================
const STORAGE_KEY = 'autofill_extension_profile';
const MAX_RECOMMENDED_SIZE = 5 * 1024 * 1024; // 5MB
const PROFILE_VERSION = '1.0';

// ============================================
// PRIVATE HELPERS
// ============================================
function validateProfile(profile) { /* ... */ }
function calculateProfileSize(encryptedData) { /* ... */ }

// ============================================
// PUBLIC API
// ============================================
export function isChromeStorageAvailable() { /* ... */ }
export function initializeProfile() { /* ... */ }
export async function saveProfile(profile, password) { /* ... */ }
export async function loadProfile(password) { /* ... */ }
export async function deleteProfile() { /* ... */ }
export async function getStorageUsage() { /* ... */ }
```

**Design Principles**:
1. **Single responsibility** per function
2. **Clear error messages** for debugging
3. **No magic strings** (use named constants)
4. **Async where needed** (Chrome Storage API is async)
5. **Validate early** (before expensive operations)

---

## ✅ Design Validation Checklist

- [x] All functions have clear signatures
- [x] Error handling strategy defined
- [x] Data flow documented
- [x] Security requirements mapped to design
- [x] Chrome Storage API correctly referenced
- [x] Integration with Phase 2 encryption clear
- [x] Quota handling designed
- [x] No overengineering (6 functions total)
- [x] Interface testable
- [x] Follows global rules

---

## 🚫 What This Module Does NOT Do

- ❌ Validate password strength (validators.js)
- ❌ Render UI (React components)
- ❌ Manage multiple profiles (single profile only)
- ❌ Sync across devices (local only)
- ❌ Import/export profiles (future feature)
- ❌ Listen to storage changes (future phase)
- ❌ Cache decrypted data (security decision)

---

## 📊 Performance Expectations

### Save Operation
- **Expected**: 50-300ms (includes encryption + storage)
- **Bottleneck**: PBKDF2 key derivation (from Phase 2)
- **Acceptable**: < 1 second for typical profile

### Load Operation
- **Expected**: 50-300ms (includes storage read + decryption)
- **Bottleneck**: PBKDF2 key derivation (from Phase 2)
- **Acceptable**: < 1 second

### Delete Operation
- **Expected**: < 50ms
- **Simple**: Just remove key from storage

**Note**: Performance optimization is NOT a Phase 3 goal. Focus on correctness.

---

## 🎯 Success Criteria for Design Phase

- [x] Module responsibilities clearly defined
- [x] Function signatures documented
- [x] Data flow diagrams complete
- [x] Error handling strategy defined
- [x] Security design validated
- [x] Testing strategy outlined
- [x] Profile schema defined
- [x] Quota handling designed
- [x] No ambiguity in implementation requirements

---

## ⏭️ Ready for Implementation Phase

**Design Status**: ✅ COMPLETE  
**Next Step**: PHASE 3 - IMPLEMENTATION  

**Implementation will create**:
- `src/storage/profileStore.js` with all 6 functions
- Atomic commits per function/responsibility
- No deviation from this design

---

**Design Approved**: Ready to proceed to implementation.
