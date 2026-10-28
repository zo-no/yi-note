/* eslint-env node */
// Run with: node --test packages/extension/tests/page-description.test.cjs
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { transformSync } = require('@babel/core');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const directory = path.join(
  __dirname,
  '../src/options/containers/Page/Description'
);
const helperFilename = path.join(directory, 'formatDescription.js');
const helperSource = readFileSync(helperFilename, 'utf8').replace(
  /^export const /gm,
  'const '
);
const { formatDescription, getDescriptionPreview } = vm.runInNewContext(
  `${helperSource}\n;({ formatDescription, getDescriptionPreview });`,
  {},
  { filename: helperFilename }
);
const format = value => JSON.parse(JSON.stringify(formatDescription(value)));
const restore = blocks => blocks.map(block => block.text).join('');

const emptyInputs = [undefined, null, '', ' \t\r\n\u3000 ', false, 0, [], {}];

test('missing, blank and non-string descriptions have no blocks or preview', () => {
  for (const input of emptyInputs) {
    assert.deepEqual(format(input), []);
    assert.equal(getDescriptionPreview(input), '');
  }
});

test('Bilibili SEO fields become ordered blocks without inferring or rewriting values', () => {
  const description =
    '真实介绍，视频播放量 12,345、弹幕量 0、点赞数 暂无、投硬币枚数 --、收藏人数 8、转发人数 2, 视频作者 UP主, 作者简介 记录生活，相关视频：标题一，标题二, third, part 2';
  const blocks = format(description);
  assert.deepEqual(
    blocks.map(block => block.label),
    [
      '',
      '视频播放量',
      '弹幕量',
      '点赞数',
      '投硬币枚数',
      '收藏人数',
      '转发人数',
      '视频作者',
      '作者简介',
      '相关视频'
    ]
  );
  assert.equal(blocks[1].text, '视频播放量 12,345、');
  assert.equal(blocks[2].text, '弹幕量 0、');
  assert.equal(blocks[3].text, '点赞数 暂无、');
  assert.equal(blocks[4].text, '投硬币枚数 --、');
  assert.equal(restore(blocks), description);
});

test('original CRLF, LF, CR, blank lines, indentation and trailing spaces survive', () => {
  const description =
    ' \t引言\r\n\r\n视频作者：名字\n作者简介: 第一行\r第二行\n\n尾声  \t';
  const blocks = format(description);
  assert.deepEqual(blocks, [
    { label: '', text: ' \t引言\r\n\r\n' },
    { label: '视频作者', text: '视频作者：名字\n' },
    { label: '作者简介', text: '作者简介: 第一行\r' },
    { label: '', text: '第二行\n\n' },
    { label: '', text: '尾声  \t' }
  ]);
  assert.equal(restore(blocks), description);
});

test('repeated fields and unusual field order are not sorted or deduplicated', () => {
  const description = '点赞数：未公开；视频作者：乙; 点赞数：3，弹幕量：0';
  const blocks = format(description);
  assert.deepEqual(
    blocks.map(block => block.label),
    ['点赞数', '视频作者', '点赞数', '弹幕量']
  );
  assert.equal(restore(blocks), description);
  assert.deepEqual(format(description), blocks, 'formatting is repeatable');
});

test('unknown fields and prose are retained rather than interpreted as metadata', () => {
  const description =
    '自定义字段：原值, 标签：甲,乙；视频播放量：未知，神秘指数：8.8，作者简介 真实介绍';
  const blocks = format(description);
  assert.deepEqual(
    blocks.map(block => block.label),
    ['', '视频播放量', '作者简介']
  );
  assert.equal(blocks[0].text, '自定义字段：原值, 标签：甲,乙；');
  assert.equal(blocks[1].text, '视频播放量：未知，神秘指数：8.8，');
  assert.equal(restore(blocks), description);

  const prose =
    '关于视频作者的故事，视频播放量变化不代表质量，点赞数值：不猜测';
  assert.deepEqual(format(prose), [{ label: '', text: prose }]);
});

