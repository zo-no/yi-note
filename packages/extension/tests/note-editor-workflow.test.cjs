/* eslint-env node */
// Run with: node --test packages/extension/tests/note-editor-workflow.test.cjs
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const TYPE_VIDEO_NOTE = 'video';
const KEY_PAUSE_VIDEO_WHEN_EDITING = 'pause_video_when_editing';
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

function createEditor(t) {
  const calls = {
    actions: [],
    writes: [],
    commits: [],
    playerUrls: [],
    times: 0,
    pauses: 0,
    screenshots: 0,
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
    pause: () => {},
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
  const video = {};
  h.player = {
    pause: () => {
      calls.pauses++;
      return h.pause();
    },
    getCurrentTime: () => {
      calls.times++;
      return h.getTime();
    },
    getVideoElement: () => video
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
    PlayerFactory: {
      getPlayer: ({ url }) => {
        calls.playerUrls.push(url);
        return h.getPlayer();
      }
    },
    takeScreenshot: element => {
      assert.equal(element, video);
      calls.screenshots++;
      return h.screenshot();
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

test('Enter saves two consecutive drafts without refocusing; zero is valid', async t => {
  const h = createEditor(t);
  h.timestamp = 0;
  h.hook.handleFocus();
  h.hook.handleChange('first');
  await enter(h);
  assert.equal(h.editor.revision, 1);
  assert.equal(h.editor.active, false);
  assert.equal(h.editor.note.timestamp, null);
  assert.equal(h.editor.note.content, '');

  h.render();
  h.timestamp = 42.5;
  h.hook.handleChange('second'); // No second onFocus, just like Enter in Editor.
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
  h.pause = () => pause.promise;
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
});

test('a slow screenshot does not block saving or overwrite the next draft image', async t => {
  const h = createEditor(t);
  const oldImage = deferred();
  const newImage = deferred();
  h.screenshot = () => oldImage.promise;
  h.hook.handleChange('first');
  await flush();
  assert.equal(h.calls.screenshots, 1);
  let saved = false;
  const saving = h.hook.handleSave().then(() => {
    saved = true;
  });
  await flush();
  assert.equal(
    saved,
    true,
    'saving must finish while the screenshot is pending'
  );
  await saving;
  assert.equal(committedNotes(h)[0].image, '');

  h.timestamp = 24;
  h.screenshot = () => newImage.promise;
  h.hook.handleChange('second');
  await flush();
  assert.equal(h.calls.screenshots, 2);
  newImage.resolve('new-image');
  await flush();
  assert.equal(h.editor.note.image, 'new-image');
  const current = copy(h.editor);
  const actionCount = h.calls.actions.length;
  oldImage.resolve('stale-image');
  await flush();
  assert.deepEqual(copy(h.editor), current);
  assert.equal(h.calls.actions.length, actionCount);
  await h.hook.handleSave();
  assert.equal(committedNotes(h)[1].image, 'new-image');
  assert.equal(committedNotes(h)[1].timestamp, 24);
});

for (const transition of ['cancel', 'edit another note']) {
  test(`a late screenshot cannot change the editor after ${transition}`, async t => {
    const h = createEditor(t);
    const image = deferred();
    h.screenshot = () => image.promise;
    h.hook.handleChange('discarded draft');
    await flush();
    assert.equal(h.calls.screenshots, 1);
    const revision = h.editor.revision;
    if (transition === 'cancel') {
      h.hook.handleCancel();
    } else {
      h.actions.videoNotes.edit({
        id: 'other-note',
        content: 'keep this',
        timestamp: 80,
        image: 'other-image'
      });
    }
    assert.equal(h.editor.revision, revision + 1);
    const current = copy(h.editor);
    const actionCount = h.calls.actions.length;
    image.resolve('stale-image');
    await flush();
    assert.deepEqual(copy(h.editor), current);
    assert.equal(h.calls.actions.length, actionCount);
    assert.equal(h.calls.writes.length, 0);
  });
}

test('cancel/reset invalidates pending getTime results and errors, including a waiting save', async t => {
  for (const transition of ['cancel', 'navigate']) {
    for (const outcome of ['resolve', 'reject']) {
      await t.test(`${transition}: old getTime ${outcome}`, async t => {
        const h = createEditor(t);
        const time = deferred();
        h.getTime = () => time.promise;
        h.hook.handleChange('old draft');
        await flush();
        assert.equal(h.calls.times, 1);
        // Cancel is disabled during save; navigation can still reset a saving draft.
        const saving = transition === 'navigate' ? h.hook.handleSave() : null;
        if (transition === 'cancel') h.hook.handleCancel();
        else await h.navigate('https://example.com/watch/next');
        const current = copy(h.editor);
        const actionCount = h.calls.actions.length;
        if (outcome === 'resolve') time.resolve(111);
        else time.reject(new Error('old player failed'));
        await saving;
        await flush();
        assert.deepEqual(copy(h.editor), current);
        assert.equal(h.calls.actions.length, actionCount);
        assert.equal(h.calls.writes.length, 0);
        assert.equal(h.render().error, '');
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

test('saving locks callbacks; storage failure preserves the draft and timestamp for retry', async t => {
  const h = createEditor(t);
  const time = deferred();
  const write = deferred();
  h.getTime = () => time.promise;
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
  assert.equal(h.calls.writes.length, 1);
  write.reject(new Error('storage unavailable'));
  await saving;
  assert.equal(h.render().saving, false);
  assert.equal(h.hook.error, 'editor.saveError');
  assert.equal(h.editor.revision, revision);
  assert.equal(h.editor.active, true);
  assert.equal(h.editor.note.content, 'retry me');
  assert.equal(h.editor.note.timestamp, 31);
  assert.equal(h.calls.commits.length, 0);
  assert.equal(h.calls.notes, 0);

  h.beforeWrite = () => {};
  await h.hook.handleSave();
  assert.equal(h.calls.writes.length, 2);
  assert.equal(h.calls.commits.length, 1);
  assert.equal(h.calls.times, 1, 'retry must reuse the original timestamp');
  assert.equal(committedNotes(h)[0].content, 'retry me');
  assert.equal(h.editor.revision, revision + 1);
  assert.equal(h.editor.note.content, '');
  assert.equal(h.render().error, '');
});

test('invalid player times never persist and retain content for a zero-second retry', async t => {
  for (const timestamp of invalidTimes) {
    await t.test(String(timestamp), async t => {
      const h = createEditor(t);
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

      h.timestamp = 0;
      await h.hook.handleSave();
      assert.equal(h.calls.times, 2);
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
    h.actions.videoNotes.edit(note);
    h.hook.handleFocus();
    h.hook.handleChange('edited text');
    const revision = h.editor.revision;
    await h.hook.handleSave();
    assert.equal(h.calls.playerUrls.length, 0, String(timestamp));
    assert.equal(h.calls.times, 0);
    assert.equal(h.calls.screenshots, 0);
    if (Number.isFinite(timestamp) && timestamp >= 0) {
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
      const saving = phase === 'image' ? null : h.hook.handleSave();
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
