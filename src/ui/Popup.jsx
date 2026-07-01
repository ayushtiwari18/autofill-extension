/**
 * Popup.jsx — SmartFill root component
 * ─────────────────────────────────────────────────────────
 * Profile is always loaded from IndexedDB via profileStore.loadProfile().
 * DEV_MODE / devData.js have been removed — IDB is the single source of
 * truth in both development and production builds.
 */
import React, { createContext, useState, useEffect, useContext } from 'react';
import Dashboard    from './Dashboard.jsx';
import ProfileForm  from './ProfileForm.jsx';
import Review       from './Review.jsx';
import { loadProfile, hasProfile } from '../storage/profileStore.js';
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
