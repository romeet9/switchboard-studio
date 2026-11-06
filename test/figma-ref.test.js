import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFigmaRef } from '../src/lib/config.js';
import { normalizeNodeId, parseArgs } from '../src/lib/args.js';

test('design URL with node-id (dash becomes colon)', () => {
  assert.deepEqual(parseFigmaRef('https://www.figma.com/design/AbC123xyz789/My-File?node-id=12-34&t=zz'), { fileKey: 'AbC123xyz789', nodeId: '12:34' });
});
test('legacy /file/ URL and colon node-id', () => {
  assert.deepEqual(parseFigmaRef('https://www.figma.com/file/AbC123xyz789/x?node-id=1:2'), { fileKey: 'AbC123xyz789', nodeId: '1:2' });
});
test('branch URL uses the branch key', () => {
  assert.equal(parseFigmaRef('https://www.figma.com/design/AbC123xyz789/branch/BrAnCh456/x').fileKey, 'BrAnCh456');
});
test('bare file key, no node', () => {
  assert.deepEqual(parseFigmaRef('mDz2h34YO140uGbhVl27kA'), { fileKey: 'mDz2h34YO140uGbhVl27kA', nodeId: null });
});
test('URL without node-id', () => {
  assert.equal(parseFigmaRef('https://www.figma.com/design/AbC123xyz789/x').nodeId, null);
});
test('garbage is rejected', () => {
  assert.throws(() => parseFigmaRef('hello world'), /Not a Figma URL/);
  assert.throws(() => parseFigmaRef('short'), /Not a Figma URL/);
});
test('normalizeNodeId accepts dash or colon', () => {
  assert.equal(normalizeNodeId('12-34'), '12:34');
  assert.equal(normalizeNodeId('12:34'), '12:34');
  assert.equal(normalizeNodeId('I1:2;3:4'), 'I1:2;3:4');
});
test('parseArgs: repeatable, =, booleans, unknown flags', () => {
  const { positional, values } = parseArgs(['KEY', '--node', '1-2', '--node=3:4', '--json', '--out', 'x'],
    { string: ['out'], multi: ['node'], boolean: ['json'] });
  assert.deepEqual(positional, ['KEY']);
  assert.deepEqual(values.node, ['1-2', '3:4']);
  assert.equal(values.json, true);
  assert.equal(values.out, 'x');
  assert.throws(() => parseArgs(['--nope'], {}), /Unknown option/);
  assert.throws(() => parseArgs(['--out'], { string: ['out'] }), /needs a value/);
});
