# 🟦 PHASE 6 - REACT POPUP UI (PLANNING)

## 📋 Objective
Build a complete React-based popup UI for profile management, form field review, autofill triggering, and storage management with password protection and intuitive user experience.

## 🎯 Expected Output
1. **Popup.jsx** - Main container component with routing
2. **ProfileForm.jsx** - Profile creation/editing form (all 25 fields)
3. **Review.jsx** - Review matched fields before autofill
4. **Login.jsx** - Password entry for decryption
5. **Dashboard.jsx** - Quick actions and status
6. Responsive design (320px - 800px width)
7. Form validation and error handling
8. Loading states and user feedback
9. Password-protected profile access
10. Clear, intuitive navigation

## 🎨 UI Components Overview

### 1. Login Screen (Initial State)
**Purpose**: Password entry to decrypt profile
- Password input field (type="password")
- "Unlock Profile" button
- "Create New Profile" link
- Error messages for wrong password
- Loading spinner during decryption

### 2. Dashboard (Main Screen)
**Purpose**: Quick actions and status overview
- Welcome message with user's name
- Profile completion percentage
- Quick stats (fields filled, last updated)
- "Edit Profile" button
- "Scan Current Page" button
- "Autofill Form" button (if form detected)
- "Lock Profile" button (encrypt and close)
- Storage usage indicator

### 3. Profile Form (Create/Edit)
**Purpose**: Create or edit all 25 profile fields
**Sections**:
- Personal Information (9 fields)
- Education (5 fields)
- Experience (4 fields)
- Links (4 fields)
- Documents (1 file upload)

**Features**:
- Multi-step wizard OR single scrollable form
- Real-time validation
- Field hints/placeholders
- Save button (encrypts and stores)
- Cancel button (discard changes)
- Password confirmation on first save

### 4. Review Screen (Before Autofill)
**Purpose**: Review and confirm matched fields
- List of matched fields with confidence scores
- Color coding (green=high, yellow=medium)
- Edit inline capability
- Unmatched form fields highlighted
- "Confirm & Autofill" button
- "Cancel" button
- Warning for low confidence matches

### 5. Success/Error Modals
- Success confirmation after autofill
- Error messages for failures
- Storage quota warnings
- CAPTCHA detection alerts

## 🔄 User Flows

### Flow 1: First-Time User (No Profile)
```
1. Open popup
2. See "Create Profile" screen
3. Enter password (twice for confirmation)
4. Fill profile form (all 25 fields)
5. Click "Save Profile"
6. Profile encrypted and stored
7. Redirect to Dashboard
```

### Flow 2: Returning User (Profile Exists)
```
1. Open popup
2. See Login screen
3. Enter password
4. Profile decrypted
5. See Dashboard
6. Click "Scan Current Page" (optional)
7. See form detection results
8. Click "Autofill Form"
9. See Review screen
10. Confirm matches
11. Autofill executed (Phase 7)
12. Success message
```

### Flow 3: Edit Profile
```
1. From Dashboard, click "Edit Profile"
2. Enter password (re-authentication)
3. See Profile Form with current values
4. Edit fields
5. Click "Save"
6. Profile re-encrypted and stored
7. Back to Dashboard
```

### Flow 4: Delete Profile
```
1. From Dashboard, click "Settings" or "Delete Profile"
2. Confirm deletion (modal)
3. Profile deleted from storage
4. Redirect to "Create Profile" screen
```

## ⚠️ Risks Identified

### 1. React Complexity
- **Risk**: Overengineering with too many components
- **Mitigation**: Keep components simple, max 5 components
- **Stop Condition**: If component tree > 3 levels deep

### 2. State Management
- **Risk**: Complex state across components
- **Mitigation**: Use React Context for global state (profile, password)
- **Limitation**: No Redux/MobX (keep it simple)

### 3. Password Re-entry UX
- **Risk**: Users frustrated by repeated password entry
- **Mitigation**: Keep decrypted profile in memory during session
- **Security**: Clear on popup close (Chrome handles this)

### 4. Form Validation Performance
- **Risk**: Real-time validation causing lag
- **Mitigation**: Debounce validation (300ms)
- **Stop Condition**: If input lag > 100ms

### 5. Large Profile Forms
- **Risk**: 25 fields overwhelming users
- **Mitigation**: Multi-step wizard OR collapsible sections
- **TODO**: User test which approach is better

