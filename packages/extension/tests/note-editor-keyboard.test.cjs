/* eslint-env node */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function setup(overrides = {}, text = 'hello', start = text.length, end = start) {
  const frames = [];
  const state = { saves: 0, changes: [], prevented: 0, stopped: 0, caret: null };
  const context = vm.createContext({
    window: { requestAnimationFrame: callback => frames.push(callback) }
  });
  const source = fs.readFileSync(
    path.join(__dirname, '../src/ui/utils/handleNoteEditorKeyDown.js'),
    'utf8'
  );
  const handler = vm.runInContext(
    source.replace('export default', 'globalThis.handler ='),
    context
  );
  const event = {
    key: 'Enter',
    metaKey: false,
    repeat: false,
    nativeEvent: { isComposing: false, keyCode: 13 },
    currentTarget: {
      value: text,
      selectionStart: start,
      selectionEnd: end,
      setSelectionRange: (from, to) => {
        state.caret = [from, to];
      }
    },
    preventDefault: () => state.prevented++,
    stopPropagation: () => state.stopped++,
    ...overrides
  };
  handler(event, () => state.saves++, value => state.changes.push(value));
  return { state, frames };
}

test('Enter saves without inserting a newline or reaching host-page shortcuts', () => {
  const { state, frames } = setup();
  assert.equal(state.saves, 1);
  assert.deepEqual(state.changes, []);
  assert.equal(state.prevented, 1);
  assert.equal(state.stopped, 1);
  assert.equal(frames.length, 0);
});

test('holding Enter does not repeatedly save', () => {
  const { state } = setup({ repeat: true });
  assert.equal(state.saves, 0);
  assert.equal(state.prevented, 1);
  assert.deepEqual(state.changes, []);
});

for (const [name, text, start, end, expected] of [
  ['end', 'hello', 5, 5, 'hello\n'],
  ['middle', 'hello', 2, 2, 'he\nllo'],
  ['selection', 'hello', 1, 4, 'h\no'],
  ['empty editor', '', 0, 0, '\n'],
  ['Chinese text', '视频笔记', 2, 2, '视频\n笔记']
]) {
  test(`Command+Enter inserts a newline at ${name} and restores the caret`, () => {
    const { state, frames } = setup({ metaKey: true }, text, start, end);
    assert.equal(state.saves, 0);
    assert.deepEqual(state.changes, [expected]);
    assert.equal(state.prevented, 1);
    assert.equal(state.stopped, 1);
    assert.equal(state.caret, null);
    assert.equal(frames.length, 1);
    frames[0]();
    assert.deepEqual(state.caret, [start + 1, start + 1]);
  });
}

for (const nativeEvent of [
  { isComposing: true, keyCode: 13 },
  { isComposing: false, keyCode: 229 }
]) {
  test(`IME confirmation is left to the input method: ${JSON.stringify(nativeEvent)}`, () => {
    const { state, frames } = setup({ nativeEvent });
    assert.equal(state.saves, 0);
    assert.deepEqual(state.changes, []);
    assert.equal(state.prevented, 0);
    assert.equal(state.stopped, 0);
    assert.equal(frames.length, 0);
  });
}

test('ordinary typing is unchanged', () => {
  const { state } = setup({ key: 'a' });
  assert.equal(state.saves, 0);
  assert.deepEqual(state.changes, []);
  assert.equal(state.prevented, 0);
  assert.equal(state.stopped, 0);
});
