import { rangeIndex } from "./ranges.js";
import type { Settings } from "./settings.js";
import type { ProtectedRange } from "./types.js";

interface GroupingResult {
  changes: ProtectedRange[];
  preserved: ProtectedRange[];
  ambiguous: ProtectedRange[];
}

/** Recognize a complete standalone candidate before planning separator edits.
 * Ranges and known number bonds remain owned by their recognizers. */
export function digitGrouping(
  text: string,
  settings: Settings,
  excluded: readonly ProtectedRange[],
): GroupingResult {
  const changes: ProtectedRange[] = [];
  const preserved: ProtectedRange[] = [];
  const ambiguous: ProtectedRange[] = [];
  if (!settings.rules.digitGrouping.enabled)
    return { changes, preserved, ambiguous };
  // Cleanup must not turn separate numbers into one grouped candidate next time.
  for (const match of text.matchAll(
    /(?<=\p{N})[ \u00a0\u2009\u202f]{2,}(?=\p{N})/gu,
  ))
    preserved.push({ start: match.index, end: match.index + match[0].length });
  const excludedIndex = rangeIndex(text.length, excluded);
  const grammar =
    settings.locale === "en-gb"
      ? /^([+−-]?)([0-9]+|[0-9]{1,3}(?:,[0-9]{3})+|[0-9]{1,3}(?:[ \u00a0\u2009\u202f][0-9]{3})+)(?:\.[0-9]+)?$/u
      : /^([+−-]?)([0-9]+|[0-9]{1,3}(?:[ \u00a0\u2009\u202f][0-9]{3})+)(?:[.,][0-9]+)?$/u;
  const tokens = [...text.matchAll(/[^\s;!?¿¡()[\]{}"'“”‘’«»\uFFFC]+/gu)];
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    // A bare colon only belongs to a construction consumed from its left
    // number. Starting from it would swallow the number after a prose label.
    if (token[0] === ":") continue;
    let last = token;
    while (index + 1 < tokens.length) {
      const next = tokens[index + 1];
      if (
        !connectsNumberTokens(
          last[0],
          text.slice(last.index + last[0].length, next.index),
          next[0],
        )
      )
        break;
      last = next;
      index++;
    }
    const candidate = text
      .slice(token.index, last.index + last[0].length)
      .replace(/[.,:…]+$/u, "");
    const end = token.index + candidate.length;
    if (excludedIndex.overlaps(token.index, end)) continue;
    // Missing-integer forms are expected skips; punctuation cleanup must not
    // split their leading decimal marker from the digit tail on a later pass.
    if (/^[+−-]?[.,]\p{N}/u.test(candidate)) {
      preserved.push({ start: token.index, end });
      continue;
    }
    const match = grammar.exec(candidate);
    if (!match) {
      // Structural exclusions and unsupported digits/identifiers take priority
      // over an apparently malformed numeric fragment within them.
      if (!/^[+−-]?[0-9][0-9., \u00a0\u2009\u202f]*$/u.test(candidate))
        continue;
      const unsigned = candidate.replace(/^[+−-]/u, "");
      preserved.push({ start: token.index, end });
      const integerDigits = unsigned
        .split(settings.locale === "en-gb" ? /\./u : /[.,]/u, 1)[0]
        .replace(/[, \u00a0\u2009\u202f]/gu, "");
      if (
        (integerDigits.length > 1 && integerDigits.startsWith("0")) ||
        /^[0-9]+(?:\.[0-9]+){2,}$/u.test(unsigned)
      )
        continue;
      ambiguous.push({ start: token.index, end });
      continue;
    }
    const integer = match[2];
    const digits = integer.replace(/[, \u00a0\u2009\u202f]/gu, "");
    preserved.push({ start: token.index, end });
    if (digits.length > 1 && digits.startsWith("0")) continue;
    if (digits.length < Number(settings.rules.digitGrouping.minDigits))
      continue;
    const start = token.index + match[1].length;
    if (digits.length !== integer.length) {
      if (!settings.rules.digitGrouping.normalizeExisting) continue;
      for (const separator of integer.matchAll(/[, \u00a0\u2009]/gu))
        changes.push({
          start: start + separator.index,
          end: start + separator.index + 1,
        });
    } else {
      for (let offset = integer.length - 3; offset > 0; offset -= 3)
        changes.push({ start: start + offset, end: start + offset });
    }
  }
  return { changes, preserved, ambiguous };
}

/** A group-space or separated operator still connects a numerical construction.
 * Terminal commas/periods followed by space are instead list/sentence boundaries. */
function connectsNumberTokens(
  left: string,
  gap: string,
  right: string,
): boolean {
  if (!/^[ \t\u00a0\u2009\u202f()[\]{}]*$/u.test(gap)) return false;
  // A comma/period directly after a number ends it before any next token,
  // including a missing-integer decimal or signed item in the list.
  if (gap.length > 0 && /\p{N}[.,]$/u.test(left)) return false;
  if (
    (/\p{N}$/u.test(left) && /^:/u.test(right)) ||
    ((left === ":" || /\p{N}:$/u.test(left)) && /^\p{N}/u.test(right))
  )
    return true;
  if (/[+−–*/=×÷^%-]$/u.test(left) || /^[+−–*/=×÷^%-]/u.test(right))
    return true;
  if (!/^[ \u00a0\u2009\u202f]+$/u.test(gap)) return false;
  return (
    (/\p{N}$/u.test(left) && /^[.,]?\p{N}/u.test(right) && gap.length === 1) ||
    /^[.,]/u.test(right) ||
    /^[.,]$/u.test(left) ||
    /\p{N}:$/u.test(left)
  );
}
