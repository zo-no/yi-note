/* eslint-env node */
// Run with: node --test packages/extension/tests/note-sections.test.cjs
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const commonRequire = createRequire(
  path.join(__dirname, '../../common/package.json')
);
const { v4, validate } = commonRequire('uuid');
const copy = value => structuredClone(value);

// Adapt module syntax only; helpers, storage merging and Markdown stay real.
function load(relativePath, result, context = {}) {
  const filename = path.join(__dirname, relativePath);
  const source = readFileSync(filename, 'utf8')
    .replace(/^import\s[\s\S]*?;\r?\n/gm, '')
    .replace(/^export const /gm, 'const ')
    .replace('export default', 'const defaultExport =');
  return vm.runInNewContext(`${source}\n;${result};`, context, { filename });
}

const {
  createSection,
  createDefaultSections,
  sectionsToMarkdown,
  getNoteSections,
  hasNoteContent
} = load(
  '../../common/utils/noteSections.js',
  '({ createSection, createDefaultSections, sectionsToMarkdown, getNoteSections, hasNoteContent })',
  { v4 }
);
const labels = Object.freeze({
  observation: '观察',
  analysis: '分析',
  takeaway: '收获'
});
const withSections = sections => ({
  sections,
  content: sectionsToMarkdown(sections)
});

const { INSTALLATION_URL, QUERY_AUTO_JUMP } = load(
  '../../common/constants.js',
  '({ INSTALLATION_URL, QUERY_AUTO_JUMP })',
  { process }
);
const markdown = load('../../common/services/markdown.js', 'defaultExport', {
  marked: commonRequire('marked'),
  secondsToTime: load('../../common/utils/secondsToTime.js', 'defaultExport'),
  buildAutoSeekUrl: load(
    '../../common/utils/buildAutoSeekUrl.js',
    'defaultExport',
    {
      videoUrlParser: commonRequire('js-video-url-parser'),
      QUERY_AUTO_JUMP,
      URL,
      URLSearchParams
    }
  ),
  INSTALLATION_URL,
  browser: { i18n: { getMessage: (key, substitution) => substitution } }
});

function createStorage(initial) {
  const data = copy(initial);
  // Clone at both boundaries, as browser.storage does: references cannot persist.
  const local = {
    get: async key => copy(key === undefined ? data : { [key]: data[key] }),
    set: async items => {
      Object.assign(data, copy(items));
    }
  };
  const BrowserStorage = load(
    '../../common/services/storage/BrowserStorage.js',
    'defaultExport',
    {
      Storage: load(
        '../../common/services/storage/Storage.js',
        'defaultExport'
      ),
      addNoteToList: load(
        '../../common/utils/addNoteToList.js',
        'defaultExport'
      ),
      addTagToList: load('../../common/utils/addTagToList.js', 'defaultExport'),
      validate,
      browser: { storage: { local } }
    }
  );
  return new BrowserStorage();
}

test('createSection keeps raw labels and content, defaults to custom and generates independent IDs', () => {
  const empty = createSection('自定义');
  assert.deepEqual(copy(empty), {
    id: empty.id,
    kind: 'custom',
    label: '自定义',
    content: ''
  });
  const explicit = createSection(
    '  **标签**\n第二行  ',
    '\n原文  \r\n',
    'analysis'
  );
  assert.deepEqual(copy(explicit), {
    id: explicit.id,
    kind: 'analysis',
    label: '  **标签**\n第二行  ',
    content: '\n原文  \r\n'
  });
  assert.ok(validate(empty.id));
  assert.ok(validate(explicit.id));
  assert.notEqual(empty.id, explicit.id);
});

test('legacy Markdown, even matching template headings, is not coerced into sections', () => {
  for (const content of [
    '# 旧笔记\n\n正文 **原样**\n\n![截图](data:image/png;base64,AAAA)',
    '### 观察\n\n原文\n\n### 分析\n\n推理\n\n### 收获\n\n结论'
  ]) {
    const note = Object.freeze({ id: 'legacy', content });
    assert.equal(getNoteSections(note), null);
    assert.equal(hasNoteContent(note), true);
    assert.deepEqual(note, { id: 'legacy', content });
    assert.equal(Object.hasOwn(note, 'sections'), false);
  }
});

