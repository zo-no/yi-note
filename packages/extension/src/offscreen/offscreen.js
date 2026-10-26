/* global chrome */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (
    sender.id !== chrome.runtime.id ||
    sender.tab ||
    message.target !== 'offscreen' ||
    message.action !== 'copy'
  ) {
    return;
  }

  const textarea = document.getElementById('clipboard');
  try {
    if (typeof message.data !== 'string') {
      throw new Error('Clipboard content must be a string');
    }
    // Offscreen documents cannot be focused for navigator.clipboard.writeText.
    textarea.value = message.data;
    textarea.select();
    if (!document.execCommand('copy')) {
      throw new Error('Clipboard copy failed');
    }
    sendResponse({ code: 'success' });
  } catch (error) {
    sendResponse({ code: 'error', error: error.message });
  } finally {
    textarea.value = '';
  }
});
