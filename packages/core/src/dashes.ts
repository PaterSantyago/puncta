import type { Settings } from "./settings.js";
import type { ProtectedRange, RuleId } from "./types.js";

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
    const left = /[ \u00a0]*$/u.exec(text.slice(0, start))?.[0] ?? "";
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
    changes.push({ start, end, after: english ? "–" : "—", ruleId: "dashes" });
    changes.push({
      start: start - left.length,
      end: start,
      after:
        !english && quoteRoles.get(start - left.length - 1) === "open"
          ? ""
          : /[\r\n]$/u.test(before)
            ? left
            : (english || opening) && before && !/[([{¿¡]$/u.test(before)
              ? " "
              : "",
      ruleId: "dashes",
    });
    changes.push({
      start: end,
      end: end + right.length,
      after:
        (!english && quoteRoles.get(end + right.length) === "close") ||
        /^[\r\n]/u.test(after)
          ? ""
          : (english || !opening) &&
              after &&
              !/^(?:[,;:!?)}\]]|\.(?!\.\.))/u.test(after)
            ? " "
            : "",
      ruleId: "dashes",
    });
  }
  for (let index = 0; index < markers.length; index++) {
    const marker = markers[index];
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
      /\S[ \u00a0]+$/u.test(text.slice(0, marker.index)) &&
      /^[ \u00a0]+\S/u.test(text.slice(marker.index + marker[0].length))
    ) {
      format(marker, true);
    } else {
      const span = {
        start: marker.index,
        end: marker.index + marker[0].length,
      };
      const left =
        /[ \u00a0]*$/u.exec(text.slice(0, span.start))?.[0].length ?? 0;
      const right = /^[ \u00a0]*/u.exec(text.slice(span.end))?.[0].length ?? 0;
      preserved.push({ start: span.start - left, end: span.end + right });
      if (settings.rules.dashes.enabled) ambiguous.push(span);
    }
  }
  return { changes, preserved, ambiguous, roles };
}

/** Unit recognition is shared with number bonds, including disabled formatting. */
export function numericDashes(
  text: string,
  settings: Settings,
  bonds: readonly import("./number-bonds.js").NumberBond[],
  textualRoles: readonly ProtectedRange[],
) {
  const changes: DashChange[] = [];
  const ambiguous: (ProtectedRange & { ruleId: RuleId })[] = [];
  const preserved: ProtectedRange[] = [];
  let numericText = text;
  for (const role of textualRoles)
    numericText =
      numericText.slice(0, role.start) +
      "\uFFFC".repeat(role.end - role.start) +
      numericText.slice(role.end);
  for (const match of numericText.matchAll(
    /[-+−]?(?:\d+(?:[.,]\d+)*|[.,]\d+(?:[.,]\d+)*)(?:[ \u00a0]*[-–+*/=][ \u00a0]*[-+−]?(?:\d+(?:[.,]\d+)*|[.,]\d+(?:[.,]\d+)*))*/gu,
  )) {
    let start = match.index;
    const end = start + match[0].length;
    if (
      /^[.,]/u.test(match[0]) &&
      /[\p{L}\p{M}\p{N})\]"'»”’,;:!?.] *$/u.test(text.slice(0, start))
    )
      start++;
    const before = numericText.slice(0, start);
    const prefixCurrency = bonds.some(
      (bond) =>
        bond.ruleId === "currencies" &&
        bond.end === start &&
        bond.construction.end >= end,
    );
    if (/[\p{L}\p{M}\p{N}_/]$/u.test(before) && !prefixCurrency) continue;
    const suffixBond = bonds.some((bond) => bond.start === end);
    if (/[\p{L}\p{M}\p{N}_/]/u.test(text[end] ?? "") && !suffixBond) continue;
    const knownUnit = bonds.some(
      (bond) => bond.ruleId === "units" && bond.start === end,
    );
    const value = text.slice(start, end);
    const simple =
      !/[-+]$/u.test(before) &&
      /^[-+−]?(?:\d+(?:[.,]\d+)*|[.,]\d+(?:[.,]\d+)*)(?:[-–](?:\d+(?:[.,]\d+)*|[.,]\d+(?:[.,]\d+)*))?$/u.test(
        value,
      );
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
