import type { PunctaConfigError } from "../core/src/config.js";
import type {
  ConfigLocation,
  LocaleId,
  PunctaInstance,
  PunctaOptions,
  PunctaWarning,
} from "../core/src/types.js";

export interface Scope {
  readonly instance: PunctaInstance;
  readonly locale: LocaleId | null;
  readonly protected: boolean;
}

/** Private cross-package metadata: immutable and bundled, not a public export.
 * It carries scope identity, never the registry, resources, or mutable settings. */
export function requireInstance(
  instance: unknown,
  ErrorType: typeof PunctaConfigError,
): asserts instance is PunctaInstance {
  if (instance === undefined)
    throw new ErrorType(
      "instance.missing",
      "A Puncta instance is required.",
      {},
      ["instance"],
    );
  if (
    !instance ||
    typeof instance !== "object" ||
    typeof Reflect.get(instance, "text") !== "function" ||
    typeof Reflect.get(instance, "with") !== "function" ||
    !Reflect.get(instance, Symbol.for("@use-puncta/scope"))
  )
    throw new ErrorType(
      "config.invalid-option",
      "Invalid Puncta instance.",
      { reason: "type" },
      ["instance"],
    );
}

export function instanceScope(instance: PunctaInstance): Scope {
  const metadata = Reflect.get(instance, Symbol.for("@use-puncta/scope")) as {
    locale: LocaleId;
    enabled: boolean;
  };
  return { instance, locale: metadata.locale, protected: !metadata.enabled };
}

export function scopeTransform(scope: Scope) {
  return (text: string) =>
    scope.instance.text(text, {
      detailed: true,
      ...(scope.locale === null || scope.protected ? { enabled: false } : {}),
    });
}

/** Resolve host markers once for both adapters; protection is checked by the caller first. */
export function hostScope(
  parent: Scope,
  attributes: Readonly<Record<string, unknown>>,
  location: (name: string) => ConfigLocation,
  warnings: PunctaWarning[],
  ErrorType: typeof PunctaConfigError,
): Scope {
  if (parent.protected) return parent;
  if (attributes["data-puncta"] === "off")
    return { ...parent, protected: true };
  const markerNames = [
    "data-puncta",
    "data-puncta-locale",
    "data-puncta-options",
  ];
  const present = (name: string) => attributes[name] !== undefined;
  const explicit = markerNames.some(present);
  if (!explicit && !present("lang")) return parent;
  function fail(
    name: string,
    code: string,
    details: Record<string, unknown>,
    path: readonly (string | number)[] = [],
  ): never {
    throw new ErrorType(
      code,
      "Invalid markup configuration.",
      details,
      path,
      location(name),
    );
  }
  if (present("data-puncta") && attributes["data-puncta"] !== "")
    fail(
      "data-puncta",
      "config.invalid-option",
      {
        reason:
          typeof attributes["data-puncta"] === "string" ? "value" : "type",
      },
      ["data-puncta"],
    );
  let overrides: PunctaOptions = {};
  if (present("data-puncta-options")) {
    const json = attributes["data-puncta-options"];
    if (typeof json !== "string")
      fail("data-puncta-options", "config.invalid-option", { reason: "type" }, [
        "data-puncta-options",
      ]);
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      fail("data-puncta-options", "markup.invalid-config", {});
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      fail("data-puncta-options", "config.invalid-option", { reason: "type" });
    for (const key of Object.keys(parsed))
      if (key !== "rules" && key !== "hyphenation")
        fail(
          "data-puncta-options",
          "config.invalid-option",
          { reason: "unknown" },
          [key],
        );
    overrides = parsed as PunctaOptions;
  }
  let locale = parent.locale;
  let localeAttribute: string | undefined;
  if (present("data-puncta-locale")) {
    overrides = {
      ...overrides,
      locale: attributes["data-puncta-locale"] as LocaleId,
    };
    localeAttribute = "data-puncta-locale";
  } else if (present("lang")) {
    const value = attributes.lang;
    let reason: "empty" | "invalid" | "unsupported" | "not-loaded" | undefined;
    if (value === "") reason = "empty";
    else if (typeof value !== "string") reason = "invalid";
    else {
      try {
        Intl.getCanonicalLocales(value);
      } catch {
        reason = "invalid";
      }
      if (!reason) {
        const aliases: Record<string, LocaleId> = {
          en: "en-gb",
          "en-gb": "en-gb",
          es: "es-es",
          "es-es": "es-es",
        };
        const id = aliases[value.toLowerCase()];
        if (!id) reason = "unsupported";
        else {
          // Probe registry membership independently from inherited language minima.
          try {
            parent.instance.with({ locale: id, hyphenation: null });
          } catch (error) {
            if (
              error instanceof ErrorType &&
              error.code === "locale.unavailable"
            )
              reason = "not-loaded";
            else throw error;
          }
          if (!reason) {
            overrides = { ...overrides, locale: id };
            localeAttribute = "lang";
          }
        }
      }
    }
    if (reason) {
      locale = null;
      warnings.push({
        code: "markup.language-unavailable",
        source: "markup",
        message: "Language is unavailable.",
        details: { value, reason },
        locale: null,
        ruleId: null,
        location: location("lang"),
      });
    }
  }
  let instance: PunctaInstance;
  try {
    instance = parent.instance.with(overrides);
  } catch (error) {
    if (error instanceof ErrorType)
      throw new ErrorType(
        error.code,
        error.message,
        error.details,
        error.optionPath,
        location(
          error.optionPath[0] === "locale"
            ? (localeAttribute ?? "data-puncta-locale")
            : present("data-puncta-options")
              ? "data-puncta-options"
              : (localeAttribute ?? "data-puncta"),
        ),
      );
    throw error;
  }
  if (overrides.locale !== undefined) locale = overrides.locale;
  if (!explicit && locale === parent.locale) return parent;
  return { instance, locale, protected: false };
}
