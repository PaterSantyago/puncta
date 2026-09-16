import type {
  AppliedRule,
  Edit,
  PunctaWarning,
  Source,
  TextResult,
} from "../core/src/types.js";

/** These boundaries deliberately retain more information than ellipsis needs.
 * Words/bonds stop at all three; quotes may span line/opaque but not block. */
export type Boundary = "line" | "opaque" | "block";
type Span = { sourceId: number; start: number; end: number };
type Transform = (text: string) => TextResult;
type Part = { span: Span } | { boundary: Boundary } | { transform: Transform };

/** Collect original leaves, recognise contiguous text, and return edits to their owners.
 * Neither structural boundaries nor source addresses become output characters. */
export class TextContext {
  readonly sources: Source[] = [];
  readonly edits: Edit[] = [];
  readonly warnings: PunctaWarning[] = [];
  readonly appliedRules: AppliedRule[] = [];
  private readonly parts: Part[] = [];
  private readonly values: string[] = [];

  constructor(private readonly transform: (text: string) => TextResult) {}

  append(text: string, path: Source["path"]): () => string {
    const sourceId = this.sources.length;
    this.sources.push({ id: sourceId, text, path });
    this.values.push(text);
    this.parts.push({ span: { sourceId, start: 0, end: text.length } });
    return () => this.values[sourceId];
  }

  boundary(boundary: Boundary): void {
    this.parts.push({ boundary });
  }

  /** A scope owns its original leaves and interrupts recognition on both sides. */
  use(transform: Transform): void {
    this.parts.push({ transform });
  }

  finish(): void {
    let transform = this.transform;
    let spans: Span[] = [];
    const flush = () => {
      if (!spans.length) return;
      const text = spans
        .map((span) =>
          this.sources[span.sourceId].text.slice(span.start, span.end),
        )
        .join("");
      const report = transform(text);
      for (const edit of report.edits) {
        const ranges: Span[] = [];
        const range = edit.ranges[0];
        ranges.push(...sourceRanges(spans, range.start, range.end));
        this.edits.push({ ...edit, ranges });
      }
      for (const warning of report.warnings) {
        this.warnings.push(
          warning.location.kind === "text"
            ? {
                ...warning,
                location: {
                  kind: "text",
                  ranges: warning.location.ranges.flatMap((range) =>
                    sourceRanges(spans, range.start, range.end),
                  ),
                },
              }
            : warning,
        );
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
    for (const part of splitLines(this.parts, this.sources)) {
      if ("span" in part) spans.push(part.span);
      else {
        flush();
        if ("transform" in part) transform = part.transform;
      }
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

/** Convert a position in joined accessible text back to separate original leaves. */
function sourceRanges(
  spans: readonly Span[],
  start: number,
  end: number,
): Span[] {
  const ranges: Span[] = [];
  let offset = 0;
  for (const span of spans) {
    const length = span.end - span.start;
    // An insertion at a transparent seam belongs to the left nonempty leaf.
    if (
      start === end &&
      length > 0 &&
      start >= offset &&
      start <= offset + length
    )
      return [
        {
          sourceId: span.sourceId,
          start: span.start + start - offset,
          end: span.start + start - offset,
        },
      ];
    const overlapStart = Math.max(start, offset);
    const overlapEnd = Math.min(end, offset + length);
    if (overlapStart < overlapEnd)
      ranges.push({
        sourceId: span.sourceId,
        start: span.start + overlapStart - offset,
        end: span.start + overlapEnd - offset,
      });
    offset += length;
  }
  return ranges;
}

/** Detect CRLF and whitespace-only lines across transparent leaves too. Structural
 * boundaries stop this joining; their word/bond/quote semantics remain distinct. */
function splitLines(
  parts: readonly Part[],
  sources: readonly Source[],
): Part[] {
  const result: Part[] = [];
  let spans: Span[] = [];
  function flush() {
    const text = spans
      .map((span) => sources[span.sourceId].text.slice(span.start, span.end))
      .join("");
    let start = 0;
    for (const match of text.matchAll(
      /(?:\r\n|\r|\n)(?:[ \t]*(?:\r\n|\r|\n))*/gu,
    )) {
      result.push(
        ...sourceRanges(spans, start, match.index).map((span) => ({ span })),
      );
      result.push({
        boundary: /^(?:\r\n|\r|\n)$/u.test(match[0]) ? "line" : "block",
      });
      start = match.index + match[0].length;
    }
    result.push(
      ...sourceRanges(spans, start, text.length).map((span) => ({ span })),
    );
    spans = [];
  }
  for (const part of parts) {
    if ("span" in part) spans.push(part.span);
    else {
      flush();
      result.push(part);
    }
  }
  flush();
  return result;
}
