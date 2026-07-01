import React, { useState } from 'react';
import { useAppContext } from './Popup.jsx';
import { loadProfile } from '../storage/profileStore.js';

function Login() {
  const { setCurrentScreen, setProfile, setPassword, setIsUnlocked, setError } = useAppContext();
  const [passwordInput, setPasswordInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!passwordInput.trim()) {
      setError('Please enter your password');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Attempt to decrypt and load profile
      console.log('[Login] Attempting to decrypt profile...');
      const profile = await loadProfile(passwordInput);
      
      if (profile) {
        console.log('[Login] Profile decrypted successfully');
        setProfile(profile);
        setPassword(passwordInput);
        setIsUnlocked(true);
        setCurrentScreen('dashboard');
      } else {
        setError('No profile found. Please create one.');
        setCurrentScreen('create');
      }
    } catch (error) {
      console.error('[Login] Decryption failed:', error);
      setError(`Login failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearData = async () => {
    if (!confirm('⚠️ This will delete your saved profile. Are you sure?')) {
      return;
    }

    try {
      // Clear all storage
      await chrome.storage.local.clear();
      console.log('[Login] Storage cleared');
      alert('✅ Profile data cleared. You can now create a new profile.');
      setCurrentScreen('create');
    } catch (error) {
      console.error('[Login] Failed to clear storage:', error);
      setError('Failed to clear data');
    }
  };

  return (
    <div className="content">
      <div className="welcome-section">
        <h2 className="welcome-title">Welcome Back!</h2>
        <p className="welcome-subtitle">Enter your password to unlock your profile</p>
      </div>

      <form onSubmit={handleLogin}>
        <div className="input-group">
          <label className="input-label required">Password</label>
          <input
            type="password"
            className="input-field"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="Enter your password"
            disabled={isLoading}
            autoFocus
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="spinner"></span> Decrypting...
            </>
          ) : (
            'Unlock Profile'
          )}
        </button>
      </form>

      <div className="mt-24 text-center">
        <button
          type="button"
          className="btn btn-link"
          onClick={handleClearData}
        >
          Clear Data & Start Fresh
        </button>
      </div>

      <div className="mt-16 alert alert-info">
        <strong>Tip:</strong> If you forgot your password, you'll need to clear your data and create a new profile.
      </div>
    </div>
  );
}

export default Login;
