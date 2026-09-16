import { checkObject, invalidOption, PunctaConfigError } from "./config.js";
import { transformHtml } from "./html.js";
import type {
  HtmlOptions,
  HtmlResult,
  Locale,
  LocaleId,
  PunctaInstance,
  TextOptions,
  TextResult,
} from "./types.js";
export { PunctaConfigError } from "./config.js";
export type * from "./types.js";

export function createPuncta(options: {
  readonly locales: readonly Locale[];
  readonly locale: LocaleId;
}): PunctaInstance {
  checkObject(options, ["locales", "locale"]);
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
  function selectLocale(value: unknown): LocaleId {
    if (value === undefined) invalidOption(["locale"], "required");
    if (typeof value !== "string") invalidOption(["locale"], "type");
    if (!loaded.has(value as LocaleId))
      throw new PunctaConfigError(
        "locale.unavailable",
        "Locale is not loaded.",
        { locale: value },
        ["locale"],
      );
    return value as LocaleId;
  }
  const defaultLocale = selectLocale(options.locale);
  function text(source: string, call: TextOptions = {}): string | TextResult {
    if (typeof source !== "string")
      invalidOption(["source"], source === undefined ? "required" : "type");
    checkObject(call, ["locale", "detailed"]);
    if (call.detailed !== undefined && typeof call.detailed !== "boolean")
      invalidOption(["detailed"], "type");
    const locale = selectLocale(
      call.locale === undefined ? defaultLocale : call.locale,
    );
    const edits: TextResult["edits"][number][] = [];
    const result = source.replace(
      /(?<!\.)\.{3}(?!\.)/gu,
      (before, start: number) => {
        edits.push({
          kind: "replace",
          before,
          after: "…",
          locale,
          ruleIds: ["ellipsis"],
          ranges: [{ sourceId: 0, start, end: start + 3 }],
        });
        return "…";
      },
    );
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
    checkObject(call, ["locale", "detailed", "mode", "context"]);
    if (call.mode !== undefined && call.mode !== "fragment")
      invalidOption(["mode"], "value");
    if (call.context !== undefined && call.context !== "div")
      invalidOption(["context"], "value");
    // Validate even a fragment without text leaves.
    text("", { locale: call.locale, detailed: call.detailed });
    const report = transformHtml(
      source,
      (value) =>
        text(value, { locale: call.locale, detailed: true }) as TextResult,
    );
    return call.detailed ? report : report.result;
  }
  return Object.freeze({ text, html }) as PunctaInstance;
}
