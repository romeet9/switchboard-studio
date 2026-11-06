import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getNodes, getImages, getFile, FigmaError, walk } from '../src/lib/figma.js';

const res = (status, body = {}, headers = {}) => ({
  status, ok: status >= 200 && status < 300,
  headers: { get: (k) => headers[k.toLowerCase()] ?? null },
  json: async () => body,
});
const stub = (...responses) => {
  const calls = [];
  const fn = async (url, init) => { calls.push({ url: new URL(url), init }); return responses[Math.min(calls.length - 1, responses.length - 1)]; };
  return { fn, calls };
};
const base = { token: 'tok', sleep: async () => {} };

test('getNodes sends the token header and ids/depth', async () => {
  const { fn, calls } = stub(res(200, { nodes: {} }));
  await getNodes('KEY', ['1:2', '3:4'], { ...base, fetch: fn, depth: 2 });
  assert.equal(calls[0].url.pathname, '/v1/files/KEY/nodes');
  assert.equal(calls[0].url.searchParams.get('ids'), '1:2,3:4');
  assert.equal(calls[0].url.searchParams.get('depth'), '2');
  assert.equal(calls[0].init.headers['X-Figma-Token'], 'tok');
});
test('getImages defaults to png at 2x and returns the images map', async () => {
  const { fn, calls } = stub(res(200, { err: null, images: { '1:2': 'https://x/y.png' } }));
  const images = await getImages('KEY', '1:2', { ...base, fetch: fn });
  assert.equal(calls[0].url.searchParams.get('format'), 'png');
  assert.equal(calls[0].url.searchParams.get('scale'), '2');
  assert.deepEqual(images, { '1:2': 'https://x/y.png' });
});
test('429 is retried with backoff, then succeeds', async () => {
  const waits = [];
  const { fn, calls } = stub(res(429), res(429, {}, { 'retry-after': '3' }), res(200, { name: 'ok' }));
  const out = await getFile('KEY', { ...base, fetch: fn, sleep: async (ms) => waits.push(ms) });
  assert.equal(out.name, 'ok');
  assert.equal(calls.length, 3);
  assert.deepEqual(waits, [1000, 3000]);
});
test('429 gives up after 3 retries with a clear message', async () => {
  const { fn, calls } = stub(res(429));
  await assert.rejects(getFile('KEY', { ...base, fetch: fn }), (e) => e instanceof FigmaError && e.status === 429 && /rate limit/i.test(e.message));
  assert.equal(calls.length, 4);
});
test('403 and 404 have clear errors', async () => {
  await assert.rejects(getFile('KEY', { ...base, fetch: stub(res(403, { err: 'Forbidden' })).fn }), /403.*token.*file_content:read/s);
  await assert.rejects(getFile('KEY', { ...base, fetch: stub(res(404)).fn }), /could not find file KEY.*file key/s);
});
test('walk visits in order and can skip children', () => {
  const tree = { name: 'a', children: [{ name: 'b', children: [{ name: 'c' }] }, { name: 'd' }] };
  const seen = [];
  walk(tree, (n, parents) => { seen.push(`${parents.map((p) => p.name).join('')}/${n.name}`); return n.name !== 'b'; });
  assert.deepEqual(seen, ['/a', 'a/b', 'a/d']);
});
