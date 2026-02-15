# 🟦 PHASE 2 - ENCRYPTION UTILITIES (DESIGN)

## 🎯 Module Objective
Provide secure, reusable encryption/decryption utilities for profile data using Web Crypto API with AES-GCM and PBKDF2 key derivation.

---

## 🏗 Module Architecture

### Module: `src/utils/encryption.js`

**Responsibilities**:
- Feature detection for Web Crypto API
- Secure key derivation from user password
- Encrypt JavaScript objects to encrypted strings
- Decrypt encrypted strings back to JavaScript objects
- Handle encryption/decryption errors gracefully

**NOT Responsible For**:
- Storage operations (handled by profileStore.js)
- Password management UI (handled by Popup components)
- Password validation (handled by validators.js)

---

## 📋 Function Signatures

### 1. `isWebCryptoAvailable()`
```javascript
/**
 * Check if Web Crypto API is available
 * @returns {boolean} - true if crypto.subtle is available
 */
function isWebCryptoAvailable() {
  return (
    typeof window !== 'undefined' &&
    window.crypto &&
    window.crypto.subtle &&
    typeof window.crypto.subtle.encrypt === 'function'
  );
}
```

**Purpose**: Detect Web Crypto support before attempting operations  
**Returns**: Boolean (no errors thrown)  
**Usage**: Call once on module load or before first encryption

---

### 2. `deriveKey(password, salt)`
```javascript
/**
 * Derive encryption key from password using PBKDF2
 * @param {string} password - User's encryption password
 * @param {Uint8Array} salt - 16-byte salt for key derivation
 * @returns {Promise<CryptoKey>} - Derived AES-GCM key
 * @throws {Error} - If Web Crypto unavailable or derivation fails
 */
async function deriveKey(password, salt) {
  // Implementation details in implementation phase
}
```

**Algorithm**: PBKDF2  
**Hash Function**: SHA-256  
**Iterations**: 100,000  
**Key Length**: 256 bits  
**Salt**: 16 bytes (128 bits)

**Error Handling**:
- Throw if Web Crypto unavailable
- Throw if password is empty
- Throw if salt is not Uint8Array of length 16

---

### 3. `encrypt(data, password)`
```javascript
/**
 * Encrypt data object using AES-GCM
 * @param {Object} data - JavaScript object to encrypt (will be JSON stringified)
 * @param {string} password - User's encryption password
 * @returns {Promise<Object>} - Object with { salt, iv, ciphertext } in base64
 * @throws {Error} - If encryption fails or Web Crypto unavailable
 */
async function encrypt(data, password) {
  // Implementation details in implementation phase
}
```

**Input Validation**:
- `data`: Must be serializable to JSON (no functions, circular refs)
- `password`: Non-empty string

**Process**:
1. Generate random 16-byte salt
2. Derive key from password + salt
3. Generate random 12-byte IV
4. JSON.stringify(data)
5. Encrypt with AES-GCM
6. Return { salt, iv, ciphertext } (all base64 encoded)

**Output Format**:
```javascript
{
  salt: "base64_string",      // 16 bytes
  iv: "base64_string",        // 12 bytes
  ciphertext: "base64_string" // variable length + 16 byte auth tag
}
```

**Error Scenarios**:
- Web Crypto unavailable → Error: "Web Crypto API not available"
- Empty password → Error: "Password cannot be empty"
- JSON serialization fails → Error: "Data cannot be serialized"
- Encryption fails → Error: "Encryption operation failed"

---

### 4. `decrypt(encryptedData, password)`
```javascript
/**
 * Decrypt encrypted data object using AES-GCM
 * @param {Object} encryptedData - Object with { salt, iv, ciphertext } in base64
 * @param {string} password - User's encryption password
 * @returns {Promise<Object>} - Decrypted JavaScript object
 * @throws {Error} - If decryption fails, wrong password, or corrupted data
 */
async function decrypt(encryptedData, password) {
  // Implementation details in implementation phase
}
```

**Input Validation**:
- `encryptedData`: Must have { salt, iv, ciphertext } properties
- All properties must be valid base64 strings
- `password`: Non-empty string

**Process**:
1. Validate encryptedData structure
2. Base64 decode salt, iv, ciphertext
3. Derive key from password + salt
4. Decrypt ciphertext with AES-GCM
5. Parse JSON to JavaScript object
6. Return decrypted object

