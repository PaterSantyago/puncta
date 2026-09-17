import type { NumberBond } from "./number-bonds.js";
import type { Settings } from "./settings.js";
import type { ProtectedRange } from "./types.js";

interface GroupingResult {
  changes: ProtectedRange[];
  preserved: ProtectedRange[];
  ambiguous: ProtectedRange[];
}

/** Recognize a complete numeric candidate before planning separator edits.
 * Known designations come from the same catalogue as exterior number bonds. */
export function digitGrouping(
  text: string,
  settings: Settings,
  bonds: readonly NumberBond[],
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
  // Hide only recognized designations, retaining original numeric coordinates.
  const characters = text.split("");
  for (const { designation } of bonds)
    characters.fill("\uFFFC", designation.start, designation.end);
  const numericText = characters.join("");
  const grammar =
    settings.locale === "en-gb"
      ? /^([+−-]?)([0-9]+|[0-9]{1,3}(?:,[0-9]{3})+|[0-9]{1,3}(?:[ \u00a0\u2009\u202f][0-9]{3})+)(?:\.[0-9]+)?$/u
      : /^([+−-]?)([0-9]+|[0-9]{1,3}(?:[ \u00a0\u2009\u202f][0-9]{3})+)(?:[.,][0-9]+)?$/u;
  const tokens = [
    ...numericText.matchAll(/[^\s;!?¿¡()[\]{}"'“”‘’«»\uFFFC]+/gu),
  ];
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
    const range = /^([+−-]?[^–-]+)([–-])([+−-]?[^–-]+)$/u.exec(candidate);
    const endpoints =
      range &&
      (range[2] === "–" ||
        settings.rules.ranges.standalone ||
        bonds.some((bond) => bond.ruleId === "units" && bond.start === end))
        ? [range[1], range[3]]
        : [candidate];
    const records = endpoints.map((value) =>
      classifyNumber(value, grammar, settings),
    );
    // Eligibility belongs to the whole range. A technical endpoint takes
    // precedence over an apparently malformed fragment in the other endpoint.
    if (records.some((record) => record.kind === "excluded")) {
      if (
        range ||
        /^[+−-]?[0-9.,][0-9., \u00a0\u2009\u202f]*$/u.test(candidate)
      )
        preserved.push({ start: token.index, end });
      continue;
    }
    preserved.push({ start: token.index, end });
    if (records.some((record) => record.kind === "ambiguous")) {
      ambiguous.push({ start: token.index, end });
      continue;
    }
    let endpointStart = token.index;
    for (const record of records) {
      if (record.kind !== "valid") continue;
      const { integer, sign } = record;
      const digits = integer.replace(/[, \u00a0\u2009\u202f]/gu, "");
      const start = endpointStart + sign.length;
      if (digits.length >= Number(settings.rules.digitGrouping.minDigits)) {
        if (digits.length !== integer.length) {
          if (settings.rules.digitGrouping.normalizeExisting)
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
      endpointStart += endpoints[0].length + 1;
    }
  }
  return { changes, preserved, ambiguous };
}

type NumberRecord =
  | { kind: "valid"; sign: string; integer: string }
  | { kind: "excluded" | "ambiguous" };

/** Classification never repairs notation or coerces digits to a numeric value. */
function classifyNumber(
  value: string,
  grammar: RegExp,
  settings: Settings,
): NumberRecord {
  if (!/^[+−-]?[0-9][0-9., \u00a0\u2009\u202f]*$/u.test(value))
    return { kind: "excluded" };
  const match = grammar.exec(value);
  const unsigned = value.replace(/^[+−-]/u, "");
  const integer =
    match?.[2] ??
    unsigned.split(settings.locale === "en-gb" ? /\./u : /[.,]/u, 1)[0];
  const digits = integer.replace(/[, \u00a0\u2009\u202f]/gu, "");
  if (
    (digits.length > 1 && digits.startsWith("0")) ||
    /^[0-9]+(?:\.[0-9]+){2,}$/u.test(unsigned)
  )
    return { kind: "excluded" };
  return match
    ? { kind: "valid", sign: match[1], integer }
    : { kind: "ambiguous" };
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
  if (
    /[+−–*/=×÷^%-]$/u.test(left) ||
    (/\p{N}$/u.test(left) && /^[+−–*/=×÷^%-]/u.test(right))
  )
    return true;
  if (!/^[ \u00a0\u2009\u202f]+$/u.test(gap)) return false;
  return (
    (/\p{N}$/u.test(left) && /^[.,]?\p{N}/u.test(right) && gap.length === 1) ||
    /^[.,]/u.test(right) ||
    /^[.,]$/u.test(left) ||
    /\p{N}:$/u.test(left)
  );
}
