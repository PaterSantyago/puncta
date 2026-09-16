import type { WordEdges } from "../core/src/hyphenation.js";
import type {
  AppliedRule,
  Edit,
  ProtectedRange,
  PunctaWarning,
  Source,
  TextResult,
} from "../core/src/types.js";

/** These boundaries deliberately retain more information than ellipsis needs.
 * Words/bonds stop at all three; quotes may span line/opaque but not block. */
export type Boundary = "line" | "opaque" | "block";
type Span = { sourceId: number; start: number; end: number };
type RecognitionSpan = Span | { virtual: string };
type RecognitionReport = Pick<TextResult, "edits" | "warnings"> & {
  readonly apostrophes?: readonly ProtectedRange[];
};
export interface RecognitionTransform {
  segment(text: string, initialLineStart: boolean): TextResult;
  quotation(text: string): TextResult & RecognitionReport;
  insertions?(
    text: string,
    edits: readonly Edit[],
    edges: WordEdges,
    apostrophes: readonly ProtectedRange[],
  ): Pick<TextResult, "edits" | "warnings">;
}
type Part =
  | { span: Span }
  | { boundary: Boundary }
  | { transform: RecognitionTransform }
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
  private readonly apostrophes: Span[] = [];

  constructor(private readonly transform: RecognitionTransform) {}

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
  enter(transform: RecognitionTransform): void {
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
      const report = transform.segment(text, lineStart);
      if (/[^ \t]/u.test(text)) lineStart = false;
      const projected = projectReport(report, spans);
      this.edits.push(...projected.edits);
      this.warnings.push(...projected.warnings);
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
    this.finishHyphenation();
    this.edits.sort(
      (a, b) =>
        a.ranges[0].sourceId - b.ranges[0].sourceId ||
        a.ranges[0].start - b.ranges[0].start ||
        a.ranges[0].end - b.ranges[0].end,
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

  /** Resolve words on the final typographic view, then return inserted SHY to
   * original leaves. Opaque/scope edges never expose a partial word. */
  private finishHyphenation(): void {
    const transforms = [this.transform];
    let transform = this.transform;
    let spans: Span[] = [];
    let leftOpaque = false;
    const typographyEdits = [...this.edits];
    const flush = (rightOpaque: boolean) => {
      if (spans.length && transform.insertions) {
        const text = spans
          .map((span) =>
            this.sources[span.sourceId].text.slice(span.start, span.end),
          )
          .join("");
        const localEdits = typographyEdits.flatMap((edit) => {
          const local: { start: number; end: number }[] = [];
          let offset = 0;
          for (const span of spans) {
            for (const range of edit.ranges) {
              if (range.sourceId !== span.sourceId) continue;
              if (range.start === range.end) {
                if (range.start >= span.start && range.end <= span.end)
                  local.push({
                    start: offset + range.start - span.start,
                    end: offset + range.end - span.start,
                  });
              } else if (range.start < span.end && range.end > span.start)
                local.push({
                  start:
                    offset + Math.max(range.start, span.start) - span.start,
                  end: offset + Math.min(range.end, span.end) - span.start,
                });
            }
            offset += span.end - span.start;
          }
          return local.length
            ? [
                {
                  ...edit,
                  ranges: [
                    {
                      sourceId: 0,
                      start: local[0].start,
                      end: local[local.length - 1].end,
                    },
                  ],
                },
              ]
            : [];
        });
        let offset = 0;
        const localApostrophes: ProtectedRange[] = [];
        for (const span of spans) {
          for (const mark of this.apostrophes) {
            if (
              span.sourceId === mark.sourceId &&
              mark.start >= span.start &&
              mark.end <= span.end
            )
              localApostrophes.push({
                start: offset + mark.start - span.start,
                end: offset + mark.end - span.start,
              });
          }
          offset += span.end - span.start;
        }
        const report = projectReport(
          transform.insertions(
            text,
            localEdits,
            { leftOpaque, rightOpaque },
            localApostrophes,
          ),
          spans,
        );
        this.edits.push(...report.edits);
        this.warnings.push(...report.warnings);
      }
      spans = [];
    };
    for (const part of splitLines(this.parts, this.sources)) {
      if ("span" in part) spans.push(part.span);
      else {
        const opaque = !("boundary" in part) || part.boundary === "opaque";
        flush(opaque);
        if ("transform" in part) {
          transforms.push(part.transform);
          transform = part.transform;
        } else if ("leave" in part) {
          transforms.pop();
          transform = transforms[transforms.length - 1];
        }
        leftOpaque = opaque;
      }
    }
    flush(false);
  }

  /** Quotes span line/opaque positions; child scopes own independent depth. Virtual
   * characters exist only in this recognition view, never in sources or output. */
  private finishQuotes(): void {
    const contexts = [
      { transform: this.transform, spans: [] as RecognitionSpan[], text: "" },
    ];
    const flush = (context: (typeof contexts)[number]) => {
      const report = projectReport(
        context.transform.quotation(context.text),
        context.spans,
      );
      this.apostrophes.push(...report.apostrophes);
      for (const edit of report.edits) {
        const ranges = edit.ranges;
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
      this.warnings.push(...report.warnings);
      context.spans = [];
      context.text = "";
    };
    const virtual = (context: (typeof contexts)[number], text: string) => {
      context.spans.push({ virtual: text });
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

/** A single provenance projection serves every recognition context. */
function projectReport(
  report: RecognitionReport,
  spans: readonly RecognitionSpan[],
) {
  const edits: Edit[] = [];
  const warnings: PunctaWarning[] = [];
  for (const edit of report.edits) {
    const ranges = edit.ranges.flatMap((range) =>
      sourceRanges(spans, range.start, range.end),
    );
    if (ranges.length) edits.push({ ...edit, ranges });
  }
  for (const warning of report.warnings) {
    if (warning.location.kind !== "text") {
      warnings.push(warning);
      continue;
    }
    const ranges = warning.location.ranges.flatMap((range) =>
      sourceRanges(spans, range.start, range.end),
    );
    if (ranges.length)
      warnings.push({ ...warning, location: { kind: "text", ranges } });
  }
  const apostrophes = (report.apostrophes ?? []).flatMap((range) =>
    sourceRanges(spans, range.start, range.end),
  );
  return { edits, warnings, apostrophes };
}

/** Convert a position in joined accessible text back to separate original leaves. */
function sourceRanges(
  spans: readonly RecognitionSpan[],
  start: number,
  end: number,
): Span[] {
  const ranges: Span[] = [];
  let offset = 0;
  for (const span of spans) {
    if ("virtual" in span) {
      offset += span.virtual.length;
      continue;
    }
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
