# 🟦 PHASE 6 - REACT POPUP UI (DESIGN)

## 🎯 Module Objective
Create a complete React-based popup interface for profile management, form review, and autofill triggering with password protection and intuitive UX.

---

## 🏗 Architecture Overview

### State Management Strategy
**React Context API** for global state (no Redux)

```javascript
AppContext = {
  profile: Object | null,
  password: String | null,
  isUnlocked: Boolean,
  formData: Object | null,
  mappingResult: Object | null,
  currentScreen: String,
  error: String | null
}
```

### Screen Routing
Simple state-based routing (no React Router)

```javascript
Screens:
- 'login'         // Password entry
- 'create'        // First-time profile creation
- 'dashboard'     // Main screen
- 'edit-profile'  // Edit existing profile
- 'review'        // Review matches before autofill
```

---

## 📄 Component Hierarchy

```
Popup.jsx (Root)
├── AppContextProvider
├── Header (logo, title)
├── MainContent
│   ├── Login (screen === 'login')
│   ├── Dashboard (screen === 'dashboard')
│   ├── ProfileForm (screen === 'create' || 'edit-profile')
│   └── Review (screen === 'review')
└── Footer (status, version)
```

---

## 📝 Component Specifications

## 1. Popup.jsx (Root Container)

**Responsibilities**:
- Initialize AppContext
- Detect if profile exists on mount
- Route to appropriate screen
- Provide global error handling

**State**:
```javascript
{
  currentScreen: 'login' | 'create' | 'dashboard' | 'edit-profile' | 'review',
  profile: Object | null,
  password: String | null,
  isUnlocked: Boolean,
  formData: Object | null,
  mappingResult: Object | null,
  error: String | null,
  loading: Boolean
}
```

**Effects**:
```javascript
useEffect(() => {
  // On mount: check if profile exists
  checkProfileExists()
    .then(exists => {
      if (exists) setScreen('login');
      else setScreen('create');
    });
}, []);
```

**NOT Responsible For**:
- Individual screen logic
- Form validation
- Direct storage operations

---

## 2. Login.jsx

**Responsibilities**:
- Password input
- Unlock profile
- Error display
- Link to reset/create profile

**Props**: None (uses AppContext)

**State**:
```javascript
{
  password: String,
  error: String | null,
  loading: Boolean
}
```

**Functions**:
```javascript
const handleUnlock = async () => {
  setLoading(true);
  try {
    const decrypted = await loadProfile(password);
    setProfile(decrypted);
    setIsUnlocked(true);
    setScreen('dashboard');
  } catch (error) {
    setError('Incorrect password');
  } finally {
    setLoading(false);
  }
};
```

**UI Elements**:
- Password input (type="password")
- "Unlock" button
- Error message area
- "Create New Profile" link

---

## 3. Dashboard.jsx

**Responsibilities**:
- Display profile stats
- Show quick actions
- Form detection status
- Navigation to other screens

**Props**: None (uses AppContext)

**State**:
```javascript
{
  storageUsage: Number,
  profileCompletion: Number,
  formsDetected: Number,
  loading: Boolean
}
```

**Effects**:
```javascript
useEffect(() => {
  // Calculate profile completion
  const completion = calculateCompletion(profile);
  setProfileCompletion(completion);
  
  // Get storage usage
  getStorageUsage().then(setStorageUsage);
  
  // Check for forms on current page
  requestFormScan();
}, []);
```

**Functions**:
```javascript
const handleScanPage = async () => {
  const formData = await requestFormScan();
  setFormData(formData);
};

const handleAutofill = async () => {
  const mapping = await mapProfileToForm(profile, formData);
  setMappingResult(mapping);
  setScreen('review');
};

const handleLock = () => {
  setProfile(null);
  setPassword(null);
  setIsUnlocked(false);
  setScreen('login');
};
```

**UI Elements**:
- Welcome message: "Hello, {firstName}!"
- Profile completion: "Profile {X}% complete"
- Storage meter: "{X} MB / 5 MB used"
- "Edit Profile" button
- "Scan Current Page" button
- "Autofill Form" button (enabled if forms detected)
- "Lock Profile" button

---

## 4. ProfileForm.jsx

**Responsibilities**:
- Display all 25 profile fields
- Form validation
- Save profile (encrypted)
- Handle file upload (resume)

**Props**:
```javascript
{
  mode: 'create' | 'edit',
  initialProfile: Object | null
}
```