### 6. File Upload (Resume)
- **Risk**: Chrome extension file handling unclear
- **Mitigation**: Use FileReader API
- **Stop Condition**: If file access restricted by Chrome

### 7. Popup Size Constraints
- **Risk**: Content doesn't fit in popup
- **Mitigation**: Fixed height with scrolling
- **Standard**: 320px min width, 600px max height

## 🔍 Edge Cases

### Edge Case 1: Password Mismatch
- **Scenario**: User enters wrong password
- **Handling**: Show error, allow 3 attempts, then reset option
- **UI**: Red error message, "Forgot password? Reset profile"

### Edge Case 2: Empty Profile Fields
- **Scenario**: User saves profile with some fields empty
- **Handling**: Allow it (optional fields), show completion %
- **Validation**: Only email required

### Edge Case 3: No Forms on Page
- **Scenario**: User clicks "Autofill" but no forms detected
- **Handling**: Show message "No forms found on this page"
- **UI**: Disable "Autofill" button if no forms

### Edge Case 4: Storage Quota Exceeded
- **Scenario**: Profile + encrypted data > 5MB
- **Handling**: Show error before save, suggest removing resume
- **UI**: Storage meter warning at 80%

### Edge Case 5: Popup Closed During Save
- **Scenario**: User closes popup while saving
- **Handling**: Save operation completes (async)
- **TODO**: Test Chrome's behavior

### Edge Case 6: Multiple Forms on Page
- **Scenario**: Page has multiple forms
- **Handling**: Show dropdown to select which form
- **UI**: "Select form to autofill: [dropdown]"

### Edge Case 7: Low Confidence Matches
- **Scenario**: All matches below 0.8 confidence
- **Handling**: Show warning, require explicit confirmation
- **UI**: Yellow warning banner, "Review required"

## 📁 Files to Create/Modify

### New Files
1. `src/ui/Popup.jsx` - Main container
2. `src/ui/Login.jsx` - Password entry
3. `src/ui/Dashboard.jsx` - Main screen
4. `src/ui/ProfileForm.jsx` - Profile editor
5. `src/ui/Review.jsx` - Match review
6. `src/ui/components/Button.jsx` - Reusable button
7. `src/ui/components/Input.jsx` - Reusable input
8. `src/ui/components/ProgressBar.jsx` - Progress indicator
9. `src/ui/styles.css` - Global styles
10. `PHASE_6_DESIGN.md` - Design documentation

### Modified Files
- `src/index.js` - React render entry point
- `public/index.html` - Popup HTML template
- `webpack.config.js` - React JSX loader configuration

## 🏗️ Component Structure

```
src/ui/
├── Popup.jsx (Main Container)
│   ├── AppContext (profile, password, formData)
│   ├── Router (screen state)
│   └── Layout (header, content, footer)
│
├── screens/
│   ├── Login.jsx
│   │   ├── PasswordInput
│   │   ├── UnlockButton
│   │   └── CreateProfileLink
│   │
│   ├── Dashboard.jsx
│   │   ├── WelcomeMessage
│   │   ├── ProfileStats
│   │   ├── ActionButtons
│   │   └── StorageMeter
│   │
│   ├── ProfileForm.jsx
│   │   ├── PersonalSection
│   │   ├── EducationSection
│   │   ├── ExperienceSection
│   │   ├── LinksSection
│   │   ├── DocumentsSection
│   │   └── SaveButton
│   │
│   └── Review.jsx
│       ├── MatchList
│       ├── ConfidenceIndicator
│       ├── UnmatchedFields
│       └── ConfirmButton
│
└── components/
    ├── Button.jsx
    ├── Input.jsx
    ├── ProgressBar.jsx
    └── Modal.jsx
```

## 📊 Data Flow

```
1. Popup Opens
   ↓
2. Check chrome.storage for encrypted profile
   ↓
   Has profile? → Login Screen → Enter Password
   No profile? → Create Profile Screen
   ↓
3. Profile Decrypted → Store in AppContext
   ↓
4. Dashboard Screen
   ↓
5. User Action:
   - Edit Profile → ProfileForm → Save → Re-encrypt → Dashboard
   - Scan Page → Get formData from background → Dashboard
   - Autofill → Get matches from mapper → Review → Confirm → Execute (Phase 7)
   - Lock → Clear context → Close popup
```

## 🎨 UI/UX Requirements

