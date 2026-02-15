import React from 'react';

function Popup() {
  return (
    <div style={{
      padding: '20px',
      textAlign: 'center'
    }}>
      <h1 style={{
        fontSize: '18px',
        color: '#333',
        marginBottom: '10px'
      }}>
        Smart Job Application Autofill
      </h1>
      <p style={{
        fontSize: '14px',
        color: '#666',
        margin: '0'
      }}>
        Extension skeleton loaded successfully
      </p>
      <div style={{
        marginTop: '20px',
        padding: '10px',
        backgroundColor: '#f0f0f0',
        borderRadius: '4px'
      }}>
        <p style={{
          fontSize: '12px',
          color: '#999',
          margin: '0'
        }}>
          Phase 1 Complete ✓
        </p>
      </div>
    </div>
  );
}

export default Popup;