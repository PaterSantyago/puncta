import { invalidOption, PunctaConfigError } from "./config.js";
import type { ProtectedRange } from "./types.js";

/** Validate against the original UTF-16 source before sorting a private copy. */
export function protectedRanges(
  source: string,
  input: readonly ProtectedRange[] | undefined,
): ProtectedRange[] {
  if (input === undefined) return [];
  if (!Array.isArray(input)) invalidOption(["protect"], "type");
  const boundaries = new Set([0, source.length]);
  for (const segment of new Intl.Segmenter("und", {
    granularity: "grapheme",
  }).segment(source))
    boundaries.add(segment.index);
  const ranges: ProtectedRange[] = [];
  for (const [index, range] of input.entries()) {
    if (
      !range ||
      typeof range !== "object" ||
      Array.isArray(range) ||
      Object.keys(range).some((key) => key !== "start" && key !== "end") ||
      !Number.isInteger(range.start) ||
      !Number.isInteger(range.end) ||
      range.start < 0 ||
      range.start > range.end ||
      range.end > source.length ||
      !boundaries.has(range.start) ||
      !boundaries.has(range.end)
    )
      throw new PunctaConfigError(
        "protect.invalid-range",
        "Protection must use valid original grapheme boundaries.",
        { index },
        ["protect", index],
      );
    if (range.start !== range.end)
      ranges.push({ start: range.start, end: range.end });
  }
  return mergeRanges(ranges);
}

function mergeRanges(ranges: ProtectedRange[]): ProtectedRange[] {
  ranges.sort((a, b) => a.start - b.start || a.end - b.end);
  const result: ProtectedRange[] = [];
  for (const range of ranges) {
    const previous = result.at(-1);
    if (previous && range.start <= previous.end)
      result[result.length - 1] = {
        start: previous.start,
        end: Math.max(previous.end, range.end),
      };
    else result.push(range);
  }
  return result;
}

/** Protection is an opaque gap, never a deletion that joins its two sides.
 * Ranges must be valid, sorted and merged by protectedRanges/technicalRanges. */
export function accessibleParts(
  source: string,
  ranges: readonly ProtectedRange[],
): { text: string; start: number }[] {
  const parts: { text: string; start: number }[] = [];
  let start = 0;
  for (const range of ranges) {
    if (start < range.start)
      parts.push({ text: source.slice(start, range.start), start });
    start = range.end;
  }
  if (start < source.length) parts.push({ text: source.slice(start), start });
  return parts;
}

/** Recognise only the agreed technical forms, in accessible joined text. URL
 * bodies stay conservative: punctuation may belong to a path/query/fragment. */
