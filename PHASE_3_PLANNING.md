# 🟦 PHASE 3 - PROFILE STORAGE ENGINE (PLANNING)

## 📋 Objective
Build a secure profile storage engine that integrates encryption utilities with chrome.storage.local API for persistent, encrypted user profile data management.

## 🎯 Expected Output
1. **profileStore.js** - Profile storage management module
2. Save encrypted profile to chrome.storage.local
3. Load and decrypt profile from chrome.storage.local
4. Initialize empty profile structure
5. Validate profile data before storage
6. Handle storage quota limits
7. Clear/reset profile functionality

## ⚠️ Risks Identified

### 1. Chrome Storage API Availability
- **Risk**: chrome.storage may not be available in all contexts
- **Mitigation**: Feature detection before operations
- **Stop Condition**: If chrome.storage.local unavailable, document and halt

### 2. Storage Quota Limits
- **Risk**: chrome.storage.local has 10MB quota (QUOTA_BYTES)
- **Concern**: Large resume files could exceed quota
- **Mitigation**: 
  - Validate data size before saving
  - Document max profile size (recommend 5MB for safety)
  - Provide clear error if quota exceeded
- **Edge Case**: Handle QUOTA_EXCEEDED_ERR

### 3. Concurrent Access
- **Risk**: Multiple tabs accessing storage simultaneously
- **Mitigation**: Chrome storage API handles locking internally
- **Note**: No additional locking needed

### 4. Password Management
- **Risk**: Where to store/manage encryption password?
- **Decision**: Password NOT stored anywhere (user must enter each session)
- **Implication**: Profile encrypted at rest, password required for decrypt
- **UI Flow**: User enters password → decrypt → work with data → encrypt → save

### 5. Storage Key Naming
- **Risk**: Key collision with other extensions
- **Decision**: Use namespaced key: `autofill_extension_profile`
- **Validation**: Check for key existence before operations

### 6. Data Migration
- **Risk**: Future schema changes may break stored data
- **Mitigation**: Include version field in profile schema
- **TODO**: Document migration strategy for future phases

### 7. Browser Storage Events
- **Risk**: Storage changes from other contexts (tabs, extension pages)
- **Handling**: chrome.storage.onChanged listener (future phase)
- **Phase 3 Scope**: Basic save/load only, no live sync yet

## 🔍 Edge Cases

### Edge Case 1: No Profile Exists (First Use)
- **Scenario**: User opens extension for first time
- **Handling**: Return null or empty profile structure
- **UI Behavior**: Show "Create Profile" flow

### Edge Case 2: Corrupted Encrypted Data
- **Scenario**: Storage contains invalid encrypted data
- **Handling**: Decryption will fail (from encryption.js)
- **User Action**: Offer "Reset Profile" option with confirmation
- **Data Loss**: User explicitly warned before reset

### Edge Case 3: Wrong Password
- **Scenario**: User enters incorrect password when loading profile
- **Handling**: Return clear error from decrypt function
- **UI Behavior**: Show "Incorrect password" message, retry option

### Edge Case 4: Storage Quota Exceeded
- **Scenario**: Profile data (encrypted) exceeds 10MB
- **Handling**: chrome.storage.set() will throw QUOTA_EXCEEDED_ERR
- **Prevention**: Pre-validate size before attempting save
- **User Feedback**: "Profile too large, reduce resume size"

### Edge Case 5: Partial Profile Save Failure
- **Scenario**: Save operation fails mid-write
- **Handling**: Chrome storage is atomic (all or nothing)
- **Recovery**: Previous data remains intact

### Edge Case 6: Empty Profile Save
- **Scenario**: User saves empty profile (all fields blank)
- **Handling**: Allow empty profile (valid use case)
- **Validation**: Validate structure, not emptiness

### Edge Case 7: Resume File Size
- **Scenario**: User uploads very large resume (5MB+ base64)
- **Handling**: 
  - Validate file size before base64 encoding
  - Recommend max 2MB original file size
  - Base64 encoding increases size by ~33%

### Edge Case 8: Concurrent Save Operations
- **Scenario**: User triggers multiple saves rapidly
- **Handling**: Let last operation win (Chrome handles atomicity)
- **UI Prevention**: Disable save button during operation

## 📁 Files to Create/Modify

### New Files
1. `src/storage/profileStore.js` - Main storage module
2. `PHASE_3_DESIGN.md` - Design documentation

### Modified Files
None (Phase 3 is isolated storage module)

## 🏗️ Module Structure

```
src/storage/profileStore.js
├── isChromeStorageAvailable()
├── initializeProfile()
├── saveProfile(profile, password)
├── loadProfile(password)
├── deleteProfile()
└── getStorageUsage()
```

