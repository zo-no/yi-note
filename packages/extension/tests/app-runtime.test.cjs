/* eslint-env node */
// Run with: node --test packages/extension/tests/app-runtime.test.cjs
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function createRuntime(polyfill) {
  const listeners = new Set();
  const runtime = {
    id: 'yi-note-test',
    onMessage: {
      addListener: listener => {
        assert.equal(listeners.has(listener), false);
        listeners.add(listener);
      },
      removeListener: listener => assert.equal(listeners.delete(listener), true)
    },
    connect: () => assert.fail('App must not open a keepalive port'),
    sendMessage: () => assert.fail('App must not send heartbeat messages')
  };
  let browser = { runtime };
  if (polyfill) {
    const context = vm.createContext({
      chrome: browser,
      // The old polyfill warns once about callback responses; this is expected.
      console: { ...console, warn: () => {} }
    });
    vm.runInContext(
      readFileSync(
        path.join(__dirname, '../src/vendors/browser-polyfill.js'),
        'utf8'
      ),
      context
    );
    browser = context.browser;
  }
  return { browser, runtime, listeners };
}

function mountApp(kind, { polyfill = false, withoutBrowser = false } = {}) {
  const app = {
    ...createRuntime(polyfill),
    pathname: '/',
    replacements: [],
    pushes: [],
    progress: [],
    urlChanges: [],
    resets: 0,
    reloads: 0,
    state: {
      app: { open: false, url: 'https://example.com/watch', progress: false },
      settings: { data: {} }
    }
  };
  app.history = {
    replace: route => {
      app.replacements.push(route);
      app.pathname = route;
    },
    push: route => {
      app.pushes.push(route);
      app.pathname = route;
    }
  };
  app.location = {
    href: app.state.app.url,
    hostname: 'example.com',
    reload: () => app.reloads++
  };
  app.actions = {
    app: {
      // Match the existing easy-peasy action: setOpen toggles, ignoring payload.
      setOpen: () => {
        app.state.app.open = !app.state.app.open;
      },
      setUrl: url => {
        app.urlChanges.push(url);
        app.state.app.url = url;
      },
      setShowingAd: () => {}
    },
    settings: { fetchSettings: () => {} }
  };
  app.playerFactory = {
    getPlayer: () => Promise.resolve(null),
    reset: () => app.resets++
  };

  const hooks = [];
  let cursor;
  let effects;
  const unchanged = (previous, deps) =>
    previous &&
    deps.every((dep, index) => Object.is(dep, previous.deps[index]));
  const useRef = value => {
    const index = cursor++;
    if (!hooks[index]) hooks[index] = { current: value };
    return hooks[index];
  };
  const context = {
    useRef,
    useState: value => {
      const state = useRef(value);
      return [
        state.current,
        next => {
          state.current = next;
          app.progress.push(next);
        }
      ];
    },
    useCallback: (callback, deps) => {
      const index = cursor++;
      if (!unchanged(hooks[index], deps)) {
        hooks[index] = { deps, callback };
      }
      return hooks[index].callback;
    },
    useEffect: (effect, deps) => {
      const index = cursor++;
      const previous = hooks[index];
      if (!unchanged(previous, deps)) {
        effects.push(() => {
          if (previous && previous.cleanup) previous.cleanup();
          hooks[index] = { deps, cleanup: effect() };
        });
      }
    },
    useInterval: (callback, ms) => {
      assert.equal(ms, 300);
      app.tick = callback;
    },
    useStoreState: selector => selector(app.state),
    useStoreActions: selector => selector(app.actions),
    useHistory: () => app.history,
    useLocation: () => ({ pathname: app.pathname }),
    window: { location: app.location },
    PlayerFactory: app.playerFactory,
    URL,
    URLSearchParams,
    delay: () => Promise.resolve(),
    QUERY_AUTO_JUMP: 'auto-jump',
    KEY_RELOAD_TAB: 'reload-tab',
    KEY_RELOAD_TAB_ALLOWED_DOMAINS: 'reload-domains',
    logger: { info: () => {} }
  };
  if (!withoutBrowser) context.browser = app.browser;

  // Execute the real component's hooks, excluding imports and JSX. This is a
  // dependency-free logic test, not a React renderer or browser integration test.
  const filename = path.join(
    __dirname,
    `../src/${kind}/containers/App/index.js`
  );
  const source = readFileSync(filename, 'utf8');
  const start = source.indexOf('const App = () => {');
  const end = source.indexOf('\n  return (', start);
  assert.ok(start >= 0 && end > start, 'App hook-body boundaries must exist');
  const App = vm.runInNewContext(
    `${source.slice(start, end)}\n}; App;`,
    context,
    { filename }
  );
  app.render = () => {
    cursor = 0;
    effects = [];
    App();
    effects.forEach(effect => effect());
  };
  app.unmount = () => {
    hooks.forEach(hook => {
      if (hook.cleanup) hook.cleanup();
    });
  };
  app.render();
  return app;
}

