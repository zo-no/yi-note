/* eslint-env node */
// Run with: node --test packages/extension/tests/mv3.test.cjs
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const createManifest = require('../manifest');
const clone = value => structuredClone(value);
const flush = () => new Promise(resolve => setImmediate(resolve));
const unexpected = () => assert.fail('Unexpected API call');

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

function event() {
  const listeners = new Set();
  return {
    listeners,
    addListener: listener => listeners.add(listener),
    removeListener: listener => listeners.delete(listener),
    emit: (...args) => [...listeners].map(listener => listener(...args))
  };
}

function onlyListener(source) {
  assert.equal(source.listeners.size, 1);
  return [...source.listeners][0];
}

function clock() {
  const pending = new Map();
  let nextId = 0;
  return {
    pending,
    setTimeout: (callback, delay) => {
      const id = ++nextId;
      pending.set(id, { callback, delay });
      return id;
    },
    clearTimeout: id => pending.delete(id),
    fire: delay => {
      assert.equal(pending.size, 1, 'Exactly one timer should be waiting');
      const [id, timer] = [...pending][0];
      assert.equal(timer.delay, delay);
      pending.delete(id);
      timer.callback();
    }
  };
}

function runScript(relative, context) {
  const filename = path.join(root, relative);
  return vm.runInContext(readFileSync(filename, 'utf8'), context, { filename });
}

function loadModule(relative, names, context) {
  const filename = path.join(root, relative);
  // These modules use one-line imports and named const exports. Execute their
  // real bodies; only replace module plumbing, not the behavior under test.
  const source = readFileSync(filename, 'utf8')
    .replace(/^import .+;\r?\n/gm, '')
    .replace(/^export (?=const )/gm, '');
  return vm.runInContext(
    `(() => {\n${source}\nreturn { ${names.join(', ')} };\n})()`,
    context,
    { filename }
  );
}

function loadBackground(context) {
  Object.assign(
    context,
    loadModule('src/background/clipboard.js', ['copyText'], context),
    loadModule(
      'src/background/downloads.js',
      ['exportJsonBackup', 'exportFirefoxFile'],
      context
    )
  );
  loadModule('src/background/index.js', [], context);
}

function worker(version = 3) {
  const timers = clock();
  const errors = [];
  const browser = {
    action: { onClicked: event() },
    browserAction: { onClicked: event() },
    tabs: { sendMessage: unexpected },
    runtime: {
      getManifest: () => ({ manifest_version: version }),
      onMessage: event(),
      onInstalled: event(),
      openOptionsPage: async () => {},
      sendMessage: unexpected
    }
  };
  if (version === 2) delete browser.action;
  const context = vm.createContext({
    browser,
    setTimeout: timers.setTimeout,
    clearTimeout: timers.clearTimeout,
    Logger: { useDefaults() {}, error: error => errors.push(error) },
    migration_v_0_6_4: unexpected
  });
  loadBackground(context);
  return {
    browser,
    context,
    timers,
    errors,
    onMessage: onlyListener(browser.runtime.onMessage)
  };
}

function clipboard() {
  const calls = { contexts: [], create: [], messages: [] };
  const browser = {
    runtime: {
      getManifest: () => ({ manifest_version: 3 }),
      getURL: file => `chrome-extension://yi-note-test/${file}`,
      sendMessage: async message => {
        calls.messages.push(clone(message));
        return { code: 'success' };
      }
    }
  };
  const chrome = {
    runtime: {
      getContexts: async query => {
        calls.contexts.push(clone(query));
        return [];
      }
    },
    offscreen: {
      createDocument: async options => {
        calls.create.push(clone(options));
      }
    }
  };
  // Loading again gives a restarted worker fresh module state but the same APIs.
  const restart = () =>
    loadModule(
      'src/background/clipboard.js',
      ['copyText'],
      vm.createContext({ browser, chrome })
    ).copyText;
  return { browser, chrome, calls, restart, copyText: restart() };
}

