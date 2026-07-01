/**
 * Dashboard.jsx — SmartFill main screen
 * ─────────────────────────────────────────────────────────
 * FIXED: getStorageUsage() no longer calls chrome.storage.local.getBytesInUse()
 * (wrong store). Now estimates IDB usage via JSON.stringify of the profile
 * record, which is the only large object we write to IDB from the popup.
 * Real IDB quota estimation requires StorageManager.estimate() which we
 * call as a secondary source when available.
 */
import React, { useState, useEffect }     from 'react';
import { useAppContext }                   from './Popup.jsx';
import { simpleMapProfileToForm }          from '../engine/simpleMapper.js';

function Dashboard() {
  const {
    profile,
    setCurrentScreen,
    setFormData,
    setMappingResult,
    resetState,
  } = useAppContext();

  const [storageUsage, setStorageUsage]       = useState(0);
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [formsDetected, setFormsDetected]     = useState(0);
  const [scanning, setScanning]               = useState(false);
  const [lastScannedUrl, setLastScannedUrl]   = useState('');

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

  // FIXED: estimate IDB usage instead of querying chrome.storage.local
  const getStorageUsage = async () => {
    try {
      let bytes = 0;

      // Primary: StorageManager.estimate() gives real browser quota/usage
      if (navigator.storage && navigator.storage.estimate) {
        const est = await navigator.storage.estimate();
        bytes = est.usage || 0;
      } else if (profile) {
        // Fallback: estimate from profile JSON size
        bytes = new Blob([JSON.stringify(profile)]).size;
      }

      setStorageUsage((bytes / (1024 * 1024)).toFixed(2));
    } catch (err) {
      console.error('[Dashboard] Storage estimate error:', err);
      setStorageUsage('?');
    }
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
    } finally { setScanning(false); }
  };

  const handleAutofill = async () => {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'GET_LAST_SCANNED_DATA' });
      if (!response || !response.formData) {
        alert('Please scan the page first (click Scan Page)');
        return;
      }
      if (!response.formData.forms || response.formData.forms.length === 0) {
        alert('No forms detected. Click Scan Page first.');
        return;
      }
      const innerProfile = profile?.profile ?? profile;
      const mapping = simpleMapProfileToForm(innerProfile, response.formData);
      if (!mapping.matches || mapping.matches.length === 0) {
        const fieldSummary = response.formData.forms
          .flatMap(f => f.fields)
          .map(f => `  • label="${f.label}" name="${f.name}" type="${f.type}"`)
          .join('\n');
        alert(`No fields matched.\n\nDetected fields:\n${fieldSummary}\n\nCheck console (F12) for details.`);
        return;
      }
      setMappingResult(mapping);
      setCurrentScreen('review');
    } catch (err) {
      console.error('[Dashboard] Autofill error:', err);
      alert('Autofill error: ' + err.message);
    }
  };

  const handleEditProfile  = () => setCurrentScreen('edit-profile');
  const handleLock         = () => { if (confirm('Lock and close?')) { resetState(); window.close(); } };
  const getFirstName       = () => profile?.profile?.personal?.firstName || 'User';
  const safeHostname       = (url) => { try { return new URL(url).hostname; } catch { return url; } };

  return (
    <div className="content">
      <div className="welcome-section">
        <h2 className="welcome-title">Hello, {getFirstName()}! 👋</h2>
        <p className="welcome-subtitle">Ready to fill forms smarter</p>
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
        <div className="stat-card">
          <div className="stat-value">{storageUsage} MB</div>
          <div className="stat-label">IDB Usage</div>
        </div>
      </div>

      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${profileCompletion}%` }}></div>
      </div>
      <div className="progress-text mb-24">{profileCompletion}% profile complete</div>

      {lastScannedUrl && (
        <div className="alert alert-info" style={{ marginBottom: '12px', fontSize: '11px' }}>
          Last scanned: {safeHostname(lastScannedUrl)}
        </div>
      )}

      <div className="button-group">
        <button className="btn btn-secondary" onClick={handleScanPage} disabled={scanning}>
          {scanning ? '🔄 Scanning…' : '🔍 Scan Page'}
        </button>
        <button className="btn btn-primary" onClick={handleAutofill}>
          ⚡ Fill Form
        </button>
      </div>

      <div className="button-group" style={{ marginTop: '8px' }}>
        <button className="btn btn-secondary" onClick={handleEditProfile}>
          ✏️ Edit Profile
        </button>
        <button className="btn btn-secondary" onClick={handleLock}>
          🔒 Lock
        </button>
      </div>
    </div>
  );
}

export default Dashboard;