test('the default template preserves the entire original Markdown once and has independent IDs', () => {
  const original = [
    '  原文开头  ',
    '',
    '### 分析',
    '> 引用与 **强调**',
    '- [ ] 待办',
    '[链接](https://example.com/a?x=1&y=2)',
    '![截图](data:image/png;base64,AAAA)',
    '```js',
    'const value = "<tag>";',
    '```',
    '',
    '尾部空格  ',
    ''
  ].join('\r\n');
  const first = createDefaultSections(original, labels);
  const second = createDefaultSections(original, labels);
  assert.deepEqual(
    copy(first).map(({ kind, label, content }) => ({ kind, label, content })),
    [
      { kind: 'observation', label: '观察', content: original },
      { kind: 'analysis', label: '分析', content: '' },
      { kind: 'takeaway', label: '收获', content: '' }
    ]
  );
  const ids = [...first, ...second].map(section => section.id);
  assert.equal(new Set(ids).size, 6);
  assert.ok(ids.every(id => validate(id)));
  assert.equal(
    sectionsToMarkdown(first),
    `### 观察\n\n${original}\n\n### 分析\n\n\n\n### 收获\n\n`
  );
  first[0].content = '仅修改第一份';
  first[1].label = '重命名';
  assert.equal(second[0].content, original);
  assert.equal(second[1].label, '分析');
  assert.equal(labels.analysis, '分析');
});

test('empty source content creates three empty bodies without losing supplied labels', () => {
  for (const content of [undefined, null, '']) {
    const sections = createDefaultSections(content, labels);
    assert.deepEqual(
      copy(sections).map(section => section.content),
      ['', '', '']
    );
    assert.deepEqual(
      copy(sections).map(section => section.label),
      ['观察', '分析', '收获']
    );
    assert.equal(hasNoteContent(withSections(sections)), false);
  }
});

test('custom sections serialize additions, deletions and renames in order without changing IDs', () => {
  const question = createSection('问题', '待核对');
  const discarded = createSection('临时', '将删除的正文');
  const reference = createSection('参考', '[原始资料](https://example.com)');
  const sections = [question, discarded];
  assert.equal(
    sectionsToMarkdown(sections),
    '### 问题\n\n待核对\n\n### 临时\n\n将删除的正文'
  );
  sections.push(reference);
  assert.equal(
    sectionsToMarkdown(sections),
    '### 问题\n\n待核对\n\n### 临时\n\n将删除的正文\n\n### 参考\n\n[原始资料](https://example.com)'
  );
  sections.splice(1, 1);
  const originalId = question.id;
  question.label = '追问与验证';
  assert.equal(
    sectionsToMarkdown(sections),
    '### 追问与验证\n\n待核对\n\n### 参考\n\n[原始资料](https://example.com)'
  );
  assert.equal(question.id, originalId);
  const snapshot = copy(sections);
  assert.strictEqual(getNoteSections(withSections(sections)), sections);
  assert.deepEqual(copy(sections), snapshot);
  assert.equal(sectionsToMarkdown([]), '');
});

test('JSON roundtrip preserves IDs, kinds, raw labels, bodies and the Markdown projection', () => {
  const sections = createDefaultSections('原文\r\n  缩进', labels);
  sections[1].content = '**分析**\n\n第二段';
  sections.push(createSection('  <自定义>\n& 标签  ', '代码 `a < b`\n尾部  '));
  const note = {
    id: 'roundtrip-note',
    type: 'video',
    timestamp: 12.5,
    ...withSections(sections)
  };
  const restored = JSON.parse(JSON.stringify(note));
  assert.deepEqual(restored, copy(note));
  assert.notStrictEqual(restored.sections, sections);
  assert.strictEqual(getNoteSections(restored), restored.sections);
  assert.strictEqual(getNoteSections(restored), restored.sections);
  assert.equal(sectionsToMarkdown(restored.sections), note.content);
  assert.equal(hasNoteContent(restored), true);
});

