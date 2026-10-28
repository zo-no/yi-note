/* eslint-env node */
// Run with: node --test packages/extension/tests/note-editor-workflow.test.cjs
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const TYPE_VIDEO_NOTE = 'video';
const KEY_PAUSE_VIDEO_WHEN_EDITING = 'pause_video_when_editing';
const KEY_RESUME_VIDEO_AFTER_SAVE = 'resume_video_after_save';
const invalidTimes = [NaN, undefined, null, Infinity, -1];
const copy = value => structuredClone(value);
// Drain promise continuations without sleeping or resolving any pending I/O.
const flush = () => new Promise(resolve => setImmediate(resolve));

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function loadDefault(relativePath, context = {}, result) {
  const filename = path.join(__dirname, relativePath);
  const source = readFileSync(filename, 'utf8')
    .replace(/^import\s[\s\S]*?;\r?\n/gm, '')
    .replace(/^export const /gm, 'const ')
    .replace('export default', 'globalThis.result =');
  return vm.runInNewContext(result ? `${source}\n${result}` : source, context, {
    filename
  });
}

const { hasNoteContent, sectionsToMarkdown } = loadDefault(
  '../../common/utils/noteSections.js',
  {},
  '({ hasNoteContent, sectionsToMarkdown })'
);
const addNoteToList = loadDefault('../../common/utils/addNoteToList.js');
const handleKeyDown = loadDefault('../src/ui/utils/handleNoteEditorKeyDown.js');

// Timeout tests advance only the hook's clock; other tests use real Node timers.
function createTimers() {
  let now = 0;
  let nextId = 0;
  const pending = new Map();
  return {
    pending,
    setTimeout(callback, delay) {
      const id = ++nextId;
      pending.set(id, { callback, delay, due: now + delay });
      return id;
    },
    clearTimeout(id) {
      pending.delete(id);
    },
    advance(milliseconds) {
      now += milliseconds;
      for (const [id, { callback, due }] of pending) {
        if (due <= now) {
          pending.delete(id);
          callback();
        }
      }
    }
  };
}

function createEditor(t, timers = { setTimeout, clearTimeout }) {
  const calls = {
    actions: [],
    writes: [],
    commits: [],
    playerUrls: [],
    times: 0,
    pausedQueries: 0,
    pauses: 0,
    plays: 0,
    screenshots: 0,
    captures: [],
    notes: 0,
    stateUpdates: [],
    errors: [],
    warnings: []
  };
  const h = {
    calls,
    timestamp: 12,
    pages: new Map(),
    beforeWrite: () => {},
    getTime: () => h.timestamp,
    getPlayer: () => h.player,
    getPaused: () =>
      !h.video.ended && typeof h.video.paused === 'boolean'
        ? h.video.paused
        : null,
    pause: () => {
      h.video.paused = true;
      h.video.dispatchEvent({ type: 'pause' });
    },
    play: () => {
      h.video.paused = false;
      h.video.dispatchEvent({ type: 'play' });
    },
    screenshot: () => '',
    getNotes: () => []
  };
  const storage = {
    getPage: async id => copy(h.pages.get(id)),
    getNotes: async () => {
      calls.notes++;
      return h.getNotes();
    }
  };
  for (const method of ['addPage', 'addNote', 'updateNote']) {
    storage[method] = async (...args) => {
      const write = { method, args: copy(args) };
      calls.writes.push(write);
      await h.beforeWrite(method, ...args);
      calls.commits.push(write);
      return copy(method === 'addPage' ? args[0] : args[1]);
    };
  }
  const StorageService = { getStorage: () => storage };
  const dependencies = {
    action: run => ({ kind: 'action', run }),
    thunk: run => ({ kind: 'thunk', run }),
    StorageService,
    TYPE_VIDEO_NOTE,
    addNoteToList,
    // Only external services are stubs; note validation, merging, IDs' placement
    // and every editor/page action below come from the production models.
    v5: seed => `generated-${encodeURIComponent(seed)}`,
    uuidNamespace: 'test-namespace',
    generatePageId: url => `page-${url}`,
    getMetadata: (_, url) => ({ url }),
    document: {}
  };
  const state = {
    app: { url: 'https://example.com/watch/first', showingAd: false },
    settings: { data: {} }
  };
  const actions = {};

  // Minimal easy-peasy binding: actions receive their local mutable state;
  // thunks receive local actions and local/root state accessors.
  function bind(model, prefix) {
    const localState = {};
    const localActions = {};
    for (const [key, value] of Object.entries(model)) {
      const name = `${prefix}.${key}`;
      if (value && typeof value.run === 'function') {
        localActions[key] = payload => {
          calls.actions.push({ name, payload: copy(payload) });
          if (value.kind === 'action') return value.run(localState, payload);
          return value.run(localActions, payload, {
            getState: () => localState,
            getStoreState: () => state,
            getStoreActions: () => actions
          });
        };
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        const child = bind(value, name);
        localState[key] = child.state;
        localActions[key] = child.actions;
      } else {
        localState[key] = copy(value);
      }
    }
    return { state: localState, actions: localActions };
  }
  for (const [name, filename] of [
    ['videoNotes', '../src/ui/store/videoNotes.js'],
    ['page', '../../common/store/page.js']
  ]) {
    const model = bind(loadDefault(filename, dependencies), name);
    state[name] = model.state;
    actions[name] = model.actions;
  }
  h.state = state;
  h.actions = actions;
  Object.defineProperty(h, 'editor', {
    get: () => state.videoNotes.editor
  });
  h.navigate = async url => {
    state.app.url = url;
    // Match the onSetUrl listener in ui/store/store.js, using real resets.
    await actions.videoNotes.reset();
    actions.page.reset();
  };
  const listeners = new Map();
  h.listeners = listeners;
  h.video = {
    paused: false,
    currentSrc: 'https://example.com/first.mp4',
    isConnected: true,
    seeking: false,
    ended: false,
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(listener);
    },
    removeEventListener(type, listener) {
      if (!listeners.has(type)) return;
      listeners.get(type).delete(listener);
      if (!listeners.get(type).size) listeners.delete(type);
    },
    dispatchEvent({ type }) {
      for (const listener of listeners.get(type) || []) listener({ type });
    }
  };
  h.player = {
    getPaused: () => {
      calls.pausedQueries++;
      return h.getPaused();
    },
    play: () => {
      calls.plays++;
      return h.play();
    },
    pause: () => {
      calls.pauses++;
      return h.pause();
    },
    getCurrentTime: () => {
      calls.times++;
      return h.getTime();
    },
    getVideoElement: () => h.video
  };

  const hooks = [];
  let cursor;
  let effects;
  let unmounted = false;
  const useRef = initial => {
    const index = cursor++;
    if (!hooks[index]) hooks[index] = { current: initial };
    return hooks[index];
  };
  const useNoteEditor = loadDefault('../src/ui/hooks/useNoteEditor.js', {
    useRef,
    useState: initial => {
      const ref = useRef(initial);
      return [
        ref.current,
        next => {
          calls.stateUpdates.push(next);
          ref.current = typeof next === 'function' ? next(ref.current) : next;
        }
      ];
    },
    useEffect: (effect, deps) => {
      const index = cursor++;
      const previous = hooks[index];
      if (
        !previous ||
        !deps ||
        !previous.deps ||
        deps.length !== previous.deps.length ||
        deps.some((dep, i) => !Object.is(dep, previous.deps[i]))
      ) {
        effects.push(() => {
          if (previous && previous.cleanup) previous.cleanup();
          hooks[index] = { deps, cleanup: effect() };
        });
      }
    },
    useStore: () => ({ getState: () => state, getActions: () => actions }),
    hasNoteContent,
    StorageService,
    TYPE_VIDEO_NOTE,
    KEY_PAUSE_VIDEO_WHEN_EDITING,
    KEY_RESUME_VIDEO_AFTER_SAVE,
    setTimeout: timers.setTimeout,
    clearTimeout: timers.clearTimeout,
    PlayerFactory: {
      getPlayer: ({ url }) => {
        calls.playerUrls.push(url);
        return h.getPlayer();
      }
    },
    takeScreenshot: (element, settings) => {
      assert.equal(element, h.video);
      calls.screenshots++;
      calls.captures.push({ element, settings });
      return h.screenshot(element, settings);
    },
    logger: {
      error: error => calls.errors.push(error),
      warn: error => calls.warnings.push(error)
    }
  });
  h.render = () => {
    assert.equal(unmounted, false, 'cannot render an unmounted hook');
    cursor = 0;
    effects = [];
    h.hook = useNoteEditor();
    effects.forEach(effect => effect());
    return h.hook;
  };
  h.unmount = () => {
    if (unmounted) return;
    unmounted = true;
    hooks.forEach(hook => {
      if (hook.cleanup) hook.cleanup();
    });
  };
  t.after(h.unmount);
  h.render();
  return h;
}

