import React, { createContext, useState, useEffect, useContext } from 'react';
import Login from './Login.jsx';
import Dashboard from './Dashboard.jsx';
import ProfileForm from './ProfileForm.jsx';
import Review from './Review.jsx';
import { loadProfile } from '../storage/profileStore.js';
import './styles.css';

// Create App Context
export const AppContext = createContext();

// Custom hook for using context
export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppContextProvider');
  }
  return context;
};

function Popup() {
  // Global state
  const [currentScreen, setCurrentScreen] = useState('loading');
  const [profile, setProfile] = useState(null);
  const [password, setPassword] = useState(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [formData, setFormData] = useState(null);
  const [mappingResult, setMappingResult] = useState(null);
  const [error, setError] = useState(null);

  // Check if profile exists on mount
  useEffect(() => {
    checkProfileExists();
  }, []);

  const checkProfileExists = async () => {
    try {
      // Try to get encrypted profile from storage
      const result = await chrome.storage.local.get(['encryptedProfile']);
      
      if (result.encryptedProfile) {
        // Profile exists, show login
        setCurrentScreen('login');
      } else {
        // No profile, show create screen
        setCurrentScreen('create');
      }
    } catch (err) {
      console.error('[Popup] Error checking profile:', err);
      setError('Failed to check profile existence');
      setCurrentScreen('create'); // Default to create
    }
  };

  // Context value
  const contextValue = {
    // State
    currentScreen,
    profile,
    password,
    isUnlocked,
    formData,
    mappingResult,
    error,
    
    // Setters
    setCurrentScreen,
    setProfile,
    setPassword,
    setIsUnlocked,
    setFormData,
    setMappingResult,
    setError,
    
    // Helper methods
    resetState: () => {
      setProfile(null);
      setPassword(null);
      setIsUnlocked(false);
      setFormData(null);
      setMappingResult(null);
      setError(null);
    }
  };

  // Render current screen
  const renderScreen = () => {
    switch (currentScreen) {
      case 'loading':
        return (
          <div className="loading-container">
            <div className="spinner"></div>
          </div>
        );
      
      case 'login':
        return <Login />;
      
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
            <div className="alert alert-error">
              Unknown screen: {currentScreen}
            </div>
          </div>
        );
    }
  };

  return (
    <AppContext.Provider value={contextValue}>
      <div className="popup-container">
        {/* Header */}
        <header className="header">
          <h1>⚡ Autofill Assistant</h1>
        </header>

        {/* Main Content */}
        <main>
          {error && (
            <div className="content">
              <div className="alert alert-error">
                {error}
              </div>
            </div>
          )}
          {renderScreen()}
        </main>

        {/* Footer */}
        <footer className="footer">
          v0.1.0 | Smart Job Application Autofill
        </footer>
      </div>
    </AppContext.Provider>
  );
}

export default Popup;
