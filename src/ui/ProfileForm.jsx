/**
 * ProfileForm — Create/Edit profile
 * Saves using plain JSON (no password required).
 */
import React, { useState, useEffect } from 'react';
import { useAppContext } from './Popup.jsx';
import { saveProfile, initializeProfile } from '../storage/profileStore.js';

function ProfileForm({ mode = 'create', initialProfile = null }) {
  const { setCurrentScreen, setProfile, profile: contextProfile } = useAppContext();

  const getInitial = () => {
    const base = initialProfile || contextProfile || initializeProfile();
    return base.profile || base;
  };

  const [form, setForm] = useState(getInitial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const set = (section, field, value) => {
    setForm(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value }
    }));
  };

  const handleSkillsChange = (value) => {
    const arr = value.split(',').map(s => s.trim()).filter(Boolean);
    setForm(prev => ({ ...prev, experience: { ...prev.experience, skills: arr } }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const fullProfile = {
        version: '1.0',
        profile: form,
        metadata: {
          createdAt: contextProfile?.metadata?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      };
      await saveProfile(fullProfile);
      setProfile(fullProfile);
      setSaved(true);
      setTimeout(() => { setCurrentScreen('dashboard'); }, 800);
    } catch (err) {
      alert('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const F = ({ label, section, field, type = 'text', placeholder = '' }) => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <input
        className="input-field"
        type={type}
        placeholder={placeholder}
        value={form[section]?.[field] || ''}
        onChange={e => set(section, field, e.target.value)}
      />
    </div>
  );

  return (
    <div className="content" style={{ maxHeight: '480px', overflowY: 'auto' }}>
      <h2 className="welcome-title">{mode === 'create' ? 'Create Profile' : 'Edit Profile'}</h2>

      <h3 className="form-section-title">👤 Personal</h3>
      <F label="First Name"     section="personal"  field="firstName"  placeholder="Ayush" />
      <F label="Last Name"      section="personal"  field="lastName"   placeholder="Tiwari" />
      <F label="Email"          section="personal"  field="email"      type="email" placeholder="ayush@example.com" />
      <F label="Phone"          section="personal"  field="phone"      type="tel"   placeholder="+91-98765-43210" />
      <F label="Address"        section="personal"  field="address"    placeholder="123 Main Street" />
      <F label="City"           section="personal"  field="city"       placeholder="Indore" />
      <F label="State"          section="personal"  field="state"      placeholder="Madhya Pradesh" />
      <F label="ZIP Code"       section="personal"  field="zipCode"    placeholder="452001" />
      <F label="Country"        section="personal"  field="country"    placeholder="India" />

      <h3 className="form-section-title">🎓 Education</h3>
      <F label="University"     section="education" field="university"      placeholder="IIT Indore" />
      <F label="Degree"         section="education" field="degree"          placeholder="B.Tech" />
      <F label="Major"          section="education" field="major"           placeholder="Computer Science" />
      <F label="Graduation Year" section="education" field="graduationYear" placeholder="2024" />
      <F label="GPA / CGPA"     section="education" field="gpa"             placeholder="8.5" />

      <h3 className="form-section-title">💼 Experience</h3>
      <F label="Current Role"       section="experience" field="currentRole"        placeholder="Software Engineer" />
      <F label="Current Company"    section="experience" field="currentCompany"     placeholder="Tech Corp" />
      <F label="Years of Experience" section="experience" field="yearsOfExperience" placeholder="2" />
      <div className="form-group">
        <label className="form-label">Skills (comma-separated)</label>
        <textarea
          className="input-field"
          placeholder="JavaScript, React, Node.js"
          value={Array.isArray(form.experience?.skills) ? form.experience.skills.join(', ') : ''}
          onChange={e => handleSkillsChange(e.target.value)}
          rows={2}
        />
      </div>

      <h3 className="form-section-title">🔗 Links</h3>
      <F label="LinkedIn"  section="links" field="linkedin"  placeholder="https://linkedin.com/in/..." />
      <F label="GitHub"    section="links" field="github"    placeholder="https://github.com/..." />
      <F label="Portfolio" section="links" field="portfolio" placeholder="https://yoursite.dev" />
      <F label="Website"   section="links" field="website"   placeholder="https://yoursite.dev" />

      <div className="btn-group mt-24">
        {mode === 'edit' && (
          <button className="btn btn-secondary" onClick={() => setCurrentScreen('dashboard')} disabled={saving}>
            Cancel
          </button>
        )}
        <button className="btn btn-success" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : saved ? '✅ Saved!' : '💾 Save Profile'}
        </button>
      </div>
    </div>
  );
}

export default ProfileForm;