function offscreen() {
  const selected = [];
  const commands = [];
  const textarea = { value: '', select: () => selected.push(textarea.value) };
  const document = {
    getElementById: id => {
      assert.equal(id, 'clipboard');
      return textarea;
    },
    execCommand: command => {
      commands.push(command);
      return true;
    }
  };
  const chrome = { runtime: { id: 'yi-note-test', onMessage: event() } };
  runScript(
    'src/offscreen/offscreen.js',
    vm.createContext({ chrome, document })
  );
  return {
    document,
    textarea,
    selected,
    commands,
    listener: onlyListener(chrome.runtime.onMessage),
    sender: { id: chrome.runtime.id }
  };
}

function downloads() {
  const timers = clock();
  const requests = [];
  const searches = [];
  const api = {
    onChanged: event(),
    download: async options => {
      requests.push(clone(options));
      return 42;
    },
    search: async query => {
      searches.push(clone(query));
      return [{ id: 42, state: 'in_progress' }];
    }
  };
  const urls = { created: [], revoked: [] };
  const context = vm.createContext({
    browser: { downloads: api },
    setTimeout: timers.setTimeout,
    clearTimeout: timers.clearTimeout,
    URL: {
      createObjectURL: blob => {
        urls.created.push(blob);
        return 'blob:yi-note-test';
      },
      revokeObjectURL: url => urls.revoked.push(url)
    }
  });
  return {
    api,
    timers,
    requests,
    searches,
    urls,
    ...loadModule(
      'src/background/downloads.js',
      ['exportJsonBackup', 'exportFirefoxFile'],
      context
    )
  };
}

function assertDownloadClean(harness) {
  assert.equal(harness.api.onChanged.listeners.size, 0);
  assert.equal(harness.timers.pending.size, 0);
}

test('manifest builds keep Chromium MV3 and Firefox MV2 isolated in either order', () => {
  const common = require('../manifest.common.json');
  const original = clone(common);
  const chromium = createManifest('chromium');
  const firefox = createManifest('firefox');
  assert.equal(chromium.manifest_version, 3);
  assert.equal(chromium.minimum_chrome_version, '116');
  assert.deepEqual(chromium.background, { service_worker: 'background.js' });
  assert.ok(chromium.action);
  assert.ok(chromium.permissions.includes('offscreen'));
  assert.deepEqual(chromium.host_permissions, [
    'http://*/*',
    'https://*/*',
    'file://*/*'
  ]);
  assert.equal(chromium.options_page, 'options.html');
  assert.equal(
    chromium.content_security_policy.extension_pages,
    "script-src 'self'; object-src 'self'"
  );
  assert.ok(
    chromium.web_accessible_resources.every(entry =>
      Array.isArray(entry.resources)
    )
  );
  for (const key of ['browser_action', 'options_ui'])
    assert.equal(key in chromium, false);

  assert.equal(firefox.manifest_version, 2);
  assert.deepEqual(firefox.browser_action, chromium.action);
  assert.deepEqual(firefox.background, {
    scripts: ['vendors/browser-polyfill.js', 'background.js'],
    persistent: true
  });
  assert.deepEqual(firefox.options_ui, {
    page: 'options.html',
    browser_style: true
  });
  assert.equal(firefox.permissions.includes('offscreen'), false);
  assert.ok(firefox.permissions.includes('<all_urls>'));
  assert.equal(
    firefox.content_security_policy,
    chromium.content_security_policy.extension_pages
  );
  assert.deepEqual(
    firefox.web_accessible_resources,
    chromium.web_accessible_resources.flatMap(entry => entry.resources)
  );
  for (const key of [
    'action',
    'host_permissions',
    'minimum_chrome_version',
    'options_page'
  ]) {
    assert.equal(key in firefox, false);
  }
  assert.deepEqual(createManifest('chromium'), chromium);
  assert.deepEqual(createManifest('firefox'), firefox);

  for (const manifest of [chromium, firefox]) {
    manifest.icons['16'] = 'mutated.png';
    manifest.permissions.push('test-only');
    manifest.content_scripts[0].js.push('test-only.js');
    manifest.web_accessible_resources.push('test-only');
    (manifest.action || manifest.browser_action).default_icon = 'mutated.png';
  }
  chromium.web_accessible_resources[0].resources.push('nested-test-only');
  assert.deepEqual(common, original);
  for (const target of ['firefox', 'chromium', 'firefox', 'chromium']) {
    const manifest = createManifest(target);
    assert.deepEqual(manifest.icons, original.icons);
    assert.deepEqual(manifest.content_scripts, original.content_scripts);
    assert.equal(manifest.permissions.includes('test-only'), false);
    assert.equal(
      (manifest.action || manifest.browser_action).default_icon,
      original.action.default_icon
    );
    assert.equal(
      JSON.stringify(manifest.web_accessible_resources).includes('test-only'),
      false
    );
  }
  assert.throws(
    () => createManifest('unsupported'),
    /Unsupported browser target/
  );
});

