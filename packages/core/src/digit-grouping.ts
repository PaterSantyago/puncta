import { rangeIndex } from "./ranges.js";
import type { Settings } from "./settings.js";
import type { ProtectedRange } from "./types.js";

/** Accept complete standalone tokens, never a digit prefix or suffix of a
 * notation whose recognition belongs to a later grouping slice. */
export function digitGrouping(
  text: string,
  settings: Settings,
  excluded: readonly ProtectedRange[],
): { insertions: number[]; preserved: ProtectedRange[] } {
  const insertions: number[] = [];
  const preserved: ProtectedRange[] = [];
  if (!settings.rules.digitGrouping.enabled) return { insertions, preserved };
  // Cleanup must not turn separate numbers into one grouped candidate next time.
  for (const match of text.matchAll(/(?<=\p{N}) {2,}(?=\p{N})/gu))
    preserved.push({ start: match.index, end: match.index + match[0].length });
  const excludedIndex = rangeIndex(text.length, excluded);
  const grammar =
    settings.locale === "en-gb"
      ? /^([+−-]?)([0-9]+)(?:\.[0-9]+)?$/u
      : /^([+−-]?)([0-9]+)(?:[.,][0-9]+)?$/u;
  const tokens = [...text.matchAll(/[^\s;!?¿¡()[\]{}"'“”‘’«»\uFFFC]+/gu)];
  for (const [index, token] of tokens.entries()) {
    const end = token.index + token[0].length;
    if (excludedIndex.overlaps(token.index, end)) continue;
    const previous = tokens[index - 1];
    const next = tokens[index + 1];
    if (
      (previous &&
        connectsNumberTokens(
          previous[0],
          text.slice(previous.index + previous[0].length, token.index),
          token[0],
        )) ||
      (next &&
        connectsNumberTokens(token[0], text.slice(end, next.index), next[0]))
    )
      continue;
    const match = grammar.exec(token[0].replace(/[.,:…]+$/u, ""));
    if (!match) continue;
    const integer = match[2];
    if (integer.length > 1 && integer.startsWith("0")) continue;
    if (integer.length < Number(settings.rules.digitGrouping.minDigits))
      continue;
    const start = token.index + match[1].length;
    for (let offset = integer.length - 3; offset > 0; offset -= 3)
      insertions.push(start + offset);
  }
  return { insertions, preserved };
}

/** A group-space or separated operator still connects a numerical construction.
 * Terminal commas/periods followed by space are instead list/sentence boundaries. */
function connectsNumberTokens(
  left: string,
  gap: string,
  right: string,
): boolean {
  if (!/^[ \u00a0\u2009\u202f()[\]{}]*$/u.test(gap)) return false;
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