export function technicalRanges(source: string): ProtectedRange[] {
  const ranges: ProtectedRange[] = [];
  function collect(
    pattern: RegExp,
    accepts: (token: string) => boolean = () => true,
  ) {
    for (const match of source.matchAll(pattern))
      if (accepts(match[0]))
        ranges.push({ start: match.index, end: match.index + match[0].length });
  }
  // A discretionary break inside a word cannot expose a URL prefix. Look
  // through SHY only at this boundary; a leading SHY does not hide a real URL.
  collect(
    /(?<![\p{L}\p{M}\p{N}_]\u00ad*)(?:[a-z][a-z\d+.-]*:[^\s<>"`]+|www\.[^\s<>"`]+)/giu,
  );
  collect(
    /"(?:[^"\\\r\n]|\\[^\r\n])*"@[a-z\d](?:[a-z\d-]*[a-z\d])?(?:\.[a-z\d](?:[a-z\d-]*[a-z\d])?)+(?![\w-])/giu,
  );
  collect(
    /(?<![\w.+-])[\w.!#$%&'*+/=?^`{|}~-]+@[a-z\d](?:[a-z\d-]*[a-z\d])?(?:\.[a-z\d](?:[a-z\d-]*[a-z\d])?)+(?![\w-])/giu,
  );
  collect(/(?<![\w.])(?:\d{1,3}\.){3}\d{1,3}(?![\w.])/gu, (token) =>
    token.split(".").every((part) => Number(part) <= 255),
  );
  collect(/(?<![\w:])[a-f\d:]*:[a-f\d:.]+(?![\w:])/giu, (token) => {
    try {
      return new URL(`http://[${token}]/`).hostname.length > 0;
    } catch {
      return false;
    }
  });
  collect(/(?<![\w.])v\d+(?:\.\d+){2,}(?:[-+][a-z\d.-]+)?(?![\w.])/giu);
  return mergeRanges(ranges);
}

/** An edit must not create, change or remove a technical token in the word
 * view used by rule lookahead. Otherwise one group could release another
 * group's ambiguity guard on the next call. Compare multisets so an unchanged
 * neighbouring token cannot hide a changed identical one. */
export function changesTechnicalContext(
  source: string,
  candidate: string,
): boolean {
  // SHY is a discretionary boundary inside a word. Ignoring it in this
  // lookahead keeps a guarded punctuation edit guarded after insertion too.
  source = source.replaceAll("\u00ad", "");
  candidate = candidate.replaceAll("\u00ad", "");
  const existing = technicalRanges(source).map((range) =>
    source.slice(range.start, range.end),
  );
  const changed = technicalRanges(candidate).some((range) => {
    const index = existing.indexOf(candidate.slice(range.start, range.end));
    if (index < 0) return true;
    existing.splice(index, 1);
    return false;
  });
  return changed || existing.length > 0;
}

interface TechnicalChange extends ProtectedRange {
  after: string;
}

/** Hypothetical edits use original UTF-16 coordinates. The word view and its
 * whitespace boundaries are indexed once, rather than rebuilding the complete
 * text for every interval. Except for quoted email local parts, recognised
 * technical forms cannot cross whitespace. Keep a delimiter on each side of a
 * local window so lookarounds see the same boundary as in the complete source.
 * Quoted email remains a conservative full-context check, including its spaces. */
export function technicalContext(source: string) {
  const hasShy = source.includes("\u00ad");
  const text = hasShy ? source.replaceAll("\u00ad", "") : source;
  const positions = hasShy ? new Uint32Array(source.length + 1) : undefined;
  if (positions) {
    for (let index = 0; index < source.length; index++)
      positions[index + 1] =
        positions[index] + (source[index] === "\u00ad" ? 0 : 1);
  }
  const position = (offset: number) => positions?.[offset] ?? offset;
  const whitespace = [...text.matchAll(/\s/gu)].map((match) => match.index);
  const quotedEmail = text.includes('"') && text.includes("@");
  let hidden: ProtectedRange[] | undefined;

  function boundaryIndex(offset: number) {
    let low = 0;
    let high = whitespace.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (whitespace[middle] < offset) low = middle + 1;
      else high = middle;
    }
    return low;
  }

  function window(start: number, end: number, full = quotedEmail) {
    return full
      ? { start: 0, end: text.length }
      : {
          start: whitespace[boundaryIndex(start) - 1] ?? 0,
          end: Math.min(
            text.length,
            (whitespace[boundaryIndex(end)] ?? text.length) + 1,
          ),
        };
  }

  return {
    touchesHiddenToken(start: number, end: number): boolean {
      if (!hasShy) return false;
      hidden ??= technicalRanges(text);
      const left = position(start);
      const right = position(end);
      return hidden.some((token) => token.start < right && token.end > left);
    },
    joinsToken(start: number, end: number): boolean {
      const left = position(start);
      const right = position(end);
      const span = window(left, right);
      const candidate =
        text.slice(span.start, left) + text.slice(right, span.end);
      const join = left - span.start;
      return technicalRanges(candidate).some(
        (token) => token.start < join && token.end > join,
      );
    },
    splitsToken(offset: number): boolean {
      const at = position(offset);
      const span = window(at, at);
      const candidate = `${text.slice(span.start, at)} ${text.slice(at, span.end)}`;
      const split = at - span.start;
      return technicalRanges(candidate).some(
        (token) => token.end === split || token.start === split + 1,
      );
    },
    changesTokens(changes: readonly TechnicalChange[]): boolean {
      if (changes.length === 0) return false;
      const ordered = [...changes].sort(
        (a, b) => b.start - a.start || b.end - a.end,
      );
      const start = position(ordered[ordered.length - 1].start);
      const end = ordered.reduce(
        (right, change) => Math.max(right, position(change.end)),
        start,
      );
      const span = window(
        start,
        end,
        quotedEmail || ordered.some((change) => /["@]/u.test(change.after)),
      );
      const original = text.slice(span.start, span.end);
      let candidate = original;
      for (const change of ordered) {
        const left = position(change.start) - span.start;
        const right = position(change.end) - span.start;
        candidate =
          candidate.slice(0, left) +
          change.after.replaceAll("\u00ad", "") +
          candidate.slice(right);
      }
      return changesTechnicalContext(original, candidate);
    },
  };
}
