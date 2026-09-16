import { checkObject, invalidOption, PunctaConfigError } from "./config.js";
import type { LocaleId, PunctaOptions } from "./types.js";

export const sharedKeys = ["locale", "enabled", "rules", "hyphenation"];
const groups = {
  quotes: { enabled: true, normalizeExisting: true },
  apostrophes: { enabled: true },
  spaces: { enabled: true },
  ellipsis: { enabled: true },
  dashes: { enabled: true, normalizeExisting: true },
  ranges: { enabled: true, standalone: false },
  minus: { enabled: true },
  units: { enabled: true, additional: [] },
  percentages: { enabled: true, space: "none" },
  currencies: { enabled: true },
};
type Fields = Record<string, boolean | number | string | readonly string[]>;
export interface Settings {
  readonly locale: LocaleId;
  readonly enabled: boolean;
  readonly rules: Record<string, Fields>;
  readonly hyphenation: Fields;
}

/** Keep only explicit fields. Locale defaults are resolved afresh, never inherited. */
export function mergeSettings(
  parent: Settings,
  input: PunctaOptions,
  loaded: ReadonlySet<LocaleId>,
): Settings {
  const locale = input.locale === undefined ? parent.locale : input.locale;
  if (typeof locale !== "string") invalidOption(["locale"], "type");
  if (!loaded.has(locale))
    throw new PunctaConfigError(
      "locale.unavailable",
      "Locale is not loaded.",
      { locale },
      ["locale"],
    );
  if (input.enabled !== undefined && typeof input.enabled !== "boolean")
    invalidOption(["enabled"], "type");
  const rules = { ...parent.rules };
  if (input.rules !== undefined) {
    checkObject(input.rules, Object.keys(groups), ["rules"]);
    for (const [name, patch] of Object.entries(input.rules)) {
      if (patch === undefined) continue;
      rules[name] = mergeFields(
        parent.rules[name] ?? {},
        patch,
        groups[name as keyof typeof groups],
        ["rules", name],
      );
    }
  }
  const hyphenation =
    input.hyphenation === undefined
      ? parent.hyphenation
      : mergeFields(
          parent.hyphenation,
          input.hyphenation,
          hyphenationDefaults(locale),
          ["hyphenation"],
        );
  // An inherited explicit minimum must also be valid in the newly selected locale.
  const { enabled: _enabled, ...minima } = hyphenationDefaults(locale);
  for (const [key, minimum] of Object.entries(minima)) {
    const value = hyphenation[key];
    if (
      value !== undefined &&
      (typeof value !== "number" || !Number.isInteger(value) || value < minimum)
    )
      invalidOption(["hyphenation", key], "value");
  }
  return Object.freeze({
    locale,
    enabled: input.enabled ?? parent.enabled,
    rules: Object.freeze(rules),
    hyphenation,
  });
}

function hyphenationDefaults(locale: LocaleId) {
  return {
    enabled: false,
    minWordLength: 6,
    minLeft: 2,
    minRight: locale === "en-gb" ? 3 : 2,
  };
}

/** Defaults belong to the current locale; this resolved view is never inherited. */
export function resolveSettings(settings: Settings): Settings {
  return {
    ...settings,
    rules: Object.fromEntries(
      Object.entries(groups).map(([name, defaults]) => [
        name,
        {
          ...defaults,
          ...(name === "percentages"
            ? { space: settings.locale === "es-es" ? "nbsp" : "none" }
            : {}),
          ...settings.rules[name],
        },
      ]),
    ),
    hyphenation: {
      ...hyphenationDefaults(settings.locale),
      ...settings.hyphenation,
    },
  };
}

function mergeFields(
  parent: Fields,
  patch: unknown,
  defaults: Fields,
  path: string[],
): Fields {
  if (patch === null) return Object.freeze({});
  checkObject(patch, Object.keys(defaults), path);
  const result = { ...parent };
  for (const [key, value] of Object.entries(patch as Record<string, unknown>)) {
    if (value === undefined) continue;
    if (value === null) {
      delete result[key];
      continue;
    }
    const fieldPath = [...path, key];
    if (key === "additional") {
      if (!Array.isArray(value)) invalidOption(fieldPath, "type");
      const units: string[] = [];
      for (const [index, unit] of value.entries()) {
        if (typeof unit !== "string")
          invalidOption([...fieldPath, index], "type");
        if (!unit || unit.trim() !== unit || /\p{Cc}/u.test(unit))
          invalidOption([...fieldPath, index], "value");
        if (!units.includes(unit)) units.push(unit);
      }
      result[key] = Object.freeze(units);
    } else {
      if (typeof value !== typeof defaults[key])
        invalidOption(fieldPath, "type");
      if (key === "space" && value !== "none" && value !== "nbsp")
        invalidOption(fieldPath, "value");
      result[key] = value as boolean | number | string;
    }
  }
  return Object.freeze(result);
}
