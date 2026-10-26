/* eslint-env node */
// Run with: node --test packages/extension/tests/legacy-migration.test.cjs
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const clone = value =>
  value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const filename = path.join(__dirname, '../src/background/migrations/0.6.4.js');
let source = readFileSync(filename, 'utf8');
for (const statement of [
  "import { fromString } from 'uuidv4';",
  "import generatePageId from '@yi-note/common/utils/generatePageId';",
  "import BrowserStorage from '@yi-note/common/services/storage/BrowserStorage';"
]) {
  assert.ok(source.includes(statement), `Expected direct import: ${statement}`);
  source = source.replace(statement, '');
}
source = source.replace('export default ', 'module.exports = ');

// Deterministic UUID-shaped direct mocks; no package loading or DOM is needed.
const fromString = value => {
  const hex = createHash('sha1')
    .update(value)
    .digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(
    13,
    16
  )}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
};
const generatePageId = value => {
  const url = new URL(value);
  url.hash = '';
  return fromString(url.toString());
};

function createHarness(initial) {
  const harness = {
    data: clone(initial),
    events: [],
    backups: [],
    parsedUrls: [],
    now: 1700000000000,
    interrupt: () => {}
  };
  const area = name => {
    const perform = (operation, payload, apply) => {
      const event = { area: name, operation, payload: clone(payload) };
      harness.events.push(event);
      harness.interrupt('before', event);
      const result = apply();
      harness.interrupt('after', event);
      return clone(result);
    };
    return {
      get: async key =>
        perform('get', key, () =>
          key === undefined
            ? harness.data[name]
            : { [key]: harness.data[name][key] }
        ),
      set: async value =>
        perform('set', value, () => {
          Object.assign(harness.data[name], clone(value));
        }),
      remove: async keys =>
        perform('remove', keys, () => {
          for (const key of [].concat(keys)) delete harness.data[name][key];
        }),
      clear: async () =>
        assert.fail('Migration must never clear a storage area')
    };
  };
  const browser = { storage: { local: area('local'), sync: area('sync') } };
  class BrowserStorage {
    constructor(name = 'local') {
      this.storage = browser.storage[name];
    }
    async getPage(id) {
      return (await this.storage.get(id))[id];
    }
    async addPage(page) {
      await this.storage.set({ [page.id]: page });
      return page;
    }
    async addNote(pageId, note) {
      const page = await this.getPage(pageId);
      assert.ok(page, 'The destination page must exist before adding notes');
      // Match BrowserStorage/addNoteToList: replace by ID, then sort timestamps.
      page.notes = [...page.notes.filter(n => n.id !== note.id), note].sort(
        (a, b) => a.timestamp - b.timestamp
      );
      await this.storage.set({ [pageId]: page });
      return note;
    }
  }
  harness.loadMigration = () => {
    const module = { exports: null };
    vm.runInNewContext(
      source,
      {
        module,
        browser,
        BrowserStorage,
        generatePageId,
        fromString,
        URL: class extends URL {
          constructor(value) {
            harness.parsedUrls.push(value);
            super(value);
          }
        },
        Date: class extends Date {
          constructor() {
            super(harness.now);
          }
        }
      },
      { filename }
    );
    return module.exports;
  };
  harness.exportJsonFile = async (data, filename, version) => {
    harness.events.push({ operation: 'export', filename });
    // The injected exporter retains the original { version, data } envelope.
    harness.backups.push({ filename, document: clone({ version, data }) });
  };
  return harness;
}

const articleKey = 'articles.example/read?lang=zh#selection';
const articleId = generatePageId(`https://${articleKey}`);
const videoKey = 'videos.example/watch?v=demo#chapter';
const videoId = generatePageId(`https://${videoKey}`);
const otherKey = 'articles.example/other#selection';
const highlightsKey = 'articles.example/highlights';
const orphanKey = 'videos.example/orphan';
const bookmarkKey = 'videos.example/bookmark-only';
const modernId = generatePageId('https://modern.example/');
const sharedContent = '<p>Same content, distinct legacy notes</p>';

