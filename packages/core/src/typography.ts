import { numericDashes, textualDashes } from "./dashes.js";
import { numberBonds } from "./number-bonds.js";
import { quotes } from "./quotes.js";
import { accessibleParts, technicalRanges } from "./protection.js";
import type { resolveSettings } from "./settings.js";
import type { Edit, ProtectedRange, PunctaWarning, RuleId } from "./types.js";

/** Rules inspect only accessible original text. Disjoint edits keep their original
 * coordinates; role recognition also runs when that role's formatting is disabled. */
export function segmentTypography(
  source: string,
  settings: ReturnType<typeof resolveSettings>,
  protection: readonly ProtectedRange[],
  initialLineStart = true,
): { edits: Edit[]; warnings: PunctaWarning[] } {
  const edits: Edit[] = [];
  const warnings: PunctaWarning[] = [];
  if (!settings.enabled) return { edits, warnings };
  for (const accessible of accessibleParts(source, protection)) {
    for (const part of accessibleParts(
      accessible.text,
      technicalRanges(accessible.text),
    )) {
      const text = part.text;
      const graphemeBoundaries = new Set([text.length]);
      for (const segment of new Intl.Segmenter("und", {
        granularity: "grapheme",
      }).segment(text))
        graphemeBoundaries.add(segment.index);
      const offset = accessible.start + part.start;
      const range = (start: number, end: number) => ({
        sourceId: 0,
        start: offset + start,
        end: offset + end,
      });
      function edit(start: number, end: number, after: string, ruleId: RuleId) {
        const before = text.slice(start, end);
        if (
          before === after ||
          edits.some(
            (existing) =>
              existing.ranges[0].start < offset + end &&
              existing.ranges[0].end > offset + start,
          ) ||
          !graphemeBoundaries.has(start) ||
          !graphemeBoundaries.has(end)
        )
          return;
        edits.push({
          kind: !before ? "insert" : !after ? "delete" : "replace",
          before,
          after,
          locale: settings.locale,
          ruleIds: [ruleId],
          ranges: [range(start, end)],
        });
      }
      function ambiguous(
        start: number,
        end: number,
        message: string,
        ruleId: RuleId = "spaces",
      ) {
        warnings.push({
          code: "typography.ambiguous",
          source: "rule",
          message,
          details: {},
          locale: settings.locale,
          ruleId,
          location: { kind: "text", ranges: [range(start, end)] },
        });
      }
      const dashes = textualDashes(text, settings);
      const bonds = numberBonds(text, settings);
      const numeric = numericDashes(text, settings, bonds, dashes.roles);
      for (const change of numeric.changes)
        edit(change.start, change.end, change.after, change.ruleId);
      for (const span of numeric.ambiguous) {
        ambiguous(
          span.start,
          span.end,
          "Numeric dash is ambiguous; the construction was preserved.",
          span.ruleId,
        );
      }
      for (const bond of bonds) {
        if (!bond.enabled) continue;
        if (bond.warning) {
          warnings.push({
            code: bond.warning,
            source: "rule",
            message:
              bond.warning === "currency.order"
                ? "Currency order is atypical for the selected profile; the construction was preserved."
                : "Currency attachment is ambiguous; the construction was preserved.",
            details: {},
            locale: settings.locale,
            ruleId: "currencies",
            location: {
              kind: "text",
              ranges: [range(bond.construction.start, bond.construction.end)],
            },
          });
        } else edit(bond.start, bond.end, bond.after, bond.ruleId);
      }
      if (settings.rules.ellipsis?.enabled !== false) {
        for (const match of text.matchAll(/(?<!\.)\.{3}(?!\.)/gu))
          edit(match.index, match.index + 3, "…", "ellipsis");
      }
      if (settings.rules.spaces?.enabled === false) continue;

      // These intervals have a role general whitespace cleanup must not override.
      const preserved: ProtectedRange[] = [
        ...dashes.preserved,
        ...numeric.preserved,
        ...bonds.map((bond) => bond.construction),
      ];
      for (const match of text.matchAll(/ *(?:[.…](?:[. …]*[.…])|…) */gu)) {
        const start = match.index;
        const end = start + match[0].length;
        preserved.push({ start, end });
        if (/ {2}|\. +\.|^ .* $/u.test(match[0]))
          ambiguous(
            start,
            end,
            "Ellipsis spacing is ambiguous; its intervals were preserved.",
          );
      }
      for (const match of text.matchAll(/\p{N}+(?: *[.,:/-] *\p{N}+)+/gu)) {
        const start = match.index;
        const end = start + match[0].length;
        preserved.push({ start, end });
        if (
          match[0].includes(" ") &&
          !numeric.preserved.some(
            (span) => start < span.end && end > span.start,
          )
        )
          ambiguous(
            start,
            end,
            "Numeric punctuation is ambiguous; its intervals were preserved.",
          );
      }
      const isPreserved = (start: number, end: number) =>
        preserved.some((item) => start < item.end && end > item.start);
      for (const match of text.matchAll(/ +/gu)) {
        const start = match.index;
        const end = start + match[0].length;
        const before = text.slice(0, start);
        const after = text.slice(end);
        const indentation =
          /[\r\n][ \t]*$/u.test(before) ||
          (initialLineStart && offset === 0 && /^[ \t]*$/u.test(before));
        if (indentation || isPreserved(start, end)) continue;
        const insertsFollowingSpace = /^[,;:!?]+[\p{L}\p{N}¿¡]/u.test(after);
        const createsTechnical =
          !insertsFollowingSpace &&
          technicalRanges(before + after).some(
            (range) => range.start < start && range.end > start,
          );
        if (createsTechnical)
          ambiguous(
            start,
            end,
            "Removing this interval would create an ambiguous technical token.",
          );
        const closes =
          !createsTechnical &&
          /^[,;:.!?)\]]/u.test(after) &&
          /[\p{L}\p{M}\p{N})\]"'»”’!?]$/u.test(before);
        const opens =
          (/[([]$/u.test(before) ||
            (settings.locale === "es-es" && /[¿¡]$/u.test(before))) &&
          /^[\p{L}\p{N}"'«“‘¿¡]/u.test(after);
        edit(start, end, closes || opens ? "" : " ", "spaces");
      }
      for (const match of text.matchAll(/[,;:!?.]+/gu)) {
        const start = match.index;
        const end = start + match[0].length;
        if (isPreserved(start, end)) continue;
        if (
          !/[\p{L}\p{M}\p{N})\]"'»”’,;:!?.] *$/u.test(text.slice(0, start)) ||
          !/^[\p{L}\p{N}¿¡]/u.test(text.slice(end))
        )
          continue;
        if (match[0].includes(".")) {
          ambiguous(
            start,
            end,
            "Period spacing is ambiguous; its interval was preserved.",
          );
          continue;
        }
        edit(end, end, " ", "spaces");
      }
    }
  }
  return { edits, warnings };
}

/** Plain text owns both recognition contexts. Structured adapters supply their
 * segment and quotation contexts separately through private scope metadata. */
export function typography(
  source: string,
  settings: ReturnType<typeof resolveSettings>,
  protection: readonly ProtectedRange[],
  initialLineStart = true,
) {
  const quotation = quotes(source, settings, protection);
  const segment = segmentTypography(
    source,
    settings,
    protection,
    initialLineStart,
  );
  const edits = segment.edits.filter(
    (edit) =>
      !quotation.edits.some(
        (quoteEdit) =>
          quoteEdit.ranges[0].start < edit.ranges[0].end &&
          quoteEdit.ranges[0].end > edit.ranges[0].start,
      ),
  );
  return {
    edits: [...edits, ...quotation.edits],
    warnings: [...segment.warnings, ...quotation.warnings],
  };
}