function enter(h) {
  let pending;
  let prevented = 0;
  let stopped = 0;
  handleKeyDown(
    {
      key: 'Enter',
      metaKey: false,
      repeat: false,
      nativeEvent: { isComposing: false, keyCode: 13 },
      preventDefault: () => prevented++,
      stopPropagation: () => stopped++
    },
    () => {
      pending = h.hook.handleSave();
    },
    h.hook.handleChange
  );
  assert.equal(prevented, 1);
  assert.equal(stopped, 1);
  assert.ok(pending, 'Enter must invoke the real save callback');
  return pending;
}

function committedNotes(h) {
  return h.calls.commits.flatMap(({ method, args }) =>
    method === 'addPage' ? args[0].notes : [args[1]]
  );
}

function seedPage(h, notes = []) {
  h.actions.page.setPage({
    id: 'first-page',
    meta: { url: h.state.app.url },
    notes: copy(notes),
    tags: []
  });
}

const sectionDraft = (body = '看到的内容') => {
  const sections = [
    { id: 'observe', kind: 'observation', label: '观察', content: body },
    { id: 'analyze', kind: 'analysis', label: '拆解', content: '' }
  ];
  return { sections, content: sectionsToMarkdown(sections) };
};

test('structured draft saves labels and content together and resets both for the next note', async t => {
  const h = createEditor(t);
  const draft = sectionDraft();
  h.hook.handleChange(draft);
  await h.hook.handleSave();
  const [saved] = committedNotes(h);
  assert.deepEqual(saved.sections, draft.sections);
  assert.equal(saved.content, draft.content);
  assert.equal(saved.timestamp, 12);
  assert.equal(h.editor.note.sections, undefined);
  assert.equal(h.editor.note.content, '');
});

test('blank section templates are not saved as notes containing only labels', async t => {
  const h = createEditor(t);
  h.hook.handleChange(sectionDraft('  '));
  await h.hook.handleSave();
  assert.equal(h.calls.writes.length, 0);
  assert.equal(h.editor.note.sections.length, 2);
});

