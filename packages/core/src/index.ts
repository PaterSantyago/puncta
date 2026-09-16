import { instanceScope } from "../../shared/scopes.js";
import { checkObject, invalidOption, PunctaConfigError } from "./config.js";
import { transformHtml } from "./html.js";
import {
  accessibleParts,
  protectedRanges,
  technicalRanges,
} from "./protection.js";
import {
  mergeSettings,
  resolveSettings,
  type Settings,
  sharedKeys,
} from "./settings.js";
import type {
  HtmlOptions,
  HtmlResult,
  Locale,
  LocaleId,
  PunctaInstance,
  PunctaOptions,
  TextOptions,
  TextResult,
} from "./types.js";

export { PunctaConfigError } from "./config.js";
export type * from "./types.js";

export function createPuncta(
  options: PunctaOptions & {
    readonly locales: readonly Locale[];
    readonly locale: LocaleId;
  },
): PunctaInstance {
  checkObject(options, ["locales", ...sharedKeys]);
  if (!Array.isArray(options.locales))
    invalidOption(
      ["locales"],
      options.locales === undefined ? "required" : "type",
    );
  const loaded = new Set<LocaleId>();
  for (const [index, locale] of options.locales.entries()) {
    if (
      !locale ||
      (locale.id !== "en-gb" && locale.id !== "es-es") ||
      typeof locale.version !== "string" ||
      Reflect.get(locale, Symbol.for("@use-puncta/locale-format")) !== 1
    ) {
      throw new PunctaConfigError(
        "locale.incompatible",
        "Incompatible locale module.",
        {},
        ["locales", index],
      );
    }
    if (loaded.has(locale.id))
      throw new PunctaConfigError(
        "locale.duplicate",
        "Duplicate locale.",
        { locale: locale.id },
        ["locales", index],
      );
    loaded.add(locale.id);
  }
  if (options.locale === undefined) invalidOption(["locale"], "required");
  const initial = mergeSettings(
    { locale: options.locale, enabled: true, rules: {}, hyphenation: {} },
    options,
    loaded,
  );
  return makeInstance(initial);
  function makeInstance(settings: Settings): PunctaInstance {
    function text(source: string, call: TextOptions = {}): string | TextResult {
      if (typeof source !== "string")
        invalidOption(["source"], source === undefined ? "required" : "type");
      checkObject(call, [...sharedKeys, "detailed", "protect"]);
      const protection = protectedRanges(source, call.protect);
      if (call.detailed !== undefined && typeof call.detailed !== "boolean")
        invalidOption(["detailed"], "type");
      const effective = resolveSettings(mergeSettings(settings, call, loaded));
      const { locale } = effective;
      const edits: TextResult["edits"][number][] = [];
      if (effective.enabled && effective.rules.ellipsis?.enabled !== false) {
        for (const accessible of accessibleParts(source, protection)) {
          for (const part of accessibleParts(
            accessible.text,
            technicalRanges(accessible.text),
          )) {
            for (const match of part.text.matchAll(/(?<!\.)\.{3}(?!\.)/gu)) {
              const start = accessible.start + part.start + match.index;
              edits.push({
                kind: "replace",
                before: match[0],
                after: "…",
                locale,
                ruleIds: ["ellipsis"],
                ranges: [{ sourceId: 0, start, end: start + 3 }],
              });
            }
          }
        }
      }
      let result = source;
      for (const edit of [...edits].reverse()) {
        const range = edit.ranges[0];
        result =
          result.slice(0, range.start) + edit.after + result.slice(range.end);
      }
      if (!call.detailed) return result;
      return {
        result,
        hasEdits: edits.length > 0,
        outputChanged: result !== source,
        edits,
        sources: [{ id: 0, text: source, path: [] }],
        appliedRules: edits.length ? [{ ruleId: "ellipsis", locale }] : [],
        warnings: [],
      };
    }
    function html(source: string, call: HtmlOptions = {}): string | HtmlResult {
      if (typeof source !== "string")
        invalidOption(["source"], source === undefined ? "required" : "type");
      checkObject(call, [...sharedKeys, "detailed", "mode", "context"]);
      if (call.mode !== undefined && call.mode !== "fragment")
        invalidOption(["mode"], "value");
      if (call.context !== undefined && call.context !== "div")
        invalidOption(["context"], "value");
      // Validate even a fragment without text leaves.
      const { mode: _mode, context: _context, ...textCall } = call;
      text("", textCall);
      const report = transformHtml(
        source,
        instanceScope(makeInstance(mergeSettings(settings, textCall, loaded))),
      );
      return call.detailed ? report : report.result;
    }
    return Object.freeze({
      text,
      html,
      with(overrides: PunctaOptions) {
        checkObject(overrides, sharedKeys);
        return makeInstance(mergeSettings(settings, overrides, loaded));
      },
      [Symbol.for("@use-puncta/scope")]: Object.freeze({
        locale: settings.locale,
        enabled: settings.enabled,
      }),
    }) as PunctaInstance;
  }
}