test('webpack uses worker-safe globals and includes offscreen/polyfill only for Chromium', () => {
  // Capture configuration only: no webpack or other installed packages needed.
  const plugin = kind =>
    class {
      constructor(options) {
        this.kind = kind;
        this.options = options;
      }
    };
  const modules = {
    path,
    './manifest': createManifest,
    webpack: { BannerPlugin: plugin('banner') },
    'copy-webpack-plugin': plugin('copy'),
    'html-webpack-plugin': plugin('html'),
    'webpack-manifest-plugin': plugin('manifest'),
    'dotenv-webpack': plugin('dotenv')
  };
  const context = vm.createContext({
    __dirname: root,
    module: { exports: {} },
    require: name => {
      assert.ok(Object.hasOwn(modules, name), `Unexpected dependency: ${name}`);
      return modules[name];
    }
  });
  runScript('webpack.common.js', context);
  const configure = context.module.exports;
  const seeds = [];
  for (const target of ['chromium', 'firefox', 'chromium']) {
    const config = configure(target);
    assert.equal(config.output.globalObject, 'globalThis');
    assert.equal(config.output.path, path.join(root, 'dist', target));
    assert.equal(config.entry.background, './src/background/index.js');
    const manifest = config.plugins.find(item => item.kind === 'manifest')
      .options;
    assert.equal(manifest.fileName, 'manifest.json');
    assert.deepEqual(manifest.seed, createManifest(target));
    assert.equal(manifest.generate(manifest.seed), manifest.seed);
    seeds.push(manifest.seed);
    const copies = config.plugins.find(item => item.kind === 'copy').options;
    assert.deepEqual(
      clone(copies.filter(item => item.from === 'src/offscreen')),
      target === 'chromium' ? [{ from: 'src/offscreen', to: '.' }] : []
    );
    const banners = config.plugins.filter(item => item.kind === 'banner');
    assert.equal(banners.length, target === 'chromium' ? 1 : 0);
    if (banners.length) {
      const banner = banners[0].options;
      assert.equal(
        banner.banner,
        "importScripts('vendors/browser-polyfill.js');"
      );
      assert.equal(banner.raw, true);
      assert.equal(banner.entryOnly, true);
      assert.equal(banner.include.test('background.js'), true);
      assert.equal(banner.include.test('content.js'), false);
      assert.equal(banner.include.test('options.js'), false);
    }
  }
  assert.notEqual(seeds[0], seeds[2]);
  assert.deepEqual(seeds[0], seeds[2]);
});