test('invalid section metadata falls back to Markdown without throwing or mutating the note', () => {
  const section = {
    id: 'section-1',
    kind: 'custom',
    label: '记录',
    content: '原正文'
  };
  const cases = [
    ['missing sections', undefined],
    ['null sections', null],
    ['object instead of array', {}],
    ['string instead of array', 'sections'],
    ['empty array', []],
    ['null entry', [null]],
    ['undefined entry', [undefined]],
    ['string entry', ['section']],
    ['empty entry', [{}]],
    ['missing ID', [{ ...section, id: undefined }]],
    ['empty ID', [{ ...section, id: '' }]],
    ['null ID', [{ ...section, id: null }]],
    ['numeric ID', [{ ...section, id: 1 }]],
    ['object ID', [{ ...section, id: {} }]],
    ['missing label', [{ ...section, label: undefined }]],
    ['null label', [{ ...section, label: null }]],
    ['numeric label', [{ ...section, label: 1 }]],
    ['missing body', [{ ...section, content: undefined }]],
    ['null body', [{ ...section, content: null }]],
    ['numeric body', [{ ...section, content: 1 }]]
  ];
  for (const [name, sections] of cases) {
    const note = { sections, content: '### 记录\n\n原正文' };
    const snapshot = copy(note);
    assert.equal(getNoteSections(note), null, name);
    assert.equal(hasNoteContent(note), true, name);
    assert.deepEqual(copy(note), snapshot, name);
  }
});

test('duplicate IDs fall back even when the Markdown projection matches exactly', () => {
  const sections = [
    createSection('第一栏', '正文一'),
    createSection('第二栏', '正文二')
  ];
  sections[1].id = sections[0].id;
  const note = withSections(sections);
  assert.equal(note.content, '### 第一栏\n\n正文一\n\n### 第二栏\n\n正文二');
  assert.equal(getNoteSections(note), null);
  assert.equal(hasNoteContent(note), true);
});

test('legacy content edits, including clearing the note, always win over stale sections', () => {
  const sections = createDefaultSections('过期正文', labels);
  const projection = sectionsToMarkdown(sections);
  for (const content of [
    '旧编辑器保存的新正文',
    projection.replace('过期正文', '更新后的正文'),
    `${projection}\n`,
    '',
    ' \t\r\n ',
    undefined,
    null
  ]) {
    const note = { sections, content };
    const snapshot = copy(note);
    assert.equal(getNoteSections(note), null);
    assert.equal(hasNoteContent(note), Boolean((content || '').trim()));
    assert.deepEqual(copy(note), snapshot);
  }
  assert.strictEqual(getNoteSections(withSections(sections)), sections);
});

test('section headings and whitespace are not body content, but any populated section is', () => {
  const sections = createDefaultSections('', labels);
  sections.forEach(section => {
    section.content = ' \t\r\n\u3000 ';
  });
  const empty = withSections(sections);
  assert.ok(empty.content.trim());
  assert.strictEqual(getNoteSections(empty), sections);
  assert.equal(hasNoteContent(empty), false);
  for (const section of sections) {
    section.content = '有效正文';
    assert.equal(hasNoteContent(withSections(sections)), true);
    section.content = '';
  }
  assert.equal(hasNoteContent(withSections(sections)), false);
  for (const content of [undefined, null, '', ' \t\r\n ']) {
    assert.equal(hasNoteContent({ content }), false);
  }
  assert.equal(
    hasNoteContent({ content: '### 旧 Markdown 标题仍保留旧行为' }),
    true
  );
});

test('labels escape Markdown punctuation and normalize line breaks without changing stored data', () => {
  const section = createSection(
    '  \\`*_{}[]()#+.!<>|&~-\r\n标签\n二  ',
    '正文\r\n  原样  '
  );
  const snapshot = copy(section);
  const escaped =
    '\\\\\\`\\*\\_\\{\\}\\[\\]\\(\\)\\#\\+\\.\\!\\<\\>\\|\\&\\~\\- 标签 二';
  assert.equal(
    sectionsToMarkdown([section]),
    `### ${escaped}\n\n正文\r\n  原样  `
  );
  assert.deepEqual(copy(section), snapshot);
  assert.equal(
    sectionsToMarkdown([createSection(' \r\n ', '正文')]),
    '### …\n\n正文'
  );
});