### Design Principles
- Clean, minimal interface
- Clear visual hierarchy
- Obvious CTAs (Call To Action)
- Instant feedback for all actions
- No jargon, plain language

### Color Scheme
- **Primary**: Blue (#007bff) - Actions, CTAs
- **Success**: Green (#28a745) - High confidence, success
- **Warning**: Yellow/Orange (#ffc107) - Medium confidence, warnings
- **Danger**: Red (#dc3545) - Errors, delete actions
- **Text**: Dark gray (#212529)
- **Background**: White/Light gray (#f8f9fa)

### Typography
- **Font**: System fonts (no external fonts)
- **Sizes**: 
  - Headings: 18px, 16px, 14px
  - Body: 14px
  - Small: 12px

### Spacing
- Base unit: 8px
- Padding: 8px, 16px, 24px
- Margins: 8px, 16px

### Interactive Elements
- Buttons: 36px height, 12px border-radius
- Inputs: 40px height, 8px border-radius
- Hover states: Slight darken
- Focus states: Blue outline

## ✅ Validation Rules

### Password
- Minimum 8 characters
- At least 1 letter
- At least 1 number
- Show strength indicator

### Email
- Valid email format (regex)
- Required field

### Phone
- Optional format validation
- Allow various formats

### URLs (LinkedIn, GitHub, etc.)
- Valid URL format
- Must start with http:// or https://

### File Upload (Resume)
- Max size: 2MB
- Allowed types: .pdf, .doc, .docx
- Show file name after upload

## 🧪 Testing Strategy

### Manual Tests

**Test 1: First-Time User Flow**
1. Open popup (no profile exists)
2. Create profile with password
3. Fill all fields
4. Save profile
5. Verify encryption
6. Reopen popup
7. Enter password
8. Verify decryption

**Test 2: Edit Profile**
1. Open popup (profile exists)
2. Enter password
3. Navigate to Dashboard
4. Click "Edit Profile"
5. Modify fields
6. Save
7. Verify changes persisted

**Test 3: Autofill Flow**
1. Navigate to page with form
2. Open popup
3. Enter password
4. Click "Scan Page"
5. Verify form detected
6. Click "Autofill"
7. Review matches
8. Confirm (Phase 7 execution)

**Test 4: Password Error Handling**
1. Open popup
2. Enter wrong password
3. Verify error message
4. Try correct password
5. Verify success

**Test 5: Storage Quota Warning**
1. Fill profile with large data
2. Upload large resume file
3. Verify storage meter updates
4. Save profile
5. Check for quota warnings

## 🚀 Success Criteria for Phase 6

- [ ] Popup opens without errors
- [ ] Login screen functional
- [ ] Profile creation works (all 25 fields)
- [ ] Profile editing works
- [ ] Password encryption/decryption works
- [ ] Dashboard shows correct stats
- [ ] Review screen displays matches
- [ ] Form validation working
- [ ] Error handling graceful
- [ ] UI responsive (320px - 800px)
- [ ] No console errors
- [ ] Clean, readable code
- [ ] All global rules followed

## 🔄 Dependencies

### Depends On:
- Phase 2 ✅ (encryption utilities)
- Phase 3 ✅ (profile storage)
- Phase 4 ✅ (form scanner)
- Phase 5 ✅ (field mapper)

### Required By:
- Phase 7 (Autofill Executor - triggered from Review screen)

## 📝 Notes

- Keep components simple (< 200 lines each)
- Use functional components with hooks
- No class components
- Use React Context for global state
- No external UI libraries (no Material-UI, etc.)
- Vanilla CSS (no CSS-in-JS)
- Focus on functionality over aesthetics
- Mobile-first responsive design

## 🎯 Out of Scope for Phase 6

- ❌ Actual form filling (Phase 7)
- ❌ Adapter implementations (Phase 8)
- ❌ Advanced animations
- ❌ Internationalization (i18n)
- ❌ Dark mode
- ❌ Multiple profiles
- ❌ Profile export/import
- ❌ Cloud sync

---

## ⏭️ Next Steps After Planning Approval

1. Move to PHASE 6 - DESIGN
2. Define exact component hierarchy
3. Design state management strategy
4. Define prop interfaces
5. Create wireframes (text-based)
6. Commit design document
7. Move to PHASE 6 - IMPLEMENTATION

---

**Status**: ⏸️ AWAITING APPROVAL TO PROCEED TO DESIGN PHASE
