/* eslint-env node */
// Run with: node --test packages/extension/tests/player-playback.test.cjs
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function loadPlayer(name, context = {}) {
  const filename = path.join(
    __dirname,
    '../src/ui/services/player',
    `${name}.js`
  );
  const source = readFileSync(filename, 'utf8')
    .replace(/^import .*;\r?\n/gm, '')
    .replace('export default', 'globalThis.result =');
  return vm.runInNewContext(
    source,
    { logger: { info() {}, warn() {} }, ...context },
    { filename }
  );
}

// Execute the real base class as well as each adapter; mock only dependencies.
const Player = loadPlayer('Player', {
  StorageService: {
    getStorage: () => ({ getSettings: async () => ({}) })
  },
  KEY_VIDEO_SEEK_SECONDS: 'seekSeconds'
});
const HTML5Player = loadPlayer('HTML5Player', { Player });

function createYoutube(api) {
  const YoutubeIframePlayer = loadPlayer('YoutubeIframePlayer', {
    Player,
    URL,
    URLSearchParams,
    YT: {
      Player: function() {
        return api;
      }
    }
  });
  return new YoutubeIframePlayer({
    videoEl: { id: '', src: 'https://www.youtube.com/embed/video' }
  });
}

function createEmbedly(api, timers = { setTimeout, clearTimeout }) {
  const EmbedlyPlayer = loadPlayer('EmbedlyPlayer', {
    Player,
    embedly: {
      Player: function() {
        return { on() {}, ...api };
      }
    },
    setTimeout: timers.setTimeout,
    clearTimeout: timers.clearTimeout
  });
  return new EmbedlyPlayer({ videoEl: {} });
}

function createTimers() {
  let nextId = 0;
  const pending = new Map();
  return {
    pending,
    setTimeout(callback, delay) {
      const id = ++nextId;
      pending.set(id, { callback, delay });
      return id;
    },
    clearTimeout(id) {
      pending.delete(id);
    },
    expire() {
      for (const [id, { callback, delay }] of pending) {
        assert.ok(
          delay > 0 && delay <= 200,
          'state queries need a short timeout'
        );
        pending.delete(id);
        callback();
      }
    }
  };
}

const unknownStates = [undefined, null, 0, 1, '', 'false', 'true', {}, []];

test('base player exposes an async unknown state, never an assumed pause', async () => {
  const result = new Player().getPaused();
  assert.equal(typeof result.then, 'function');
  assert.equal(await result, null);
});

test('HTML5 reads fresh paused state, including while at time zero', async () => {
  const video = { paused: false, ended: false, currentTime: 0 };
  const player = new HTML5Player({ videoEl: video });
  assert.ok(player instanceof Player);
  assert.equal(await player.getPaused(), false);
  video.paused = true;
  assert.equal(await player.getPaused(), true);
  video.paused = false;
  assert.equal(await player.getPaused(), false);
});

test('HTML5 ended is unknown regardless of paused, preventing automatic replay', async () => {
  for (const paused of [false, true]) {
    const player = new HTML5Player({ videoEl: { paused, ended: true } });
    assert.equal(await player.getPaused(), null);
  }
});

test('HTML5 missing, non-boolean or unreadable state stays unknown', async () => {
  for (const paused of unknownStates) {
    const player = new HTML5Player({ videoEl: { paused } });
    assert.equal(await player.getPaused(), null);
  }
  for (const property of ['paused', 'ended']) {
    const video = { paused: false, ended: false };
    Object.defineProperty(video, property, {
      get() {
        throw new Error('video unavailable');
      }
    });
    assert.equal(await new HTML5Player({ videoEl: video }).getPaused(), null);
  }
});

test('HTML5 pause delegates synchronously and returns the original result', async () => {
  const result = {};
  const video = {
    paused: false,
    pause() {
      assert.equal(this, video);
      this.paused = true;
      return result;
    }
  };
  const player = new HTML5Player({ videoEl: video });
  assert.equal(player.pause(), result);
  assert.equal(video.paused, true);
  assert.equal(await player.getPaused(), true);
});

test('HTML5 play returns the exact underlying promise or legacy void result', async () => {
  for (const result of [Promise.resolve('played'), undefined]) {
    let calls = 0;
    const video = {
      play() {
        assert.equal(this, video);
        calls++;
        return result;
      }
    };
    const player = new HTML5Player({ videoEl: video });
    assert.equal(player.play(), result);
    await result;
    assert.equal(calls, 1);
  }
});

test('HTML5 rejected play reaches the caller without being swallowed', async () => {
  const error = new Error('autoplay denied');
  const rejection = Promise.reject(error);
  const player = new HTML5Player({ videoEl: { play: () => rejection } });
  const result = player.play();
  assert.equal(result, rejection);
  await assert.rejects(result, caught => caught === error);
});

test('HTML5 keeps currentTime zero and the existing Math.floor behavior', async () => {
  const video = { currentTime: 0 };
  const player = new HTML5Player({ videoEl: video });
  assert.equal(await player.getCurrentTime(), 0);
  video.currentTime = 12.9;
  assert.equal(await player.getCurrentTime(), 12);
});

