const waitForDownload = id =>
  new Promise((resolve, reject) => {
    const finish = error => {
      clearTimeout(timeout);
      browser.downloads.onChanged.removeListener(onChanged);
      if (error) reject(error);
      else resolve(id);
    };
    const onChanged = delta => {
      if (delta.id !== id) return;
      if (
        delta.error ||
        (delta.state && delta.state.current === 'interrupted')
      ) {
        finish(
          new Error('Backup download was interrupted; storage was not cleared')
        );
      } else if (delta.state && delta.state.current === 'complete') {
        finish();
      }
    };
    const timeout = setTimeout(
      () =>
        finish(new Error('Backup download timed out; storage was not cleared')),
      60000
    );
    browser.downloads.onChanged.addListener(onChanged);
    // Small data URLs may finish before the listener is attached.
    browser.downloads.search({ id }).then(items => {
      if (items[0]) onChanged({ id, state: { current: items[0].state } });
    }, finish);
  });

export const exportJsonBackup = async (data, filename, version) => {
  // Service workers have neither FileReader nor URL.createObjectURL.
  const url = `data:application/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify({ version, data })
  )}`;
  const id = await browser.downloads.download({ filename, url, saveAs: false });
  return waitForDownload(id);
};

export const exportFirefoxFile = async ({ blob, filename }) => {
  const url = URL.createObjectURL(blob);
  try {
    const id = await browser.downloads.download({
      filename,
      url,
      saveAs: false
    });
    return await waitForDownload(id);
  } finally {
    URL.revokeObjectURL(url);
  }
};
