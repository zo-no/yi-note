/* eslint-env node */
// Run with: node --test packages/extension/tests/note-time-format.test.cjs
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function loadDefault(relativePath, context = {}) {
  const filename = path.join(__dirname, relativePath);
  const source = readFileSync(filename, 'utf8')
    .replace(/^import .*;\r?\n/gm, '')
    .replace('export default', 'globalThis.result =');
  return vm.runInNewContext(source, context, { filename });
}

const secondsToTime = loadDefault('../../common/utils/secondsToTime.js');
const QUERY_AUTO_JUMP = 'yinotetimestamp';
const buildAutoSeekUrl = loadDefault('../../common/utils/buildAutoSeekUrl.js', {
  URL,
  URLSearchParams,
  QUERY_AUTO_JUMP,
  // Stub provider detection only; execute the real URL-building implementation.
  videoUrlParser: {
    parse: url => {
      const hostname = new URL(url).hostname;
      if (hostname === 'www.youtube.com' || hostname === 'youtu.be') {
        return { provider: 'youtube' };
      }
      if (hostname === 'vimeo.com') return { provider: 'vimeo' };
      return undefined;
    }
  }
});

const invalidTimes = [
  undefined,
  null,
  NaN,
  Infinity,
  -Infinity,
  '',
  ' \t\n ',
  'NaN',
  'Infinity',
  '-Infinity',
  'not a timestamp',
  true,
  false,
  [],
  [0],
  {},
  new Date(0),
  Symbol('timestamp'),
  1n
];
const negativeTimes = [-1, -0.5, '-1', '-0.5'];
const validTimes = [
  [0, '0:00'],
  [1, '0:01'],
  [9, '0:09'],
  [10, '0:10'],
  [59, '0:59'],
  [60, '1:00'],
  [61, '1:01'],
  [3599, '59:59'],
  [3600, '1:00:00'],
  [3601, '1:00:01'],
  [3661, '1:01:01'],
  [36000, '10:00:00'],
  [90061, '25:01:01'],
  [1.5, '0:01.5'],
  [60.5, '1:00.5'],
  ['0', '0:00'],
  ['61', '1:01'],
  ['3661', '1:01:01'],
  [' 0061 ', '1:01']
];

const label = value => `${typeof value}: ${String(value)}`;

test('invalid or negative times show a placeholder, never NaN or a fake zero', () => {
  for (const timestamp of [...invalidTimes, ...negativeTimes]) {
    assert.equal(secondsToTime(timestamp), '--:--', label(timestamp));
  }
});

test('zero, minutes, hours, fractions and legacy numeric strings keep their format', () => {
  for (const [timestamp, expected] of validTimes) {
    assert.equal(secondsToTime(timestamp), expected, label(timestamp));
  }
});

for (const [url, seekKey] of [
  ['https://www.youtube.com/watch?v=video', 't'],
  ['https://youtu.be/video?list=playlist', 't'],
  ['https://vimeo.com/123?quality=hd', QUERY_AUTO_JUMP],
  ['https://example.com/watch?video=123', QUERY_AUTO_JUMP]
]) {
  test(`${url}: invalid times return the original URL without adding a seek`, () => {
    for (const timestamp of invalidTimes) {
      assert.equal(buildAutoSeekUrl(url, timestamp), url, label(timestamp));
    }
    const existingUrl = `${url}&t=12&${QUERY_AUTO_JUMP}=34#chapter`;
    assert.equal(buildAutoSeekUrl(existingUrl, undefined), existingUrl);
  });

  test(`${url}: valid seek URLs retain parameters and replace old timestamps`, () => {
    const sourceUrl = `${url}&t=12&${QUERY_AUTO_JUMP}=34#chapter`;
    for (const [timestamp] of validTimes) {
      const expected = `${url}&${seekKey}=${encodeURIComponent(
        timestamp
      ).replace(/%20/g, '+')}#chapter`;
      assert.equal(buildAutoSeekUrl(sourceUrl, timestamp), expected);
    }
  });

  test(`${url}: finite negative seek offsets still clamp to zero`, () => {
    for (const timestamp of negativeTimes) {
      assert.equal(buildAutoSeekUrl(url, timestamp), `${url}&${seekKey}=0`);
    }
  });
}