test('YouTube maps playing/buffering/paused explicitly; ended zero is not false', async () => {
  let state;
  const player = createYoutube({ getPlayerState: () => state });
  assert.ok(player instanceof Player);
  for (const [value, expected] of [
    [1, false],
    [3, false],
    [2, true],
    [-1, null],
    [0, null],
    [5, null],
    [99, null],
    [undefined, null],
    [null, null],
    ['1', null],
    ['2', null],
    [false, null],
    [true, null]
  ]) {
    state = value;
    assert.equal(await player.getPaused(), expected, `state: ${String(state)}`);
  }
});

test('YouTube missing or throwing getPlayerState returns unknown', async () => {
  for (const api of [
    {},
    {
      getPlayerState() {
        throw new Error('not ready');
      }
    }
  ]) {
    assert.equal(await createYoutube(api).getPaused(), null);
  }
});

test('YouTube commands remain void and do not optimistically change state', async () => {
  const calls = [];
  let state = 1;
  const player = createYoutube({
    getPlayerState: () => state,
    pauseVideo: () => calls.push('pause'),
    playVideo: () => calls.push('play')
  });
  assert.equal(player.pause(), undefined);
  assert.equal(await player.getPaused(), false);
  state = 2;
  assert.equal(await player.getPaused(), true);
  assert.equal(player.play(), undefined);
  assert.equal(await player.getPaused(), true);
  assert.deepEqual(calls, ['pause', 'play']);
});

test('Embedly queries advertised support and preserves both boolean values', async () => {
  const timers = createTimers();
  let paused = false;
  let queries = 0;
  const player = createEmbedly(
    {
      isReady: true,
      supports(kind, method) {
        assert.equal(kind, 'method');
        assert.equal(method, 'getPaused');
        return true;
      },
      getPaused(callback) {
        queries++;
        callback(paused);
      }
    },
    timers
  );
  assert.ok(player instanceof Player);
  assert.equal(await player.getPaused(), false);
  paused = true;
  assert.equal(await player.getPaused(), true);
  assert.equal(queries, 2);
  assert.equal(timers.pending.size, 0);
});

test('Embedly does not query before ready or when explicitly unsupported', async () => {
  for (const capabilities of [
    { isReady: false },
    { isReady: true, supports: () => false }
  ]) {
    const timers = createTimers();
    let queries = 0;
    const player = createEmbedly(
      {
        getPaused() {
          queries++;
        },
        ...capabilities
      },
      timers
    );
    assert.equal(await player.getPaused(), null);
    assert.equal(queries, 0);
    assert.equal(timers.pending.size, 0);
  }
});

test('Embedly absent or throwing APIs resolve unknown and clean up timers', async () => {
  for (const api of [
    {},
    { getPaused: false },
    {
      supports() {
        throw new Error('capabilities unavailable');
      },
      getPaused() {}
    },
    {
      getPaused() {
        throw new Error('player unavailable');
      }
    }
  ]) {
    const timers = createTimers();
    assert.equal(await createEmbedly(api, timers).getPaused(), null);
    assert.equal(timers.pending.size, 0);
  }
});

test('Embedly without capability metadata trusts only a boolean callback', async () => {
  for (const value of [false, true, ...unknownStates]) {
    const timers = createTimers();
    const player = createEmbedly(
      { getPaused: callback => callback(value) },
      timers
    );
    assert.equal(
      await player.getPaused(),
      typeof value === 'boolean' ? value : null
    );
    assert.equal(timers.pending.size, 0);
  }
});

test('Embedly asynchronous response clears its timeout', async () => {
  const timers = createTimers();
  let respond;
  const player = createEmbedly(
    { getPaused: callback => (respond = callback) },
    timers
  );
  const result = player.getPaused();
  assert.equal(timers.pending.size, 1);
  respond(false);
  assert.equal(await result, false);
  assert.equal(timers.pending.size, 0);
});

test('Embedly timeout is short; late callbacks cannot change it or a new query', async () => {
  const timers = createTimers();
  const callbacks = [];
  const player = createEmbedly(
    { getPaused: callback => callbacks.push(callback) },
    timers
  );
  const first = player.getPaused();
  assert.equal(timers.pending.size, 1);
  timers.expire();
  assert.equal(await first, null);
  assert.equal(timers.pending.size, 0);

  const second = player.getPaused();
  callbacks[0](false);
  assert.equal(await first, null);
  assert.equal(timers.pending.size, 1);
  callbacks[1](true);
  assert.equal(await second, true);
  assert.equal(timers.pending.size, 0);
});

test(
  'Embedly unresponsive callback resolves unknown with real timers',
  { timeout: 2000 },
  async () => {
    const player = createEmbedly({ getPaused() {} });
    assert.equal(await player.getPaused(), null);
  }
);

test('Embedly commands remain void and require separate state confirmation', async () => {
  const calls = [];
  let paused = false;
  const player = createEmbedly({
    getPaused: callback => callback(paused),
    pause: () => calls.push('pause'),
    play: () => calls.push('play')
  });
  assert.equal(player.pause(), undefined);
  assert.equal(await player.getPaused(), false);
  paused = true;
  assert.equal(await player.getPaused(), true);
  assert.equal(player.play(), undefined);
  assert.equal(await player.getPaused(), true);
  assert.deepEqual(calls, ['pause', 'play']);
});
