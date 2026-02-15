import React, { useState, useEffect } from 'react';
import { useAppContext } from './Popup.jsx';
import { mapProfileToForm } from '../engine/mapper.js';

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
    if (!profile || !profile.profile) {
      setProfileCompletion(0);
      return;
    }

    let filledFields = 0;
    let totalFields = 0;

    const checkFields = (obj) => {
      for (const key in obj) {
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          checkFields(obj[key]);
        } else {
          totalFields++;
          if (obj[key] && obj[key] !== '' && (!Array.isArray(obj[key]) || obj[key].length > 0)) {
            filledFields++;
          }
        }
      }
    };

    checkFields(profile.profile);
    const percentage = totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;
    setProfileCompletion(percentage);
  };

  const getStorageUsage = async () => {
    try {
      const result = await chrome.storage.local.getBytesInUse(null);
      const usageMB = (result / (1024 * 1024)).toFixed(2);
      setStorageUsage(usageMB);
    } catch (err) {
      console.error('[Dashboard] Failed to get storage usage:', err);
    }
  };

  const checkForForms = async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) return;

      // Request last scanned data from background
      const response = await chrome.runtime.sendMessage({ action: 'GET_LAST_SCANNED_DATA' });
      if (response && response.formData && response.formData.url === tab.url) {
        setFormData(response.formData);
        setFormsDetected(response.formData.forms ? response.formData.forms.length : 0);
        setLastScannedUrl(tab.url);
      }
    } catch (err) {
      console.error('[Dashboard] Failed to check for forms:', err);
    }
  };

  const handleScanPage = async () => {
    setScanning(true);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        alert('No active tab found');
        return;
      }

      // Wait a moment for scanner to run
      await new Promise(resolve => setTimeout(resolve, 500));

      // Get scanned data
      const response = await chrome.runtime.sendMessage({ action: 'GET_LAST_SCANNED_DATA' });
      if (response && response.formData) {
        setFormData(response.formData);
        setFormsDetected(response.formData.forms ? response.formData.forms.length : 0);
        setLastScannedUrl(tab.url);
      } else {
        setFormsDetected(0);
        alert('No forms detected on this page');
      }
    } catch (err) {
      console.error('[Dashboard] Scan failed:', err);
      alert('Failed to scan page');
    } finally {
      setScanning(false);
    }
  };

  const handleAutofill = async () => {
    try {
      // Get current form data
      const response = await chrome.runtime.sendMessage({ action: 'GET_LAST_SCANNED_DATA' });
      if (!response || !response.formData) {
        alert('Please scan the page first');
        return;
      }

      // Map profile to form
      const mapping = mapProfileToForm(profile, response.formData);
      setMappingResult(mapping);
      setCurrentScreen('review');
    } catch (err) {
      console.error('[Dashboard] Autofill failed:', err);
      alert('Failed to prepare autofill');
    }
  };

  const handleEditProfile = () => {
    setCurrentScreen('edit-profile');
  };

  const handleLock = () => {
    if (confirm('Lock profile and close popup?')) {
      resetState();
      window.close();
    }
  };

  const getFirstName = () => {
    return profile?.profile?.personal?.firstName || 'User';
  };

  const getStorageBarClass = () => {
    if (storageUsage > 4) return 'storage-fill danger';
    if (storageUsage > 3) return 'storage-fill warning';
    return 'storage-fill';
  };

  return (
    <div className="content">
      {/* Welcome Section */}
      <div className="welcome-section">
        <h2 className="welcome-title">Hello, {getFirstName()}! 👋</h2>
        <p className="welcome-subtitle">Ready to autofill job applications</p>
      </div>

      {/* Profile Stats */}
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

      {/* Progress Bar */}
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${profileCompletion}%` }}></div>
      </div>
      <div className="progress-text mb-24">{profileCompletion}% of profile fields filled</div>

      {/* Action Buttons */}
      <div className="btn-group">
        <button
          className="btn btn-primary"
          onClick={handleEditProfile}
        >
          ✏️ Edit Profile
        </button>
        <button
          className="btn btn-secondary"
          onClick={handleScanPage}
          disabled={scanning}
        >
          {scanning ? 'Scanning...' : '🔍 Scan Page'}
        </button>
      </div>

      <button
        className="btn btn-success btn-block mt-16"
        onClick={handleAutofill}
        disabled={formsDetected === 0}
      >
        ⚡ Autofill Form{formsDetected !== 1 ? 's' : ''}
      </button>

      <button
        className="btn btn-secondary btn-block mt-16"
        onClick={handleLock}
      >
        🔒 Lock Profile
      </button>

      {/* Storage Meter */}
      <div className="storage-meter">
        <div className="storage-bar">
          <div className={getStorageBarClass()} style={{ width: `${(storageUsage / 5) * 100}%` }}></div>
        </div>
        <div className="storage-text">
          Storage: {storageUsage} MB / 5 MB used
        </div>
      </div>

      {lastScannedUrl && (
        <div className="mt-16 text-center text-muted" style={{ fontSize: '12px' }}>
          Last scanned: {new URL(lastScannedUrl).hostname}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