function fixture() {
  return {
    local: {
      settings: { theme: 'dark', title: 'Not a page' },
      __migration: { title: 'Not a page' },
      'vn-options': { title: 'Not a page' },
      'cache.example/state': { cursor: 3 },
      'bad host/path': { title: 'Not a URL' },
      'empty.example/': null,
      list: [],
      flag: true,
      [modernId]: { id: modernId, notes: [], meta: { title: 'Modern' } },
      [articleId]: {
        id: articleId,
        notes: [{ id: 'existing-note', content: 'Keep this', type: 'article' }],
        meta: {
          title: 'Existing title',
          url: 'https://articles.example/read?lang=zh'
        },
        tags: ['keep'],
        createAt: 123
      },
      [articleKey]: {
        title: 'Legacy title',
        10: { comment: { content: sharedContent } },
        20: { comment: { content: sharedContent } },
        metadata: null
      },
      [otherKey]: {
        title: 'Other article',
        selection: { comment: { content: 'An article comment' } }
      },
      [highlightsKey]: {
        title: 'Highlights only',
        selection: { text: 'Highlight' }
      }
    },
    sync: {
      // Deliberately insert notes before vn-bookmarks.
      [videoKey]: {
        0: { content: '<p>Start</p>' },
        '12.5': { content: '<p>Later</p>' }
      },
      [articleKey]: { 10: { content: sharedContent } },
      settings: { title: 'Keep sync settings', volume: 0.5 },
      'vn-options': { enabled: true },
      [modernId]: { id: modernId, notes: [], meta: { title: 'Modern sync' } },
      'empty.example/': null,
      'invalid.example/notes': { metadata: { content: 'Not a timestamp' } },
      'vn-bookmarks': {
        [videoKey]: { title: 'Video title' },
        [bookmarkKey]: { title: 'Bookmark only' }
      },
      [orphanKey]: { 8: { content: 'A note without a bookmark' } }
    }
  };
}

const isMutation = event => ['set', 'remove'].includes(event.operation);
const expectedNoteId = (area, pageKey, noteKey, content) =>
  fromString(JSON.stringify(['0.6.4', area, pageKey, noteKey, content]));

for (const failingFile of [
  'storage_local_0.6.4.json',
  'storage_sync_0.6.4.json'
]) {
  test(`failed export of ${failingFile} leaves both areas untouched`, async () => {
    const initial = fixture();
    const harness = createHarness(initial);
    await assert.rejects(
      harness.loadMigration()(async (...args) => {
        await harness.exportJsonFile(...args);
        if (args[1] === failingFile) throw new Error('Export failed');
      }),
      /Export failed/
    );
    assert.deepEqual(harness.data, initial);
    assert.deepEqual(harness.events.filter(isMutation), []);
    assert.deepEqual(
      harness.events
        .slice(0, 2)
        .map(({ area, operation }) => [area, operation]),
      [
        ['local', 'get'],
        ['sync', 'get']
      ]
    );
  });
}

test('a failed sync snapshot read cannot change local data', async () => {
  const initial = fixture();
  const harness = createHarness(initial);
  harness.interrupt = (phase, event) => {
    if (
      phase === 'before' &&
      event.area === 'sync' &&
      event.operation === 'get'
    ) {
      throw new Error('Read failed');
    }
  };
  await assert.rejects(
    harness.loadMigration()(harness.exportJsonFile),
    /Read failed/
  );
  assert.deepEqual(harness.data, initial);
  assert.deepEqual(harness.backups, []);
  assert.deepEqual(harness.events.filter(isMutation), []);
});