test('production build avoids Webpack 4 hardcoded MD4 concatenation hashes', () => {
  const modules = {
    'webpack-merge': (common, production) => production,
    './webpack.common': () => ({}),
    './package.json': { version: '1.7.0' },
    'clean-webpack-plugin': { CleanWebpackPlugin: class {} },
    'filemanager-webpack-plugin': class {}
  };
  const context = vm.createContext({
    module: { exports: {} },
    require: name => modules[name]
  });
  runScript('webpack.config.js', context);
  for (const target of ['chromium', 'firefox']) {
    const config = context.module.exports(target);
    assert.equal(config.optimization.concatenateModules, false);
    assert.equal(config.optimization.minimize, false);
  }
});

for (const version of [3, 2]) {
  test(`MV${version}: startup registers listeners synchronously without window/document`, () => {
    const h = worker(version);
    assert.equal(vm.runInContext('typeof window', h.context), 'undefined');
    assert.equal(vm.runInContext('typeof document', h.context), 'undefined');
    onlyListener((h.browser.action || h.browser.browserAction).onClicked);
    onlyListener(h.browser.runtime.onInstalled);
    if (version === 3)
      assert.equal(h.browser.browserAction.onClicked.listeners.size, 0);
    assert.equal(h.timers.pending.size, 0);
  });

  test(`MV${version}: action toggles the tab and falls back to options on rejection`, async () => {
    const h = worker(version);
    const click = onlyListener(
      (h.browser.action || h.browser.browserAction).onClicked
    );
    const sent = [];
    let opened = 0;
    h.browser.runtime.openOptionsPage = async () => {
      opened++;
    };
    h.browser.tabs.sendMessage = async (...args) => {
      sent.push(clone(args));
    };
    click({ id: 7 });
    await flush();
    assert.deepEqual(sent, [[7, { action: 'togglePanel' }]]);
    assert.equal(opened, 0);
    const unavailable = new Error('No content script on this tab');
    h.browser.tabs.sendMessage = async () => {
      throw unavailable;
    };
    click({ id: 8 });
    await flush();
    assert.equal(opened, 1);
    assert.deepEqual(h.errors, [unavailable]);
    const denied = new Error('Options unavailable');
    h.browser.runtime.openOptionsPage = async () => {
      throw denied;
    };
    click({ id: 9 });
    await flush();
    assert.deepEqual(h.errors, [unavailable, unavailable, denied]);
  });
}

test('open-options waits for the page and retries until an explicit true ack', async () => {
  const h = worker();
  const opening = deferred();
  const payload = { target: 'options', action: 'open-page', data: 'page-123' };
  const attempts = [];
  const replies = [undefined, false, { code: 'success' }, true];
  h.browser.runtime.openOptionsPage = () => opening.promise;
  h.browser.runtime.sendMessage = async message => {
    attempts.push(clone(message));
    if (attempts.length === 1) throw new Error('Receiving end does not exist');
    return replies.shift();
  };
  const response = h.onMessage({ action: 'open-options', data: payload });
  assert.equal(typeof response.then, 'function');
  let settled = false;
  response.then(() => {
    settled = true;
  });
  await flush();
  assert.equal(attempts.length, 0);
  opening.resolve();
  await flush();
  for (let attempt = 1; attempt <= 4; attempt++) {
    assert.equal(attempts.length, attempt);
    assert.equal(settled, false);
    h.timers.fire(200);
    await flush();
  }
  assert.deepEqual(clone(await response), { code: 'success' });
  assert.deepEqual(attempts, Array(5).fill(payload));
  assert.equal(h.timers.pending.size, 0);
});

test('open-options without navigation data returns an ack without sending a message', async () => {
  const h = worker();
  let opened = 0;
  h.browser.runtime.openOptionsPage = async () => {
    opened++;
  };
  assert.deepEqual(clone(await h.onMessage({ action: 'open-options' })), {
    code: 'success'
  });
  assert.equal(opened, 1);
  assert.equal(h.timers.pending.size, 0);
  h.browser.runtime.openOptionsPage = async () => {
    throw new Error('Cannot open options');
  };
  await assert.rejects(
    h.onMessage({ action: 'open-options' }),
    /Cannot open options/
  );
});

