// Monospace ASCII tables for chat (Slack does not render Markdown tables).
const clean = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();
const clip = (s, w) => (s.length <= w ? s : `${s.slice(0, Math.max(0, w - 1))}…`);

/** Aligned, plain-text table: padded columns, dashed header underline, long cells cut with an ellipsis. */
export function asciiTable(headers, rows, { maxWidth = 60 } = {}) {
  const gap = 2;
  const head = headers.map(clean);
  const body = rows.map((r) => head.map((_, i) => clean(r[i])));
  const widths = head.map((h, i) => Math.max(h.length, ...body.map((r) => r[i].length)));
  const total = () => widths.reduce((a, b) => a + b, 0) + gap * (widths.length - 1);
  while (total() > maxWidth) {
    let w = 0;
    widths.forEach((x, i) => { if (x > widths[w]) w = i; });
    if (widths[w] <= 4) break;
    widths[w] -= 1;
  }
  const line = (cells) => cells.map((c, i) => clip(c, widths[i]).padEnd(widths[i])).join(' '.repeat(gap)).trimEnd();
  return [line(head), widths.map((w) => '-'.repeat(w)).join(' '.repeat(gap)), ...body.map(line)].join('\n');
}

/** Wrap text in a code fence so chat renders it monospace. */
export const fence = (text) => `\`\`\`\n${text}\n\`\`\``;