test('both asynchronous backups must finish before the first write', async () => {
  const deferred = () => {
    let resolve;
    const promise = new Promise(done => {
      resolve = done;
    });
    return { promise, resolve };
  };
  const started = [deferred(), deferred()];
  const completed = [deferred(), deferred()];
  const initial = fixture();
  const harness = createHarness(initial);
  let index = 0;
  const pending = harness.loadMigration()(async (...args) => {
    const current = index++;
    await harness.exportJsonFile(...args);
    started[current].resolve();
    await completed[current].promise;
  });
  for (let i = 0; i < 2; i++) {
    await started[i].promise;
    assert.equal(harness.backups.length, i + 1);
    assert.deepEqual(harness.data, initial);
    assert.deepEqual(harness.events.filter(isMutation), []);
    completed[i].resolve();
  }
  await pending;
  assert.ok(harness.events.some(isMutation));
});

test('normal conversion preserves legacy formats and removes only converted keys', async () => {
  const initial = fixture();
  const harness = createHarness(initial);
  await harness.loadMigration()(harness.exportJsonFile);
  assert.deepEqual(harness.backups, [
    {
      filename: 'storage_local_0.6.4.json',
      document: { version: '0.6.4', data: initial.local }
    },
    {
      filename: 'storage_sync_0.6.4.json',
      document: { version: '0.6.4', data: initial.sync }
    }
  ]);

  const { local, sync } = harness.data;
  const article = local[articleId];
  assert.deepEqual(article.meta, initial.local[articleId].meta);
  assert.deepEqual(article.tags, ['keep']);
  assert.equal(article.createAt, 123);
  assert.deepEqual(article.notes, [
    initial.local[articleId].notes[0],
    {
      id: expectedNoteId('local', articleKey, '10', sharedContent),
      content: sharedContent,
      type: 'article'
    },
    {
      id: expectedNoteId('local', articleKey, '20', sharedContent),
      content: sharedContent,
      type: 'article'
    },
    {
      id: expectedNoteId('sync', articleKey, '10', sharedContent),
      content: sharedContent,
      timestamp: 10,
      type: 'video'
    }
  ]);
  const other = local[generatePageId(`https://${otherKey}`)];
  assert.deepEqual(other.meta, {
    title: 'Other article',
    url: 'https://articles.example/other'
  });
  assert.equal(other.createAt, harness.now);
  assert.equal(other.notes[0].type, 'article');
  assert.equal('timestamp' in other.notes[0], false);
  assert.deepEqual(local[generatePageId(`https://${highlightsKey}`)].notes, []);
  assert.deepEqual(local[videoId].meta, {
    title: 'Video title',
    url: `https://${videoKey}`
  });
  assert.deepEqual(local[videoId].notes, [
    {
      id: expectedNoteId('sync', videoKey, '0', '<p>Start</p>'),
      content: '<p>Start</p>',
      timestamp: 0,
      type: 'video'
    },
    {
      id: expectedNoteId('sync', videoKey, '12.5', '<p>Later</p>'),
      content: '<p>Later</p>',
      timestamp: 12.5,
      type: 'video'
    }
  ]);
  assert.deepEqual(local[generatePageId(`https://${bookmarkKey}`)].notes, []);
  assert.equal(
    local[generatePageId(`https://${orphanKey}`)].notes[0].content,
    'A note without a bookmark'
  );

  const removedLocal = [articleKey, otherKey, highlightsKey];
  const removedSync = ['vn-bookmarks', videoKey, articleKey, orphanKey];
  for (const [area, removed] of [
    ['local', removedLocal],
    ['sync', removedSync]
  ]) {
    for (const [key, value] of Object.entries(initial[area])) {
      if (removed.includes(key)) assert.equal(key in harness.data[area], false);
      else if (key !== articleId)
        assert.deepEqual(harness.data[area][key], value);
    }
  }
  assert.deepEqual(
    Object.keys(sync).sort(),
    Object.keys(initial.sync)
      .filter(key => !removedSync.includes(key))
      .sort()
  );
  const mutations = harness.events.filter(isMutation);
  const firstRemove = mutations.findIndex(
    event => event.operation === 'remove'
  );
  assert.ok(firstRemove > 0);
  assert.ok(
    mutations
      .slice(0, firstRemove)
      .every(event => event.operation === 'set' && event.area === 'local')
  );
  assert.deepEqual(mutations.slice(firstRemove), [
    { area: 'local', operation: 'remove', payload: removedLocal },
    { area: 'sync', operation: 'remove', payload: removedSync }
  ]);
  for (const key of [
    'settings',
    '__migration',
    'vn-options',
    articleId,
    modernId,
    'cache.example/state'
  ]) {
    assert.equal(
      harness.parsedUrls.includes(`https://${key}`),
      false,
      `${key} must not be parsed as a page URL`
    );
  }

  const migrated = clone(harness.data);
  harness.now += 86400000;
  await harness.loadMigration()(harness.exportJsonFile);
  assert.deepEqual(
    harness.data,
    migrated,
    'A completed migration is also safe to rerun'
  );
});

