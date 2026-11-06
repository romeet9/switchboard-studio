// Pure, synchronous lint rules over a Figma node tree in the REST JSON shape
// (the `document` of a /files/:key/nodes entry). No network, no I/O.
//
// Rules: unbound-paint, unbound-spacing, text-style, non-library-instance,
// contrast, small-target.
//
// Instance internals: the REST API cannot tell an override from a value the
// main component owns, so for INSTANCE subtrees we SKIP the binding and
// text-style rules (unbound-paint, unbound-spacing, text-style). Contrast and
// small-target still look inside instances because they measure what renders.
//
// REST shape assumptions (see the report in the task): paint.boundVariables.color
// (or node.boundVariables.fills[i]) marks a bound paint; node.styles.fill /
// .stroke / .text hold style ids; components map entries carry `remote`.
import { walk } from './figma.js';

export const SEVERITY_ORDER = { blocker: 0, major: 1, minor: 2 };
export const SMALL_TARGET_RE = /button|checkbox|radio|switch|toggle|link|icon.?button|\btabs?\b/i;
export const MIN_TARGET = 24;

const FONT_BINDINGS = ['fontFamily', 'fontStyle', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing'];
const SPACING_PROPS = ['itemSpacing', 'counterAxisSpacing', 'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom'];
const RADIUS_KEYS = ['cornerRadius', 'topLeftRadius', 'topRightRadius', 'bottomRightRadius', 'bottomLeftRadius'];
const CORNER_ORDER = ['topLeftRadius', 'topRightRadius', 'bottomRightRadius', 'bottomLeftRadius']; // rectangleCornerRadii order

// ---------- colour maths ----------

const toByte = (v) => Math.round(Math.min(1, Math.max(0, v)) * 255);

export function toHex({ r, g, b }) {
  return '#' + [r, g, b].map((v) => toByte(v).toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** WCAG 2.x relative luminance of a {r,g,b} colour with 0..1 channels. */
export function luminance({ r, g, b }) {
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrastRatio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Alpha-composite fg (with alpha) over an opaque bg. */
export function composite(fg, alpha, bg) {
  return {
    r: fg.r * alpha + bg.r * (1 - alpha),
    g: fg.g * alpha + bg.g * (1 - alpha),
    b: fg.b * alpha + bg.b * (1 - alpha),
  };
}

const WHITE = { r: 1, g: 1, b: 1 };

// ---------- paint helpers ----------

const visiblePaints = (node, prop) =>
  (Array.isArray(node[prop]) ? node[prop] : []).map((paint, index) => ({ paint, index })).filter(({ paint }) => paint.visible !== false);

/** The topmost visible paint of a node (Figma paints a fills array bottom to top). */
function topPaint(node) {
  const list = visiblePaints(node, 'fills');
  return list.length ? list[list.length - 1].paint : null;
}

function paintAlpha(paint, node) {
  return (paint.color?.a ?? 1) * (paint.opacity ?? 1) * (node.opacity ?? 1);
}

function isPaintBound(node, prop, index, paint) {
  if (paint.boundVariables?.color) return true;
  const nodeLevel = node.boundVariables?.[prop];
  if (Array.isArray(nodeLevel) && nodeLevel[index]) return true;
  return false;
}

const hasFontBinding = (node) => FONT_BINDINGS.some((k) => node.boundVariables?.[k]);

/** Nearest ancestor background: { color } (over white), or { unknown: true } if it is not a solid paint, or null. */
function findBackground(parents) {
  for (let i = parents.length - 1; i >= 0; i--) {
    const p = parents[i];
    const paint = topPaint(p);
    if (!paint) continue;
    if (paint.type !== 'SOLID') return { unknown: true };
    return { color: composite(paint.color, paintAlpha(paint, p), WHITE) };
  }
  return null;
}

const pct = (num, den) => (den > 0 ? Math.round((num / den) * 1000) / 10 : null);

/**
 * Lint one node tree.
 * @param {object} root  Figma node (REST shape), usually a frame.
 * @param {object} [ctx]
 * @param {object} [ctx.components]  The `components` map from the same API response, keyed by componentId.
 * @param {Set<string>} [ctx.libraryKeys]  Component keys of the design-system library; when given, a
 *   remote component whose key is not in the set counts as "another library".
 * @returns {{totals: object, scores: object, issues: object[], notes: string[]}}
 */
export function lintTree(root, { components = {}, libraryKeys = null } = {}) {
  const totals = {
    nodes: 0, paints: 0, boundPaints: 0,
    spacingProps: 0, boundSpacingProps: 0,
    texts: 0, styledTexts: 0,
    instances: 0, libraryInstances: 0, localInstances: 0, foreignInstances: 0, unknownInstances: 0,
    frames: 0, groups: 0,
    contrastChecked: 0, contrastFails: 0, contrastSkipped: 0,
    smallTargets: 0,
  };
  const issues = [];
  const add = (rule, severity, node, parents, detail) => issues.push({
    rule, severity, nodeId: node.id, nodeName: node.name,
    path: [...parents, node].map((n) => n.name).join(' > '), detail,
  });

  walk(root, (node, parents) => {
    if (node.visible === false) return false;
    totals.nodes++;
    const insideInstance = parents.some((p) => p.type === 'INSTANCE');
    const ownedHere = !insideInstance && node.type !== 'INSTANCE';

    if (!insideInstance) {
      if (node.type === 'FRAME') totals.frames++;
      if (node.type === 'GROUP') totals.groups++;
    }

    // (a) paints
    if (ownedHere) {
      const unbound = [];
      for (const [prop, styleKey, label] of [['fills', 'fill', 'fill'], ['strokes', 'stroke', 'stroke']]) {
        if (prop === 'strokes' && node.strokeWeight === 0) continue;
        const styled = Boolean(node.styles?.[styleKey]);
        for (const { paint, index } of visiblePaints(node, prop)) {
          if (paint.type !== 'SOLID') continue;
          totals.paints++;
          if (styled || isPaintBound(node, prop, index, paint)) totals.boundPaints++;
          else unbound.push(`${label} ${toHex(paint.color)}`);
        }
      }
      if (unbound.length) add('unbound-paint', 'blocker', node, parents, `${unbound.join(', ')} not bound to a variable or style`);
    }

    // (b) spacing and radius on auto-layout frames
    if (ownedHere && node.layoutMode && node.layoutMode !== 'NONE') {
      const bv = node.boundVariables ?? {};
      const unbound = [];
      const check = (label, value, isBound) => {
        if (!(value > 0)) return;
        totals.spacingProps++;
        if (isBound) totals.boundSpacingProps++;
        else unbound.push(`${label} ${value}`);
      };
      for (const prop of SPACING_PROPS) check(prop, node[prop], Boolean(bv[prop]));
      if (Array.isArray(node.rectangleCornerRadii)) {
        node.rectangleCornerRadii.forEach((v, i) => check(CORNER_ORDER[i], v, Boolean(bv[CORNER_ORDER[i]] || bv.cornerRadius || bv.rectangleCornerRadii)));
      } else {
        check('cornerRadius', node.cornerRadius, RADIUS_KEYS.some((k) => bv[k]));
      }
      if (unbound.length) add('unbound-spacing', 'major', node, parents, `${unbound.join(', ')} not bound to a variable`);
    }

    // (c) text styles
    if (node.type === 'TEXT' && !insideInstance) {
      totals.texts++;
      if (node.styles?.text || hasFontBinding(node)) totals.styledTexts++;
      else {
        const s = node.style ?? {};
        const font = [s.fontFamily, s.fontSize && `${s.fontSize}px`].filter(Boolean).join(' ');
        add('text-style', 'blocker', node, parents, `no text style${font ? ` (${font})` : ''}`);
      }
    }

    // (d) instances: library vs hand-built
    if (node.type === 'INSTANCE' && !insideInstance) {
      totals.instances++;
      const comp = components[node.componentId];
      const label = comp?.name ?? node.name;
      if (!comp) totals.unknownInstances++;
      else if (comp.remote !== true) {
        totals.localInstances++;
        add('non-library-instance', 'blocker', node, parents, `instance of local component "${label}" (hand-built, not from the library)`);
      } else if (libraryKeys && comp.key && !libraryKeys.has(comp.key)) {
        totals.foreignInstances++;
        add('non-library-instance', 'blocker', node, parents, `instance of "${label}" from a library other than the design system`);
      } else totals.libraryInstances++;
    }

    // (e) contrast (looks inside instances: it measures what renders)
    if (node.type === 'TEXT') {
      const paint = topPaint(node);
      if (paint?.type === 'SOLID') {
        const bg = findBackground(parents);
        if (!bg || bg.unknown) totals.contrastSkipped++;
        else {
          const fg = composite(paint.color, paintAlpha(paint, node), bg.color);
          const ratio = contrastRatio(fg, bg.color);
          const size = node.style?.fontSize ?? 0;
          const weight = node.style?.fontWeight ?? 400;
          const large = size >= 24 || (size >= 18.66 && weight >= 700);
          const need = large ? 3 : 4.5;
          totals.contrastChecked++;
          if (ratio < need) {
            totals.contrastFails++;
            add('contrast', ratio < 3 ? 'blocker' : 'major', node, parents,
              `${ratio.toFixed(2)}:1, needs ${need}:1 (${toHex(fg)} on ${toHex(bg.color)}${large ? ', large text' : ''})`);
          }
        }
      } else totals.contrastSkipped++;
    }

    // (f) small targets
    if (node.type === 'INSTANCE' && node.absoluteBoundingBox) {
      const compName = components[node.componentId]?.name ?? '';
      if (SMALL_TARGET_RE.test(node.name) || SMALL_TARGET_RE.test(compName)) {
        const { width, height } = node.absoluteBoundingBox;
        if (width < MIN_TARGET || height < MIN_TARGET) {
          // Ids like "I5:1652;144:598" are nested inside another library
          // instance (e.g. a Checkbox inside a Table cell, an icon inside an
          // Alert). The parent component owns their size and often the real
          // hit area, so they are reported as minor and kept out of the headline.
          if (String(node.id).startsWith('I')) {
            totals.smallTargetsInLibrary = (totals.smallTargetsInLibrary ?? 0) + 1;
            add('small-target', 'minor', node, parents, `${round(width)}x${round(height)} px inside a library component, minimum ${MIN_TARGET}x${MIN_TARGET}`);
          } else {
            totals.smallTargets++;
            add('small-target', 'major', node, parents, `${round(width)}x${round(height)} px, minimum ${MIN_TARGET}x${MIN_TARGET}`);
          }
        }
      }
    }
    return true;
  });

  const ruleOrder = ['unbound-paint', 'unbound-spacing', 'text-style', 'non-library-instance', 'contrast', 'small-target'];
  const indexed = issues.map((issue, i) => ({ issue, i }));
  indexed.sort((a, b) =>
    SEVERITY_ORDER[a.issue.severity] - SEVERITY_ORDER[b.issue.severity] ||
    ruleOrder.indexOf(a.issue.rule) - ruleOrder.indexOf(b.issue.rule) || a.i - b.i);

  const byRule = {};
  for (const issue of issues) byRule[issue.rule] = (byRule[issue.rule] ?? 0) + 1;

  const libraryDen = totals.libraryInstances + totals.localInstances + totals.foreignInstances;
  return {
    totals: { ...totals, byRule },
    scores: {
      variableBindingPct: pct(totals.boundPaints + totals.boundSpacingProps, totals.paints + totals.spacingProps),
      textStylesPct: pct(totals.styledTexts, totals.texts),
      libraryInstancesPct: pct(totals.libraryInstances, libraryDen),
    },
    issues: indexed.map((x) => x.issue),
    notes: [
      'Instance internals are skipped for unbound-paint, unbound-spacing and text-style (REST cannot separate overrides from what the main component owns). Contrast and small-target still inspect them.',
      'boundPaints counts paints bound to a variable or covered by a fill/stroke style.',
    ],
  };
}

const round = (n) => Math.round(n * 10) / 10;
