// Background Service Worker
// Tugasnya: menyimpan state dan mendengar perubahan storage

chrome.runtime.onInstalled.addListener(() => {
  console.log('Auto Answer Gunadarma Extension installed.');
});

// Dengarkan pesan dari content script jika diperlukan
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GET_KEY') {
    chrome.storage.sync.get(['groq_api_key', 'auto_mode'], res => {
      sendResponse(res);
    });
    return true; // async response
  }
});