**Error Scenarios**:
- Invalid structure → Error: "Invalid encrypted data format"
- Invalid base64 → Error: "Corrupted encrypted data"
- Wrong password → Error: "Decryption failed - incorrect password or corrupted data"
- AES-GCM authentication fails → Error: "Data integrity check failed"
- JSON parse fails → Error: "Corrupted decrypted data"

---

## 🔄 Data Flow

### Encryption Flow
```
User Profile Object
      |
      v
  JSON.stringify
      |
      v
  UTF-8 Encoding
      |
      v
Generate Salt (random 16 bytes)
      |
      v
Derive Key (PBKDF2)
      |
      v
Generate IV (random 12 bytes)
      |
      v
  AES-GCM Encrypt
      |
      v
Base64 Encode (salt, iv, ciphertext)
      |
      v
Return { salt, iv, ciphertext }
```

### Decryption Flow
```
{ salt, iv, ciphertext }
      |
      v
  Base64 Decode
      |
      v
Derive Key (PBKDF2 with provided salt)
      |
      v
  AES-GCM Decrypt
      |
      v
  UTF-8 Decoding
      |
      v
  JSON.parse
      |
      v
User Profile Object
```

---

## 🛡 Security Design

### 1. Key Derivation Security
- **PBKDF2** with 100,000 iterations (OWASP minimum for 2024+)
- **SHA-256** hash function (widely supported, secure)
- **Random salt** per encryption (prevents rainbow table attacks)
- **No key caching** (derive on each encrypt/decrypt for simplicity)

### 2. Encryption Security
- **AES-GCM** (authenticated encryption)
- **256-bit keys** (maximum security)
- **12-byte IV** (optimal for AES-GCM, NIST recommended)
- **Random IV per operation** (never reused)
- **Authentication tag** (automatic with AES-GCM, prevents tampering)

### 3. Data Handling Security
- **No plaintext logging** (no console.log of sensitive data)
- **No global state** (all data passed as parameters)
- **Immediate return** (no lingering plaintext in module scope)
- **Error messages sanitized** (no sensitive data in errors)

### 4. Memory Security (Best Effort)
- JavaScript has no memory zeroing capability
- Minimize plaintext lifetime
- No plaintext assignment to global variables
- Rely on garbage collection

---

## ⚠️ Error Handling Strategy

### Error Types

1. **Feature Unavailable**
   - Scenario: Web Crypto API not supported
   - Response: Throw clear error immediately
   - Message: "Web Crypto API is not available in this browser"

2. **Input Validation Errors**
   - Scenario: Invalid parameters
   - Response: Throw descriptive error
   - Examples:
     - "Password cannot be empty"
     - "Invalid encrypted data format"
     - "Data cannot be serialized to JSON"

3. **Crypto Operation Failures**
   - Scenario: Encryption/decryption fails
   - Response: Throw error without exposing details
   - Message: "Encryption operation failed" or "Decryption failed"

4. **Authentication Failures**
   - Scenario: Wrong password or tampered data
   - Response: AES-GCM will throw, catch and rethrow sanitized
   - Message: "Decryption failed - incorrect password or corrupted data"

### Error Propagation
- All functions throw errors (no silent failures)
- Caller (profileStore.js) handles errors
- No try-catch within encryption.js (let errors bubble)
- Exception: Input validation throws immediately

---

## 🧪 Interface Testing Strategy

### Test Cases (Manual for Phase 2)

**Test 1: Feature Detection**
```javascript
const available = isWebCryptoAvailable();
console.log('Web Crypto available:', available);
// Expected: true (in Chrome extension context)
```

**Test 2: Successful Encryption/Decryption**
```javascript
const testData = { name: "John Doe", email: "test@example.com" };
const password = "SecurePassword123";

const encrypted = await encrypt(testData, password);
console.log('Encrypted:', encrypted);
// Expected: { salt, iv, ciphertext } with base64 strings

const decrypted = await decrypt(encrypted, password);
console.log('Decrypted:', decrypted);
// Expected: { name: "John Doe", email: "test@example.com" }
```

