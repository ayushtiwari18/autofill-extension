import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from './Popup.jsx';
import { initializeProfile, saveProfile } from '../storage/profileStore.js';

const DRAFT_KEY = 'autofill_profile_draft';

// ── chrome.storage.local draft helpers ──────────────────────────────────────
async function saveDraft(data) {
  try {
    await chrome.storage.local.set({ [DRAFT_KEY]: data });
    console.log('[ProfileForm] Draft saved to chrome.storage.local');
  } catch (e) {
    console.warn('[ProfileForm] Draft save failed:', e.message);
  }
}

async function loadDraft() {
  try {
    const result = await chrome.storage.local.get(DRAFT_KEY);
    if (result[DRAFT_KEY]) {
      console.log('[ProfileForm] Draft restored from chrome.storage.local');
      return result[DRAFT_KEY];
    }
  } catch (e) {
    console.warn('[ProfileForm] Draft load failed:', e.message);
  }
  return null;
}

async function clearDraft() {
  try {
    await chrome.storage.local.remove(DRAFT_KEY);
    console.log('[ProfileForm] Draft cleared from chrome.storage.local');
  } catch (e) {}
}
// ────────────────────────────────────────────────────────────────────────────

function ProfileForm({ mode, initialProfile = null }) {
  const { setProfile, setPassword, setIsUnlocked, setCurrentScreen } = useAppContext();

  const [formData, setFormData] = useState(
    initialProfile?.profile || initializeProfile().profile
  );
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [resumeFileName, setResumeFileName] = useState('');
  const [draftSaved, setDraftSaved] = useState(false);
  const draftTimer = useRef(null);

  // isFirstRender: skip saving on the very first mount render only.
  // Completely independent of whether a draft exists — fixes the old
  // broken guard (!draftLoaded && !initialProfile) that prevented ALL saves.
  const isFirstRender = useRef(true);

  // On mount: restore draft from chrome.storage.local
  useEffect(() => {
    loadDraft().then(draft => {
      if (draft) {
        setFormData(draft);
        setDraftLoaded(true);
        console.log('[ProfileForm] Restored draft — unsaved data recovered');
      } else {
        console.log('[ProfileForm] No draft found — starting fresh form');
      }
    });
  }, []);

  // Auto-save draft on every formData change (debounced 800ms).
  // Skip only the very first render (initial mount) using isFirstRender ref.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return; // skip initial mount — do not save empty default state
    }
    clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      saveDraft(formData).then(() => {
        setDraftSaved(true);
        setTimeout(() => setDraftSaved(false), 2000);
      });
    }, 800);
    return () => clearTimeout(draftTimer.current);
  }, [formData]);

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isValidURL = (url) => {
    try { new URL(url); return url.startsWith('http://') || url.startsWith('https://'); }
    catch { return false; }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.personal.email) newErrors.email = 'Email is required';
    else if (!isValidEmail(formData.personal.email)) newErrors.email = 'Invalid email format';
    ['linkedin', 'github', 'portfolio', 'website'].forEach(field => {
      if (formData.links[field] && !isValidURL(formData.links[field]))
        newErrors[field] = 'Invalid URL (must start with http:// or https://)';
    });
    if (mode === 'create') {
      if (!passwordInput) newErrors.password = 'Password is required';
      else if (passwordInput.length < 8) newErrors.password = 'Password must be at least 8 characters';
      if (passwordInput !== passwordConfirm) newErrors.passwordConfirm = 'Passwords do not match';
    }
    return newErrors;
  };

  const handleChange = (section, field, value) => {
    setFormData(prev => ({ ...prev, [section]: { ...prev[section], [field]: value } }));
    if (errors[field]) setErrors(prev => { const e = { ...prev }; delete e[field]; return e; });
  };

  // Resume upload: open options page (full tab) so file picker works without closing popup
  const handleResumeUploadClick = () => {
    console.log('[ProfileForm] Resume upload requested — opening options page');
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      chrome.tabs.create({ url: chrome.runtime.getURL('public/index.html') });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) { setErrors(validationErrors); return; }
    setLoading(true);
    try {
      const profileObj = {
        version: '1.0',
        profile: formData,
        metadata: {
          createdAt: mode === 'create' ? new Date().toISOString() : initialProfile.metadata.createdAt,
          updatedAt: new Date().toISOString()
        }
      };
      const pwd = mode === 'create'
        ? passwordInput
        : passwordInput || prompt('Enter your password to save changes:');
      if (!pwd) { setLoading(false); return; }
      await saveProfile(profileObj, pwd);
      await clearDraft();
      console.log('[ProfileForm] Profile saved, draft cleared');
      setProfile(profileObj);
      setPassword(pwd);
      setIsUnlocked(true);
      setCurrentScreen('dashboard');
    } catch (err) {
      console.error('[ProfileForm] Save failed:', err);
      setErrors({ general: err.message || 'Failed to save profile' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (mode === 'create') {
      if (confirm('Discard profile and exit? Draft will be deleted.')) {
        clearDraft();
        window.close();
      }
    } else {
      setCurrentScreen('dashboard');
    }
  };

  return (
    <div className="content">
      <h2 className="welcome-title">{mode === 'create' ? 'Create Your Profile' : 'Edit Profile'}</h2>
      <p className="welcome-subtitle mb-24">
        {mode === 'create' ? 'Fill in your information to get started' : 'Update your profile information'}
      </p>

      {draftLoaded && (
        <div className="alert alert-info mb-8" style={{fontSize:'12px',padding:'6px 10px',background:'var(--color-primary-highlight)',color:'var(--color-primary)'}}>
          ✦ Unsaved draft restored — your previous data is back
        </div>
      )}

      {draftSaved && (
        <div className="alert alert-success mb-8" style={{fontSize:'12px',padding:'6px 10px'}}>
          ✓ Draft auto-saved — safe to close popup
        </div>
      )}

      {errors.general && <div className="alert alert-error mb-16">{errors.general}</div>}

      <form onSubmit={handleSave}>
        {/* Personal */}
        <div className="form-section">
          <h3 className="form-section-title">👤 Personal Information</h3>
          <div className="input-group"><label htmlFor="firstName" className="input-label">First Name</label><input type="text" id="firstName" className="input-field" value={formData.personal.firstName} onChange={(e) => handleChange('personal', 'firstName', e.target.value)} placeholder="John" /></div>
          <div className="input-group"><label htmlFor="lastName" className="input-label">Last Name</label><input type="text" id="lastName" className="input-field" value={formData.personal.lastName} onChange={(e) => handleChange('personal', 'lastName', e.target.value)} placeholder="Doe" /></div>
          <div className="input-group">
            <label htmlFor="email" className="input-label required">Email</label>
            <input type="email" id="email" className="input-field" value={formData.personal.email} onChange={(e) => handleChange('personal', 'email', e.target.value)} placeholder="john.doe@example.com" />
            {errors.email && <div className="input-error">{errors.email}</div>}
          </div>
          <div className="input-group"><label htmlFor="phone" className="input-label">Phone</label><input type="tel" id="phone" className="input-field" value={formData.personal.phone} onChange={(e) => handleChange('personal', 'phone', e.target.value)} placeholder="+1 234-567-8900" /></div>
          <div className="input-group"><label htmlFor="address" className="input-label">Address</label><input type="text" id="address" className="input-field" value={formData.personal.address} onChange={(e) => handleChange('personal', 'address', e.target.value)} placeholder="123 Main Street" /></div>
          <div className="input-group"><label htmlFor="city" className="input-label">City</label><input type="text" id="city" className="input-field" value={formData.personal.city} onChange={(e) => handleChange('personal', 'city', e.target.value)} placeholder="New York" /></div>
          <div className="input-group"><label htmlFor="state" className="input-label">State / Province</label><input type="text" id="state" className="input-field" value={formData.personal.state} onChange={(e) => handleChange('personal', 'state', e.target.value)} placeholder="NY" /></div>
          <div className="input-group"><label htmlFor="zipCode" className="input-label">ZIP / Postal Code</label><input type="text" id="zipCode" className="input-field" value={formData.personal.zipCode} onChange={(e) => handleChange('personal', 'zipCode', e.target.value)} placeholder="10001" /></div>
          <div className="input-group"><label htmlFor="country" className="input-label">Country</label><input type="text" id="country" className="input-field" value={formData.personal.country} onChange={(e) => handleChange('personal', 'country', e.target.value)} placeholder="United States" /></div>
        </div>

        {/* Education */}
        <div className="form-section">
          <h3 className="form-section-title">🎓 Education</h3>
          <div className="input-group"><label htmlFor="degree" className="input-label">Degree</label><input type="text" id="degree" className="input-field" value={formData.education.degree} onChange={(e) => handleChange('education', 'degree', e.target.value)} placeholder="Bachelor of Science" /></div>
          <div className="input-group"><label htmlFor="major" className="input-label">Major / Field of Study</label><input type="text" id="major" className="input-field" value={formData.education.major} onChange={(e) => handleChange('education', 'major', e.target.value)} placeholder="Computer Science" /></div>
          <div className="input-group"><label htmlFor="university" className="input-label">University / College</label><input type="text" id="university" className="input-field" value={formData.education.university} onChange={(e) => handleChange('education', 'university', e.target.value)} placeholder="MIT" /></div>
          <div className="input-group"><label htmlFor="graduationYear" className="input-label">Graduation Year</label><input type="number" id="graduationYear" className="input-field" value={formData.education.graduationYear} onChange={(e) => handleChange('education', 'graduationYear', e.target.value)} placeholder="2024" min="1950" max="2050" /></div>
          <div className="input-group"><label htmlFor="gpa" className="input-label">GPA</label><input type="text" id="gpa" className="input-field" value={formData.education.gpa} onChange={(e) => handleChange('education', 'gpa', e.target.value)} placeholder="3.8" /></div>
        </div>

        {/* Experience */}
        <div className="form-section">
          <h3 className="form-section-title">💼 Experience</h3>
          <div className="input-group"><label htmlFor="currentRole" className="input-label">Current Role / Job Title</label><input type="text" id="currentRole" className="input-field" value={formData.experience.currentRole} onChange={(e) => handleChange('experience', 'currentRole', e.target.value)} placeholder="Software Engineer" /></div>
          <div className="input-group"><label htmlFor="currentCompany" className="input-label">Current Company</label><input type="text" id="currentCompany" className="input-field" value={formData.experience.currentCompany} onChange={(e) => handleChange('experience', 'currentCompany', e.target.value)} placeholder="Google" /></div>
          <div className="input-group"><label htmlFor="yearsOfExperience" className="input-label">Years of Experience</label><input type="number" id="yearsOfExperience" className="input-field" value={formData.experience.yearsOfExperience} onChange={(e) => handleChange('experience', 'yearsOfExperience', e.target.value)} placeholder="5" min="0" max="50" /></div>
          <div className="input-group">
            <label htmlFor="skills" className="input-label">Skills (comma-separated)</label>
            <textarea
              id="skills"
              className="input-field"
              value={Array.isArray(formData.experience.skills) ? formData.experience.skills.join(', ') : formData.experience.skills}
              onChange={(e) => {
                const skillsArray = e.target.value.split(',').map(s => s.trim()).filter(s => s);
                handleChange('experience', 'skills', skillsArray);
              }}
              placeholder="JavaScript, React, Node.js, Python"
            />
            <div style={{fontSize:'11px',color:'var(--color-text-muted)',marginTop:'4px'}}>Separate each skill with a comma</div>
          </div>
        </div>

        {/* Links */}
        <div className="form-section">
          <h3 className="form-section-title">🔗 Links</h3>
          <div className="input-group"><label htmlFor="linkedin" className="input-label">LinkedIn</label><input type="url" id="linkedin" className="input-field" value={formData.links.linkedin} onChange={(e) => handleChange('links', 'linkedin', e.target.value)} placeholder="https://linkedin.com/in/username" />{errors.linkedin && <div className="input-error">{errors.linkedin}</div>}</div>
          <div className="input-group"><label htmlFor="github" className="input-label">GitHub</label><input type="url" id="github" className="input-field" value={formData.links.github} onChange={(e) => handleChange('links', 'github', e.target.value)} placeholder="https://github.com/username" />{errors.github && <div className="input-error">{errors.github}</div>}</div>
          <div className="input-group"><label htmlFor="portfolio" className="input-label">Portfolio</label><input type="url" id="portfolio" className="input-field" value={formData.links.portfolio} onChange={(e) => handleChange('links', 'portfolio', e.target.value)} placeholder="https://portfolio.com" />{errors.portfolio && <div className="input-error">{errors.portfolio}</div>}</div>
          <div className="input-group"><label htmlFor="website" className="input-label">Website</label><input type="url" id="website" className="input-field" value={formData.links.website} onChange={(e) => handleChange('links', 'website', e.target.value)} placeholder="https://yourwebsite.com" />{errors.website && <div className="input-error">{errors.website}</div>}</div>
        </div>

        {/* Documents */}
        <div className="form-section">
          <h3 className="form-section-title">📄 Documents</h3>
          <div className="input-group">
            <label className="input-label">Resume (PDF, DOC, DOCX - Max 2MB)</label>
            <div style={{fontSize:'12px',color:'var(--color-warning)',marginBottom:'8px',padding:'8px 10px',background:'var(--color-warning-highlight)',borderRadius:'var(--radius-sm)',lineHeight:'1.5'}}>
              ⚠️ File picker closes the popup (Chrome limitation).<br/>
              Click below to open the <strong>full options page</strong> where resume upload works correctly.
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              style={{width:'100%'}}
              onClick={handleResumeUploadClick}
            >
              📎 Upload Resume (opens options page)
            </button>
            {resumeFileName && <div style={{fontSize:'12px',marginTop:'6px',color:'var(--color-success)'}}>✓ {resumeFileName}</div>}
            {errors.resume && <div className="input-error">{errors.resume}</div>}
          </div>
        </div>

        {/* Password (create mode only) */}
        {mode === 'create' && (
          <div className="form-section">
            <h3 className="form-section-title">🔐 Password</h3>
            <div className="input-group">
              <label htmlFor="password" className="input-label required">Password (min 8 characters)</label>
              <input type="password" id="password" className="input-field" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} placeholder="Enter password" />
              {errors.password && <div className="input-error">{errors.password}</div>}
            </div>
            <div className="input-group">
              <label htmlFor="passwordConfirm" className="input-label required">Confirm Password</label>
              <input type="password" id="passwordConfirm" className="input-field" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} placeholder="Confirm password" />
              {errors.passwordConfirm && <div className="input-error">{errors.passwordConfirm}</div>}
            </div>
          </div>
        )}

        <div className="btn-group mt-24">
          <button type="button" className="btn btn-secondary" onClick={handleCancel} disabled={loading}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save Profile'}</button>
        </div>
      </form>
    </div>
  );
}

export default ProfileForm;