for (const polyfill of [false, true]) {
  const mode = polyfill ? 'vendored Chrome polyfill' : 'native callback API';

  test(`${mode}: valid runtime stays usable without ports or heartbeats`, () => {
    const app = mountApp('ui', { polyfill });
    // Worker availability is deliberately not part of the runtime.id contract.
    for (let i = 0; i < 100; i++) app.tick();
    assert.deepEqual(app.replacements, []);
    app.location.href = 'https://example.com/next';
    app.tick();
    assert.deepEqual(app.urlChanges, ['https://example.com/next']);
    assert.equal(app.resets, 1);
    app.unmount();
  });

  test(`${mode}: invalidation redirects once and stops URL work`, () => {
    const app = mountApp('ui', { polyfill });
    app.tick(); // Also prime the polyfill's runtime.id getter.
    app.runtime.id = undefined;
    app.location.href = 'https://example.com/next';
    app.state.settings.data = {
      'reload-tab': true,
      'reload-domains': ['example.com']
    };
    app.render();
    for (let i = 0; i < 10; i++) {
      app.tick();
      app.render();
    }
    assert.deepEqual(app.replacements, ['/reload']);
    assert.deepEqual(app.progress, [false]);
    assert.deepEqual(app.urlChanges, []);
    assert.equal(app.resets, 0);
    assert.equal(app.reloads, 0);
    app.unmount();
    assert.equal(app.listeners.size, 0);
  });

  test(`${mode}: togglePanel responds, toggles repeatedly and cleans up`, async () => {
    const app = mountApp('ui', { polyfill });
    const [listener] = app.listeners;
    assert.equal(app.listeners.size, 1);
    for (const expected of [true, false, true]) {
      const responses = [];
      const result = listener({ action: 'togglePanel' }, {}, value =>
        responses.push(value)
      );
      if (!polyfill) {
        assert.equal(result, undefined);
        assert.deepEqual(responses, [true]); // Response must be synchronous.
      }
      await Promise.resolve();
      assert.deepEqual(responses, [true]);
      assert.equal(app.state.app.open, expected);
      app.render();
      assert.deepEqual([...app.listeners], [listener]);
    }
    const ignored = listener({ action: 'unrelated' }, {}, () =>
      assert.fail('Unrelated messages must not get a response')
    );
    assert.equal(ignored, polyfill ? false : undefined);
    app.unmount();
    assert.equal(app.listeners.size, 0);
  });

  test(`${mode}: options responds to both actions and cleans up on changes`, async () => {
    const app = mountApp('options', { polyfill });
    const [listener] = app.listeners;
    for (const message of [
      { action: 'open-page', data: 'page-123' },
      { action: 'filter-by-tags', data: ['one', 'two'] }
    ]) {
      const responses = [];
      const result = listener(message, {}, value => responses.push(value));
      if (!polyfill) {
        assert.equal(result, undefined);
        assert.deepEqual(responses, [true]);
      }
      await Promise.resolve();
      assert.deepEqual(responses, [true]);
    }
    assert.deepEqual(app.pushes, ['/pages/page-123', '/?tags=one,two']);
    const ignored = listener({ action: 'unrelated' }, {}, () =>
      assert.fail('Unrelated messages must not get a response')
    );
    assert.equal(ignored, polyfill ? false : undefined);
    app.render();
    assert.deepEqual([...app.listeners], [listener]);
    app.history = { ...app.history };
    app.render();
    assert.equal(app.listeners.size, 1);
    assert.equal(app.listeners.has(listener), false);
    app.unmount();
    assert.equal(app.listeners.size, 0);
  });
}

for (const reject of [false, true]) {
  test(`pending player ${
    reject ? 'rejection' : 'resolution'
  } cannot replace /reload`, async () => {
    const app = mountApp('ui');
    let finish;
    const pending = new Promise((resolve, rejectPromise) => {
      finish = () =>
        reject ? rejectPromise(new Error('Player failed')) : resolve({});
    });
    app.playerFactory.getPlayer = () => pending;
    app.state.app.open = true;
    app.render();
    assert.deepEqual(app.progress, [true]);
    app.runtime.id = undefined;
    app.tick();
    app.render();
    finish();
    await pending.catch(() => {});
    await Promise.resolve();
    assert.deepEqual(app.replacements, ['/reload']);
    assert.deepEqual(app.progress, [true, false]);
    app.unmount();
  });
}

test('UI without a browser global still tracks URL changes', () => {
  const app = mountApp('ui', { withoutBrowser: true });
  app.location.href = 'https://example.com/next';
  app.tick();
  assert.deepEqual(app.urlChanges, ['https://example.com/next']);
  assert.deepEqual(app.replacements, []);
  assert.equal(app.listeners.size, 0);
  app.unmount();
});

test('valid runtime preserves the configured page-reload behavior', () => {
  const app = mountApp('ui');
  app.state.settings.data = {
    'reload-tab': true,
    'reload-domains': ['example.com']
  };
  app.render();
  app.location.href = 'https://example.com/next';
  app.tick();
  assert.equal(app.reloads, 1);
  assert.equal(app.resets, 0);
  assert.deepEqual(app.urlChanges, []);
  assert.deepEqual(app.replacements, []);
  app.unmount();
});