test('Markdown export contains every section and renders escaped labels as text, not HTML', () => {
  const sections = createDefaultSections('观察正文\n\n- 条目', labels);
  sections[1].content = '**分析正文**';
  sections[2].content = '[收获正文](https://example.com/source)';
  sections.push(createSection('<img src=x onerror=alert(1)>', '自定义正文一'));
  sections.push(
    createSection('**重点** & [链接](javascript:alert(1))', '自定义正文二')
  );
  sections.push(
    createSection(' \r\n# 换行\r\n<script>alert(1)</script>  ', '自定义正文三')
  );
  const note = { id: 'export-note', timestamp: 12, ...withSections(sections) };
  const snapshot = copy(note);
  const exported = markdown.pagesToMarkdown([
    {
      meta: { title: '测试页面', url: 'https://example.com/video' },
      notes: [note]
    }
  ]);
  assert.ok(exported.includes(`${note.content}\n\n`));
  for (const section of sections) {
    assert.ok(exported.includes(section.content), section.label);
  }
  assert.ok(exported.includes('### \\<img src=x onerror=alert\\(1\\)\\>'));
  assert.ok(
    exported.includes(
      '### \\*\\*重点\\*\\* \\& \\[链接\\]\\(javascript:alert\\(1\\)\\)'
    )
  );
  const html = markdown.toHTML(exported);
  const headings = Array.from(
    html.matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>/g),
    match => match[1]
  );
  assert.deepEqual(headings, [
    '观察',
    '分析',
    '收获',
    '&lt;img src=x onerror=alert(1)&gt;',
    '**重点** &amp; [链接](javascript:alert(1))',
    '# 换行 &lt;script&gt;alert(1)&lt;/script&gt;'
  ]);
  assert.doesNotMatch(html, /<(?:img|script)\b/i);
  assert.deepEqual(copy(note), snapshot);
});

test('BrowserStorage.addNote persists all sections and projection through a cloned storage boundary', async () => {
  const pageId = v4();
  const sibling = { id: 'sibling', timestamp: 30, content: '原有旧笔记' };
  const page = {
    id: pageId,
    meta: { title: '页面' },
    tags: ['标签'],
    notes: [sibling]
  };
  const storage = createStorage({ [pageId]: page });
  const note = {
    id: 'new-note',
    type: 'video',
    timestamp: 12,
    ...withSections(createDefaultSections('保存正文', labels))
  };
  const expected = copy(note);
  assert.strictEqual(await storage.addNote(pageId, note), note);
  const saved = await storage.getPage(pageId);
  assert.deepEqual(saved, { ...page, notes: [expected, sibling] });
  assert.strictEqual(getNoteSections(saved.notes[0]), saved.notes[0].sections);
  note.sections[0].content = '未保存的本地修改';
  saved.notes[0].sections[1].label = '读取副本的修改';
  assert.deepEqual((await storage.getPage(pageId)).notes[0], expected);
});

test('BrowserStorage.updateNote replaces the same note while retaining edited sections and other notes', async () => {
  const pageId = v4();
  const original = {
    id: 'existing-note',
    type: 'video',
    timestamp: 12,
    ...withSections(createDefaultSections('原正文', labels))
  };
  const sibling = { id: 'sibling', timestamp: 30, content: '不变的旧笔记' };
  const page = {
    id: pageId,
    meta: { title: '页面' },
    notes: [original, sibling]
  };
  const storage = createStorage({ [pageId]: page });
  const sections = copy(original.sections);
  sections[0].label = '重新命名';
  sections[0].content = '修改后的正文';
  sections.splice(1, 1);
  sections.push(createSection('自定义新增', '补充正文'));
  const updated = { ...original, ...withSections(sections) };
  assert.strictEqual(await storage.updateNote(pageId, updated), updated);
  const saved = await storage.getPage(pageId);
  assert.deepEqual(saved, { ...copy(page), notes: [copy(updated), sibling] });
  assert.strictEqual(getNoteSections(saved.notes[0]), saved.notes[0].sections);
  assert.equal(saved.notes[0].sections[0].id, original.sections[0].id);
  assert.equal(
    saved.notes[0].content,
    '### 重新命名\n\n修改后的正文\n\n### 收获\n\n\n\n### 自定义新增\n\n补充正文'
  );
});