function loadNoteItem(relativePath, playerFactory) {
  const filename = path.join(__dirname, relativePath);
  const source = readFileSync(filename, 'utf8');
  const start = source.indexOf('const NoteItem =');
  const end = source.indexOf('\n  return (', start);
  assert.ok(start >= 0 && end > start, 'NoteItem logic boundaries must exist');
  const actions = { videoNotes: {}, alerts: {}, page: {} };
  // Execute the real pre-JSX component logic with inert hooks, not a renderer.
  const render = vm.runInNewContext(
    `${source.slice(start, end)}
      return {
        formattedTime,
        hasTimestamp,
        handlePlay: typeof handlePlay === 'function' ? handlePlay : undefined
      };
    }; NoteItem;`,
    {
      secondsToTime,
      useTranslation: () => ({ t: key => key }),
      useStoreActions: selector => selector(actions),
      useState: value => [value, () => {}],
      useRef: value => ({ current: value }),
      useEffect: () => {},
      PlayerFactory: playerFactory
    },
    { filename }
  );
  return { source, render };
}

test('video notes cannot seek invalid times, even if the callback is invoked', async () => {
  const seeks = [];
  let playerRequests = 0;
  const { source, render } = loadNoteItem(
    '../src/ui/containers/VideoNotesView/NoteItem/index.js',
    {
      getPlayer: async () => {
        playerRequests++;
        return { seek: timestamp => seeks.push(timestamp) };
      }
    }
  );

  for (const timestamp of [...invalidTimes, ...negativeTimes]) {
    const item = render({ note: { timestamp } });
    assert.equal(item.formattedTime, '--:--');
    assert.equal(item.hasTimestamp, false);
    await item.handlePlay();
  }
  assert.equal(playerRequests, 0);
  assert.deepEqual(seeks, []);

  for (const [timestamp, expected] of validTimes) {
    const item = render({ note: { timestamp } });
    assert.equal(item.formattedTime, expected);
    assert.equal(item.hasTimestamp, true);
    await item.handlePlay();
  }
  assert.equal(playerRequests, validTimes.length);
  assert.deepEqual(
    seeks,
    validTimes.map(([timestamp]) => timestamp)
  );

  // Check JSX wiring separately because Node's VM does not parse JSX.
  assert.match(
    source,
    /\{hasTimestamp \? \(\s*<IconButton[\s\S]*?onClick=\{handlePlay\}[\s\S]*?<\/IconButton>\s*\) : \(\s*<PlayIcon color="disabled" titleAccess=\{formattedTime\} \/>\s*\)\}/
  );
});

test('options notes render plain placeholder text instead of a link for invalid times', () => {
  const { source, render } = loadNoteItem(
    '../src/options/containers/Page/VideoNoteItem/index.js'
  );
  for (const timestamp of [...invalidTimes, ...negativeTimes]) {
    const item = render({ note: { timestamp } });
    assert.equal(item.formattedTime, '--:--');
    assert.equal(item.hasTimestamp, false);
  }
  for (const [timestamp, expected] of validTimes) {
    const item = render({ note: { timestamp } });
    assert.equal(item.formattedTime, expected);
    assert.equal(item.hasTimestamp, true);
  }
  assert.match(
    source,
    /\{hasTimestamp \? \(\s*<Link href=\{buildAutoSeekUrl\(url, timestamp\)\} target="_blank">\s*\{formattedTime\}\s*<\/Link>\s*\) : \(\s*<span>\{formattedTime\}<\/span>\s*\)\}/
  );
});
