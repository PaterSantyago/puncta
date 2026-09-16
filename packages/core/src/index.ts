import { instanceScope } from "../../shared/scopes.js";
import { checkObject, invalidOption, PunctaConfigError } from "./config.js";
import { transformHtml } from "./html.js";
import { protectedRanges } from "./protection.js";
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
  RuleId,
  TextOptions,
  TextResult,
} from "./types.js";
import {
  quotationTypography,
  segmentTypography,
  typography,
} from "./typography.js";

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
    function text(
      source: string,
      call: TextOptions = {},
      initialLineStart = true,
      recognize: typeof typography = typography,
    ): string | TextResult {
      if (typeof source !== "string")
        invalidOption(["source"], source === undefined ? "required" : "type");
      checkObject(call, [...sharedKeys, "detailed", "protect"]);
      const protection = protectedRanges(source, call.protect);
      if (call.detailed !== undefined && typeof call.detailed !== "boolean")
        invalidOption(["detailed"], "type");
      const effective = resolveSettings(mergeSettings(settings, call, loaded));
      const { locale } = effective;
      const { edits, warnings } = recognize(
        source,
        effective,
        protection,
        initialLineStart,
      );
      edits.sort(
        (a, b) =>
          a.ranges[0].start - b.ranges[0].start ||
          a.ranges[0].end - b.ranges[0].end,
      );
      warnings.sort((a, b) =>
        a.location.kind === "text" && b.location.kind === "text"
          ? a.location.ranges[0].start - b.location.ranges[0].start
          : 0,
      );
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
        appliedRules: [
          ...new Set<RuleId>(edits.flatMap((edit) => edit.ruleIds)),
        ].map((ruleId) => ({ ruleId, locale })),
        warnings,
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
        // Private adapter entry keeps structural line context out of public options.
        transform: Object.freeze({
          segment: (source: string, initialLineStart: boolean) =>
            text(
              source,
              { detailed: true },
              initialLineStart,
              segmentTypography,
            ),
          quotation: (source: string) =>
            text(source, { detailed: true }, true, quotationTypography),
        }),
      }),
    }) as PunctaInstance;
  }
}
