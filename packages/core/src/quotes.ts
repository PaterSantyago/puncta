import { accessibleParts, technicalRanges } from "./protection.js";
import type { Settings } from "./settings.js";
import type { Edit, ProtectedRange, PunctaWarning, RuleId } from "./types.js";

type Pair = {
  start: number;
  end?: number;
  original: string;
  children: Pair[];
  style?: string;
  candidates?: string[];
};
const closing: Record<string, string> = {
  '"': '"',
  "'": "'",
  "‘": "’",
  "“": "”",
  "«": "»",
};

/** Recognition uses only accessible original text. Opaque positions occupy space,
 * but never supply a delimiter or join the words on either side. */
export function quotes(
  source: string,
  settings: Settings,
  protection: readonly ProtectedRange[] = [],
) {
  const edits: Edit[] = [];
  const warnings: PunctaWarning[] = [];
  const quoteRoles = new Map<number, "open" | "close">();
  if (!settings.enabled) return { edits, warnings, text: "", quoteRoles };
  let text = "";
  let offset = 0;
  for (const accessible of accessibleParts(source, protection)) {
    text += "\uFFFC".repeat(accessible.start - offset);
    let innerOffset = 0;
    for (const part of accessibleParts(
      accessible.text,
      technicalRanges(accessible.text),
    )) {
      text += "\uFFFC".repeat(part.start - innerOffset) + part.text;
      innerOffset = part.start + part.text.length;
    }
    text += "\uFFFC".repeat(accessible.text.length - innerOffset);
    offset = accessible.start + accessible.text.length;
  }
  text += "\uFFFC".repeat(source.length - offset);
  const boundaries = new Set([text.length]);
  for (const segment of new Intl.Segmenter("und", {
    granularity: "grapheme",
  }).segment(text))
    boundaries.add(segment.index);
  function edit(start: number, end: number, after: string, ruleId: RuleId) {
    const before = text.slice(start, end);
    if (before === after || !boundaries.has(start) || !boundaries.has(end))
      return;
    edits.push({
      kind: after ? "replace" : "delete",
      before,
      after,
      locale: settings.locale,
      ruleIds: [ruleId],
      ranges: [{ sourceId: 0, start, end }],
    });
  }
  const enabled = settings.rules.quotes.enabled !== false;
  function warn(start: number, code: string) {
    if (!enabled) return;
    warnings.push({
      code,
      source: "rule",
      message:
        code === "quotes.unpaired"
          ? "Unpaired quote was preserved."
          : "Ambiguous quote was preserved.",
      details: {},
      locale: settings.locale,
      ruleId: "quotes",
      location: {
        kind: "text",
        ranges: [{ sourceId: 0, start, end: start + 1 }],
      },
    });
  }
  const measurementDelimiters = new Set<number>();
  for (const match of text.matchAll(
    /\p{N}+(?:[.,]\p{N}+)?'[ \t]*\p{N}+(?:[.,/]\p{N}+)*(?:[ \t]+\p{N}+\/\p{N}+)?"/gu,
  )) {
    measurementDelimiters.add(match.index + match[0].indexOf("'"));
    measurementDelimiters.add(match.index + match[0].length - 1);
  }
  const roots: Pair[] = [];
  const stack: Pair[] = [];
  function finishParagraph() {
    for (const pair of stack) warn(pair.start, "quotes.unpaired");
    stack.length = 0;
  }
  for (const token of text.matchAll(
    /(?:\r\n|\r(?!\n)|(?<!\r)\n)[ \t]*(?:\r\n|\r(?!\n)|(?<!\r)\n)|["'‘’“”«»]/gu,
  )) {
    const char = token[0];
    const position = token.index;
    if (char.length > 1 || /[\r\n]/u.test(char)) {
      finishParagraph();
      continue;
    }
    if (measurementDelimiters.has(position)) {
      warn(position, "typography.ambiguous");
      continue;
    }
    const before = text.slice(0, position);
    const after = text.slice(position + 1);
    const top = stack.at(-1);
    // Apostrophe recognition is independent of its formatting switch.
    const single = char === "'" || char === "’";
    const internal =
      single && /[\p{L}\p{M}]$/u.test(before) && /^\p{L}/u.test(after);
    const singleQuoteOpen =
      top && (top.original === "'" || top.original === "‘");
    const nextSingle = [...after.matchAll(/['‘’]/gu)].find(
      (match) =>
        !(
          match[0] !== "‘" &&
          /[\p{L}\p{M}]$/u.test(after.slice(0, match.index)) &&
          /^\p{L}/u.test(after.slice(match.index + 1))
        ),
    );
    const laterSingleClose =
      nextSingle !== undefined &&
      nextSingle[0] !== "‘" &&
      !/[\s([{:;¿¡—–"'‘“«\uFFFC]$/u.test(after.slice(0, nextSingle.index));
    const possessive =
      single &&
      /[sS]$/u.test(before) &&
      /^(?:\s|$)/u.test(after) &&
      (!singleQuoteOpen || laterSingleClose);
    if (internal || possessive) {
      if (settings.rules.apostrophes.enabled !== false)
        edit(position, position + 1, "’", "apostrophes");
      continue;
    }
    if (
      /[\p{N}]$/u.test(before) &&
      (char === "'" || char === '"') &&
      (!top || closing[top.original] !== char)
    ) {
      warn(position, "typography.ambiguous");
      continue;
    }
    const canOpen =
      !before ||
      /[\s([{:;¿¡—–"'‘“«\uFFFC]$/u.test(before) ||
      /--$/u.test(before);
    const canClose =
      !after ||
      /^[\s.,;:!?\])}"'’”»—–\uFFFC]/u.test(after) ||
      /^--/u.test(after);
    if (top && closing[top.original] === char && canClose) {
      quoteRoles.set(position, "close");
      top.end = position;
      stack.pop();
    } else if (closing[char] && canOpen) {
      quoteRoles.set(position, "open");
      const pair: Pair = { start: position, original: char, children: [] };
      (top ? top.children : roots).push(pair);
      stack.push(pair);
    } else
      warn(position, canClose ? "quotes.unpaired" : "typography.ambiguous");
  }
  finishParagraph();
  const normalise = settings.rules.quotes.normalizeExisting !== false;
  const fixed = (pair: Pair) =>
    !normalise && pair.original !== '"' && pair.original !== "'";
  const palette =
    settings.locale === "en-gb" ? ["‘’", "“”"] : ["«»", "“”", "‘’"];
  // Propagate preserved-descendant constraints before choosing the preferred style.
  // A greedy depth-first choice can otherwise reject the only compatible solution.
  function candidates(pair: Pair, depth: number): string[] {
    if (pair.end === undefined) return [];
    const own = fixed(pair)
      ? [pair.original + closing[pair.original]]
      : palette.filter((style) => depth === 0 || style !== "«»");
    const children = pair.children.map((child) => candidates(child, depth + 1));
    pair.candidates = own.filter((style) =>
      children.every((styles, index) =>
        styles.some(
          (childStyle) =>
            normalise ||
            (fixed(pair) && fixed(pair.children[index])) ||
            childStyle !== style,
        ),
      ),
    );
    return pair.candidates;
  }
  function choose(pair: Pair, depth: number, parent?: Pair): boolean {
    if (pair.end === undefined) return false;
    const preferred =
      settings.locale === "en-gb"
        ? palette[depth % 2]
        : depth === 0
          ? palette[0]
          : palette[1 + ((depth - 1) % 2)];
    const available = (pair.candidates ?? []).filter(
      (style) =>
        normalise ||
        !parent ||
        (fixed(parent) && fixed(pair)) ||
        style !== parent.style,
    );
    pair.style = available.includes(preferred)
      ? preferred
      : available.length === 1
        ? available[0]
        : undefined;
    if (!pair.style) {
      warn(pair.start, "typography.ambiguous");
      return false;
    }
    return pair.children.every((child) => choose(child, depth + 1, pair));
  }
  function apply(pair: Pair) {
    if (pair.end === undefined || !pair.style) return;
    if (enabled && !fixed(pair)) {
      edit(pair.start, pair.start + 1, pair.style[0], "quotes");
      edit(pair.end, pair.end + 1, pair.style[1], "quotes");
    }
    if (
      settings.locale === "es-es" &&
      settings.rules.spaces.enabled !== false
    ) {
      const inside = text.slice(pair.start + 1, pair.end);
      const leading = /^ +/u.exec(inside);
      const trailing = / +$/u.exec(inside);
      if (leading)
        edit(pair.start + 1, pair.start + 1 + leading[0].length, "", "spaces");
      if (
        trailing &&
        trailing.index >= (leading?.[0].length ?? 0) &&
        !/[\r\n\u2028][ \t]*$/u.test(inside.slice(0, trailing.index))
      )
        edit(pair.start + 1 + trailing.index, pair.end, "", "spaces");
    }
    pair.children.forEach(apply);
  }
  for (const root of roots) {
    candidates(root, 0);
    if (choose(root, 0)) apply(root);
  }
  return { edits, warnings, text, quoteRoles };
}
