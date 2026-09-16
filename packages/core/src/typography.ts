import { quotes } from "./quotes.js";
import { accessibleParts, technicalRanges } from "./protection.js";
import type { resolveSettings } from "./settings.js";
import type { Edit, ProtectedRange, PunctaWarning, RuleId } from "./types.js";

/** Rules inspect only accessible original text. Disjoint edits keep their original
 * coordinates; role recognition also runs when that role's formatting is disabled. */
export function typography(
  source: string,
  settings: ReturnType<typeof resolveSettings>,
  protection: readonly ProtectedRange[],
  initialLineStart = true,
  mode?: "local" | "quotes",
): { edits: Edit[]; warnings: PunctaWarning[] } {
  const { edits, warnings } =
    mode === "local"
      ? { edits: [] as Edit[], warnings: [] as PunctaWarning[] }
      : quotes(source, settings, protection);
  if (!settings.enabled) return { edits, warnings };
  if (mode !== "quotes")
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
        function edit(
          start: number,
          end: number,
          after: string,
          ruleId: RuleId,
        ) {
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
        function ambiguous(start: number, end: number, message: string) {
          warnings.push({
            code: "typography.ambiguous",
            source: "rule",
            message,
            details: {},
            locale: settings.locale,
            ruleId: "spaces",
            location: { kind: "text", ranges: [range(start, end)] },
          });
        }
        if (settings.rules.ellipsis?.enabled !== false) {
          for (const match of text.matchAll(/(?<!\.)\.{3}(?!\.)/gu))
            edit(match.index, match.index + 3, "…", "ellipsis");
        }
        if (settings.rules.spaces?.enabled === false) continue;

        // These intervals have a role general whitespace cleanup must not override.
        const preserved: ProtectedRange[] = [];
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
          if (match[0].includes(" "))
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
  edits.sort((a, b) => a.ranges[0].start - b.ranges[0].start);
  warnings.sort((a, b) =>
    a.location.kind === "text" && b.location.kind === "text"
      ? a.location.ranges[0].start - b.location.ranges[0].start
      : 0,
  );
  return { edits, warnings };
}