for (const throws of [false, true]) {
  test(`open-options stops after ten ${
    throws ? 'rejected' : 'unacknowledged'
  } sends`, async () => {
    const h = worker();
    let attempts = 0;
    h.browser.runtime.sendMessage = async () => {
      attempts++;
      if (throws) throw new Error('No receiver');
    };
    const rejected = assert.rejects(
      h.onMessage({
        action: 'open-options',
        data: { action: 'filter-by-tags', data: ['tag'] }
      }),
      throws ? /No receiver/ : /management page did not respond/
    );
    await flush();
    // No real sleeps: also bound the loop so an unbounded retry is a test failure.
    for (let tick = 0; tick < 10 && h.timers.pending.size; tick++) {
      h.timers.fire(200);
      await flush();
    }
    assert.equal(attempts, 10);
    assert.equal(h.timers.pending.size, 0);
    await rejected;
  });
}

test('background returns operation Promises but never claims unknown or targeted messages', async () => {
  const h = worker();
  const pending = deferred();
  h.context.copyText = text => {
    assert.equal(text, 'link');
    return pending.promise;
  };
  assert.equal(h.onMessage({ action: 'copy', data: 'link' }), pending.promise);
  for (const message of [
    { action: 'unknown' },
    { action: 'open-page', data: 'page-123' },
    { target: 'offscreen', action: 'copy', data: 'link' },
    { target: 'options', action: 'open-options' },
    { target: 'unknown', action: 'export-file' }
  ]) {
    assert.equal(h.onMessage(message, {}, unexpected), undefined);
  }
  pending.resolve({ code: 'success' });
  await pending.promise;
  await assert.rejects(
    h.onMessage({ action: 'export-file' }),
    /only used by Firefox/
  );
  const firefox = worker(2);
  const exported = Promise.resolve(42);
  const message = { action: 'export-file', blob: {}, filename: 'notes.json' };
  firefox.context.exportFirefoxFile = request => {
    assert.equal(request, message);
    return exported;
  };
  assert.equal(firefox.onMessage(message), exported);
});

test('vendored Chrome polyfill loads without DOM and bridges Promise replies selectively', async () => {
  const chrome = {
    action: { onClicked: event() },
    runtime: {
      id: 'yi-note-test',
      onMessage: event(),
      onInstalled: event(),
      openOptionsPage: callback => callback()
    }
  };
  const context = vm.createContext({
    chrome,
    console,
    Logger: { useDefaults() {}, error: unexpected },
    migration_v_0_6_4: unexpected,
    setTimeout: unexpected
  });
  runScript('src/vendors/browser-polyfill.js', context);
  loadBackground(context);
  assert.equal(
    vm.runInContext('typeof window + ":" + typeof document', context),
    'undefined:undefined'
  );
  onlyListener(chrome.action.onClicked);
  onlyListener(chrome.runtime.onInstalled);
  const listener = onlyListener(chrome.runtime.onMessage);
  for (const message of [
    { action: 'unknown' },
    { target: 'offscreen', action: 'copy' },
    { target: 'options', action: 'open-options' },
    { target: 'unknown', action: 'copy' }
  ]) {
    assert.equal(listener(message, {}, unexpected), false);
  }
  const responses = [];
  assert.equal(
    listener({ action: 'open-options' }, {}, value =>
      responses.push(clone(value))
    ),
    true
  );
  assert.deepEqual(responses, []);
  await flush();
  assert.deepEqual(responses, [{ code: 'success' }]);
});

