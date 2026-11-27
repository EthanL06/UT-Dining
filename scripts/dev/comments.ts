import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import ts from 'typescript';

const SCRIPT_EXTENSIONS = /\.(ts|tsx|js|jsx|mjs|cjs|mts|cts)$/;
const CSS_EXTENSIONS = /\.css$/;
const SKIPPED = [
  /^packages\/supabase\/src\/database\.types\.ts$/,
  /^apps\/mobile\/drizzle\//,
  /(^|\/)node_modules\//,
  /\.d\.ts$/,
];
const DIRECTIVE =
  /^(\/\/|\/\*\*?)\s*(biome-ignore|@ts-expect-error|@ts-ignore|@ts-nocheck|@ts-check|eslint-|@jsx|turbo-|prettier-ignore|#region|#endregion)|^\/\/\/\s*<reference|^\/\*\*?\s*@(type|satisfies|typedef)\b/;

interface Range {
  start: number;
  end: number;
}

const isDirective = (text: string) => DIRECTIVE.test(text.trim());

const scriptCommentRanges = (file: string, text: string): Range[] => {
  const kind = file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
  const seen = new Map<number, Range>();
  const add = (range: ts.CommentRange) => {
    const body = text.slice(range.pos, range.end);
    if (isDirective(body)) return;
    seen.set(range.pos, { start: range.pos, end: range.end });
  };
  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node)) return;
    if (ts.isJsxExpression(node) && !node.expression) {
      const inner = text.slice(node.getStart(source) + 1, node.end - 1).trim();
      if (inner && !isDirective(inner)) {
        seen.set(node.getStart(source), { start: node.getStart(source), end: node.end });
      }
      return;
    }
    for (const range of ts.getLeadingCommentRanges(text, node.pos) ?? []) add(range);
    for (const range of ts.getTrailingCommentRanges(text, node.end) ?? []) add(range);
    for (const child of node.getChildren(source)) visit(child);
  };
  visit(source);
  if (text.startsWith('#!')) {
    for (const [pos] of seen) if (pos === 0) seen.delete(pos);
  }
  return [...seen.values()].sort((a, b) => a.start - b.start);
};

const cssCommentRanges = (text: string): Range[] => {
  const ranges: Range[] = [];
  const pattern = /\/\*[\s\S]*?\*\//g;
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    if (!isDirective(match[0]))
      ranges.push({ start: match.index, end: match.index + match[0].length });
  }
  return ranges;
};

const lineOf = (text: string, index: number) => text.slice(0, index).split('\n').length;

const strip = (text: string, ranges: Range[]) => {
  let out = text;
  for (const { start, end } of [...ranges].reverse()) {
    const lineStart = out.lastIndexOf('\n', start - 1) + 1;
    const nextNewline = out.indexOf('\n', end);
    const lineEnd = nextNewline === -1 ? out.length : nextNewline;
    const before = out.slice(lineStart, start);
    const after = out.slice(end, lineEnd);
    if (before.trim() === '' && after.trim() === '') {
      out = out.slice(0, lineStart) + out.slice(nextNewline === -1 ? lineEnd : lineEnd + 1);
    } else {
      out = out.slice(0, start).replace(/[ \t]+$/, '') + out.slice(end);
    }
  }
  return out.replace(/\n{3,}/g, '\n\n');
};

const args = process.argv.slice(2);
const write = args.includes('--write');
const explicit = args.filter((arg) => !arg.startsWith('--'));
const files = (
  explicit.length > 0
    ? explicit
    : execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean)
).filter(
  (file) =>
    (SCRIPT_EXTENSIONS.test(file) || CSS_EXTENSIONS.test(file)) &&
    !SKIPPED.some((pattern) => pattern.test(file)),
);

let found = 0;
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  const ranges = CSS_EXTENSIONS.test(file)
    ? cssCommentRanges(text)
    : scriptCommentRanges(file, text);
  if (ranges.length === 0) continue;
  found += ranges.length;
  if (write) {
    writeFileSync(file, strip(text, ranges));
    console.log(`stripped ${ranges.length} from ${file}`);
  } else {
    for (const { start, end } of ranges) {
      const first = text.slice(start, end).split('\n')[0].trim();
      console.log(`${file}:${lineOf(text, start)}: ${first.slice(0, 100)}`);
    }
  }
}

if (!write && found > 0) {
  console.error(
    `${found} code comments. The repo rule is no code comments: move the context to AGENTS.md, a README or the PR description. node scripts/dev/comments.ts --write removes them.`,
  );
  process.exit(1);
}