**State**:
```javascript
{
  formData: {
    personal: { ... },
    education: { ... },
    experience: { ... },
    links: { ... },
    documents: { ... }
  },
  password: String,
  passwordConfirm: String,
  errors: Object,
  loading: Boolean
}
```

**Validation Rules**:
```javascript
const validate = (formData) => {
  const errors = {};
  
  // Email required and valid format
  if (!formData.personal.email) {
    errors.email = 'Email is required';
  } else if (!isValidEmail(formData.personal.email)) {
    errors.email = 'Invalid email format';
  }
  
  // Phone optional but valid format if provided
  if (formData.personal.phone && !isValidPhone(formData.personal.phone)) {
    errors.phone = 'Invalid phone format';
  }
  
  // URLs must be valid if provided
  ['linkedin', 'github', 'portfolio', 'website'].forEach(field => {
    if (formData.links[field] && !isValidURL(formData.links[field])) {
      errors[field] = 'Invalid URL format';
    }
  });
  
  return errors;
};
```

**Functions**:
```javascript
const handleSave = async () => {
  // Validate
  const validationErrors = validate(formData);
  if (Object.keys(validationErrors).length > 0) {
    setErrors(validationErrors);
    return;
  }
  
  setLoading(true);
  try {
    // For 'create' mode, require password confirmation
    if (mode === 'create' && password !== passwordConfirm) {
      setErrors({ password: 'Passwords do not match' });
      return;
    }
    
    // Build profile object
    const profile = {
      version: '1.0',
      profile: formData,
      metadata: {
        createdAt: mode === 'create' ? new Date().toISOString() : initialProfile.metadata.createdAt,
        updatedAt: new Date().toISOString()
      }
    };
    
    // Save encrypted
    await saveProfile(profile, password);
    
    // Update context
    setProfile(profile);
    setPassword(password);
    setIsUnlocked(true);
    setScreen('dashboard');
  } catch (error) {
    setErrors({ general: error.message });
  } finally {
    setLoading(false);
  }
};

const handleFileUpload = (event) => {
  const file = event.target.files[0];
  if (!file) return;
  
  // Validate file size (2MB)
  if (file.size > 2 * 1024 * 1024) {
    setErrors({ resume: 'File too large (max 2MB)' });
    return;
  }
  
  // Validate file type
  const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (!allowedTypes.includes(file.type)) {
    setErrors({ resume: 'Invalid file type (PDF, DOC, DOCX only)' });
    return;
  }
  
  // Read file as base64
  const reader = new FileReader();
  reader.onload = () => {
    setFormData(prev => ({
      ...prev,
      documents: { resume: reader.result }
    }));
  };
  reader.readAsDataURL(file);
};
```

**UI Sections**:

### Personal Information (9 fields)
- First Name (text)
- Last Name (text)
- Email (email) *required
- Phone (tel)
- Address (text)
- City (text)
- State (text)
- ZIP Code (text)
- Country (text)

### Education (5 fields)
- Degree (text)
- Major (text)
- University (text)
- Graduation Year (number)
- GPA (text)

### Experience (4 fields)
- Current Role (text)
- Current Company (text)
- Years of Experience (number)
- Skills (textarea)

### Links (4 fields)
- LinkedIn (url)
- GitHub (url)
- Portfolio (url)
- Website (url)

### Documents (1 field)
- Resume (file)

---

## 5. Review.jsx

**Responsibilities**:
- Display matched fields
- Show confidence scores
- Allow inline editing
- Confirm and trigger autofill

**Props**: None (uses AppContext)

**State**:
```javascript
{
  editedMatches: Array,
  showUnmatched: Boolean
}
```

**Functions**:
```javascript
const handleConfirm = async () => {
  // Send matches to content script for autofill (Phase 7)
  await chrome.tabs.sendMessage(tabId, {
    action: 'AUTOFILL',
    matches: editedMatches
  });
  
  // Show success and return to dashboard
  setScreen('dashboard');
};

const handleEditMatch = (matchIndex, newValue) => {
  setEditedMatches(prev => {
    const updated = [...prev];
    updated[matchIndex].profileValue = newValue;
    return updated;
  });
};
```

**UI Elements**:

### Match List
For each match:
- Field label (form field name)
- Current value (from profile)
- Confidence badge (green >=0.8, yellow 0.6-0.8)
- Edit icon (allows inline edit)
- Matched on indicator (label/placeholder/name)

### Unmatched Fields Section
- Collapsible section
- List of form fields with no match
- Manual input option