test('offscreen creation is shared by concurrent copies and messages wait for creation', async () => {
  const h = clipboard();
  const creating = deferred();
  h.chrome.offscreen.createDocument = options => {
    h.calls.create.push(clone(options));
    return creating.promise;
  };
  const texts = ['one', '中文\n🔗', ''];
  const copied = Promise.all(texts.map(h.copyText));
  await flush();
  assert.equal(h.calls.create.length, 1);
  assert.deepEqual(h.calls.create[0], {
    url: 'offscreen.html',
    reasons: ['CLIPBOARD'],
    justification: 'Copy the YiNote sharing link to the clipboard.'
  });
  assert.deepEqual(h.calls.messages, []);
  creating.resolve();
  assert.deepEqual(
    clone(await copied),
    texts.map(() => ({ code: 'success' }))
  );
  assert.deepEqual(
    h.calls.messages,
    texts.map(data => ({ target: 'offscreen', action: 'copy', data }))
  );
});

test('a restarted worker reuses the existing offscreen document after querying its URL', async () => {
  const h = clipboard();
  h.chrome.runtime.getContexts = async query => {
    h.calls.contexts.push(clone(query));
    return [
      {
        contextType: 'OFFSCREEN_DOCUMENT',
        documentUrl: h.browser.runtime.getURL('offscreen.html')
      }
    ];
  };
  h.chrome.offscreen.createDocument = unexpected;
  await h.copyText('before restart');
  await h.restart()('after restart');
  assert.deepEqual(
    h.calls.contexts,
    Array(2).fill({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: ['chrome-extension://yi-note-test/offscreen.html']
    })
  );
  assert.equal(h.calls.messages.length, 2);
});

test('failed concurrent offscreen creation rejects all callers and can be retried', async () => {
  const h = clipboard();
  const creating = deferred();
  let count = 0;
  h.chrome.offscreen.createDocument = () => {
    count++;
    return creating.promise;
  };
  const failure = new Error('Offscreen creation denied');
  const rejected = ['one', 'two'].map(text =>
    assert.rejects(h.copyText(text), error => error === failure)
  );
  await flush();
  assert.equal(count, 1);
  creating.reject(failure);
  await Promise.all(rejected);
  assert.deepEqual(h.calls.messages, []);
  h.chrome.offscreen.createDocument = async () => {
    count++;
  };
  assert.deepEqual(clone(await h.copyText('retry')), { code: 'success' });
  assert.equal(count, 2);
  assert.equal(h.calls.messages.length, 1);
});

test('clipboard validates input and propagates context, transport and response failures', async () => {
  const h = clipboard();
  for (const text of [undefined, null, 7, {}, []]) {
    await assert.rejects(h.copyText(text), /must be a string/);
  }
  assert.deepEqual(h.calls, { contexts: [], create: [], messages: [] });
  h.chrome.runtime.getContexts = async () => {
    throw new Error('Context lookup failed');
  };
  await assert.rejects(h.copyText('link'), /Context lookup failed/);
  assert.deepEqual(h.calls.create, []);
  assert.deepEqual(h.calls.messages, []);
  h.chrome.runtime.getContexts = async () => [{}];
  h.chrome.offscreen.createDocument = unexpected;
  h.browser.runtime.sendMessage = async () => {
    throw new Error('Offscreen receiver unavailable');
  };
  await assert.rejects(h.copyText('link'), /Offscreen receiver unavailable/);
  for (const [response, expected] of [
    [undefined, /Clipboard copy failed/],
    [false, /Clipboard copy failed/],
    [{ code: 'error', error: 'Clipboard denied' }, /Clipboard denied/]
  ]) {
    h.browser.runtime.sendMessage = async () => response;
    await assert.rejects(h.copyText('link'), expected);
  }
});

test('offscreen ignores tab senders, other extensions and unrelated messages without a reply', () => {
  const h = offscreen();
  const copy = { target: 'offscreen', action: 'copy', data: 'secret' };
  h.document.getElementById = unexpected;
  for (const [message, sender] of [
    [copy, { id: h.sender.id, tab: { id: 7 } }],
    [copy, { id: 'another-extension' }],
    [copy, {}],
    [{ ...copy, target: 'options' }, h.sender],
    [{ ...copy, target: undefined }, h.sender],
    [{ ...copy, action: 'unknown' }, h.sender]
  ]) {
    assert.equal(h.listener(message, sender, unexpected), undefined);
  }
  assert.deepEqual(h.selected, []);
  assert.deepEqual(h.commands, []);
});

