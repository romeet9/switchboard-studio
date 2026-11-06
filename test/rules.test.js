import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { lintTree, contrastRatio, toHex } from '../src/lib/rules.js';

const load = (name, id) => {
  const entry = JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')).nodes[id];
  return lintTree(entry.document, { components: entry.components });
};
const bad = load('frame-bad.json', '1:1');
const good = load('frame-good.json', '2:1');
const rule = (r, rule) => r.issues.filter((i) => i.rule === rule);

test('contrast maths: #9CA3AF on white is about 2.5:1', () => {
  const grey = { r: 0x9c / 255, g: 0xa3 / 255, b: 0xaf / 255 };
  assert.ok(Math.abs(contrastRatio(grey, { r: 1, g: 1, b: 1 }) - 2.54) < 0.02);
  assert.equal(toHex(grey), '#9CA3AF');
  assert.equal(contrastRatio({ r: 0, g: 0, b: 0 }, { r: 1, g: 1, b: 1 }), 21);
});

test('good frame has no issues and 100% scores', () => {
  assert.deepEqual(good.issues, []);
  assert.equal(good.scores.variableBindingPct, 100);
  assert.equal(good.scores.textStylesPct, 100);
  assert.equal(good.scores.libraryInstancesPct, 100);
  assert.equal(good.totals.contrastChecked, 1);
});

test('unbound paints: only the visible, non-instance red box (and the unbound grey text fill)', () => {
  const names = rule(bad, 'unbound-paint').map((i) => i.nodeName).sort();
  assert.deepEqual(names, ['Low contrast', 'Red box']);
  assert.match(rule(bad, 'unbound-paint').find((i) => i.nodeName === 'Red box').detail, /fill #FF0000/);
  // hidden box and the paint inside the Checkbox instance are ignored
  assert.equal(bad.totals.paints, 4); // frame (bound), grey text, dark text (bound), red box
  assert.equal(bad.totals.boundPaints, 2);
});

test('unbound spacing and radius on the auto-layout frame, bound padding passes', () => {
  const [issue] = rule(bad, 'unbound-spacing');
  assert.equal(issue.nodeName, 'Brief-x / Variant B');
  assert.match(issue.detail, /itemSpacing 16/);
  assert.match(issue.detail, /cornerRadius 8/);
  assert.doesNotMatch(issue.detail, /paddingLeft/);
  assert.equal(bad.totals.spacingProps, 3);
  assert.equal(bad.totals.boundSpacingProps, 1);
});

test('text without a style', () => {
  assert.deepEqual(rule(bad, 'text-style').map((i) => i.nodeName), ['Low contrast']);
  assert.equal(bad.totals.texts, 2);
  assert.equal(bad.totals.styledTexts, 1);
  assert.equal(bad.scores.textStylesPct, 50);
});

test('library vs local instances', () => {
  assert.equal(bad.totals.instances, 2);
  assert.equal(bad.totals.libraryInstances, 1);
  assert.equal(bad.totals.localInstances, 1);
  assert.equal(bad.scores.libraryInstancesPct, 50);
  const [issue] = rule(bad, 'non-library-instance');
  assert.equal(issue.nodeName, 'Banner');
  assert.equal(issue.severity, 'blocker');
});

test('foreign library components are flagged when library keys are given', () => {
  const entry = JSON.parse(readFileSync(new URL('./fixtures/frame-bad.json', import.meta.url), 'utf8')).nodes['1:1'];
  const r = lintTree(entry.document, { components: entry.components, libraryKeys: new Set(['k-other']) });
  assert.equal(r.totals.foreignInstances, 1);
  assert.equal(r.totals.libraryInstances, 0);
});

test('contrast: the grey text fails, the dark text passes', () => {
  const issues = rule(bad, 'contrast');
  assert.equal(issues.length, 1);
  assert.equal(issues[0].nodeName, 'Low contrast');
  assert.equal(issues[0].severity, 'blocker'); // below 3:1
  assert.match(issues[0].detail, /^2\.5\d:1, needs 4\.5:1 \(#9CA3AF on #FFFFFF\)/);
  assert.equal(bad.totals.contrastChecked, 2);
  assert.equal(bad.totals.contrastFails, 1);
});

test('large text uses the 3:1 threshold', () => {
  const tree = {
    id: 'r', name: 'r', type: 'FRAME',
    fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 } }],
    children: [
      // #8A8A8A on white is about 3.4:1: passes as large, fails as body
      { id: 't1', name: 'big', type: 'TEXT', style: { fontSize: 24, fontWeight: 400 }, fills: [{ type: 'SOLID', color: { r: 0.54, g: 0.54, b: 0.54, a: 1 } }] },
      { id: 't2', name: 'small', type: 'TEXT', style: { fontSize: 14, fontWeight: 400 }, fills: [{ type: 'SOLID', color: { r: 0.54, g: 0.54, b: 0.54, a: 1 } }] },
      { id: 't3', name: 'bold19', type: 'TEXT', style: { fontSize: 19, fontWeight: 700 }, fills: [{ type: 'SOLID', color: { r: 0.54, g: 0.54, b: 0.54, a: 1 } }] },
    ],
  };
  const r = lintTree(tree);
  assert.deepEqual(r.issues.filter((i) => i.rule === 'contrast').map((i) => i.nodeName), ['small']);
});

test('opacity is composited over the background', () => {
  const tree = {
    id: 'r', name: 'r', type: 'FRAME', fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 } }],
    children: [{ id: 't', name: 'faded', type: 'TEXT', opacity: 0.4, style: { fontSize: 16 }, fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 } }] }],
  };
  assert.equal(lintTree(tree).totals.contrastFails, 1); // black at 40% on white is roughly 2.5:1, below 4.5
});

test('small targets: the 14x15 checkbox is flagged, the 120x36 button is not', () => {
  const issues = rule(bad, 'small-target');
  assert.equal(issues.length, 1);
  assert.equal(issues[0].nodeName, 'Checkbox');
  assert.match(issues[0].detail, /14x15/);
  assert.equal(rule(good, 'small-target').length, 0);
});

test('issues carry a path and are sorted blockers first', () => {
  const red = bad.issues.find((i) => i.nodeName === 'Red box');
  assert.equal(red.path, 'Brief-x / Variant B > Red box');
  assert.equal(red.nodeId, '1:4');
  const sev = bad.issues.map((i) => ['blocker', 'major', 'minor'].indexOf(i.severity));
  assert.deepEqual(sev, [...sev].sort((a, b) => a - b));
});
