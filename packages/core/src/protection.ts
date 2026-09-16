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
  collect(
    /(?<![\p{L}\p{N}_])(?:[a-z][a-z\d+.-]*:[^\s<>"`]+|www\.[^\s<>"`]+)/giu,
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

/** A typography edit must not create or extend an opaque token which would
 * change the next invocation's recognition context. Compare a multiset so an
 * unchanged neighbouring token does not hide a newly created identical one. */
export function createsTechnicalToken(
  source: string,
  candidate: string,
): boolean {
  const existing = technicalRanges(source).map((range) =>
    source.slice(range.start, range.end),
  );
  return technicalRanges(candidate).some((range) => {
    const index = existing.indexOf(candidate.slice(range.start, range.end));
    if (index < 0) return true;
    existing.splice(index, 1);
    return false;
  });
}
