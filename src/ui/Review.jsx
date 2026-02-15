import React, { useState } from 'react';
import { useAppContext } from './Popup.jsx';

function Review() {
  const {
    mappingResult,
    setCurrentScreen
  } = useAppContext();

  const [editedMatches, setEditedMatches] = useState(mappingResult?.matches || []);
  const [showUnmatched, setShowUnmatched] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!mappingResult) {
    return (
      <div className="content">
        <div className="alert alert-error">
          No mapping data available
        </div>
        <button
          className="btn btn-secondary btn-block"
          onClick={() => setCurrentScreen('dashboard')}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const getConfidenceBadge = (confidence) => {
    if (confidence >= 0.8) {
      return <span className="confidence-badge confidence-high">High</span>;
    } else if (confidence >= 0.6) {
      return <span className="confidence-badge confidence-medium">Medium</span>;
    } else {
      return <span className="confidence-badge confidence-low">Low</span>;
    }
  };

  const handleEditMatch = (index, newValue) => {
    setEditedMatches(prev => {
      const updated = [...prev];
      updated[index].profileValue = newValue;
      return updated;
    });
  };

  const handleConfirm = async () => {
    setLoading(true);

    try {
      // Get active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        alert('No active tab found');
        setLoading(false);
        return;
      }

      // Send autofill command to content script (Phase 7 implementation)
      await chrome.tabs.sendMessage(tab.id, {
        action: 'AUTOFILL',
        matches: editedMatches
      });

      // Show success
      alert(`Successfully autofilled ${editedMatches.length} fields!`);
      setCurrentScreen('dashboard');

    } catch (err) {
      console.error('[Review] Autofill failed:', err);
      alert('Autofill failed. Phase 7 not yet implemented.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setCurrentScreen('dashboard');
  };

  const hasLowConfidence = editedMatches.some(m => m.confidence < 0.8);

  return (
    <div className="content">
      <h2 className="welcome-title">Review Matches</h2>
      <p className="welcome-subtitle mb-24">
        {editedMatches.length} field{editedMatches.length !== 1 ? 's' : ''} will be autofilled
      </p>

      {/* Warning for low confidence */}
      {hasLowConfidence && (
        <div className="alert alert-warning mb-16">
          ⚠️ Some matches have medium confidence. Please review before proceeding.
        </div>
      )}

      {/* Overall Confidence */}
      <div className="stats-grid mb-24">
        <div className="stat-card">
          <div className="stat-value">{Math.round(mappingResult.overallConfidence * 100)}%</div>
          <div className="stat-label">Overall Confidence</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{editedMatches.length}</div>
          <div className="stat-label">Fields Matched</div>
        </div>
      </div>

      {/* Matched Fields */}
      <div className="match-list">
        <h3 className="form-section-title mb-16">✅ Matched Fields</h3>
        
        {editedMatches.map((match, index) => (
          <div key={index} className="match-item">
            <div className="match-info">
              <div className="match-label">{match.formFieldLabel}</div>
              <input
                type="text"
                className="input-field"
                value={match.profileValue}
                onChange={(e) => handleEditMatch(index, e.target.value)}
                style={{ marginTop: '4px', fontSize: '13px' }}
              />
              <div className="match-value" style={{ marginTop: '4px', fontSize: '11px', color: '#6c757d' }}>
                Matched on: {match.matchedOn}
              </div>
            </div>
            <div className="match-badge">
              {getConfidenceBadge(match.confidence)}
            </div>
          </div>
        ))}
      </div>

      {/* Unmatched Fields */}
      {mappingResult.unmatchedFormFields && mappingResult.unmatchedFormFields.length > 0 && (
        <div className="mt-24">
          <button
            className="btn btn-link"
            onClick={() => setShowUnmatched(!showUnmatched)}
          >
            {showUnmatched ? '▼' : '▶'} {mappingResult.unmatchedFormFields.length} unmatched form field{mappingResult.unmatchedFormFields.length !== 1 ? 's' : ''}
          </button>
          
          {showUnmatched && (
            <div className="mt-16" style={{ padding: '16px', background: '#f8f9fa', borderRadius: '8px' }}>
              {mappingResult.unmatchedFormFields.map((field, index) => (
                <div key={index} style={{ marginBottom: '8px', fontSize: '13px', color: '#6c757d' }}>
                  • {field.label || field.id} ({field.type})
                </div>
              ))}
              <div style={{ marginTop: '12px', fontSize: '12px', color: '#6c757d' }}>
                These fields will not be autofilled. You can fill them manually.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="btn-group mt-24">
        <button
          className="btn btn-secondary"
          onClick={handleCancel}
          disabled={loading}
        >
          Cancel
        </button>
        <button
          className="btn btn-success"
          onClick={handleConfirm}
          disabled={loading || editedMatches.length === 0}
        >
          {loading ? 'Filling...' : '⚡ Confirm & Autofill'}
        </button>
      </div>

      {/* Form Info */}
      <div className="mt-24 text-center text-muted" style={{ fontSize: '12px' }}>
        Autofilling on: {new URL(mappingResult.url).hostname}
      </div>
    </div>
  );
}

export default Review;
