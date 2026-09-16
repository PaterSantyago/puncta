import { freezeResource } from "../../shared/hyphenation-resource.js";
import { PunctaConfigError } from "./config.js";
import { type HyphenationResource, liangPositions } from "./liang.js";
import { accessibleParts, technicalRanges } from "./protection.js";
import type { Settings } from "./settings.js";
import type { Edit, Locale, ProtectedRange, PunctaWarning } from "./types.js";
import { hasMixedScripts } from "./unicode-scripts.js";

export interface WordEdges {
  readonly leftOpaque: boolean;
  readonly rightOpaque: boolean;
}
export const completeWordEdges: WordEdges = {
  leftOpaque: false,
  rightOpaque: false,
};
type ResourceState = HyphenationResource | "unavailable" | "incompatible";

/** Snapshot private locale data once per registry. Invalid resources remain dormant
 * until insertion is enabled, while later caller mutation cannot alter an instance. */
export function snapshotResource(locale: Locale): ResourceState {
  const candidate = Reflect.get(locale, Symbol.for("@use-puncta/hyphenation"));
  if (candidate === undefined) return "unavailable";
  try {
    const resource = structuredClone(candidate) as HyphenationResource;
    if (
      resource.format !== 1 ||
      resource.locale !== locale.id ||
      resource.localeVersion !== locale.version ||
      resource.revision !== `${locale.id}-1` ||
      !Array.isArray(resource.table) ||
      resource.table.length !== 2 ||
      !Array.isArray(resource.table[0]) ||
      !resource.table[0].length ||
      !resource.table[0].every(
        (weights) =>
          Array.isArray(weights) &&
          weights.every(
            (weight) => Number.isInteger(weight) && weight >= 0 && weight <= 9,
          ),
      )
    )
      return "incompatible";
    const validIndex = (index: unknown) =>
      typeof index === "number" &&
      Number.isInteger(index) &&
      index >= 0 &&
      index < resource.table[0].length;
    function validTrie(value: unknown): boolean {
      if (!value || typeof value !== "object" || Array.isArray(value))
        return false;
      return Object.entries(value).every(
        ([letter, node]) =>
          /^[.a-z]$/u.test(letter) &&
          (typeof node === "number"
            ? validIndex(node)
            : Array.isArray(node)
              ? node.length === 2 && validTrie(node[0]) && validIndex(node[1])
              : validTrie(node)),
      );
    }
    if (!validTrie(resource.table[1])) return "incompatible";
    return freezeResource(resource);
  } catch {
    return "incompatible";
  }
}

export function requireResource(
  state: ResourceState | undefined,
  settings: Settings,
): HyphenationResource | undefined {
  if (!settings.hyphenation.enabled) return undefined;
  if (!state || typeof state === "string")
    throw new PunctaConfigError(
      state === "incompatible"
        ? "hyphenation.resource-incompatible"
        : "hyphenation.resource-unavailable",
      "Hyphenation resource is unavailable or incompatible.",
      { locale: settings.locale },
      ["hyphenation", "enabled"],
    );
  return state;
}

/** Typography is resolved first. Each UTF-16 unit in this temporary view retains
 * its original interval; insertion never rebases the public report to that view. */
function transformedView(source: string, edits: readonly Edit[]) {
  let text = source;
  const origins = Array.from({ length: source.length }, (_, index) => ({
    start: index,
    end: index + 1,
  }));
  for (const edit of [...edits].sort(
    (a, b) =>
      b.ranges[0].start - a.ranges[0].start ||
      b.ranges[0].end - a.ranges[0].end,
  )) {
    const { start, end } = edit.ranges[0];
    text = text.slice(0, start) + edit.after + text.slice(end);
    origins.splice(
      start,
      end - start,
      ...Array.from({ length: edit.after.length }, () => ({ start, end })),
    );
  }
  const range = (start: number, end: number) =>
    start === end
      ? {
          sourceId: 0,
          start: origins[start - 1]?.end ?? origins[start]?.start ?? 0,
          end: origins[start - 1]?.end ?? origins[start]?.start ?? 0,
        }
      : { sourceId: 0, start: origins[start].start, end: origins[end - 1].end };
  return { text, origins, range };
}

