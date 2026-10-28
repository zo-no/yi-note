const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { transformSync } = require('@babel/core');
const { jsdom } = require('jsdom');
const React = require('react');
const { renderToString, renderToStaticMarkup } = require('react-dom/server');

const root = path.resolve(__dirname, '../src');
const resources = language => ({
  header: require(path.join(root, 'locales', language, 'header.json')),
  translations: require(path.join(
    root,
    'locales',
    language,
    'translations.json'
  ))
});

const flatten = (value, prefix = '') =>
  typeof value === 'string'
    ? { [prefix]: value }
    : Object.assign(
        {},
        ...Object.entries(value).map(([key, child]) =>
          flatten(child, `${prefix}.${key}`)
        )
      );

function loadSite() {
  const i18n = require('i18next').createInstance();
  const cache = new Map();
  const site = {
    site: {
      siteMetadata: {
        title: 'wildframe',
        description: 'Fallback site description',
        author: '@shuowu'
      }
    }
  };
  const gatsby = {
    graphql: () => '',
    StaticQuery: ({ render }) => render(site),
    useStaticQuery: () => site,
    Link: ({ to, ...props }) => React.createElement('a', { href: to, ...props })
  };
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const localRequire = createRequire(filename);
    const { code } = transformSync(fs.readFileSync(filename, 'utf8'), {
      filename,
      babelrc: false,
      configFile: false,
      presets: [require.resolve('@babel/preset-react')],
      plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')]
    });
    const resolve = request => {
      if (request === 'i18next') return i18n;
      if (request === 'gatsby') return gatsby;
      if (/\.(png|scss)$/.test(request)) return request;
      if (request.startsWith('.')) {
        const resolved = localRequire.resolve(request);
        if (resolved.endsWith('.js')) return load(resolved);
      }
      return localRequire(request);
    };
    new Function('require', 'module', 'exports', code)(
      resolve,
      module,
      module.exports
    );
    return module.exports;
  }
  return {
    load: relative => load(path.join(root, relative)),
    i18n
  };
}

test('Chinese and English resources have matching keys and interpolation variables', () => {
  const en = flatten(resources('en'));
  const zh = flatten(resources('zh-CN'));
  assert.deepEqual(Object.keys(zh).sort(), Object.keys(en).sort());
  for (const key of Object.keys(en)) {
    assert.deepEqual(
      (zh[key].match(/{{\w+}}/g) || []).sort(),
      (en[key].match(/{{\w+}}/g) || []).sort(),
      key
    );
    if (en[key]) assert.ok(zh[key].trim(), key);
  }
});

test('all pages render in both languages, including accessibility text and metadata', async () => {
  const { load, i18n } = loadSite();
  const pages = ['pages/index.js', 'pages/404.js', 'pages/privacy.js'].map(
    filename => load(filename).default
  );
  const Helmet = require('react-helmet').default;
  for (const language of ['en', 'zh-CN']) {
    await i18n.changeLanguage(language);
    const translations = resources(language).translations;
    const titles = [
      translations.home.title,
      translations.notFound.title,
      translations.privacy.title
    ];
    pages.forEach((Page, index) => {
      const html = renderToString(React.createElement(Page));
      assert.ok(html.includes(titles[index]));
      assert.ok(html.includes(translations.common.skipToContent));
      assert.ok(html.includes(translations.common.home));
      assert.doesNotMatch(html, /(?:home|notFound|common|privacy)\.[a-zA-Z]+/);
      const head = Helmet.rewind();
      assert.ok(head.htmlAttributes.toString().includes(`lang="${language}"`));
      assert.ok(
        head.meta.toString().includes(translations.common.siteDescription)
      );
      if (index === 2) {
        for (const section of translations.privacy.sections) {
          assert.ok(html.includes(section.title));
          assert.ok(
            html.includes(
              renderToStaticMarkup(React.createElement('p', null, section.body))
            )
          );
        }
        assert.ok(html.includes(translations.privacy.updated));
      }
    });
  }
});

test('browser detection, saved selection, fallback and unavailable storage work', async () => {
  const document = jsdom('<div id="root"></div>', {
    url: 'https://wildframe.test'
  });
  global.window = document.defaultView;
  global.document = document;
  global.navigator = window.navigator;
  const saved = new Map();
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: key => saved.get(key) || null,
      setItem: (key, value) => saved.set(key, value),
      removeItem: key => saved.delete(key)
    },
    configurable: true
  });
  Object.defineProperty(navigator, 'languages', {
    value: ['zh-CN'],
    configurable: true
  });
  const detectorPath = require.resolve('i18next-browser-languagedetector');
  delete require.cache[detectorPath];
  const { load, i18n } = loadSite();
  const { detectLanguage, setLanguage } = load('i18n.js');
  try {
    assert.equal(
      i18n.language,
      'en',
      'initial render matches static Gatsby HTML'
    );
    assert.equal(window.localStorage.getItem('wildframeLanguage'), null);
    await detectLanguage();
    assert.equal(i18n.language, 'zh-CN');
    await setLanguage('en');
    assert.equal(window.localStorage.getItem('wildframeLanguage'), 'en');
    await detectLanguage();
    assert.equal(i18n.language, 'en', 'explicit selection takes priority');
    await setLanguage('zh-Hans');
    assert.equal(i18n.language, 'zh-CN');
    await setLanguage('fr-FR');
    assert.equal(i18n.language, 'en');
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new Error('Storage disabled');
      },
      configurable: true
    });
    await setLanguage('zh-CN');
    assert.equal(i18n.language, 'zh-CN');
    await detectLanguage();
    assert.equal(i18n.language, 'zh-CN');
  } finally {
    window.close();
    delete global.window;
    delete global.document;
    delete global.navigator;
  }
});
