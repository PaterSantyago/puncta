import { instanceScope } from "../../shared/scopes.js";
import { checkObject, invalidOption, PunctaConfigError } from "./config.js";
import { transformHtml } from "./html.js";
import {
  insertHyphens,
  requireResource,
  snapshotResource,
  type WordEdges,
} from "./hyphenation.js";
import { protectedRanges } from "./protection.js";
import {
  mergeSettings,
  resolveSettings,
  type Settings,
  sharedKeys,
} from "./settings.js";
import { removeSoftHyphens } from "./strip-soft-hyphens.js";
import type {
  Edit,
  HtmlOptions,
  HtmlResult,
  Locale,
  LocaleId,
  ProtectedRange,
  PunctaInstance,
  PunctaOptions,
  RuleId,
  StripSoftHyphensOptions,
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
  const resources = new Map<LocaleId, ReturnType<typeof snapshotResource>>();
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
    resources.set(locale.id, snapshotResource(locale));
  }
  if (options.locale === undefined) invalidOption(["locale"], "required");
  const initial = mergeSettings(
    { locale: options.locale, enabled: true, rules: {}, hyphenation: {} },
    options,
    loaded,
  );
  return makeInstance(initial);
  function makeInstance(
    settings: Settings,
    operation: "typography" | "remove" = "typography",
  ): PunctaInstance {
    const recognition =
      operation === "remove"
        ? {
            text: removeSoftHyphens,
            segment: removeSoftHyphens,
            quotation: () => ({ edits: [], warnings: [] }),
            requiresResource: false,
          }
        : {
            text: typography,
            segment: segmentTypography,
            quotation: quotationTypography,
            requiresResource: true,
          };
    function validateResource(effective: Settings) {
      return recognition.requiresResource
        ? requireResource(resources.get(effective.locale), effective)
        : undefined;
    }
    validateResource(settings);
    function text(
      source: string,
      call: TextOptions = {},
      initialLineStart = true,
      recognize: typeof typography = recognition.text,
      includeHyphenation = true,
    ): string | TextResult {
      if (typeof source !== "string")
        invalidOption(["source"], source === undefined ? "required" : "type");
      checkObject(call, [...sharedKeys, "detailed", "protect"]);
      const protection = protectedRanges(source, call.protect);
      if (call.detailed !== undefined && typeof call.detailed !== "boolean")
        invalidOption(["detailed"], "type");
      const effective = resolveSettings(mergeSettings(settings, call, loaded));
      const resource = validateResource(effective);
      const { locale } = effective;
      const { edits, warnings, apostrophes } = recognize(
        source,
        effective,
        protection,
        initialLineStart,
      );
      if (includeHyphenation && recognition.requiresResource) {
        const insertion = insertHyphens(
          source,
          effective,
          protection,
          edits,
          resource,
          undefined,
          apostrophes,
        );
        edits.push(...insertion.edits);
        warnings.push(...insertion.warnings);
      }
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
      // Disjoint edits already follow original source order. Assemble once rather
      // than copying a growing result for every separator in a long number.
      const pieces: string[] = [];
      let cursor = 0;
      for (const edit of edits) {
        const range = edit.ranges[0];
        pieces.push(source.slice(cursor, range.start), edit.after);
        cursor = range.end;
      }
      pieces.push(source.slice(cursor));
      const result = pieces.join("");
      if (!call.detailed) return result;
      return {
        ...(!includeHyphenation ? { apostrophes } : {}),
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
      if (
        call.mode !== undefined &&
        call.mode !== "fragment" &&
        call.mode !== "document"
      )
        invalidOption(["mode"], "value");
      // Validate even a fragment without text leaves.
      const { mode: _mode, context: _context, ...textCall } = call;
      text("", textCall);
      const report = transformHtml(
        source,
        instanceScope(
          makeInstance(mergeSettings(settings, textCall, loaded), operation),
        ),
        call,
      );
      return call.detailed ? report : report.result;
    }
    return Object.freeze({
      text,
      html,
      stripSoftHyphens(
        source: string,
        call: StripSoftHyphensOptions = {},
      ): string | TextResult | HtmlResult {
        checkObject(call, [
          ...sharedKeys,
          "detailed",
          "format",
          "protect",
          "mode",
          "context",
        ]);
        const { format = "text", ...options } = call;
        if (format !== "text" && format !== "html")
          invalidOption(["format"], "value");
        const removal = makeInstance(settings, "remove");
        return format === "html"
          ? removal.html(source, options)
          : removal.text(source, options);
      },
      with(overrides: PunctaOptions) {
        checkObject(overrides, sharedKeys);
        return makeInstance(
          mergeSettings(settings, overrides, loaded),
          operation,
        );
      },
      [Symbol.for("@use-puncta/scope")]: Object.freeze({
        removal: (overrides: PunctaOptions) => {
          checkObject(overrides, sharedKeys);
          return makeInstance(
            mergeSettings(settings, overrides, loaded),
            "remove",
          );
        },
        locale: settings.locale,
        enabled: settings.enabled,
        // Private adapter entry keeps structural line context out of public options.
        transform: Object.freeze({
          segment: (source: string, initialLineStart: boolean) =>
            text(
              source,
              { detailed: true },
              initialLineStart,
              recognition.segment,
              false,
            ),
          quotation: (source: string) =>
            text(
              source,
              { detailed: true },
              true,
              recognition.quotation,
              false,
            ),
          // Adapters need no edit projection for an inactive insertion pass.
          insertions: !resolveSettings(settings).hyphenation.enabled
            ? undefined
            : (
                source: string,
                edits: readonly Edit[],
                edges: WordEdges,
                apostrophes: readonly ProtectedRange[],
              ) =>
                insertHyphens(
                  source,
                  resolveSettings(settings),
                  [],
                  edits,
                  validateResource(settings),
                  edges,
                  apostrophes,
                ),
        }),
      }),
    }) as PunctaInstance;
  }
}