test('canceling a structured edit leaves the persisted note unchanged', async t => {
  const h = createEditor(t);
  const original = {
    ...sectionDraft(),
    id: 'existing',
    timestamp: 8,
    type: TYPE_VIDEO_NOTE
  };
  seedPage(h, [original]);
  h.actions.videoNotes.edit(original);
  h.hook.handleChange(sectionDraft('尚未保存的修改'));
  h.hook.handleCancel();
  assert.deepEqual(copy(h.state.page.data.notes[0]), original);
  assert.equal(h.calls.writes.length, 0);
  assert.equal(h.editor.note.sections, undefined);
});

test('failed structured save retains all draft fields for retry', async t => {
  const h = createEditor(t);
  const draft = sectionDraft();
  h.beforeWrite = () => {
    throw new Error('storage unavailable');
  };
  h.hook.handleChange(draft);
  await h.hook.handleSave();
  assert.equal(h.render().error, 'editor.saveError');
  assert.deepEqual(copy(h.editor.note.sections), draft.sections);
  assert.equal(h.editor.note.content, draft.content);
  h.beforeWrite = () => {};
  await h.hook.handleSave();
  assert.deepEqual(committedNotes(h)[0].sections, draft.sections);
});

test('plain-text edits clear stale section metadata instead of resurrecting old content', async t => {
  const h = createEditor(t);
  const original = {
    ...sectionDraft(),
    id: 'existing',
    timestamp: 8,
    type: TYPE_VIDEO_NOTE
  };
  seedPage(h, [original]);
  h.actions.videoNotes.edit(original);
  h.hook.handleChange('新的普通 Markdown');
  await h.hook.handleSave();
  const [saved] = committedNotes(h);
  assert.equal(saved.content, '新的普通 Markdown');
  assert.deepEqual(saved.sections, []);
  assert.equal(saved.id, 'existing');
});

test('focus only prepares the player and honors the pause setting; save captures 15 after seeking from 10', async t => {
  for (const pauseWhenEditing of [undefined, false, true]) {
    await t.test(String(pauseWhenEditing), async t => {
      const h = createEditor(t);
      if (pauseWhenEditing !== undefined) {
        h.state.settings.data[KEY_PAUSE_VIDEO_WHEN_EDITING] = pauseWhenEditing;
      }
      h.timestamp = 10;
      h.hook.handleFocus();
      await flush();
      assert.equal(h.editor.active, true);
      assert.equal(h.calls.playerUrls.length, 1);
      assert.equal(h.calls.pauses, pauseWhenEditing ? 1 : 0);
      assert.equal(h.video.paused, !!pauseWhenEditing);
      assert.equal(h.calls.times, 0);
      assert.equal(h.calls.screenshots, 0);
      assert.equal(h.editor.note.timestamp, null);
      assert.equal(h.editor.note.image, '');

      h.hook.handleChange('save at the new position');
      h.video.seeking = true;
      h.timestamp = 15;
      h.video.seeking = false;
      h.screenshot = () => 'frame-at-15';
      await flush();
      assert.equal(h.calls.times, 0);
      assert.equal(h.calls.screenshots, 0);
      await h.hook.handleSave();
      assert.equal(committedNotes(h)[0].timestamp, 15);
      assert.equal(committedNotes(h)[0].image, 'frame-at-15');
      assert.equal(h.calls.times, 1);
      assert.equal(h.calls.screenshots, 1);
      assert.equal(h.calls.playerUrls.length, 1);
      assert.equal(h.calls.plays, pauseWhenEditing ? 1 : 0);
      assert.equal(h.render().notice, 'editor.saved');
    });
  }
});

test('with editing pause disabled, each save reads the latest time while playback continues', async t => {
  const h = createEditor(t);
  h.state.settings.data[KEY_PAUSE_VIDEO_WHEN_EDITING] = false;
  h.timestamp = 10;
  h.hook.handleChange('playing draft');
  await flush();
  assert.equal(h.calls.times, 0);
  h.timestamp = 18;
  h.getTime = () => {
    assert.equal(h.video.paused, false);
    return h.timestamp;
  };
  h.screenshot = () => `frame-at-${h.timestamp}`;
  await h.hook.handleSave();
  assert.equal(committedNotes(h)[0].timestamp, 18);
  assert.equal(committedNotes(h)[0].image, 'frame-at-18');
  h.render();
  h.hook.handleChange('still playing');
  h.timestamp = 27;
  await h.hook.handleSave();
  assert.equal(committedNotes(h)[1].timestamp, 27);
  assert.equal(committedNotes(h)[1].image, 'frame-at-27');
  assert.equal(h.calls.pauses, 0);
  assert.equal(h.calls.plays, 0);
  assert.equal(h.calls.pausedQueries, 0);
});

test('screenshot receives the video element and the current loaded settings only at save time', async t => {
  const h = createEditor(t);
  h.hook.handleChange('capture settings');
  await flush();
  assert.equal(h.calls.screenshots, 0);
  const settings = { screenshot_resolution: 720 };
  h.state.settings.data = settings;
  h.screenshot = (element, receivedSettings) => {
    assert.equal(element, h.video);
    assert.equal(receivedSettings, settings);
    return 'configured-image';
  };
  await h.hook.handleSave();
  assert.equal(h.calls.captures.length, 1);
  assert.equal(h.calls.captures[0].settings, settings);
  assert.equal(committedNotes(h)[0].image, 'configured-image');
});

