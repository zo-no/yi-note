import Logger from 'js-logger';
import migration_v_0_6_4 from './migrations/0.6.4';
import { copyText } from './clipboard';
import { exportJsonBackup, exportFirefoxFile } from './downloads';

Logger.useDefaults();

const openOptions = async options => {
  await browser.runtime.openOptionsPage();
  if (!options) return { code: 'success' };

  // Opening the tab does not guarantee that React has registered its listener.
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      const response = await browser.runtime.sendMessage(options);
      if (response === true) return { code: 'success' };
    } catch (error) {
      if (attempt === 9) throw error;
    }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('The YiNote management page did not respond');
};

// Register listeners synchronously every time the service worker starts.
const action = browser.action || browser.browserAction;
action.onClicked.addListener(tab => {
  browser.tabs.sendMessage(tab.id, { action: 'togglePanel' }).catch(error => {
    Logger.error(error);
    browser.runtime.openOptionsPage().catch(Logger.error);
  });
});

browser.runtime.onMessage.addListener(message => {
  // Do not reply to messages intended for the offscreen document or options UI.
  if (message.target) return;

  switch (message.action) {
    case 'open-options':
      return openOptions(message.data);
    case 'copy':
      return copyText(message.data);
    case 'export-file':
      if (browser.runtime.getManifest().manifest_version === 2) {
        return exportFirefoxFile(message);
      }
      return Promise.reject(
        new Error('Blob messages are only used by Firefox')
      );
  }
});

browser.runtime.onInstalled.addListener(({ reason, previousVersion }) => {
  if (reason === 'update' && previousVersion === '0.6.4') {
    migration_v_0_6_4(exportJsonBackup).catch(Logger.error);
  }
});
