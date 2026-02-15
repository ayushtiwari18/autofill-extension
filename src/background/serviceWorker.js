/**
 * Background Service Worker
 * Coordinates between popup UI and content scripts
 * Handles form scan results and extension state
 */

// ============================================
// STATE
// ============================================
let lastScannedData = null;

// ============================================
// MESSAGE HANDLERS
// ============================================

/**
 * Handle messages from content scripts and popup
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[Service Worker] Received message:', message.type);
  
  switch (message.type) {
    case 'FORM_DATA_SCANNED':
      handleFormDataScanned(message.data, sender);
      sendResponse({ success: true });
      break;
      
    case 'GET_LAST_SCANNED_DATA':
      sendResponse({ data: lastScannedData });
      break;
      
    default:
      console.log('[Service Worker] Unknown message type:', message.type);
      sendResponse({ success: false, error: 'Unknown message type' });
  }
  
  return true; // Keep message channel open for async response
});

/**
 * Handle form data scanned from content script
 * @param {Object} data - Scanned page data
 * @param {Object} sender - Message sender info
 */
function handleFormDataScanned(data, sender) {
  console.log(`[Service Worker] Forms scanned on ${data.url}: ${data.forms.length} form(s)`);
  
  // Store last scanned data
  lastScannedData = {
    ...data,
    tabId: sender.tab ? sender.tab.id : null,
    receivedAt: new Date().toISOString()
  };
  
  // Log form details (metadata only, no values)
  data.forms.forEach((form, index) => {
    console.log(`  Form ${index + 1}: Type=${form.type}, Fields=${form.fields.length}, CAPTCHA=${form.hasCaptcha}`);
  });
  
  // Future: Notify popup UI if open
  // Future: Update extension badge with form count
}

// ============================================
// INITIALIZATION
// ============================================
console.log('[Service Worker] Loaded successfully - Phase 4');