test('Enter saves two consecutive drafts without refocusing; zero is valid', async t => {
  const h = createEditor(t);
  h.state.settings.data[KEY_PAUSE_VIDEO_WHEN_EDITING] = true;
  h.timestamp = 0;
  h.hook.handleFocus();
  h.hook.handleChange('first');
  await enter(h);
  assert.equal(h.editor.revision, 1);
  assert.equal(h.editor.active, false);
  assert.equal(h.editor.note.timestamp, null);
  assert.equal(h.editor.note.content, '');
  assert.equal(h.calls.pauses, 1);
  assert.equal(h.calls.plays, 1);
  assert.equal(h.video.paused, false);
  assert.equal(h.listeners.size, 0);
  assert.equal(h.render().notice, 'editor.savedWithoutImage');

  h.timestamp = 42.5;
  h.hook.handleChange('second'); // No second onFocus, just like Enter in Editor.
  await flush();
  assert.equal(h.render().notice, '');
  assert.equal(h.editor.active, true);
  assert.equal(h.calls.pauses, 2);
  assert.equal(h.calls.plays, 1);
  assert.equal(h.video.paused, true);
  assert.equal(h.calls.times, 1);
  assert.equal(h.calls.screenshots, 1);
  await enter(h);
  const notes = committedNotes(h);
  assert.deepEqual(
    notes.map(note => note.content),
    ['first', 'second']
  );
  assert.deepEqual(
    notes.map(note => note.timestamp),
    [0, 42.5]
  );
  assert.ok(notes.every(note => note.id && note.type === TYPE_VIDEO_NOTE));
  assert.notEqual(notes[0].id, notes[1].id);
  assert.equal(h.state.page.data.notes.length, 2);
  assert.equal(h.calls.times, 2);
  assert.equal(h.calls.playerUrls.length, 2);
  assert.equal(h.calls.pauses, 2);
  assert.equal(h.calls.plays, 2);
  assert.equal(h.calls.screenshots, 2);
  assert.equal(h.listeners.size, 0);
  assert.equal(h.editor.revision, 2);
  assert.equal(h.render().saving, false);
});

test('rapid typing/save shares focus initialization and waits for pause/time without losing content', async t => {
  const h = createEditor(t);
  const player = deferred();
  const pause = deferred();
  const time = deferred();
  h.state.settings.data[KEY_PAUSE_VIDEO_WHEN_EDITING] = true;
  h.getPlayer = () => player.promise;
  h.pause = async () => {
    await pause.promise;
    h.video.paused = true;
  };
  h.getTime = () => time.promise;
  h.hook.handleFocus();
  h.hook.handleChange('early text');
  h.hook.handleChange('latest text');
  const saving = h.hook.handleSave();
  assert.equal(h.render().saving, true);
  assert.equal(h.calls.playerUrls.length, 1);
  assert.equal(h.calls.writes.length, 0);

  player.resolve(h.player);
  await flush();
  assert.equal(h.calls.pauses, 1);
  assert.equal(h.calls.times, 0);
  pause.resolve();
  await flush();
  assert.equal(h.calls.times, 1);
  assert.equal(h.calls.writes.length, 0);
  assert.equal(h.editor.note.content, 'latest text');
  time.resolve(17);
  await saving;
  assert.equal(committedNotes(h)[0].content, 'latest text');
  assert.equal(committedNotes(h)[0].timestamp, 17);
  assert.equal(h.calls.times, 1);
  assert.equal(h.calls.plays, 1);
});

test('a pending screenshot times out within 1000ms and cannot overwrite the next draft image', async t => {
  const timers = createTimers();
  const h = createEditor(t, timers);
  const oldImage = deferred();
  const newImage = deferred();
  h.screenshot = () => oldImage.promise;
  h.hook.handleChange('first');
  await flush();
  assert.equal(h.calls.screenshots, 0);
  const saving = h.hook.handleSave();
  await flush();
  assert.equal(h.calls.screenshots, 1);
  assert.equal(h.calls.writes.length, 0);
  assert.equal(timers.pending.size, 1);
  const [{ delay }] = [...timers.pending.values()];
  assert.ok(delay > 0 && delay <= 1000, 'capture must have a bounded timeout');
  timers.advance(delay - 1);
  await flush();
  assert.equal(h.render().saving, true);
  assert.equal(h.calls.writes.length, 0);
  timers.advance(1);
  await saving;
  assert.equal(committedNotes(h)[0].image, '');
  assert.equal(h.render().notice, 'editor.savedWithoutImage');
  assert.equal(h.hook.error, '');
  assert.equal(h.calls.warnings.length, 1);
  assert.equal(timers.pending.size, 0);

  h.timestamp = 24;
  h.screenshot = () => newImage.promise;
  h.hook.handleChange('second');
  const secondSave = h.hook.handleSave();
  await flush();
  assert.equal(h.calls.screenshots, 2);
  const current = copy(h.editor);
  const actionCount = h.calls.actions.length;
  oldImage.resolve('stale-image');
  await flush();
  assert.deepEqual(copy(h.editor), current);
  assert.equal(h.calls.actions.length, actionCount);
  assert.equal(h.calls.commits.length, 1);
  newImage.resolve('new-image');
  await secondSave;
  assert.equal(committedNotes(h)[0].image, '');
  assert.equal(committedNotes(h)[1].image, 'new-image');
  assert.equal(committedNotes(h)[1].timestamp, 24);
  assert.equal(h.render().notice, 'editor.saved');
  assert.equal(timers.pending.size, 0);
});

