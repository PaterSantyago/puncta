import type {
  AppliedRule,
  Edit,
  Source,
  TextResult,
} from "../core/src/types.js";

/** These boundaries deliberately retain more information than ellipsis needs.
 * Words/bonds stop at all three; quotes may span line/opaque but not block. */
export type Boundary = "line" | "opaque" | "block";
type Span = { sourceId: number; start: number; end: number };
type Part = { span: Span } | { boundary: Boundary };

/** Collect original leaves, recognise contiguous text, and return edits to their owners.
 * Neither structural boundaries nor source addresses become output characters. */
export class TextContext {
  readonly sources: Source[] = [];
  readonly edits: Edit[] = [];
  readonly appliedRules: AppliedRule[] = [];
  private readonly parts: Part[] = [];
  private readonly values: string[] = [];

  constructor(private readonly transform: (text: string) => TextResult) {}

  append(text: string, path: Source["path"]): () => string {
    const sourceId = this.sources.length;
    this.sources.push({ id: sourceId, text, path });
    this.values.push(text);
    let start = 0;
    // A whitespace-only line ends quote context; a single newline does not.
    for (const match of text.matchAll(
      /(?:\r\n|\r|\n)(?:[ \t]*(?:\r\n|\r|\n))*/gu,
    )) {
      this.parts.push({ span: { sourceId, start, end: match.index } });
      this.boundary(/^(?:\r\n|\r|\n)$/u.test(match[0]) ? "line" : "block");
      start = match.index + match[0].length;
    }
    this.parts.push({ span: { sourceId, start, end: text.length } });
    return () => this.values[sourceId];
  }

  boundary(boundary: Boundary): void {
    this.parts.push({ boundary });
  }

  finish(): void {
    let spans: Span[] = [];
    const flush = () => {
      if (!spans.length) return;
      const text = spans
        .map((span) =>
          this.sources[span.sourceId].text.slice(span.start, span.end),
        )
        .join("");
      const report = this.transform(text);
      for (const edit of report.edits) {
        const ranges: Span[] = [];
        let offset = 0;
        const range = edit.ranges[0];
        for (const span of spans) {
          const length = span.end - span.start;
          const start = Math.max(range.start, offset);
          const end = Math.min(range.end, offset + length);
          if (start < end)
            ranges.push({
              sourceId: span.sourceId,
              start: span.start + start - offset,
              end: span.start + end - offset,
            });
          offset += length;
        }
        this.edits.push({ ...edit, ranges });
      }
      for (const rule of report.appliedRules) {
        if (
          !this.appliedRules.some(
            (item) =>
              item.ruleId === rule.ruleId && item.locale === rule.locale,
          )
        )
          this.appliedRules.push(rule);
      }
      spans = [];
    };
    for (const part of this.parts) {
      if ("boundary" in part) flush();
      else spans.push(part.span);
    }
    flush();
    // Apply from right to left so every range keeps its original UTF-16 coordinates.
    for (const edit of [...this.edits].reverse()) {
      for (let index = edit.ranges.length - 1; index >= 0; index--) {
        const range = edit.ranges[index];
        const value = this.values[range.sourceId];
        this.values[range.sourceId] =
          value.slice(0, range.start) +
          (index === 0 ? edit.after : "") +
          value.slice(range.end);
      }
    }
  }
}
