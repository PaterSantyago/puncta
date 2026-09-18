import { accessibleParts, technicalRanges } from "./protection.js";
import type { Settings } from "./settings.js";
import type { Edit, ProtectedRange, PunctaWarning } from "./types.js";

/** Removal uses original accessible text; it never classifies words for insertion. */
export function removeSoftHyphens(
  source: string,
  settings: Settings,
  protection: readonly ProtectedRange[],
): { edits: Edit[]; warnings: PunctaWarning[] } {
  const edits: Edit[] = [];
  if (settings.enabled) {
    for (const accessible of accessibleParts(source, protection)) {
      for (const part of accessibleParts(
        accessible.text,
        technicalRanges(accessible.text),
      )) {
        for (const match of part.text.matchAll(/\u00ad/gu)) {
          const start = accessible.start + part.start + match.index;
          edits.push({
            kind: "delete",
            before: "\u00ad",
            after: "",
            locale: settings.locale,
            ruleIds: ["hyphenation.remove"],
            ranges: [{ sourceId: 0, start, end: start + 1 }],
          });
        }
      }
    }
  }
  return { edits, warnings: [] };
}
