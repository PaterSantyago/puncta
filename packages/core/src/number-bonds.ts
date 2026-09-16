import type { Settings } from "./settings.js";
import type { ProtectedRange, RuleId } from "./types.js";

const baseUnits = [
  "mm",
  "cm",
  "m",
  "km",
  "µm",
  "nm",
  "mg",
  "g",
  "kg",
  "t",
  "ml",
  "mL",
  "l",
  "L",
  "ms",
  "s",
  "min",
  "h",
  "d",
  "°C",
  "°F",
  "K",
  "m²",
  "m³",
  "m/s",
  "km/h",
  "Hz",
  "kHz",
  "MHz",
  "GHz",
  "W",
  "kW",
  "MW",
  "Wh",
  "kWh",
  "V",
  "A",
  "Pa",
  "kPa",
  "MPa",
  "bar",
  "J",
  "kJ",
  "N",
];
const continuation = /^[\p{L}\p{M}\p{N}_/°^]/u;

/** Original numeric spans, without interpreting separators or rewriting notation.
 * A code immediately before a number is a recognised boundary, not a word tail. */
function numbers(text: string): ProtectedRange[] {
  const result: ProtectedRange[] = [];
  for (const match of text.matchAll(
    /[+−-]?\d+(?:[.,]\d+)*(?:[-–]\d+(?:[.,]\d+)*)?/gu,
  )) {
    const start = match.index;
    const end = start + match[0].length;
    const before = text.slice(0, start);
    if (
      /[\p{L}\p{M}\p{N}_/]$/u.test(before) &&
      !/(?:^|[^\p{L}\p{M}\p{N}_])(?:GBP|EUR|USD)$/u.test(before) &&
      !(
        /(?:GBP|EUR|USD)$/u.test(before) &&
        result.some((span) => span.end === start - 3)
      )
    )
      continue;
    result.push({ start, end });
  }
  return result;
}

export interface NumberBond {
  readonly start: number;
  readonly end: number;
  readonly after: string;
  readonly ruleId: RuleId;
  readonly enabled: boolean;
  readonly warning: "currency.order" | "typography.ambiguous" | null;
  readonly construction: ProtectedRange;
}

/** Recognition owns intervals even when their formatting is disabled. This keeps
 * general spaces from damaging preserved currency orders or number notation. */
export function numberBonds(text: string, settings: Settings): NumberBond[] {
  const units = [
    ...new Set([
      ...baseUnits,
      ...(settings.rules.units.additional as readonly string[]),
    ]),
  ]
    // Additions cannot replace the separately specified currency/percent/angle roles.
    .filter(
      (unit) => !["GBP", "EUR", "USD", "£", "€", "$", "%", "°"].includes(unit),
    )
    .sort((a, b) => b.length - a.length);
  const bonds: NumberBond[] = [];
  const spans = numbers(text);
  function add(
    start: number,
    end: number,
    after: string,
    ruleId: RuleId,
    construction: ProtectedRange,
    warning: NumberBond["warning"] = null,
  ) {
    bonds.push({
      start,
      end,
      after,
      ruleId,
      construction,
      warning,
      enabled: settings.rules[ruleId].enabled !== false,
    });
  }
  for (const number of spans) {
    const gap = /^[ \u00a0]*/u.exec(text.slice(number.end))?.[0] ?? "";
    const markerStart = number.end + gap.length;
    const tail = text.slice(markerStart);
    const unit = units.find(
      (candidate) =>
        tail.startsWith(candidate) &&
        !continuation.test(tail.slice(candidate.length)),
    );
    if (unit || (tail.startsWith("°") && !continuation.test(tail.slice(1)))) {
      add(number.end, markerStart, unit ? "\u00a0" : "", "units", {
        start: number.start,
        end: markerStart + (unit?.length ?? 1),
      });
    } else if (tail.startsWith("%") && !continuation.test(tail.slice(1))) {
      add(
        number.end,
        markerStart,
        settings.rules.percentages.space === "nbsp" ? "\u00a0" : "",
        "percentages",
        { start: number.start, end: markerStart + 1 },
      );
    }
  }
  for (const match of text.matchAll(/GBP|EUR|USD|[£€$]/gu)) {
    const start = match.index;
    const end = start + match[0].length;
    const left = spans.find(
      (span) =>
        span.end <= start && /^[ \u00a0]*$/u.test(text.slice(span.end, start)),
    );
    const right = spans.find(
      (span) =>
        span.start >= end && /^[ \u00a0]*$/u.test(text.slice(end, span.start)),
    );
    // A currency code must be a whole designation, including when adjacent to a
    // number. A following known unit is already a recognised numeric boundary.
    if (
      (!left && /[\p{L}\p{M}\p{N}_]$/u.test(text.slice(0, start))) ||
      (!right && continuation.test(text.slice(end)))
    )
      continue;
    const validRight =
      right &&
      (!continuation.test(text.slice(right.end)) ||
        /^(?:GBP|EUR|USD)(?![\p{L}\p{M}\p{N}_/°^])/u.test(
          text.slice(right.end),
        ) ||
        bonds.some((bond) => bond.construction.start === right.start))
        ? right
        : undefined;
    if (right && !validRight && right.start === end) continue;
    const leftAttached = left && !text.slice(left.end, start).includes(" ");
    const rightAttached =
      validRight && !text.slice(end, validRight.start).includes(" ");
    if (left && validRight && leftAttached === rightAttached) {
      add(
        left.end,
        validRight.start,
        text.slice(left.end, validRight.start),
        "currencies",
        { start: left.start, end: validRight.end },
        "typography.ambiguous",
      );
      continue;
    }
    const prefix = !!validRight && (!left || !!rightAttached);
    const number = prefix ? validRight : left;
    if (!number) continue;
    const symbol = match[0].length === 1;
    const atypical = symbol && prefix !== (settings.locale === "en-gb");
    add(
      prefix ? end : number.end,
      prefix ? number.start : start,
      symbol && prefix ? "" : "\u00a0",
      "currencies",
      { start: prefix ? start : number.start, end: prefix ? number.end : end },
      atypical ? "currency.order" : null,
    );
  }
  return bonds;
}
