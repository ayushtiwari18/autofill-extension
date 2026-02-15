import React from 'react';
import { createRoot } from 'react-dom/client';
import Popup from './ui/Popup.jsx';

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

function initApp() {
  const container = document.getElementById('root');
  if (!container) {
    console.error('[Index] Root element not found');
    return;
  }

  const root = createRoot(container);
  root.render(<Popup />);
  
  console.log('[Index] React app rendered');
}
