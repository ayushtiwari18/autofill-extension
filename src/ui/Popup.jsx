/**
 * Popup.jsx — SmartFill root component
 * ─────────────────────────────────────────────────────────
 * FIXED: init() now loads profile from IDB via profileStore.loadProfile()
 * (which itself delegates to idb.js).
 * Previously in DEV_MODE it short-circuited to devData.js, and in PROD
 * it also called profileStore.loadProfile() but that used chrome.storage.
 * Now both DEV and PROD go through the same unified IDB path
 * (DEV_MODE just skips the IDB call for speed during development).
 */
import React, { createContext, useState, useEffect, useContext } from 'react';
import Dashboard    from './Dashboard.jsx';
import ProfileForm  from './ProfileForm.jsx';
import Review       from './Review.jsx';
import { loadProfile, hasProfile } from '../storage/profileStore.js';
import { DEV_MODE, DEV_PROFILE }   from '../devData.js';
import './styles.css';

export const AppContext = createContext();
export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppContext.Provider');
  return ctx;
};

function Popup() {
  const [currentScreen, setCurrentScreen] = useState('loading');
  const [profile, setProfile]             = useState(null);
  const [formData, setFormData]           = useState(null);
  const [mappingResult, setMappingResult] = useState(null);
  const [error, setError]                 = useState(null);

  useEffect(() => { init(); }, []);

  const init = async () => {
    try {
      // ── DEV MODE: use hardcoded devData profile, skip IDB ───────────────
      if (DEV_MODE) {
        console.log('[Popup] DEV_MODE — using devData.js profile');
        setProfile(DEV_PROFILE);
        setCurrentScreen('dashboard');
        return;
      }

      // ── PROD: load from IndexedDB via profileStore ───────────────────
      const stored = await loadProfile();
      if (stored) {
        console.log('[Popup] Profile loaded from IDB');
        setProfile(stored);
        setCurrentScreen('dashboard');
      } else {
        console.log('[Popup] No profile in IDB — first run, showing create screen');
        setCurrentScreen('create');
      }
    } catch (err) {
      console.error('[Popup] Init error:', err);
      setError('Could not load profile. Please try again.');
      setCurrentScreen('create');
    }
  };

  const contextValue = {
    currentScreen, profile, formData, mappingResult, error,
    setCurrentScreen, setProfile, setFormData, setMappingResult, setError,
    resetState: () => {
      setProfile(null); setFormData(null); setMappingResult(null); setError(null);
      setCurrentScreen('create');
    },
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'loading':
        return (
          <div className="loading-container">
            <div className="spinner"></div>
            <p style={{ marginTop: '12px', color: 'var(--text-secondary, #666)', fontSize: '13px' }}>
              Loading profile…
            </p>
          </div>
        );
      case 'create':
        return <ProfileForm mode="create" />;
      case 'dashboard':
        return <Dashboard />;
      case 'edit-profile':
        return <ProfileForm mode="edit" initialProfile={profile} />;
      case 'review':
        return <Review />;
      default:
        return (
          <div className="content">
            <div className="alert alert-error">Unknown screen: {currentScreen}</div>
          </div>
        );
    }
  };

  return (
    <AppContext.Provider value={contextValue}>
      <div className="popup-container">
        <header className="header">
          <h1>⚡ SmartFill</h1>
          {DEV_MODE && (
            <div style={{ fontSize: '10px', color: '#ff9800', textAlign: 'center' }}>
              DEV MODE — using devData.js
            </div>
          )}
        </header>
        <main>
          {error && (
            <div className="content">
              <div className="alert alert-error">{error}</div>
            </div>
          )}
          {renderScreen()}
        </main>
        <footer className="footer">v0.1.0 │ SmartFill</footer>
      </div>
    </AppContext.Provider>
  );
}

export default Popup;
