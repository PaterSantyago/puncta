import { digitGrouping } from "./digit-grouping.js";
import { rangeIndex } from "./ranges.js";
import { precedingSpaceStart } from "./spaces.js";
import { numericDashes, textualDashes } from "./dashes.js";
import { numberBonds } from "./number-bonds.js";
import {
  accessibleParts,
  technicalContext,
  technicalRanges,
} from "./protection.js";
import { quotes } from "./quotes.js";
import type { resolveSettings } from "./settings.js";
import type { Edit, ProtectedRange, PunctaWarning, RuleId } from "./types.js";

interface TypographyReport {
  edits: Edit[];
  warnings: PunctaWarning[];
  apostrophes?: readonly ProtectedRange[];
}

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
      const technical = technicalContext(text);
      const occupied = rangeIndex(text.length);
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
          occupied.overlaps(start, end) ||
          !graphemeBoundaries.has(start) ||
          !graphemeBoundaries.has(end)
        )
          return;
        if (
          technical.touchesHiddenToken(start, end) &&
          technical.changesTokens([{ start, end, after }])
        ) {
          ambiguous(
            start,
            end,
            "This change would alter ambiguous technical context; the interval was preserved.",
            ruleId,
          );
          return;
        }
        occupied.add({ start, end });
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
      const grouping = digitGrouping(text, settings, bonds, dashes.roles);
      for (const change of grouping.changes)
        edit(change.start, change.end, "\u202f", "digitGrouping");
      for (const span of grouping.ambiguous)
        ambiguous(
          span.start,
          span.end,
          "Numeric grouping is ambiguous; the complete candidate was preserved.",
          "digitGrouping",
        );
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
        for (const match of text.matchAll(/(?<!\.)\.{3}(?!\.)/gu)) {
          const end = match.index + 3;
          if (
            technical.changesTokens([{ start: match.index, end, after: "…" }])
          ) {
            ambiguous(
              match.index,
              end,
              "Replacing these dots would alter ambiguous technical context.",
              "ellipsis",
            );
          } else edit(match.index, end, "…", "ellipsis");
        }
      }
      if (settings.rules.spaces?.enabled === false) continue;

      // These intervals have a role general whitespace cleanup must not override.
      const preserved: ProtectedRange[] = [
        ...dashes.preserved,
        ...numeric.preserved,
        ...bonds.map((bond) => bond.construction),
        ...grouping.preserved,
      ];
      // Start only at the beginning of a space run. Retrying at every space
      // makes a long indentation without any dots quadratic.
      for (const match of text.matchAll(
        /(?<! ) *(?:[.…](?:[. …]*[.…])|…) */gu,
      )) {
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
      // A suffix of the same digit run cannot succeed when its full run failed.
      // Avoid retrying the punctuation search at every digit of a long integer.
      for (const match of text.matchAll(
        /(?<!\p{N})\p{N}+(?: *[.,:/-] *\p{N}+)+/gu,
      )) {
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
      const preservedIndex = rangeIndex(text.length, preserved);
      let lineCursor = 0;
      let atLineStart = initialLineStart && offset === 0;
      for (const match of text.matchAll(/ +/gu)) {
        const start = match.index;
        const end = start + match[0].length;
        const before = text.slice(0, start);
        const after = text.slice(end);
        for (; lineCursor < start; lineCursor++) {
          const character = text[lineCursor];
          if (character === "\r" || character === "\n") atLineStart = true;
          else if (character !== " " && character !== "\t") atLineStart = false;
        }
        if (atLineStart || preservedIndex.overlaps(start, end)) continue;
        const insertsFollowingSpace = /^[,;:!?]+[\p{L}\p{N}¿¡]/u.test(after);
        const createsTechnical =
          !insertsFollowingSpace && technical.joinsToken(start, end);
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
        if (preservedIndex.overlaps(start, end)) continue;
        if (
          !/[\p{L}\p{M}\p{N})\]"'»”’,;:!?.]$/u.test(
            text.slice(0, precedingSpaceStart(text, start)),
          ) ||
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
        // Punctuation spacing must not turn ordinary source text into a newly
        // opaque technical token on the next invocation (for example an IPv6
        // suffix ending at this insertion). Preserve that ambiguous interval.
        if (technical.splitsToken(end)) {
          ambiguous(
            start,
            end,
            "Spacing this interval would create an ambiguous technical token.",
          );
          continue;
        }
        edit(end, end, " ", "spaces");
      }
    }
  }
  return { edits, warnings };
}

/** Coordinate quote roles and segment-local dash intervals on the original view. */
export function quotationTypography(
  source: string,
  settings: ReturnType<typeof resolveSettings>,
  protection: readonly ProtectedRange[],
): TypographyReport {
  const { edits, warnings, text, quoteRoles, apostrophes } = quotes(
    source,
    settings,
    protection,
  );
  const occupied = rangeIndex(
    text.length,
    edits.map((edit) => edit.ranges[0]),
  );
  const boundaries = new Set([text.length]);
  for (const segment of new Intl.Segmenter("und", {
    granularity: "grapheme",
  }).segment(text))
    boundaries.add(segment.index);
  function edit(start: number, end: number, after: string, ruleId: RuleId) {
    const before = text.slice(start, end);
    if (before === after || !boundaries.has(start) || !boundaries.has(end))
      return;
    occupied.add({ start, end });
    edits.push({
      kind: !before ? "insert" : !after ? "delete" : "replace",
      before,
      after,
      locale: settings.locale,
      ruleIds: [ruleId],
      ranges: [{ sourceId: 0, start, end }],
    });
  }
  // Dash pairing is segment-local, but its outside intervals use quote roles
  // from this wider context (a quotation may span a line or opaque fragment).
  for (const part of text.matchAll(/[^\r\n\u2028\uFFFC]+/gu)) {
    const localRoles = new Map<number, "open" | "close">();
    for (const [position, role] of quoteRoles) {
      if (position >= part.index && position < part.index + part[0].length)
        localRoles.set(position - part.index, role);
    }
    const dashes = textualDashes(part[0], settings, localRoles);
    for (const change of dashes.changes) {
      const start = part.index + change.start;
      const end = part.index + change.end;
      if (occupied.overlaps(start, end)) continue;
      edit(start, end, change.after, "dashes");
    }
    for (const span of dashes.ambiguous)
      warnings.push({
        code: "typography.ambiguous",
        source: "rule",
        message: "Textual dash is ambiguous; the marker was preserved.",
        details: {},
        locale: settings.locale,
        ruleId: "dashes",
        location: {
          kind: "text",
          ranges: [
            {
              sourceId: 0,
              start: part.index + span.start,
              end: part.index + span.end,
            },
          ],
        },
      });
  }
  return { edits, warnings, apostrophes };
}

/** Plain text owns both recognition contexts. Structured adapters supply their
 * segment and quotation contexts separately through private scope metadata. */
export function typography(
  source: string,
  settings: ReturnType<typeof resolveSettings>,
  protection: readonly ProtectedRange[],
  initialLineStart = true,
): TypographyReport {
  const quotation = quotationTypography(source, settings, protection);
  const segment = segmentTypography(
    source,
    settings,
    protection,
    initialLineStart,
  );
  const occupied = rangeIndex(
    source.length,
    quotation.edits.map((edit) => edit.ranges[0]),
  );
  const edits = segment.edits.filter(
    (edit) => !occupied.overlaps(edit.ranges[0].start, edit.ranges[0].end),
  );
  return {
    edits: [...edits, ...quotation.edits],
    warnings: [...segment.warnings, ...quotation.warnings],
    apostrophes: quotation.apostrophes,
  };
}