test('links with field-like path/query text and commas stay intact as plain text', () => {
  for (const url of [
    'https://example.com/视频播放量:1,弹幕量:2?next=视频作者:甲&x=1,2',
    'www.example.com/path,收藏人数:9#视频作者:甲',
    '//example.com/path,转发人数:8',
    'mailto:hello@example.com?subject=hi,作者简介:文本'
  ]) {
    const description = `来源 ${url}, 视频作者：真实作者`;
    const blocks = format(description);
    assert.deepEqual(
      blocks.map(block => block.label),
      ['', '视频作者']
    );
    assert.equal(blocks[0].text, `来源 ${url}, `);
    assert.equal(restore(blocks), description);
  }
});

test('related-video titles are not split on commas, embedded labels or URL punctuation', () => {
  const related =
    '相关视频：标题一，视频作者：标题中的字眼, https://example.com/a,b?x=1,2\n标题二，作者简介：也是标题\n视频播放量：这个标题不是统计数据';
  const description = `视频作者：实际作者，${related}`;
  const blocks = format(description);
  assert.deepEqual(
    blocks.filter(block => block.label).map(block => block.label),
    ['视频作者', '相关视频']
  );
  assert.equal(restore(blocks.slice(1)), related);
  assert.equal(restore(blocks), description);
});

const malicious =
  '<img src=x onerror="alert(1),视频作者:伪造">\r\n<script>alert("x")</script>\n&lt;b&gt; &amp; javascript:alert(1)';

test('HTML, attributes, entities and script-looking text remain literal and unmodified', () => {
  const blocks = format(malicious);
  assert.ok(blocks.every(block => block.label === ''));
  assert.equal(restore(blocks), malicious);
  assert.deepEqual(format('<b>视频播放量：9，弹幕量：4</b>'), [
    { label: '', text: '<b>视频播放量：9，弹幕量：4</b>' }
  ]);
});

test('preview is a bounded literal prefix, not a summary, and does not split Unicode characters', () => {
  assert.equal(getDescriptionPreview(' \t原文\r\n第二行  '), '原文 第二行');
  const description = `${'😀'.repeat(140)}完整结尾`;
  assert.equal(getDescriptionPreview(description), `${'😀'.repeat(140)}…`);
  assert.equal(getDescriptionPreview('字'.repeat(140)), '字'.repeat(140));
  assert.equal(restore(format(description)), description);
});

const componentFilename = path.join(directory, 'index.js');
const componentSource = readFileSync(componentFilename, 'utf8');
// Adapt imports and JSX only. Execute the real component with controlled hooks.
const { code: componentCode } = transformSync(
  componentSource
    .replace(/^import\s[\s\S]*?;\r?\n/gm, '')
    .replace('export default Description;', 'globalThis.result = Description;'),
  {
    filename: componentFilename,
    babelrc: false,
    configFile: false,
    presets: [require.resolve('@babel/preset-react')]
  }
);

function createComponentHarness() {
  let activeState;
  let cursor;
  const Description = vm.runInNewContext(
    componentCode,
    {
      React,
      PropTypes: require('prop-types'),
      formatDescription,
      getDescriptionPreview,
      useTranslation: namespace => {
        assert.equal(namespace, 'options');
        return { t: key => key };
      },
      useMemo: factory => factory(),
      useState: initial => {
        const state = activeState;
        const index = cursor++;
        if (!(index in state)) {
          state[index] = typeof initial === 'function' ? initial() : initial;
        }
        return [
          state[index],
          update => {
            state[index] =
              typeof update === 'function' ? update(state[index]) : update;
          }
        ];
      },
      StyledDescription: 'section',
      StyledToggle: 'button',
      StyledPreview: 'p',
      StyledContent: 'div',
      StyledBlock: 'div',
      StyledLabel: 'strong'
    },
    { filename: componentFilename }
  );
  return () => {
    const state = [];
    return description => {
      activeState = state;
      cursor = 0;
      return Description({ description });
    };
  };
}

function textContent(node) {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(textContent).join('');
  return textContent(node.props.children);
}