## 📊 Profile Schema (Version 1.0)

```javascript
{
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
      skills: [] // array of strings
    },
    links: {
      linkedin: "",
      github: "",
      portfolio: "",
      website: ""
    },
    documents: {
      resume: null // base64 encoded file or null
    }
  },
  metadata: {
    createdAt: "", // ISO timestamp
    updatedAt: ""  // ISO timestamp
  }
}
```

## ✅ Validation Checklist

- [ ] Chrome storage API feature detection
- [ ] Profile structure validation (schema enforcement)
- [ ] Size validation before save (< 5MB recommended)
- [ ] Encryption integration (using Phase 2 utilities)
- [ ] Error propagation from encryption layer
- [ ] Storage quota error handling
- [ ] Atomic operations (no partial saves)
- [ ] Clear error messages
- [ ] No data loss on failed operations

## 🔐 Security Requirements

1. **Password Never Stored**
   - Password only in memory during encrypt/decrypt
   - No caching, no persistence
   - User must re-enter each session

2. **Data Encrypted at Rest**
   - Profile encrypted before storage
   - Stored data: `{ salt, iv, ciphertext }`
   - Cannot be read without password

3. **Storage Key Namespacing**
   - Key: `autofill_extension_profile`
   - Prevents collision with other extensions

4. **No Plaintext Logging**
   - Never log decrypted profile data
   - Never log passwords
   - Only log operation success/failure

## 🛑 Stop Conditions

### Immediate Stop Required If:
1. chrome.storage.local API differs from documentation
2. Chrome storage quota behavior unpredictable
3. Encryption/decryption integration fails
4. Storage operations not atomic
5. Data corruption occurs during save

### Document as TODO If:
1. Migration strategy unclear for future schema changes
2. Multi-profile support requirements undefined
3. Cloud sync requirements (out of scope for Phase 3)
4. Storage change listener behavior uncertain

## 🧪 Testing Strategy (for this phase)

### Manual Testing Required:
1. Save new profile with password
2. Load profile with correct password
3. Attempt load with wrong password (should fail)
4. Delete profile and verify removal
5. Save large profile (near quota limit)
6. Save empty profile (all fields blank)
7. Check storage usage reporting
8. Verify no plaintext data in chrome.storage

### Storage Inspection:
- Open Chrome DevTools → Application → Storage → Extension Storage
- Verify data is encrypted (ciphertext visible)
- Verify no plaintext profile data

### Error Testing:
1. Simulate quota exceeded (artificially large data)
2. Corrupt stored data manually (test recovery)
3. Test with no stored profile (first use)

## 📏 Size Constraints

### Chrome Storage Limits:
- **Total quota**: 10MB (QUOTA_BYTES)
- **Recommended max profile**: 5MB encrypted
- **Base64 overhead**: ~33% increase

### Size Recommendations:
- Original resume file: Max 2MB
- After base64 encoding: ~2.66MB
- After encryption: ~2.7MB (includes IV, salt, auth tag)
- Total with profile metadata: ~3MB
- **Safety margin**: 2x for comfortable usage

## 📊 Success Criteria for Phase 3

- [ ] `profileStore.js` created with all functions
- [ ] Chrome storage API properly utilized
- [ ] Profile encryption/decryption working
- [ ] Size validation implemented
- [ ] Quota error handling complete
- [ ] Schema validation enforced
- [ ] Error handling comprehensive
- [ ] No data loss scenarios
- [ ] Code is simple and readable
- [ ] All global rules followed

## 🔄 Dependencies

### Depends On:
- Phase 1 ✅ (project structure)
- Phase 2 ✅ (encryption utilities)

### Required By:
- Phase 6 (React popup UI - will consume this module)
- All phases needing profile data access

## 📝 Notes

- This is a pure storage layer, no UI interaction yet
- Will be consumed by React components in Phase 6
- Focus on reliability and data integrity
- Keep functions simple and focused
- Password management is caller's responsibility

## 🎯 Out of Scope for Phase 3

- ❌ Password validation/strength checking (validators.js responsibility)
- ❌ UI for profile management (Phase 6)
- ❌ Multi-profile support (future enhancement)
- ❌ Cloud sync (not required by SRS)
- ❌ Storage change listeners (future phase)
- ❌ Profile import/export (future enhancement)

---

## ⏭️ Next Steps After Planning Approval

1. Move to PHASE 3 - DESIGN
2. Define exact function signatures
3. Define data flow for save/load operations
4. Define error handling strategy
5. Define validation rules
6. Commit design document
7. Move to PHASE 3 - IMPLEMENTATION

---

**Status**: ⏸️ AWAITING APPROVAL TO PROCEED TO DESIGN PHASE
