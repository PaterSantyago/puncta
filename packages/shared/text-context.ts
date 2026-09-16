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
type Transform = (
  text: string,
  initialLineStart: boolean,
  mode?: "local" | "quotes",
) => TextResult;
type Part =
  | { span: Span }
  | { boundary: Boundary }
  | { transform: Transform }
  | { leave: true };

/** Collect original leaves, recognise contiguous text, and return edits to their owners.
 * Neither structural boundaries nor source addresses become output characters. */
export class TextContext {
  readonly sources: Source[] = [];
  readonly edits: Edit[] = [];
  readonly warnings: PunctaWarning[] = [];
  readonly appliedRules: AppliedRule[] = [];
  private readonly parts: Part[] = [];
  private readonly values: string[] = [];

  constructor(private readonly transform: Transform) {}

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
  enter(transform: Transform): void {
    this.parts.push({ transform });
  }

  leave(): void {
    this.parts.push({ leave: true });
  }

  finish(): void {
    const transforms = [this.transform];
    let transform = this.transform;
    let lineStart = true;
    let spans: Span[] = [];
    const flush = () => {
      if (!spans.length) return;
      const text = spans
        .map((span) =>
          this.sources[span.sourceId].text.slice(span.start, span.end),
        )
        .join("");
      const report = transform(text, lineStart, "local");
      if (/[^ \t]/u.test(text)) lineStart = false;
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
        if ("transform" in part) {
          transforms.push(part.transform);
          transform = part.transform;
        } else if ("leave" in part) {
          transforms.pop();
          transform = transforms[transforms.length - 1];
        } else lineStart = part.boundary !== "opaque";
      }
    }
    flush();
    this.finishQuotes();
    this.edits.sort(
      (a, b) =>
        a.ranges[0].sourceId - b.ranges[0].sourceId ||
        a.ranges[0].start - b.ranges[0].start,
    );
    this.warnings.sort((a, b) =>
      a.location.kind === "text" && b.location.kind === "text"
        ? a.location.ranges[0].sourceId - b.location.ranges[0].sourceId ||
          a.location.ranges[0].start - b.location.ranges[0].start
        : 0,
    );
    this.appliedRules.length = 0;
    for (const edit of this.edits)
      for (const ruleId of edit.ruleIds) {
        if (
          !this.appliedRules.some(
            (item) => item.ruleId === ruleId && item.locale === edit.locale,
          )
        )
          this.appliedRules.push({ ruleId, locale: edit.locale });
      }
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

  /** Quotes span line/opaque positions; child scopes own independent depth. Virtual
   * characters exist only in this recognition view, never in sources or output. */
  private finishQuotes(): void {
    const contexts = [
      { transform: this.transform, spans: [] as Span[], text: "" },
    ];
    const flush = (context: (typeof contexts)[number]) => {
      const report = context.transform(context.text, true, "quotes");
      for (const edit of report.edits) {
        const ranges = sourceRanges(
          context.spans,
          edit.ranges[0].start,
          edit.ranges[0].end,
        );
        if (!ranges.length) continue;
        // A quote's final inner-space deletion supersedes ordinary space collapse.
        for (let index = this.edits.length - 1; index >= 0; index--) {
          if (
            this.edits[index].ranges.some((old) =>
              ranges.some(
                (range) =>
                  range.sourceId === old.sourceId &&
                  range.start < old.end &&
                  range.end > old.start,
              ),
            )
          )
            this.edits.splice(index, 1);
        }
        this.edits.push({ ...edit, ranges });
      }
      for (const warning of report.warnings)
        if (warning.location.kind === "text") {
          const ranges = warning.location.ranges.flatMap((range) =>
            sourceRanges(context.spans, range.start, range.end),
          );
          if (ranges.length)
            this.warnings.push({
              ...warning,
              location: { kind: "text", ranges },
            });
        }
      context.spans = [];
      context.text = "";
    };
    const virtual = (context: (typeof contexts)[number], text: string) => {
      context.spans.push({ sourceId: -1, start: 0, end: text.length });
      context.text += text;
    };
    for (const part of splitLines(this.parts, this.sources)) {
      const context = contexts[contexts.length - 1];
      if ("span" in part) {
        context.spans.push(part.span);
        context.text += this.sources[part.span.sourceId].text.slice(
          part.span.start,
          part.span.end,
        );
      } else if ("transform" in part) {
        virtual(context, "\uFFFC");
        contexts.push({ transform: part.transform, spans: [], text: "" });
      } else if ("leave" in part) {
        flush(context);
        contexts.pop();
      } else if (part.boundary === "block") {
        for (const active of contexts) flush(active);
      } else virtual(context, part.boundary === "line" ? "\u2028" : "\uFFFC");
    }
    flush(contexts[0]);
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
      span.sourceId >= 0 &&
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
    if (span.sourceId >= 0 && overlapStart < overlapEnd)
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
