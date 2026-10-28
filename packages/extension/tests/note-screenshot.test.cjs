/* eslint-env node */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const source = fs
  .readFileSync(
    path.join(__dirname, '../src/ui/utils/takeScreenshot.js'),
    'utf8'
  )
  .replace(/^import\s[\s\S]*?;\r?\n/gm, '')
  .replace('export default', 'globalThis.capture =');

function setup() {
  const calls = { settings: 0, draws: [], errors: [] };
  const canvas = {
    getContext: () => ({ drawImage: (...args) => calls.draws.push(args) }),
    toDataURL: () => 'data:image/jpeg;base64,fixture'
  };
  const capture = vm.runInNewContext(source, {
    document: { createElement: () => canvas },
    StorageService: {
      getStorage: () => ({
        getSettings: async () => {
          calls.settings++;
          return { screenshot_resolution: 720 };
        }
      })
    },
    KEY_SCREENSHOT_RESOLUTION: 'screenshot_resolution',
    SCREENSHOT_RESOLUTION: {
      360: { x: 640, y: 360 },
      720: { x: 1280, y: 720 }
    },
    logger: { error: error => calls.errors.push(error) }
  });
  return { calls, canvas, capture };
}

test('save-time capture draws immediately with loaded settings, without awaiting storage', async () => {
  const h = setup();
  const video = {};
  const result = h.capture(video, { screenshot_resolution: 720 });
  assert.equal(h.calls.settings, 0);
  assert.deepEqual(h.calls.draws[0], [video, 0, 0, 1280, 720]);
  assert.equal(await result, 'data:image/jpeg;base64,fixture');
});

test('unknown resolution safely falls back to 360p, including empty settings', async () => {
  for (const settings of [{}, { screenshot_resolution: 'unexpected' }]) {
    const h = setup();
    await h.capture({}, settings);
    assert.equal(h.canvas.width, 640);
    assert.equal(h.canvas.height, 360);
    assert.equal(h.calls.settings, 0);
  }
});

test('legacy callers without loaded settings still use persisted preferences', async () => {
  const h = setup();
  await h.capture({});
  assert.equal(h.calls.settings, 1);
  assert.equal(h.canvas.width, 1280);
});

test('unavailable or cross-origin screenshots remain optional', async () => {
  const h = setup();
  assert.equal(await h.capture(null, {}), undefined);
  h.canvas.toDataURL = () => {
    throw new Error('tainted canvas');
  };
  assert.equal(await h.capture({}, {}), null);
  assert.equal(h.calls.errors.length, 2);
});