test('component renders nothing for blank or absent descriptions', () => {
  const render = createComponentHarness()();
  for (const input of emptyInputs) assert.equal(render(input), null);
});

test('native button toggles a labelled keyboard-scrollable region and keeps its ID stable', () => {
  const render = createComponentHarness()();
  const description = '第一行\n视频播放量：12,345、弹幕量：0\n原文尾部  ';
  let tree = render(description);
  let [button, region] = tree.props.children;
  let preview = button.props.children[1];
  const contentId = region.props.id;
  assert.equal(button.type, 'button');
  assert.equal(button.props.type, 'button');
  assert.equal(button.props['aria-expanded'], false);
  assert.equal(button.props['aria-controls'], contentId);
  assert.equal(
    textContent(button),
    `page.description.title${getDescriptionPreview(description)}page.description.expand`
  );
  assert.equal(preview.type, 'p');
  assert.equal(preview.props.as, 'span');
  assert.equal(textContent(preview), getDescriptionPreview(description));
  assert.equal(region.props.hidden, true);
  assert.equal(region.props.tabIndex, undefined);
  assert.equal(textContent(region), '');
  assert.equal(
    region.props['aria-labelledby'],
    button.props.children[0].props.id
  );

  button.props.onClick();
  tree = render(description);
  [button, region] = tree.props.children;
  preview = button.props.children[1];
  assert.equal(button.props['aria-expanded'], true);
  assert.equal(
    textContent(button),
    'page.description.titlepage.description.collapse'
  );
  assert.equal(preview, false);
  assert.equal(region.props.hidden, false);
  assert.equal(region.props.role, 'region');
  assert.equal(region.props.tabIndex, 0);
  assert.equal(region.props.id, contentId);
  assert.equal(textContent(region), description, 'rendered text is lossless');

  button.props.onClick();
  [button, region] = render(description).props.children;
  preview = button.props.children[1];
  assert.equal(button.props['aria-expanded'], false);
  assert.equal(region.props.hidden, true);
  assert.equal(textContent(region), '');
  assert.equal(textContent(preview), getDescriptionPreview(description));
});

test('independent instances have unique control IDs and start collapsed', () => {
  const createInstance = createComponentHarness();
  const first = createInstance();
  const second = createInstance();
  const firstTree = first('简介一');
  const secondTree = second('简介二');
  assert.notEqual(
    firstTree.props.children[1].props.id,
    secondTree.props.children[1].props.id
  );
  firstTree.props.children[0].props.onClick();
  assert.equal(first('简介一').props.children[0].props['aria-expanded'], true);
  assert.equal(
    second('简介二').props.children[0].props['aria-expanded'],
    false
  );
  assert.equal(
    createInstance()('新页面').props.children[0].props['aria-expanded'],
    false
  );
});

test('actual JSX escapes hostile text in both preview and expanded content', () => {
  const render = createComponentHarness()();
  let tree = render(malicious);
  for (let attempt = 0; attempt < 2; attempt++) {
    const html = renderToStaticMarkup(tree);
    assert.ok(html.includes('&lt;img'));
    assert.ok(html.includes('&lt;script&gt;'));
    assert.doesNotMatch(html, /<(?:img|script|iframe|a)\b/i);
    tree.props.children[0].props.onClick();
    tree = render(malicious);
  }
  assert.doesNotMatch(componentSource, /dangerouslySetInnerHTML/);
});

test('styles enforce a one-line preview, bounded scrolling, wrapping and visible focus', () => {
  const styles = readFileSync(path.join(directory, 'styled.js'), 'utf8');
  assert.match(styles, /-webkit-line-clamp: 1/);
  assert.match(styles, /max-height: min\([^;]+40vh\)/);
  assert.match(styles, /overflow-y: auto/);
  assert.match(styles, /white-space: pre-wrap/);
  assert.match(styles, /overflow-wrap: anywhere/);
  assert.match(styles, /&:focus-visible/);
  assert.match(styles, /&:focus\s*\{/);
  assert.match(styles, /theme\.tokens\.fontSizes\.compact/);
  assert.match(styles, /theme\.tokens\.fontSizes\.auxiliary/);
});