/** The English alphabet has one UTF-16 unit per admitted grapheme. Unsupported
 * graphemes remain in whole tokens so accents/joiners cannot expose subwords. */
export function insertHyphens(
  source: string,
  settings: Settings,
  protection: readonly ProtectedRange[],
  previous: readonly Edit[],
  resource: HyphenationResource | undefined,
  edges: WordEdges = completeWordEdges,
  apostrophes: readonly ProtectedRange[] = [],
): { edits: Edit[]; warnings: PunctaWarning[] } {
  const edits: Edit[] = [];
  const warnings: PunctaWarning[] = [];
  if (!settings.enabled || !settings.hyphenation.enabled || !resource)
    return { edits, warnings };
  const view = transformedView(source, previous);
  const protectedView: ProtectedRange[] = [];
  for (const [index, origin] of view.origins.entries()) {
    if (
      !protection.some(
        (span) => origin.start < span.end && origin.end > span.start,
      )
    )
      continue;
    const last = protectedView.at(-1);
    if (last?.end === index)
      protectedView[protectedView.length - 1] = {
        start: last.start,
        end: index + 1,
      };
    else protectedView.push({ start: index, end: index + 1 });
  }
  for (const accessible of accessibleParts(view.text, protectedView)) {
    for (const part of accessibleParts(
      accessible.text,
      technicalRanges(accessible.text),
    )) {
      const offset = accessible.start + part.start;
      const leftOpaque = offset > 0 || edges.leftOpaque;
      const rightOpaque =
        offset + part.text.length < view.text.length || edges.rightOpaque;
      for (const match of part.text.matchAll(
        /[\p{L}\p{M}\p{N}\p{Pc}\p{Cf}\p{Cs}]+(?:['’ʼ\-\u2010\u2011]+[\p{L}\p{M}\p{N}\p{Pc}\p{Cf}\p{Cs}]+)*/gu,
      )) {
        const word = match[0];
        const start = match.index;
        if (
          (leftOpaque &&
            /^['’ʼ\-\u2010\u2011]*$/u.test(part.text.slice(0, start))) ||
          (rightOpaque &&
            /^['’ʼ\-\u2010\u2011]*$/u.test(
              part.text.slice(start + word.length),
            ))
        )
          continue;
        const originalWord = view.range(
          offset + start,
          offset + start + word.length,
        );
        if (
          apostrophes.some(
            (mark) =>
              mark.start >= originalWord.start &&
              mark.start <= originalWord.end,
          )
        )
          continue;
        const graphemes = [
          ...new Intl.Segmenter("und", { granularity: "grapheme" }).segment(
            word,
          ),
        ];
        // Expected skips take priority over unsupported-script diagnostics.
        if (
          graphemes.length < Number(settings.hyphenation.minWordLength) ||
          /[\p{N}'’ʼ\-\u2010\u2011\u00ad]/u.test(word)
        )
          continue;
        const lower = word.toLowerCase();
        if (word !== lower && word !== lower[0].toUpperCase() + lower.slice(1))
          continue;
        if (!/^[a-zA-Z]+$/u.test(word)) {
          warnings.push({
            code: hasMixedScripts(word)
              ? "hyphenation.mixed-scripts"
              : "hyphenation.unsupported-characters",
            source: "rule",
            message:
              "The word uses characters outside the locale's supported alphabet.",
            details: {},
            locale: settings.locale,
            ruleId: "hyphenation.insert",
            location: {
              kind: "text",
              ranges: [
                view.range(offset + start, offset + start + word.length),
              ],
            },
          });
          continue;
        }
        for (const position of liangPositions(lower, resource)) {
          if (
            position < Number(settings.hyphenation.minLeft) ||
            word.length - position < Number(settings.hyphenation.minRight)
          )
            continue;
          edits.push({
            kind: "insert",
            before: "",
            after: "\u00ad",
            locale: settings.locale,
            ruleIds: ["hyphenation.insert"],
            ranges: [
              view.range(offset + start + position, offset + start + position),
            ],
          });
        }
      }
    }
  }
  return { edits, warnings };
}
