import { precedingSpaceStart } from "./spaces.js";
import type { NumberBond } from "./number-bonds.js";
import { technicalContext } from "./protection.js";
import type { Settings } from "./settings.js";
import type { ProtectedRange, RuleId } from "./types.js";

const unsignedNumber = String.raw`(?:\d+(?:[.,]\d+)*|[.,]\d+(?:[.,]\d+)*)`;
const numericExpression = (number: string) =>
  new RegExp(
    String.raw`[-+−]?${number}(?:[ \u00a0]*[-–−+*/=×÷][ \u00a0]*[-+−]?${number})*`,
    "gu",
  );
const simpleNumberOrRange = (number: string) =>
  new RegExp(`^[-+−]?${number}(?:[-–]${number})?$`, "u");

export interface DashChange extends ProtectedRange {
  after: string;
  ruleId: RuleId;
}

/** Recognise explicit prose markers on the original accessible segment. Numeric
 * dashes and word hyphens are deliberately outside this recogniser. */
export function textualDashes(
  text: string,
  settings: Settings,
  quoteRoles: ReadonlyMap<number, "open" | "close"> = new Map(),
) {
  const changes: DashChange[] = [];
  const preserved: ProtectedRange[] = [];
  const ambiguous: ProtectedRange[] = [];
  const roles: ProtectedRange[] = [];
  const technical = technicalContext(text);
  const markers = [
    ...text.matchAll(
      /(?<![-–—])--(?![-–—])|(?<![-–—])[–—](?![–—]|-(?![.,]?\d))/gu,
    ),
  ].filter(
    (match) =>
      !/\d$/u.test(text.slice(0, match.index)) ||
      !/^[.,]?\d/u.test(text.slice(match.index + match[0].length)),
  );
  function format(marker: (typeof markers)[number], opening: boolean) {
    const start = marker.index;
    const end = start + marker[0].length;
    roles.push({ start, end });
    const left = text.slice(precedingSpaceStart(text, start, " \u00a0"), start);
    const right = /^[ \u00a0]*/u.exec(text.slice(end))?.[0] ?? "";
    preserved.push({ start: start - left.length, end: end + right.length });
    if (
      !settings.rules.dashes.enabled ||
      (marker[0] !== "--" && !settings.rules.dashes.normalizeExisting)
    )
      return;
    const english = settings.locale === "en-gb";
    const before = text.slice(0, start - left.length);
    const after = text.slice(end + right.length);
    const followsOpeningQuote =
      !english && quoteRoles.get(start - left.length - 1) === "open";
    const precedesClosingQuote =
      !english && quoteRoles.get(end + right.length) === "close";
    const lineStart = !before || /[\r\n]$/u.test(before);
    const lineEnd = !after || /^[\r\n]/u.test(after);
    const needsLeftSpace = (english || opening) && !/[([{¿¡]$/u.test(before);
    const needsRightSpace =
      (english || !opening) && !/^(?:[,;:!?)}\]]|\.(?!\.\.))/u.test(after);
    let leftInterval = needsLeftSpace ? " " : "";
    if (lineStart) leftInterval = left;
    if (followsOpeningQuote) leftInterval = "";
    const rightInterval =
      !lineEnd && !precedesClosingQuote && needsRightSpace ? " " : "";
    changes.push({ start, end, after: english ? "–" : "—", ruleId: "dashes" });
    changes.push({
      start: start - left.length,
      end: start,
      after: leftInterval,
      ruleId: "dashes",
    });
    changes.push({
      start: end,
      end: end + right.length,
      after: rightInterval,
      ruleId: "dashes",
    });
  }
  for (let index = 0; index < markers.length; index++) {
    const changesStart = changes.length;
    const rolesStart = roles.length;
    const marker = markers[index];
    const leftStart = precedingSpaceStart(text, marker.index, " \u00a0");
    const next = markers[index + 1];
    const middle = next
      ? text.slice(marker.index + marker[0].length, next.index)
      : "";
    if (next && /\p{L}/u.test(middle) && !/[\r\n]/u.test(middle)) {
      format(marker, true);
      format(next, false);
      index++;
    } else if (
      settings.locale === "en-gb" &&
      leftStart < marker.index &&
      /\S/u.test(text[leftStart - 1] ?? "") &&
      /^[ \u00a0]+\S/u.test(text.slice(marker.index + marker[0].length))
    ) {
      format(marker, true);
    } else {
      const span = {
        start: marker.index,
        end: marker.index + marker[0].length,
      };
      const left = span.start - leftStart;
      const right = /^[ \u00a0]*/u.exec(text.slice(span.end))?.[0].length ?? 0;
      preserved.push({ start: span.start - left, end: span.end + right });
      if (settings.rules.dashes.enabled) ambiguous.push(span);
    }
    // Formatting a group of prose markers must not create a technical token
    // which would hide a different subset of those markers on a later call.
    if (technical.changesTokens(changes.slice(changesStart))) {
      changes.length = changesStart;
      if (settings.rules.dashes.enabled)
        ambiguous.push(...roles.slice(rolesStart));
    }
  }
  return { changes, preserved, ambiguous, roles };
}