for (const outcome of ['success', 'invalid input', 'false', 'throw']) {
  test(`offscreen copy ${outcome}: responds once and clears clipboard text`, () => {
    const h = offscreen();
    if (outcome === 'false') h.document.execCommand = () => false;
    if (outcome === 'throw')
      h.document.execCommand = () => {
        throw new Error('Clipboard denied');
      };
    const responses = [];
    const data = outcome === 'invalid input' ? null : '中文\n🔗';
    assert.equal(
      h.listener(
        { target: 'offscreen', action: 'copy', data },
        h.sender,
        response => responses.push(clone(response))
      ),
      undefined
    );
    assert.deepEqual(responses, [
      outcome === 'success'
        ? { code: 'success' }
        : {
            code: 'error',
            error:
              outcome === 'invalid input'
                ? 'Clipboard content must be a string'
                : outcome === 'throw'
                ? 'Clipboard denied'
                : 'Clipboard copy failed'
          }
    ]);
    assert.equal(h.textarea.value, '');
    assert.deepEqual(h.selected, outcome === 'invalid input' ? [] : [data]);
    if (outcome === 'success') assert.deepEqual(h.commands, ['copy']);
  });
}

test('real background clipboard and offscreen listener propagate the copy ack and failure', async () => {
  const h = clipboard();
  const page = offscreen();
  h.chrome.runtime.getContexts = async () => [{}];
  h.browser.runtime.sendMessage = message =>
    new Promise(resolve => {
      page.listener(message, page.sender, resolve);
    });
  assert.deepEqual(clone(await h.copyText('link')), { code: 'success' });
  page.document.execCommand = () => false;
  await assert.rejects(h.copyText('link'), /Clipboard copy failed/);
  assert.equal(page.textarea.value, '');
});

for (const succeeds of [true, false]) {
  test(`Firefox clipboard ${
    succeeds ? 'success' : 'failure'
  } removes its temporary textarea`, async () => {
    const calls = [];
    const textarea = {
      select: () => calls.push('select'),
      remove: () => calls.push('remove')
    };
    const context = vm.createContext({
      browser: { runtime: { getManifest: () => ({ manifest_version: 2 }) } },
      document: {
        createElement: tag => {
          assert.equal(tag, 'textarea');
          return textarea;
        },
        body: {
          appendChild: node => {
            assert.equal(node, textarea);
            calls.push('append');
          }
        },
        execCommand: command => {
          assert.equal(command, 'copy');
          calls.push('copy');
          return succeeds;
        }
      }
    });
    const { copyText } = loadModule(
      'src/background/clipboard.js',
      ['copyText'],
      context
    );
    if (succeeds)
      assert.deepEqual(clone(await copyText('link')), { code: 'success' });
    else await assert.rejects(copyText('link'), /Clipboard copy failed/);
    assert.equal(textarea.value, 'link');
    assert.deepEqual(calls, ['append', 'select', 'copy', 'remove']);
  });
}

