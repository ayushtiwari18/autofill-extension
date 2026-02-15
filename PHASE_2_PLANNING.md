# 🟦 PHASE 2 - ENCRYPTION UTILITIES (PLANNING)

## 📋 Objective
Build secure AES-GCM encryption/decryption utilities using Web Crypto API to protect user profile data stored in chrome.storage.local.

## 🎯 Expected Output
1. **encryption.js** - Core encryption/decryption module
2. Secure key derivation from password
3. Encrypt/decrypt functions for profile data
4. Error handling for corrupted data
5. No plaintext data exposure in memory longer than necessary

## ⚠️ Risks Identified

### 1. Web Crypto API Compatibility
- **Risk**: Crypto.subtle may not be available in all contexts
- **Mitigation**: Feature detection and graceful degradation
- **Stop Condition**: If Web Crypto unavailable, document and halt

### 2. Key Derivation Strategy
- **Risk**: Weak password → weak encryption
- **Mitigation**: Use PBKDF2 with high iteration count (100,000+)
- **Question**: Should we enforce minimum password strength?
- **Decision**: Document password recommendations, no enforcement (user choice)

### 3. Salt Storage
- **Risk**: Where to store the salt?
- **Decision**: Store salt alongside encrypted data (not secret, prevents rainbow tables)

### 4. IV (Initialization Vector) Management
- **Risk**: IV reuse breaks AES-GCM security
- **Mitigation**: Generate new random IV for each encryption operation
- **Storage**: Prepend IV to ciphertext

### 5. Data Corruption Detection
- **Risk**: Corrupted encrypted data causes app crash
- **Mitigation**: AES-GCM provides authentication tag (automatic integrity check)
- **Fallback**: Catch errors and trigger data reset flow

### 6. Memory Security
- **Risk**: Decrypted data lingering in memory
- **Mitigation**: Return data immediately, no global storage of decrypted data
- **Note**: JavaScript cannot zero memory, best effort only

## 🔍 Edge Cases

### Edge Case 1: No Password Set
- **Scenario**: User hasn't configured encryption password yet
- **Handling**: Return clear error, prompt password setup in UI
- **Implementation**: Check for stored salt before attempting decryption

### Edge Case 2: Wrong Password
- **Scenario**: User enters incorrect password during decryption
- **Handling**: AES-GCM will fail authentication, catch and return clear error
- **User Experience**: "Incorrect password or corrupted data"

### Edge Case 3: Corrupted Ciphertext
- **Scenario**: Storage corruption, extension update issues
- **Handling**: Decryption will fail, offer data reset option
- **Data Loss**: User informed explicitly before reset

### Edge Case 4: Browser Crypto API Unavailable
- **Scenario**: Old browser, privacy extensions blocking
- **Handling**: Feature detection on load, display clear error
- **Fallback**: NO fallback to weak encryption, fail explicitly

### Edge Case 5: Empty/Null Data Encryption
- **Scenario**: Attempting to encrypt empty profile
- **Handling**: Allow empty object encryption (valid use case)
- **Validation**: Validate data structure, not emptiness

### Edge Case 6: Large Data Encryption
- **Scenario**: Profile with large resume file (base64)
- **Concern**: chrome.storage.local quota (10MB)
- **Handling**: Validate size before encryption
- **Mitigation**: Document max resume size (2MB recommended)

## 📁 Files to Create/Modify

### New Files
1. `src/utils/encryption.js` - Core encryption module
2. `PHASE_2_DESIGN.md` - Design documentation

### Modified Files
None (Phase 2 is isolated utility creation)

## 🏗️ Module Structure

```
src/utils/encryption.js
├── deriveKey(password, salt)
├── encrypt(data, password)
├── decrypt(encryptedData, password)
└── isWebCryptoAvailable()
```

## ✅ Validation Checklist

- [ ] Web Crypto API feature detection
- [ ] PBKDF2 key derivation with sufficient iterations
- [ ] AES-GCM encryption (not AES-CBC or deprecated modes)
- [ ] Random IV generation per encryption
- [ ] Salt stored with encrypted data
- [ ] No plaintext logging
- [ ] Error messages don't leak sensitive info
- [ ] Returns proper error objects (not throwing)
- [ ] Data format clearly documented

## 🔐 Security Requirements

1. **Algorithm**: AES-GCM (Galois/Counter Mode)
   - Provides encryption + authentication
   - Prevents tampering detection

2. **Key Derivation**: PBKDF2
   - Iterations: 100,000 minimum
   - Hash: SHA-256
   - Salt: 16 bytes random

3. **IV (Initialization Vector)**
   - Size: 12 bytes (96 bits) for AES-GCM
   - Generation: crypto.getRandomValues()
   - Uniqueness: New IV per encryption

4. **Data Format** (after encryption):
   ```json
   {
     "salt": "base64_encoded_salt",
     "iv": "base64_encoded_iv",
     "ciphertext": "base64_encoded_encrypted_data"
   }
   ```

## 🛑 Stop Conditions

### Immediate Stop Required If:
1. Web Crypto API behavior differs from MDN documentation
2. AES-GCM not supported in target Chrome version
3. PBKDF2 iteration performance causes UI freeze (>2 seconds)
4. Memory consumption exceeds reasonable limits
5. Crypto operations fail silently without errors

### Document as TODO If:
1. Uncertain about optimal iteration count
2. Key caching strategy unclear
3. Multi-profile encryption handling undefined

## 🧪 Testing Strategy (for this phase)

### Manual Testing Required:
1. Encrypt sample profile data
2. Decrypt and verify data integrity
3. Attempt decryption with wrong password (should fail)
4. Corrupt ciphertext and attempt decryption (should fail)
5. Check console for any plaintext data leaks
6. Verify no sensitive data in error messages

### Performance Testing:
1. Measure PBKDF2 key derivation time
2. Ensure encryption/decryption under 500ms for typical profile

## 📊 Success Criteria for Phase 2

- [ ] `encryption.js` created with all functions
- [ ] Web Crypto API properly utilized
- [ ] No hallucinated crypto APIs
- [ ] Error handling comprehensive
- [ ] No plaintext data exposure
- [ ] Data format documented
- [ ] Code is simple and readable
- [ ] No overengineering
- [ ] All global rules followed

## 🔄 Dependencies

### Depends On:
- Phase 1 ✅ (project structure)

### Required By:
- Phase 3 (Profile Storage Engine)
- All subsequent phases using encrypted data

## 📝 Notes

- This is a utility module, no UI interaction yet
- Will be consumed by profileStore.js in Phase 3
- Focus on correctness and security, not performance optimization
- Keep functions pure (input → output, no side effects)

---

## ⏭️ Next Steps After Planning Approval

1. Move to PHASE 2 - DESIGN
2. Define exact function signatures
3. Define error handling strategy
4. Define data flow
5. Commit design document
6. Move to PHASE 2 - IMPLEMENTATION

---

**Status**: ⏸️ AWAITING APPROVAL TO PROCEED TO DESIGN PHASE