test('worker interruption before or after every durable change is retryable', async t => {
  const baseline = createHarness(fixture());
  await baseline.loadMigration()(baseline.exportJsonFile);
  const mutations = baseline.events.filter(isMutation);
  const firstRemove = mutations.findIndex(
    event => event.operation === 'remove'
  );
  const withoutCreationTimes = data => {
    const result = clone(data);
    for (const page of Object.values(result.local)) {
      if (page && page.id && Array.isArray(page.notes)) delete page.createAt;
    }
    return result;
  };
  for (const phase of ['before', 'after']) {
    for (let target = 0; target < mutations.length; target++) {
      const { area, operation } = mutations[target];
      await t.test(
        `${phase} change ${target + 1}: ${area}.${operation}`,
        async () => {
          const initial = fixture();
          const harness = createHarness(initial);
          let count = -1;
          harness.interrupt = (currentPhase, event) => {
            if (!isMutation(event)) return;
            if (currentPhase === 'before') count++;
            if (count === target && currentPhase === phase)
              throw new Error('Worker stopped');
          };
          await assert.rejects(
            harness.loadMigration()(harness.exportJsonFile),
            /Worker stopped/
          );
          if (
            target < firstRemove ||
            (target === firstRemove && phase === 'before')
          ) {
            for (const key of [articleKey, otherKey, highlightsKey]) {
              assert.deepEqual(harness.data.local[key], initial.local[key]);
            }
            assert.deepEqual(harness.data.sync, initial.sync);
          }
          const writtenPages = Object.values(harness.data.local).filter(
            page => page && page.id
          );
          harness.interrupt = () => {};
          harness.now += 86400000;
          // Reload the module in a fresh VM, retaining only durable storage state.
          await harness.loadMigration()(harness.exportJsonFile);
          assert.deepEqual(
            withoutCreationTimes(harness.data),
            withoutCreationTimes(baseline.data)
          );
          for (const page of writtenPages) {
            assert.equal(harness.data.local[page.id].createAt, page.createAt);
          }
          for (const page of Object.values(harness.data.local)) {
            if (page && Array.isArray(page.notes)) {
              assert.equal(
                new Set(page.notes.map(note => note.id)).size,
                page.notes.length
              );
            }
          }
        }
      );
    }
  }
});

test('unrecognized bookmark entries are retained rather than deleting their container', async () => {
  const initial = {
    local: {},
    sync: {
      'vn-bookmarks': {
        [bookmarkKey]: { title: 'Valid bookmark' },
        __internal: { title: 'Internal state' },
        'invalid.example/': null
      }
    }
  };
  const harness = createHarness(initial);
  await harness.loadMigration()(harness.exportJsonFile);
  assert.deepEqual(harness.data.sync, initial.sync);
  assert.equal(Object.keys(harness.data.local).length, 1);
  const migrated = clone(harness.data);
  harness.now += 86400000;
  await harness.loadMigration()(harness.exportJsonFile);
  assert.deepEqual(harness.data, migrated);
});