for (const transition of ['reset', 'navigate', 'edit another note']) {
  test(`a pending save screenshot cannot write or resume after ${transition}`, async t => {
    const h = createEditor(t);
    const image = deferred();
    h.state.settings.data[KEY_PAUSE_VIDEO_WHEN_EDITING] = true;
    h.screenshot = () => image.promise;
    h.hook.handleChange('discarded draft');
    const saving = h.hook.handleSave();
    await flush();
    assert.equal(h.calls.screenshots, 1);
    assert.equal(h.calls.pauses, 1);
    assert.equal(h.calls.writes.length, 0);
    const revision = h.editor.revision;
    // The cancel callback is locked during a save, but external resets still occur.
    if (transition === 'reset') {
      h.actions.videoNotes.editor.reset();
    } else if (transition === 'navigate') {
      await h.navigate('https://example.com/watch/next');
    } else {
      h.actions.videoNotes.edit({
        id: 'other-note',
        content: 'keep this',
        timestamp: 80,
        image: 'other-image'
      });
    }
    h.render();
    assert.equal(h.editor.revision, revision + 1);
    assert.equal(h.listeners.size, 0);
    const current = copy(h.editor);
    const actionCount = h.calls.actions.length;
    image.resolve('stale-image');
    await saving;
    await flush();
    assert.deepEqual(copy(h.editor), current);
    assert.equal(h.calls.actions.length, actionCount);
    assert.equal(h.calls.writes.length, 0);
    assert.equal(h.calls.plays, 0);
    assert.equal(h.calls.notes, 0);
    assert.equal(h.render().error, '');
    assert.equal(h.hook.notice, '');
    assert.equal(h.hook.saving, false);
  });
}

test('cancel invalidates pending focus player results and errors without reading time or capturing', async t => {
  for (const outcome of ['resolve', 'reject']) {
    await t.test(outcome, async t => {
      const h = createEditor(t);
      const player = deferred();
      h.state.settings.data[KEY_PAUSE_VIDEO_WHEN_EDITING] = true;
      h.getPlayer = () => player.promise;
      h.hook.handleChange('cancel before preparation finishes');
      await flush();
      assert.equal(h.calls.times, 0);
      assert.equal(h.calls.screenshots, 0);
      h.hook.handleCancel();
      const current = copy(h.editor);
      const actionCount = h.calls.actions.length;
      if (outcome === 'resolve') player.resolve(h.player);
      else player.reject(new Error('old player failed'));
      await flush();
      assert.deepEqual(copy(h.editor), current);
      assert.equal(h.calls.actions.length, actionCount);
      assert.equal(h.calls.pauses, 0);
      assert.equal(h.calls.plays, 0);
      assert.equal(h.calls.times, 0);
      assert.equal(h.calls.screenshots, 0);
      assert.equal(h.render().error, '');
      h.getPlayer = () => h.player;
      h.timestamp = 22;
      h.hook.handleChange('replacement');
      await h.hook.handleSave();
      assert.equal(committedNotes(h)[0].timestamp, 22);
      assert.equal(committedNotes(h)[0].content, 'replacement');
      assert.equal(h.calls.times, 1);
    });
  }
});

test('reset/navigation invalidates pending save-time results and errors', async t => {
  for (const transition of ['reset', 'navigate']) {
    for (const outcome of ['resolve', 'reject']) {
      await t.test(`${transition}: old getTime ${outcome}`, async t => {
        const h = createEditor(t);
        const time = deferred();
        h.state.settings.data[KEY_PAUSE_VIDEO_WHEN_EDITING] = true;
        h.getTime = () => time.promise;
        h.hook.handleChange('old draft');
        const saving = h.hook.handleSave();
        await flush();
        assert.equal(h.calls.times, 1);
        if (transition === 'reset') h.actions.videoNotes.editor.reset();
        else await h.navigate('https://example.com/watch/next');
        h.render();
        const current = copy(h.editor);
        const actionCount = h.calls.actions.length;
        if (outcome === 'resolve') time.resolve(111);
        else time.reject(new Error('old player failed'));
        await saving;
        await flush();
        assert.deepEqual(copy(h.editor), current);
        assert.equal(h.calls.actions.length, actionCount);
        assert.equal(h.calls.writes.length, 0);
        assert.equal(h.calls.screenshots, 0);
        assert.equal(h.calls.plays, 0);
        assert.equal(h.render().error, '');
        assert.equal(h.hook.notice, '');
        assert.equal(h.hook.saving, false);

        h.getTime = () => 22;
        h.hook.handleChange('replacement');
        await h.hook.handleSave();
        assert.equal(committedNotes(h)[0].timestamp, 22);
        assert.equal(committedNotes(h)[0].content, 'replacement');
        assert.equal(h.calls.times, 2);
      });
    }
  }
});

