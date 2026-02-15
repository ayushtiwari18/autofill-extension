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
  console.log('[Service Worker] Received message:', message.action || message.type);
  
  // Handle different message formats
  const messageType = message.action || message.type;
  
  switch (messageType) {
    case 'FORM_DATA_SCANNED':
      handleFormDataScanned(message.data, sender);
      sendResponse({ success: true });
      break;
      
    case 'GET_LAST_SCANNED_DATA':
      // Popup requesting last scanned data
      if (lastScannedData) {
        sendResponse({ 
          success: true, 
          formData: lastScannedData 
        });
      } else {
        sendResponse({ 
          success: false, 
          formData: null 
        });
      }
      break;
      
    default:
      console.log('[Service Worker] Unknown message type:', messageType);
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
  
  // Update extension badge with form count
  if (sender.tab && sender.tab.id) {
    const formCount = data.forms.length;
    if (formCount > 0) {
      chrome.action.setBadgeText({ 
        text: formCount.toString(), 
        tabId: sender.tab.id 
      });
      chrome.action.setBadgeBackgroundColor({ 
        color: '#007bff', 
        tabId: sender.tab.id 
      });
    } else {
      chrome.action.setBadgeText({ 
        text: '', 
        tabId: sender.tab.id 
      });
    }
  }
}

// ============================================
// TAB UPDATES
// ============================================

/**
 * Clear badge when tab is updated (navigated)
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading') {
    // Clear badge on navigation
    chrome.action.setBadgeText({ text: '', tabId: tabId });
    
    // Clear last scanned data if it's for this tab
    if (lastScannedData && lastScannedData.tabId === tabId) {
      lastScannedData = null;
    }
  }
});

// ============================================
// INITIALIZATION
// ============================================
console.log('[Service Worker] Loaded successfully - Phase 6');
