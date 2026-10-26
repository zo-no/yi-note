/* global chrome */
let creatingDocument;

const ensureOffscreenDocument = async () => {
  const documentUrl = browser.runtime.getURL('offscreen.html');
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
    documentUrls: [documentUrl]
  });
  if (contexts.length) return;

  // Concurrent copy requests must share Chrome's single offscreen document.
  if (!creatingDocument) {
    creatingDocument = chrome.offscreen
      .createDocument({
        url: 'offscreen.html',
        reasons: ['CLIPBOARD'],
        justification: 'Copy the YiNote sharing link to the clipboard.'
      })
      .finally(() => {
        creatingDocument = undefined;
      });
  }
  await creatingDocument;
};

export const copyText = async text => {
  if (typeof text !== 'string') {
    throw new Error('Clipboard content must be a string');
  }

  if (browser.runtime.getManifest().manifest_version === 3) {
    await ensureOffscreenDocument();
    const response = await browser.runtime.sendMessage({
      target: 'offscreen',
      action: 'copy',
      data: text
    });
    if (!response || response.code !== 'success') {
      throw new Error((response && response.error) || 'Clipboard copy failed');
    }
  } else {
    // Firefox's MV2 background page still provides a DOM.
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    try {
      textarea.select();
      if (!document.execCommand('copy')) {
        throw new Error('Clipboard copy failed');
      }
    } finally {
      textarea.remove();
    }
  }

  return { code: 'success' };
};