test('JSON backup encodes data without DOM/blob APIs and waits for the matching completion', async () => {
  const h = downloads();
  const data = { notes: ['中文\n🔗', 'a&b#c%'], nested: { value: 1 } };
  const saved = clone(data);
  const pending = h.exportJsonBackup(data, 'storage.json', '0.6.4');
  let settled = false;
  pending.then(() => {
    settled = true;
  });
  await flush();
  assert.equal(settled, false);
  assert.equal(h.requests.length, 1);
  const { url, ...options } = h.requests[0];
  assert.deepEqual(options, { filename: 'storage.json', saveAs: false });
  const prefix = 'data:application/json;charset=utf-8,';
  assert.ok(url.startsWith(prefix));
  assert.deepEqual(JSON.parse(decodeURIComponent(url.slice(prefix.length))), {
    version: '0.6.4',
    data
  });
  assert.deepEqual(data, saved);
  assert.deepEqual(h.searches, [{ id: 42 }]);
  assert.deepEqual(h.urls.created, []);
  h.api.onChanged.emit({ id: 99, state: { current: 'complete' } });
  h.api.onChanged.emit({ id: 99, error: { current: 'NETWORK_FAILED' } });
  h.api.onChanged.emit({ id: 42, state: { current: 'in_progress' } });
  await flush();
  assert.equal(settled, false);
  assert.equal(h.api.onChanged.listeners.size, 1);
  h.api.onChanged.emit({ id: 42, state: { current: 'complete' } });
  assert.equal(await pending, 42);
  assertDownloadClean(h);
});

test('download search handles completion before listener registration', async () => {
  const h = downloads();
  h.api.download = async () => {
    h.api.onChanged.emit({ id: 42, state: { current: 'complete' } });
    return 42;
  };
  h.api.search = async query => {
    assert.deepEqual(clone(query), { id: 42 });
    return [{ id: 42, state: 'complete' }];
  };
  assert.equal(await h.exportJsonBackup({}, 'backup.json', '0.6.4'), 42);
  assertDownloadClean(h);
});

for (const failure of [
  'interrupted',
  'error',
  'search interrupted',
  'search rejected',
  'download rejected',
  'timeout'
]) {
  test(`backup download ${failure} rejects and cleans up listeners/timers`, async () => {
    const h = downloads();
    let expected = /interrupted; storage was not cleared/;
    if (failure === 'search interrupted')
      h.api.search = async () => [{ id: 42, state: 'interrupted' }];
    if (failure === 'search rejected') {
      h.api.search = async () => {
        throw new Error('Search failed');
      };
      expected = /Search failed/;
    }
    if (failure === 'download rejected') {
      h.api.download = async () => {
        throw new Error('Download denied');
      };
      h.api.search = unexpected;
      expected = /Download denied/;
    }
    if (failure === 'timeout') {
      h.api.search = async () => [];
      expected = /timed out; storage was not cleared/;
    }
    const rejected = assert.rejects(
      h.exportJsonBackup({}, 'backup.json', '0.6.4'),
      expected
    );
    await flush();
    if (failure === 'interrupted')
      h.api.onChanged.emit({ id: 42, state: { current: 'interrupted' } });
    if (failure === 'error')
      h.api.onChanged.emit({ id: 42, error: { current: 'NETWORK_FAILED' } });
    if (failure === 'timeout') h.timers.fire(60000);
    await rejected;
    assertDownloadClean(h);
  });
}

for (const outcome of ['complete', 'interrupted', 'download rejected']) {
  test(`Firefox file ${outcome}: retains the blob URL until settlement, then revokes it`, async () => {
    const h = downloads();
    const blob = { fixture: 'opaque blob passed through unchanged' };
    if (outcome === 'download rejected')
      h.api.download = async () => {
        throw new Error('Download denied');
      };
    const pending = h.exportFirefoxFile({ blob, filename: 'notes.json' });
    const checked =
      outcome === 'complete'
        ? pending.then(id => assert.equal(id, 42))
        : assert.rejects(
            pending,
            outcome === 'interrupted' ? /interrupted/ : /Download denied/
          );
    await flush();
    assert.deepEqual(h.urls.created, [blob]);
    if (outcome !== 'download rejected') {
      assert.deepEqual(h.requests, [
        { filename: 'notes.json', url: 'blob:yi-note-test', saveAs: false }
      ]);
      assert.deepEqual(h.urls.revoked, []);
      h.api.onChanged.emit({ id: 42, state: { current: outcome } });
    }
    await checked;
    assert.deepEqual(h.urls.revoked, ['blob:yi-note-test']);
    assertDownloadClean(h);
  });
}