test('saving locks callbacks; storage failure retains the draft but retry captures a fresh time and image', async t => {
  const h = createEditor(t);
  const time = deferred();
  const image = deferred();
  const write = deferred();
  h.state.settings.data[KEY_PAUSE_VIDEO_WHEN_EDITING] = true;
  h.getTime = () => time.promise;
  h.screenshot = () => image.promise;
  h.beforeWrite = () => write.promise;
  h.hook.handleChange('retry me');
  const revision = h.editor.revision;
  const saving = h.hook.handleSave();

  async function assertLocked() {
    assert.equal(h.render().saving, true);
    const current = copy(h.editor);
    const actionCount = h.calls.actions.length;
    const playerCount = h.calls.playerUrls.length;
    await h.hook.handleSave();
    h.hook.handleChange('must be ignored');
    h.hook.handleFocus();
    h.hook.handleCancel();
    assert.deepEqual(copy(h.editor), current);
    assert.equal(h.calls.actions.length, actionCount);
    assert.equal(h.calls.playerUrls.length, playerCount);
  }
  await flush();
  await assertLocked();
  assert.equal(h.calls.writes.length, 0);
  time.resolve(31);
  await flush();
  await assertLocked();
  assert.equal(h.calls.screenshots, 1);
  assert.equal(h.calls.writes.length, 0);
  assert.equal(h.calls.plays, 0);
  image.resolve('first-attempt-image');
  await flush();
  await assertLocked();
  assert.equal(h.calls.writes.length, 1);
  assert.equal(h.calls.plays, 0);
  write.reject(new Error('storage unavailable'));
  await saving;
  assert.equal(h.render().saving, false);
  assert.equal(h.hook.error, 'editor.saveError');
  assert.equal(h.editor.revision, revision);
  assert.equal(h.editor.active, true);
  assert.equal(h.editor.note.content, 'retry me');
  assert.equal(h.editor.note.timestamp, null);
  assert.equal(h.editor.note.image, '');
  assert.equal(h.calls.writes[0].args[0].notes[0].timestamp, 31);
  assert.equal(h.calls.writes[0].args[0].notes[0].image, 'first-attempt-image');
  assert.equal(h.calls.commits.length, 0);
  assert.equal(h.calls.notes, 0);
  assert.equal(h.calls.plays, 0);
  assert.equal(h.hook.notice, '');

  h.getTime = () => 47;
  h.screenshot = () => 'retry-image';
  h.beforeWrite = () => {};
  await h.hook.handleSave();
  assert.equal(h.calls.writes.length, 2);
  assert.equal(h.calls.commits.length, 1);
  assert.equal(h.calls.times, 2, 'retry must read the current playback time');
  assert.equal(h.calls.screenshots, 2);
  assert.equal(h.calls.plays, 1);
  assert.equal(committedNotes(h)[0].timestamp, 47);
  assert.equal(committedNotes(h)[0].image, 'retry-image');
  assert.equal(committedNotes(h)[0].content, 'retry me');
  assert.equal(h.editor.revision, revision + 1);
  assert.equal(h.editor.note.content, '');
  assert.equal(h.render().error, '');
});

test('invalid player times never persist and retain content for a zero-second retry', async t => {
  for (const timestamp of invalidTimes) {
    await t.test(String(timestamp), async t => {
      const h = createEditor(t);
      h.state.settings.data[KEY_PAUSE_VIDEO_WHEN_EDITING] = true;
      h.timestamp = timestamp;
      h.hook.handleChange('keep until time is available');
      await h.hook.handleSave();
      assert.equal(h.calls.writes.length, 0);
      assert.equal(h.editor.revision, 0);
      assert.equal(h.editor.note.timestamp, null);
      assert.equal(h.editor.note.content, 'keep until time is available');
      assert.equal(h.render().saving, false);
      assert.equal(h.hook.error, 'editor.timestampUnavailable');
      assert.equal(h.calls.screenshots, 0);
      assert.equal(h.calls.plays, 0);
      assert.equal(h.hook.notice, '');

      h.timestamp = 0;
      await h.hook.handleSave();
      assert.equal(h.calls.times, 2);
      assert.equal(h.calls.plays, 1);
      assert.equal(committedNotes(h)[0].timestamp, 0);
      assert.equal(
        committedNotes(h)[0].content,
        'keep until time is available'
      );
      assert.equal(h.editor.revision, 1);
      assert.equal(h.render().error, '');
    });
  }
});

test('existing notes keep their timestamps; damaged notes are not restamped but remain editable in options', async t => {
  for (const timestamp of [0, 51, ...invalidTimes]) {
    const h = createEditor(t);
    const note = {
      id: 'existing-note',
      content: 'original',
      timestamp,
      image: 'existing-image',
      type: TYPE_VIDEO_NOTE
    };
    seedPage(h, [note]);
    h.state.settings.data[KEY_PAUSE_VIDEO_WHEN_EDITING] = true;
    h.actions.videoNotes.edit(note);
    h.hook.handleFocus();
    h.hook.handleChange('edited text');
    const revision = h.editor.revision;
    await h.hook.handleSave();
    assert.equal(h.calls.playerUrls.length, 0, String(timestamp));
    assert.equal(h.calls.times, 0);
    assert.equal(h.calls.screenshots, 0);
    assert.equal(h.calls.pauses, 0);
    assert.equal(h.calls.plays, 0);
    if (Number.isFinite(timestamp) && timestamp >= 0) {
      assert.equal(h.render().notice, 'editor.saved');
      assert.equal(h.editor.revision, revision + 1);
    } else {
      assert.equal(h.calls.writes.length, 0, String(timestamp));
      assert.equal(h.editor.revision, revision);
      assert.equal(h.editor.note.content, 'edited text');
      assert.equal(h.editor.note.timestamp, timestamp);
      assert.equal(h.render().error, 'editor.timestampUnavailable');
      // Options VideoNoteItem sends this payload directly to the shared model.
      await h.actions.page.saveNote({ ...note, content: 'edited text' });
    }
    assert.equal(h.calls.commits.length, 1);
    assert.equal(h.calls.commits[0].method, 'updateNote');
    assert.deepEqual(committedNotes(h)[0], { ...note, content: 'edited text' });
    assert.equal(h.state.page.data.notes.length, 1);
    assert.equal(h.state.page.data.notes[0].timestamp, timestamp);
  }
});