### Actions
- "Confirm & Autofill" button (primary)
- "Cancel" button (secondary)
- Warning banner if any match < 0.8 confidence

---

## 📊 State Flow Diagram

```
APP MOUNT
  ↓
Check Profile Exists?
  │
  ├── YES → LOGIN SCREEN
  │           ↓
  │       Enter Password
  │           ↓
  │       Decrypt Profile
  │           ↓
  └── NO → CREATE PROFILE SCREEN
              ↓
          Fill Form + Password
              ↓
          Encrypt & Save
              ↓
          DASHBOARD
              │
              ├── Edit Profile → PROFILE FORM → Save → DASHBOARD
              ├── Scan Page → Get formData → DASHBOARD
              ├── Autofill → Map fields → REVIEW → Confirm → Execute (Phase 7)
              └── Lock → Clear state → LOGIN SCREEN
```

---

## 🎨 Styling Guidelines

### Layout
```css
.popup-container {
  width: 400px;
  min-height: 500px;
  max-height: 600px;
  overflow-y: auto;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.header {
  padding: 16px;
  background: #007bff;
  color: white;
  border-bottom: 2px solid #0056b3;
}

.content {
  padding: 24px;
}

.footer {
  padding: 12px;
  background: #f8f9fa;
  text-align: center;
  font-size: 12px;
  color: #6c757d;
}
```

### Buttons
```css
.btn {
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-primary:hover {
  background: #0056b3;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-danger {
  background: #dc3545;
  color: white;
}
```

### Inputs
```css
.input-group {
  margin-bottom: 16px;
}

.input-label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 500;
  color: #212529;
}

.input-field {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ced4da;
  border-radius: 8px;
  font-size: 14px;
}

.input-field:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0,123,255,0.1);
}

.input-error {
  color: #dc3545;
  font-size: 12px;
  margin-top: 4px;
}
```

### Confidence Badges
```css
.confidence-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.confidence-high {
  background: #d4edda;
  color: #155724;
}

.confidence-medium {
  background: #fff3cd;
  color: #856404;
}

.confidence-low {
  background: #f8d7da;
  color: #721c24;
}
```

---

## 🔌 Integration Points

### With Phase 3 (Storage)
```javascript
import { saveProfile, loadProfile, deleteProfile } from './storage/profileStore.js';

// In Login.jsx
const profile = await loadProfile(password);

// In ProfileForm.jsx
await saveProfile(profile, password);
```

### With Phase 4 (Scanner)
```javascript
// In Dashboard.jsx
const requestFormScan = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const response = await chrome.tabs.sendMessage(tab.id, { action: 'SCAN_PAGE' });
  return response.formData;
};
```

### With Phase 5 (Mapper)
```javascript
import { mapProfileToForm } from './engine/mapper.js';

// In Dashboard.jsx (before Review screen)
const mapping = mapProfileToForm(profile, formData);
setMappingResult(mapping);
```

### With Phase 7 (Executor)
```javascript
// In Review.jsx
const handleConfirm = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  await chrome.tabs.sendMessage(tab.id, {
    action: 'AUTOFILL',
    matches: editedMatches
  });
};
```

---

## ✅ Design Validation Checklist

- [x] Component hierarchy defined
- [x] State management strategy clear
- [x] Screen routing logic specified
- [x] All props and state documented
- [x] Integration points mapped
- [x] Styling guidelines complete
- [x] Validation rules defined
- [x] Error handling planned
- [x] No overengineering
- [x] Follows global rules

---

## 🚫 What This Module Does NOT Do

- ❌ Actual form filling (Phase 7)
- ❌ Form scanning (Phase 4)
- ❌ Field mapping (Phase 5)
- ❌ Complex animations
- ❌ Multiple profiles
- ❌ Cloud sync
- ❌ Dark mode

---

## 🎯 Success Criteria for Design Phase

- [x] All components specified
- [x] State flow documented
- [x] Integration clear
- [x] UI/UX guidelines defined
- [x] No ambiguity in implementation

---

## ⏭️ Ready for Implementation Phase

**Design Status**: ✅ COMPLETE  
**Next Step**: PHASE 6 - IMPLEMENTATION  

**Implementation will create**:
- `src/ui/Popup.jsx`
- `src/ui/Login.jsx`
- `src/ui/Dashboard.jsx`
- `src/ui/ProfileForm.jsx`
- `src/ui/Review.jsx`
- `src/ui/styles.css`
- Update `src/index.js`
- Update `public/index.html`
- Atomic commits per component

---

**Design Approved**: Ready to proceed to implementation.
