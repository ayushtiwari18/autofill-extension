import React, { useState } from 'react';
import { useAppContext } from './Popup.jsx';
import { loadProfile } from '../storage/profileStore.js';

function Login() {
  const {
    setProfile,
    setPassword,
    setIsUnlocked,
    setCurrentScreen,
    setError
  } = useAppContext();

  const [passwordInput, setPasswordInput] = useState('');
  const [localError, setLocalError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUnlock = async (e) => {
    e.preventDefault();
    
    if (!passwordInput) {
      setLocalError('Please enter your password');
      return;
    }

    setLoading(true);
    setLocalError(null);

    try {
      // Attempt to decrypt profile
      const decryptedProfile = await loadProfile(passwordInput);
      
      // Success - update context
      setProfile(decryptedProfile);
      setPassword(passwordInput);
      setIsUnlocked(true);
      setCurrentScreen('dashboard');
      
    } catch (err) {
      console.error('[Login] Decryption failed:', err);
      setLocalError('Incorrect password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setCurrentScreen('create');
  };

  const handleReset = async () => {
    if (confirm('Are you sure you want to delete your profile? This cannot be undone.')) {
      try {
        await chrome.storage.local.remove(['encryptedProfile']);
        setCurrentScreen('create');
      } catch (err) {
        console.error('[Login] Failed to delete profile:', err);
        setLocalError('Failed to delete profile');
      }
    }
  };

  return (
    <div className="content">
      <div className="welcome-section">
        <h2 className="welcome-title">Welcome Back!</h2>
        <p className="welcome-subtitle">Enter your password to unlock your profile</p>
      </div>

      {localError && (
        <div className="alert alert-error">
          {localError}
        </div>
      )}

      <form onSubmit={handleUnlock}>
        <div className="input-group">
          <label htmlFor="password" className="input-label">Password</label>
          <input
            type="password"
            id="password"
            className="input-field"
            placeholder="Enter your password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            disabled={loading}
            autoFocus
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner"></span>
              <span style={{ marginLeft: '8px' }}>Unlocking...</span>
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
          onClick={handleReset}
          disabled={loading}
        >
          Forgot password? Reset profile
        </button>
      </div>
    </div>
  );
}

export default Login;