/** Unit recognition is shared with number bonds, including disabled formatting. */
export function numericDashes(
  text: string,
  settings: Settings,
  bonds: readonly NumberBond[],
  textualRoles: readonly ProtectedRange[],
) {
  const changes: DashChange[] = [];
  const ambiguous: (ProtectedRange & { ruleId: RuleId })[] = [];
  const preserved: ProtectedRange[] = [];
  const suffixes = new Set(bonds.map((bond) => bond.start));
  const units = new Set(
    bonds.filter((bond) => bond.ruleId === "units").map((bond) => bond.start),
  );
  const currencyEnds = new Map<number, number>();
  for (const bond of bonds)
    if (bond.ruleId === "currencies")
      currencyEnds.set(
        bond.end,
        Math.max(currencyEnds.get(bond.end) ?? 0, bond.construction.end),
      );
  let numericText = text;
  for (const role of textualRoles)
    numericText =
      numericText.slice(0, role.start) +
      "\uFFFC".repeat(role.end - role.start) +
      numericText.slice(role.end);
  const number = settings.rules.digitGrouping.enabled
    ? String.raw`(?:\d+(?:[., \u00a0\u2009\u202f]\d+)*|[.,]\d+(?:[.,]\d+)*)`
    : unsignedNumber;
  const simplePattern = simpleNumberOrRange(number);
  for (const match of numericText.matchAll(numericExpression(number))) {
    let start = match.index;
    const end = start + match[0].length;
    if (
      /^[.,]/u.test(match[0]) &&
      /[\p{L}\p{M}\p{N})\]"'»”’,;:!?.]$/u.test(
        text.slice(0, precedingSpaceStart(text, start)),
      )
    )
      start++;
    const before = numericText.slice(0, start);
    const prefixCurrency = (currencyEnds.get(start) ?? -1) >= end;
    if (/[\p{L}\p{M}\p{N}\u00ad_/]$/u.test(before) && !prefixCurrency) continue;
    const suffixBond = suffixes.has(end);
    if (/[\p{L}\p{M}\p{N}\u00ad_/]/u.test(text[end] ?? "") && !suffixBond)
      continue;
    const knownUnit = units.has(end);
    const value = text.slice(start, end);
    const simple = !/[-+]$/u.test(before) && simplePattern.test(value);
    if (!simple && /[-–]/u.test(value)) {
      const ruleId = value.startsWith("-") ? "minus" : "ranges";
      preserved.push({ start, end });
      if (settings.rules[ruleId].enabled)
        ambiguous.push({ start, end, ruleId });
      continue;
    }
    if (!simple) continue;
    if (knownUnit && value.startsWith("-") && settings.rules.minus.enabled)
      changes.push({ start, end: start + 1, after: "−", ruleId: "minus" });
    const separator = value.slice(1).indexOf("-") + 1;
    if (
      separator > 0 &&
      settings.rules.ranges.enabled &&
      (knownUnit || settings.rules.ranges.standalone)
    )
      changes.push({
        start: start + separator,
        end: start + separator + 1,
        after: "–",
        ruleId: "ranges",
      });
  }
  return { changes, ambiguous, preserved };
}
