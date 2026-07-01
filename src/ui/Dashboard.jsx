import React, { useState, useEffect } from 'react';
import { useAppContext } from './Popup.jsx';
import { simpleMapProfileToForm } from '../engine/simpleMapper.js';

function Dashboard() {
  const {
    profile,
    setCurrentScreen,
    setFormData,
    setMappingResult,
    resetState
  } = useAppContext();

  const [storageUsage, setStorageUsage] = useState(0);
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [formsDetected, setFormsDetected] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [lastScannedUrl, setLastScannedUrl] = useState('');

  useEffect(() => {
    calculateProfileCompletion();
    getStorageUsage();
    checkForForms();
  }, []);

  const calculateProfileCompletion = () => {
    if (!profile || !profile.profile) { setProfileCompletion(0); return; }
    let filled = 0, total = 0;
    const walk = (obj) => {
      for (const k in obj) {
        if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
          walk(obj[k]);
        } else {
          total++;
          if (obj[k] && obj[k] !== '' && (!Array.isArray(obj[k]) || obj[k].length > 0)) filled++;
        }
      }
    };
    walk(profile.profile);
    setProfileCompletion(total > 0 ? Math.round((filled / total) * 100) : 0);
  };

  const getStorageUsage = async () => {
    try {
      const result = await chrome.storage.local.getBytesInUse(null);
      setStorageUsage((result / (1024 * 1024)).toFixed(2));
    } catch (err) { console.error('[Dashboard] Storage error:', err); }
  };

  const checkForForms = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) return;
      const response = await chrome.runtime.sendMessage({ action: 'GET_LAST_SCANNED_DATA' });
      if (response && response.formData && response.formData.url === tab.url) {
        setFormData(response.formData);
        setFormsDetected(response.formData.forms ? response.formData.forms.length : 0);
        setLastScannedUrl(tab.url);
      }
    } catch (err) { console.error('[Dashboard] checkForForms error:', err); }
  };

  const handleScanPage = async () => {
    setScanning(true);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) { alert('No active tab found'); return; }

      console.log('[Dashboard] Scanning tab:', tab.id, tab.url);
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'SCAN_PAGE' });

      if (response && response.success) {
        await new Promise(r => setTimeout(r, 300));
        const bgResponse = await chrome.runtime.sendMessage({ action: 'GET_LAST_SCANNED_DATA' });
        if (bgResponse && bgResponse.formData) {
          setFormData(bgResponse.formData);
          const numForms = bgResponse.formData.forms ? bgResponse.formData.forms.length : 0;
          setFormsDetected(numForms);
          setLastScannedUrl(tab.url);
          if (numForms === 0) alert('Page scanned — no forms found.');
          else console.log('[Dashboard] Detected', numForms, 'form(s)');
        }
      } else {
        alert('No forms detected on this page');
      }
    } catch (err) {
      console.error('[Dashboard] Scan failed:', err);
      if (err.message && err.message.includes('Could not establish connection')) {
        alert('⚠️ Refresh the page, then click Scan Page again.');
      } else {
        alert('Scan failed: ' + err.message);
      }
    } finally {
      setScanning(false);
    }
  };

  const handleAutofill = async () => {
    try {
      // 1. Get scanned form data
      const response = await chrome.runtime.sendMessage({ action: 'GET_LAST_SCANNED_DATA' });
      console.log('[Dashboard] GET_LAST_SCANNED_DATA response:', response);

      if (!response || !response.formData) {
        alert('Please scan the page first (click Scan Page)');
        return;
      }
      if (!response.formData.forms || response.formData.forms.length === 0) {
        alert('No forms detected. Click Scan Page first.');
        return;
      }

      // 2. Unwrap profile — always use the inner object
      const innerProfile = profile?.profile ?? profile;
      console.log('[Dashboard] innerProfile keys:', innerProfile ? Object.keys(innerProfile) : 'NULL');
      console.log('[Dashboard] formData forms:', response.formData.forms.length);
      console.log('[Dashboard] formData fields:', response.formData.forms[0]?.fields?.map(f => `${f.label}(${f.type})`));

      // 3. Run simple keyword mapper
      const mapping = simpleMapProfileToForm(innerProfile, response.formData);
      console.log('[Dashboard] Mapping result:', mapping);

      if (!mapping.matches || mapping.matches.length === 0) {
        // Show detailed debug info
        const fieldSummary = response.formData.forms
          .flatMap(f => f.fields)
          .map(f => `  • label="${f.label}" name="${f.name}" type="${f.type}"`)
          .join('\n');
        console.error('[Dashboard] 0 matches. Detected fields:\n' + fieldSummary);
        alert(
          `No fields matched.\n\nDetected fields:\n${fieldSummary}\n\n` +
          `Check console (F12) for detailed matching log.`
        );
        return;
      }

      // 4. Go to review screen
      setMappingResult(mapping);
      setCurrentScreen('review');
    } catch (err) {
      console.error('[Dashboard] Autofill error:', err);
      alert('Autofill error: ' + err.message);
    }
  };

  const handleEditProfile = () => setCurrentScreen('edit-profile');

  const handleLock = () => {
    if (confirm('Lock profile and close popup?')) { resetState(); window.close(); }
  };

  const getFirstName = () => profile?.profile?.personal?.firstName || 'User';

  const safeHostname = (url) => {
    try { return new URL(url).hostname; } catch { return url; }
  };

  return (
    <div className="content">
      <div className="welcome-section">
        <h2 className="welcome-title">Hello, {getFirstName()}! 👋</h2>
        <p className="welcome-subtitle">Ready to autofill job applications</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{profileCompletion}%</div>
          <div className="stat-label">Profile Complete</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{formsDetected}</div>
          <div className="stat-label">Forms Detected</div>
        </div>
      </div>

      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${profileCompletion}%` }}></div>
      </div>
      <div className="progress-text mb-24">{profileCompletion}% of profile fields filled</div>

      <div className="btn-group">
        <button className="btn btn-primary" onClick={handleEditProfile}>✏️ Edit Profile</button>
        <button className="btn btn-secondary" onClick={handleScanPage} disabled={scanning}>
          {scanning ? '🔄 Scanning...' : '🔍 Scan Page'}
        </button>
      </div>

      <button
        className="btn btn-success btn-block mt-16"
        onClick={handleAutofill}
        disabled={formsDetected === 0}
      >
        ⚡ Autofill Form{formsDetected !== 1 ? 's' : ''}
      </button>

      <button className="btn btn-secondary btn-block mt-16" onClick={handleLock}>
        🔒 Lock Profile
      </button>

      <div className="storage-meter">
        <div className="storage-bar">
          <div
            className={`storage-fill${storageUsage > 4 ? ' danger' : storageUsage > 3 ? ' warning' : ''}`}
            style={{ width: `${(storageUsage / 5) * 100}%` }}
          />
        </div>
        <div className="storage-text">Storage: {storageUsage} MB / 5 MB used</div>
      </div>

      {lastScannedUrl && (
        <div className="mt-16 text-center text-muted" style={{ fontSize: '12px' }}>
          Last scanned: {safeHostname(lastScannedUrl)}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