**Test 3: Wrong Password**
```javascript
const encrypted = await encrypt(testData, "password1");
try {
  await decrypt(encrypted, "password2");
} catch (error) {
  console.log('Error caught:', error.message);
  // Expected: "Decryption failed - incorrect password or corrupted data"
}
```

**Test 4: Corrupted Data**
```javascript
const encrypted = await encrypt(testData, password);
encrypted.ciphertext = "corrupted_base64_data";
try {
  await decrypt(encrypted, password);
} catch (error) {
  console.log('Error caught:', error.message);
  // Expected: Error about corruption
}
```

**Test 5: Empty Data**
```javascript
const emptyData = {};
const encrypted = await encrypt(emptyData, password);
const decrypted = await decrypt(encrypted, password);
console.log('Empty data roundtrip:', decrypted);
// Expected: {}
```

---

## 🔗 Module Dependencies

### External Dependencies
- **Web Crypto API** (window.crypto.subtle)
  - Native browser API (no npm package)
  - Available in all modern Chrome versions
  - No polyfill needed for Chrome extension

### Internal Dependencies
- **None** (pure utility module)
  - No imports from other project modules
  - Self-contained

### Consumers (Future)
- `src/storage/profileStore.js` (Phase 3)
- Any module needing data encryption

---

## 📐 Code Structure

```javascript
// src/utils/encryption.js

// ============================================
// CONSTANTS
// ============================================
const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 16;  // bytes
const IV_LENGTH = 12;    // bytes for AES-GCM
const KEY_LENGTH = 256;  // bits

// ============================================
// PRIVATE HELPERS
// ============================================
function arrayBufferToBase64(buffer) { /* ... */ }
function base64ToArrayBuffer(base64) { /* ... */ }

// ============================================
// PUBLIC API
// ============================================
export function isWebCryptoAvailable() { /* ... */ }
export async function deriveKey(password, salt) { /* ... */ }
export async function encrypt(data, password) { /* ... */ }
export async function decrypt(encryptedData, password) { /* ... */ }
```

**Design Principles**:
1. **Pure functions** (no side effects)
2. **Single responsibility** (each function does one thing)
3. **No magic numbers** (use named constants)
4. **Descriptive names** (self-documenting code)
5. **Minimal abstraction** (no unnecessary helpers)

---

## ✅ Design Validation Checklist

- [x] All functions have clear signatures
- [x] Error handling strategy defined
- [x] Data flow documented
- [x] Security requirements mapped to design
- [x] No hallucinated Web Crypto APIs
- [x] No overengineering (4 functions total)
- [x] Interface testable
- [x] No global state
- [x] No side effects
- [x] Follows global rules

---

## 🚫 What This Module Does NOT Do

- ❌ Store encrypted data (profileStore.js responsibility)
- ❌ Manage passwords (UI responsibility)
- ❌ Validate password strength (validators.js responsibility)
- ❌ Handle storage quota (profileStore.js responsibility)
- ❌ Provide UI feedback (React components responsibility)
- ❌ Cache keys (security trade-off for simplicity)
- ❌ Support multiple encryption schemes (only AES-GCM)

---

## 📊 Performance Expectations

### Key Derivation (PBKDF2)
- **Expected**: 50-200ms on modern hardware
- **Acceptable**: Up to 500ms
- **Stop Condition**: If > 2 seconds, halt and document

### Encryption/Decryption
- **Expected**: <10ms for typical profile (~5KB)
- **Acceptable**: <50ms for large profile (~100KB)
- **Stop Condition**: If > 500ms, investigate

**Note**: Performance optimization is NOT a Phase 2 goal. Focus on correctness.

---

## 🎯 Success Criteria for Design Phase

- [x] Module responsibilities clearly defined
- [x] Function signatures documented
- [x] Data flow diagrams complete
- [x] Error handling strategy defined
- [x] Security design validated
- [x] Testing strategy outlined
- [x] No ambiguity in implementation requirements
- [x] All edge cases from planning covered

---

## ⏭️ Ready for Implementation Phase

**Design Status**: ✅ COMPLETE  
**Next Step**: PHASE 2 - IMPLEMENTATION  

**Implementation will create**:
- `src/utils/encryption.js` with all 4 functions
- Atomic commits per function
- No deviation from this design

---

**Design Approved**: Ready to proceed to implementation.
