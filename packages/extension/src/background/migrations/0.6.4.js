import { fromString } from 'uuidv4';
import generatePageId from '@yi-note/common/utils/generatePageId';
import BrowserStorage from '@yi-note/common/services/storage/BrowserStorage';

// Do not import the services barrel: PDF/file libraries require a DOM.
const storage = new BrowserStorage();

const isObject = value =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const isLegacyPage = (key, data) => {
  if (
    !isObject(data) ||
    key === 'settings' ||
    key.startsWith('vn-') ||
    !/[./]/.test(key) ||
    key.includes('://') ||
    typeof data.id === 'string' ||
    Array.isArray(data.notes) ||
    isObject(data.meta)
  ) {
    return false;
  }
  // Legacy keys are scheme-less hosts/paths, not modern UUIDs or internal keys.
  try {
    const url = new URL(`https://${key}`);
    return !!url.hostname && !url.username && !url.password;
  } catch {
    return false;
  }
};

const generateNoteId = (area, pageKey, noteKey, content) =>
  fromString(JSON.stringify(['0.6.4', area, pageKey, noteKey, content]));

const getOrCreatePage = async (url, title) => {
  const id = generatePageId(url);
  const existingPage = await storage.getPage(id);
  if (existingPage) {
    return existingPage;
  }
  return storage.addPage({
    id,
    notes: [],
    meta: { title, url },
    createAt: +new Date()
  });
};

const processSyncStorageBookmarks = async data => {
  let complete = true;
  for (const key in data) {
    if (!isLegacyPage(key, data[key])) {
      complete = false;
      continue;
    }
    await getOrCreatePage(`https://${key}`, data[key].title);
  }
  return complete;
};

const processSyncStorageNotes = async (key, data) => {
  const page = await getOrCreatePage(`https://${key}`);
  for (const timestamp in data) {
    const note = {
      id: generateNoteId('sync', key, timestamp, data[timestamp].content),
      content: data[timestamp].content,
      timestamp: +timestamp,
      type: 'video'
    };
    await storage.addNote(page.id, note);
  }
};

const processLocalStoragePage = async (key, data) => {
  const { origin, pathname, search } = new URL(`https://${key}`);
  const url = `${origin}${pathname}${search}`;
  const page = await getOrCreatePage(url, data.title);

  for (const noteKey in data) {
    const entry = data[noteKey];
    const comment = isObject(entry) && entry.comment;
    if (isObject(comment)) {
      const note = {
        id: generateNoteId('local', key, noteKey, comment.content),
        content: comment.content,
        type: 'article'
      };
      await storage.addNote(page.id, note);
    }
  }
};

export default async exportJsonFile => {
  const dataInLocal = await browser.storage.local.get();
  const dataInSync = await browser.storage.sync.get();
  // Neither area may be changed until both original snapshots are backed up.
  await exportJsonFile(dataInLocal, 'storage_local_0.6.4.json', '0.6.4');
  await exportJsonFile(dataInSync, 'storage_sync_0.6.4.json', '0.6.4');

  const localKeys = [];
  const syncKeys = [];
  for (const key in dataInLocal) {
    const value = dataInLocal[key];
    if (
      !isObject(value) ||
      !(
        typeof value.title === 'string' ||
        Object.values(value).some(
          entry => isObject(entry) && isObject(entry.comment)
        )
      ) ||
      !isLegacyPage(key, value)
    ) {
      continue;
    }
    await processLocalStoragePage(key, value);
    localKeys.push(key);
  }

  // Bookmarks must precede notes, regardless of the storage key order.
  const bookmarks = dataInSync['vn-bookmarks'];
  if (isObject(bookmarks) && (await processSyncStorageBookmarks(bookmarks))) {
    syncKeys.push('vn-bookmarks');
  }
  for (const key in dataInSync) {
    const value = dataInSync[key];
    if (
      !isLegacyPage(key, value) ||
      !Object.keys(value).every(
        timestamp =>
          timestamp.trim() !== '' &&
          Number.isFinite(+timestamp) &&
          isObject(value[timestamp]) &&
          Object.prototype.hasOwnProperty.call(value[timestamp], 'content')
      )
    ) {
      continue;
    }
    await processSyncStorageNotes(key, value);
    syncKeys.push(key);
  }

  // All conversions must finish before cleanup. A stopped worker can replay
  // retained legacy keys: stable note IDs make BrowserStorage.addNote an upsert.
  if (localKeys.length) {
    await browser.storage.local.remove(localKeys);
  }
  if (syncKeys.length) {
    await browser.storage.sync.remove(syncKeys);
  }
};