test('unmount suppresses late player/time/image/support work and state setters', async t => {
  for (const phase of ['player', 'time', 'image', 'support']) {
    await t.test(phase, async t => {
      const h = createEditor(t);
      const pending = deferred();
      if (phase === 'player') h.getPlayer = () => pending.promise;
      if (phase === 'time') h.getTime = () => pending.promise;
      if (phase === 'image') h.screenshot = () => pending.promise;
      if (phase === 'support') h.getNotes = () => pending.promise;
      h.hook.handleChange('unmount me');
      const saving = h.hook.handleSave();
      await flush();
      if (phase === 'support') {
        await saving;
        assert.equal(h.calls.notes, 1);
      } else if (phase === 'image') {
        assert.equal(h.calls.screenshots, 1);
      } else if (phase === 'time') {
        assert.equal(h.calls.times, 1);
      }
      h.unmount();
      const current = copy(h.state);
      const actionCount = h.calls.actions.length;
      const stateUpdateCount = h.calls.stateUpdates.length;
      const writeCount = h.calls.writes.length;
      pending.resolve(
        phase === 'player'
          ? h.player
          : phase === 'support'
          ? Array(50).fill({ id: 'note' })
          : phase === 'image'
          ? 'late-image'
          : 60
      );
      await saving;
      await flush();
      assert.deepEqual(copy(h.state), current);
      assert.equal(h.calls.actions.length, actionCount);
      assert.equal(h.calls.stateUpdates.length, stateUpdateCount);
      assert.equal(h.calls.writes.length, writeCount);
      assert.equal(h.state.videoNotes.support.open, false);
      if (phase === 'player') assert.equal(h.calls.times, 0);
    });
  }
});

test('unmount during an already-dispatched save does not reset the editor or request support', async t => {
  const h = createEditor(t);
  const write = deferred();
  h.beforeWrite = () => write.promise;
  h.hook.handleChange('already saving');
  const saving = h.hook.handleSave();
  await flush();
  assert.equal(h.calls.writes.length, 1);
  h.unmount();
  const current = copy(h.editor);
  const actionCount = h.calls.actions.length;
  const stateUpdateCount = h.calls.stateUpdates.length;
  write.resolve();
  await saving;
  await flush();
  // Persistence already dispatched to the shared store may still finish;
  // the unmounted hook must not dispatch editor/support work afterward.
  assert.equal(h.calls.commits.length, 1);
  assert.deepEqual(copy(h.editor), current);
  assert.ok(
    h.calls.actions
      .slice(actionCount)
      .every(({ name }) => !name.startsWith('videoNotes.'))
  );
  assert.equal(h.calls.stateUpdates.length, stateUpdateCount);
  assert.equal(h.calls.notes, 0);
});

test('store saveNote does not let an empty input ID overwrite the generated ID', async t => {
  for (const bookmarked of [false, true]) {
    const h = createEditor(t);
    if (bookmarked) seedPage(h);
    await h.actions.page.saveNote({
      id: '',
      content: 'zero',
      timestamp: 0,
      type: TYPE_VIDEO_NOTE
    });
    const [note] = committedNotes(h);
    assert.equal(note.id, 'generated-zero0');
    assert.equal(h.calls.commits[0].method, bookmarked ? 'addNote' : 'addPage');
    assert.equal(h.state.page.data.notes[0].id, note.id);
    assert.equal(h.state.page.data.notes[0].timestamp, 0);
  }
});

test('store rejects invalid new video notes before any storage or UI write', async t => {
  for (const id of [undefined, '', 'not-an-existing-note']) {
    for (const bookmarked of [false, true]) {
      for (const timestamp of invalidTimes) {
        const h = createEditor(t);
        if (bookmarked) seedPage(h);
        const current = copy(h.state.page);
        const note = { content: 'invalid', timestamp, type: TYPE_VIDEO_NOTE };
        if (id !== undefined) note.id = id;
        await assert.rejects(
          h.actions.page.saveNote(note),
          /valid timestamp/,
          `id=${String(id)}, bookmarked=${bookmarked}, time=${String(
            timestamp
          )}`
        );
        assert.equal(h.calls.writes.length, 0);
        assert.deepEqual(copy(h.state.page), current);
      }
    }
  }
});

test('async store saves cannot replace the page UI after a video URL change', async t => {
  for (const method of ['addPage', 'addNote', 'updateNote']) {
    await t.test(method, async t => {
      const h = createEditor(t);
      const note = {
        id: method === 'updateNote' ? 'existing-note' : '',
        content: 'belongs to first page',
        timestamp: 5,
        type: TYPE_VIDEO_NOTE
      };
      if (method !== 'addPage') seedPage(h, note.id ? [note] : []);
      const write = deferred();
      h.beforeWrite = () => write.promise;
      const saving = h.actions.page.saveNote(note);
      await flush();
      assert.equal(h.calls.writes[0].method, method);
      await h.navigate('https://example.com/watch/next');
      h.pages.set('next-page', {
        id: 'next-page',
        meta: { url: h.state.app.url },
        notes: [],
        tags: ['next']
      });
      await h.actions.page.fetchPage('next-page');
      const current = copy(h.state.page);
      const actionCount = h.calls.actions.length;
      write.resolve();
      await saving;
      assert.equal(h.calls.commits.length, 1);
      assert.deepEqual(copy(h.state.page), current);
      assert.equal(h.calls.actions.length, actionCount);
    });
  }
});

test('resume preference defaults on, respects false, and waits until persistence completes', async t => {
  for (const preference of [undefined, true, false]) {
    await t.test(String(preference), async t => {
      const h = createEditor(t);
      h.state.settings.data[KEY_PAUSE_VIDEO_WHEN_EDITING] = true;
      if (preference !== undefined)
        h.state.settings.data[KEY_RESUME_VIDEO_AFTER_SAVE] = preference;
      const write = deferred();
      h.beforeWrite = () => write.promise;
      h.hook.handleChange('resume after commit only');
      await flush();
      assert.equal(h.video.paused, true);
      const saving = h.hook.handleSave();
      await flush();
      assert.equal(h.calls.writes.length, 1);
      assert.equal(h.calls.plays, 0);
      write.resolve();
      await saving;
      assert.equal(h.calls.commits.length, 1);
      assert.equal(h.calls.plays, preference === false ? 0 : 1);
      assert.equal(h.listeners.size, 0);
    });
  }
});

