/* eslint-env node */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const React = require('react');
const PropTypes = require('prop-types');
const babel = require('@babel/core');
const load = relative =>
  fs.readFileSync(path.join(__dirname, relative), 'utf8');
const loadDefault = (relative, context = {}) =>
  vm.runInNewContext(
    load(relative)
      .replace(/^import\s[\s\S]*?;\r?\n/gm, '')
      .replace('export default', 'globalThis.result ='),
    context
  );
const sortNotes = loadDefault('../src/ui/utils/sortNotes.js');
const ids = notes => Array.from(notes, note => note.id);
const notes = Object.freeze([
  Object.freeze({ id: 'later', timestamp: 125 }),
  Object.freeze({ id: 'zero', timestamp: 0 }),
  Object.freeze({ id: 'first', timestamp: 78 }),
  Object.freeze({ id: 'same', timestamp: '78' }),
  Object.freeze({ id: 'last', timestamp: 220 })
]);

test('video timestamps sort in both directions, preserving equal-time order and identity', () => {
  assert.deepEqual(ids(sortNotes(notes)), [
    'zero',
    'first',
    'same',
    'later',
    'last'
  ]);
  assert.deepEqual(ids(sortNotes(notes, 'desc')), [
    'last',
    'later',
    'first',
    'same',
    'zero'
  ]);
  assert.equal(sortNotes(notes)[0], notes[1]);
  assert.deepEqual(ids(notes), ['later', 'zero', 'first', 'same', 'last']);
});

test('invalid timestamps always stay at the end instead of becoming zero', () => {
  const bad = [
    null,
    undefined,
    NaN,
    Infinity,
    -1,
    '',
    ' ',
    true,
    {},
    []
  ].map((timestamp, i) => ({ id: String(i), timestamp }));
  for (const order of ['asc', 'desc']) {
    const result = sortNotes([...bad, { id: 'valid', timestamp: 0 }], order);
    assert.equal(result[0].id, 'valid');
    assert.deepEqual(ids(result.slice(1)), ids(bad));
  }
  assert.deepEqual(ids(sortNotes([])), []);
});

test('new and edited notes use the selected display order without rewriting data', () => {
  const added = [...notes, { id: 'new', timestamp: 110 }];
  assert.deepEqual(ids(sortNotes(added, 'desc')), [
    'last',
    'later',
    'new',
    'first',
    'same',
    'zero'
  ]);
  const edited = added.map(note =>
    note.id === 'new' ? { ...note, content: 'edited' } : note
  );
  assert.deepEqual(
    ids(sortNotes(edited, 'desc')),
    ids(sortNotes(added, 'desc'))
  );
});

function createNoteRenderer() {
  let state;
  const source = load('../src/ui/containers/VideoNotesView/NoteItem/index.js')
    .replace(/^import\s[\s\S]*?;\r?\n/gm, '')
    .replace('export default NoteItem;', 'globalThis.result = NoteItem;');
  const { code } = babel.transformSync(source, {
    configFile: false,
    babelrc: false,
    presets: [require.resolve('@babel/preset-react')]
  });
  const component = vm.runInNewContext(code, {
    React,
    PropTypes,
    useState: initial => {
      const current = state;
      if (!('value' in current)) current.value = initial;
      return [
        current.value,
        value => {
          current.value =
            typeof value === 'function' ? value(current.value) : value;
        }
      ];
    },
    useStoreActions: selector =>
      selector({
        videoNotes: { edit() {} },
        alerts: { show() {} },
        page: { removeNote() {} }
      }),
    useTranslation: () => ({ t: key => key }),
    secondsToTime: loadDefault('../../common/utils/secondsToTime.js'),
    Markdown: { toText: value => value },
    PlayerFactory: {},
    Grid: 'div',
    IconButton: 'button',
    PlayIcon: 'svg',
    EditIcon: 'svg',
    DeleteIcon: 'svg',
    NoteContent: 'note-content',
    StyledCard: 'article',
    StyledMainRow: 'header',
    StyledSummary: 'summary-text',
    StyledTimestamp: 'time',
    StyledExpandMoreIcon: 'chevron',
    StyledExpandedSection: 'section',
    StyledNote: 'div'
  });
  return () => {
    const instance = {};
    return note => {
      state = instance;
      return component({ note });
    };
  };
}
function all(tree, type) {
  if (!tree || typeof tree !== 'object') return [];
  if (Array.isArray(tree)) return tree.flatMap(node => all(node, type));
  return [
    ...(tree.type === type ? [tree] : []),
    ...all(tree.props.children, type)
  ];
}
function toggle(tree) {
  return all(tree, 'button').find(node => 'aria-expanded' in node.props);
}

test('multiple card instances expand and collapse independently with matching chevrons', () => {
  const create = createNoteRenderer();
  const a = create();
  const b = create();
  const noteA = { id: 'a', timestamp: 78, content: 'first' };
  const noteB = { id: 'b', timestamp: 85, content: 'second' };
  let first = a(noteA);
  let second = b(noteB);
  assert.equal(all(first, 'section')[0].props.hidden, true);
  assert.equal(all(second, 'section')[0].props.hidden, true);
  assert.equal(all(first, 'note-content').length, 0);
  toggle(first).props.onClick();
  first = a(noteA);
  second = b(noteB);
  assert.equal(all(first, 'section')[0].props.hidden, false);
  assert.equal(all(first, 'chevron')[0].props['data-expanded'], true);
  assert.equal(all(first, 'time').length, 1);
  assert.equal(all(second, 'section')[0].props.hidden, true);
  assert.equal(all(second, 'chevron')[0].props['data-expanded'], false);
  assert.equal(
    toggle(first).props['aria-controls'],
    all(first, 'section')[0].props.id
  );
  toggle(second).props.onClick();
  second = b(noteB);
  toggle(first).props.onClick();
  first = a(noteA);
  assert.equal(all(first, 'section')[0].props.hidden, true);
  assert.equal(all(first, 'note-content').length, 0);
  assert.equal(all(second, 'section')[0].props.hidden, false);
});

test('collapse styles use instance attributes, never namespaced dynamic props', () => {
  const css = load('../src/ui/containers/VideoNotesView/NoteItem/styled.js');
  assert.match(css, /&\[hidden\]\s*\{\s*display: none;/);
  assert.match(
    css,
    /&\[data-expanded='true'\]\s*\{\s*transform: rotate\(90deg\)/
  );
  assert.doesNotMatch(css, /props\.expanded|\{\s*expanded\s*\}/);
  const view = load('../src/ui/containers/VideoNotesView/index.js');
  assert.match(view, /items=\{sortedNotes\}/);
});