for (const scenario of [
  'manual pause',
  'unknown state',
  'user played and paused',
  'cancel',
  'empty',
  'failed write'
]) {
  test(`no automatic playback for ${scenario}`, async t => {
    const h = createEditor(t);
    h.state.settings.data[KEY_PAUSE_VIDEO_WHEN_EDITING] = true;
    if (scenario === 'manual pause') h.video.paused = true;
    if (scenario === 'unknown state') h.getPaused = () => null;
    h.hook.handleChange(scenario === 'empty' ? '  ' : 'keep paused');
    await flush();
    if (scenario === 'user played and paused') {
      h.play();
      h.pause();
    }
    if (scenario === 'failed write')
      h.beforeWrite = () => {
        throw new Error('quota');
      };
    if (scenario === 'cancel') h.hook.handleCancel();
    else await h.hook.handleSave();
    assert.equal(h.calls.plays, 0);
    assert.equal(
      h.calls.commits.length,
      ['cancel', 'empty', 'failed write'].includes(scenario) ? 0 : 1
    );
    if (scenario === 'failed write') {
      assert.equal(h.editor.note.content, 'keep paused');
      assert.equal(h.render().error, 'editor.saveError');
    }
  });
}

for (const transition of [
  'navigation',
  'advertisement',
  'ended',
  'new src',
  'new currentSrc',
  'detached',
  'new draft'
]) {
  test(`saved notes never resume an obsolete player after ${transition}`, async t => {
    const h = createEditor(t);
    h.state.settings.data[KEY_PAUSE_VIDEO_WHEN_EDITING] = true;
    const write = deferred();
    h.beforeWrite = () => write.promise;
    h.hook.handleChange('old video');
    const saving = h.hook.handleSave();
    await flush();
    assert.equal(h.calls.writes.length, 1);
    if (transition === 'navigation')
      await h.navigate('https://example.com/next');
    if (transition === 'advertisement') h.state.app.showingAd = true;
    if (transition === 'ended') h.video.ended = true;
    if (transition === 'new src') h.video.src = 'https://example.com/next.mp4';
    if (transition === 'new currentSrc')
      h.video.currentSrc = 'https://example.com/next.mp4';
    if (transition === 'detached') h.video.isConnected = false;
    if (transition === 'new draft') h.actions.videoNotes.editor.reset();
    write.resolve();
    await saving;
    assert.equal(h.calls.commits.length, 1);
    assert.equal(h.calls.plays, 0);
    assert.equal(h.render().error, '');
  });
}

for (const failure of ['play rejects', 'state unknown', 'element throws']) {
  test(`a resume failure (${failure}) never turns a committed note into a failed save`, async t => {
    const h = createEditor(t);
    h.state.settings.data[KEY_PAUSE_VIDEO_WHEN_EDITING] = true;
    h.screenshot = () => 'frame';
    h.beforeWrite = () => {
      if (failure === 'play rejects')
        h.play = () => Promise.reject(new Error('autoplay blocked'));
      if (failure === 'state unknown') h.getPaused = () => null;
      if (failure === 'element throws')
        h.player.getVideoElement = () => {
          throw new Error('detached player');
        };
    };
    h.hook.handleChange('already persisted');
    await h.hook.handleSave();
    assert.equal(h.calls.commits.length, 1);
    assert.equal(h.editor.note.content, '');
    assert.equal(h.render().notice, 'editor.savedResumeBlocked');
    assert.equal(h.hook.error, '');
    await h.hook.handleSave();
    assert.equal(h.calls.writes.length, 1);
  });
}

test('navigation while checking whether to resume prevents a late play command', async t => {
  const h = createEditor(t);
  h.state.settings.data[KEY_PAUSE_VIDEO_WHEN_EDITING] = true;
  const paused = deferred();
  h.beforeWrite = () => {
    h.getPaused = () => paused.promise;
  };
  h.hook.handleChange('old session');
  const saving = h.hook.handleSave();
  await flush();
  assert.equal(h.calls.commits.length, 1);
  await h.navigate('https://example.com/next');
  paused.resolve(true);
  await saving;
  assert.equal(h.calls.plays, 0);
  assert.equal(h.render().notice, '');
});

test('options page navigation also fences an async save when app.url is absent', async t => {
  const h = createEditor(t);
  // The options app model has no url; Page switches via fetchPage(route.id).
  delete h.state.app.url;
  const note = {
    id: 'existing-note',
    content: 'before editing',
    timestamp: null,
    type: TYPE_VIDEO_NOTE
  };
  seedPage(h, [note]);
  const write = deferred();
  h.beforeWrite = () => write.promise;
  const saving = h.actions.page.saveNote({ ...note, content: 'options edit' });
  await flush();
  assert.equal(h.calls.writes[0].method, 'updateNote');
  h.pages.set('next-page', {
    id: 'next-page',
    meta: { url: 'https://example.com/watch/next' },
    notes: [],
    tags: ['next']
  });
  await h.actions.page.fetchPage('next-page');
  const current = copy(h.state.page);
  write.resolve();
  await saving;
  assert.equal(h.calls.commits.length, 1);
  assert.equal(h.calls.commits[0].args[0], 'first-page');
  assert.deepEqual(copy(h.state.page), current);
});
