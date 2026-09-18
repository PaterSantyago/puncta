# Settings reference

[Documentation index](../README.md)

This page defines shared settings and all eleven typography rule groups.
The [configuration guide](../guides/configuration.md) shows complete examples.
The hyphenation guide is pending.
Their current details remain in the [core package instructions](../../packages/core/README.md).

## Configuration surfaces

| Surface                     | Accepted settings                                              | Limits                                                      |
| --------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------- |
| `createPuncta`              | `locales`, plus all `PunctaOptions` fields                     | `locales` and `locale` required                             |
| `instance.with`             | `PunctaOptions`                                                | Cannot change `locales`                                     |
| `instance.text`             | `TextOptions`: shared fields, `protect`, `detailed`            | String input, protection applies only to this call          |
| `instance.html`             | `HtmlOptions`: shared fields, `mode`, `context`, `detailed`    | No `protect`                                                |
| `instance.stripSoftHyphens` | `StripSoftHyphensOptions`: text or HTML options, plus `format` | Format selects valid options. See pending removal reference |
| React pure calls            | `instance`, shared fields, `detailed`                          | No `protect`, `mode`, `context`, or `format`                |
| React components            | `locale`, `enabled`, `options: { rules, hyphenation }`         | Root instance required, no `detailed`                       |
| HTML markers                | `data-puncta`, `data-puncta-locale`, `data-puncta-options`     | JSON options accept only `rules` and `hyphenation`          |

`locales` is a readonly array of imported `Locale` modules.
It defines the registry at creation. A call cannot add a locale.
See [locale exports](locales-and-rules.md#locale-exports).
See [text/HTML parameters](core.md#format-parameters) and [HTML procedures](../guides/html.md).
React and removal procedures stay in their pending slices.

## Shared fields

`PunctaOptions` has these optional readonly fields:

| Field         | Type and permitted values                          | Initial default                          |
| ------------- | -------------------------------------------------- | ---------------------------------------- |
| `locale`      | `LocaleId`: `"en-gb"` or `"es-es"`, must be loaded | Required at creation, otherwise inherits |
| `enabled`     | `boolean`                                          | `true`                                   |
| `rules`       | `RulesOptions` object                              | Locale defaults for each group           |
| `hyphenation` | `HyphenationOptions` object or `null`              | Insertion off                            |

Unknown option names cause an error, even when their value is `undefined`.
Puncta rejects whole options objects that are `null`, arrays, or non-objects.
It also rejects `rules: null`, `locale: null`, and `enabled: null`.
Rule groups do not accept boolean shorthand.
Use `{ enabled: false }` inside a rule group.

## Rule fields and defaults

`RuleOptions` contains `readonly enabled?: boolean | null`.
`RulesOptions` has the optional groups below. Each group accepts `null`.
All group fields are optional and readonly. Each field also accepts `null`.
An omitted field or explicit `undefined` inherits its explicit parent value.

| Group           | Fields and permitted values                                           | Default in both locales, unless specified                   |
| --------------- | --------------------------------------------------------------------- | ----------------------------------------------------------- |
| `quotes`        | `enabled: boolean`, `normalizeExisting: boolean`                      | `true`, `true`                                              |
| `apostrophes`   | `enabled: boolean`                                                    | `true`                                                      |
| `spaces`        | `enabled: boolean`                                                    | `true`                                                      |
| `ellipsis`      | `enabled: boolean`                                                    | `true`                                                      |
| `dashes`        | `enabled: boolean`, `normalizeExisting: boolean`                      | `true`, `true`                                              |
| `ranges`        | `enabled: boolean`, `standalone: boolean`                             | `true`, `false`                                             |
| `minus`         | `enabled: boolean`                                                    | `true`                                                      |
| `units`         | `enabled: boolean`, `additional: readonly string[]`                   | `true`, `[]`                                                |
| `percentages`   | `enabled: boolean`, `space: "none" \| "nbsp"`                         | `true`, `"none"` in en-gb, `"nbsp"` in es-es                |
| `currencies`    | `enabled: boolean`                                                    | `true`                                                      |
| `digitGrouping` | `enabled: boolean`, `minDigits: number`, `normalizeExisting: boolean` | `false`, `5`, `true`. See [digit grouping](#digit-grouping) |

`normalizeExisting: false` keeps existing formatted quote pairs or dash styles.
It still converts straight quotes or explicit double-hyphen markers.
Use `standalone: true` for numeric ranges without a known unit.
`space` controls the number/percentage interval: no space or U+00A0 NBSP.

`additional` adds literal, case-sensitive, complete unit designations.
Each string must be nonempty, without edge whitespace or control characters.
Puncta removes exact duplicates. A new array replaces inherited additions.
Built-in units stay available. An empty array removes additions only.

Additional units do not change the percentage, currency, or angle-degree roles.
See [rule behavior](locales-and-rules.md#units).

## Inheritance and reset

Puncta stores explicit values independently of locale defaults.
The effective value comes from the nearest explicit setting, or the current locale default.
A locale change keeps explicit values.

| Input                                           | Effect                                                     |
| ----------------------------------------------- | ---------------------------------------------------------- |
| Field or group omitted                          | Inherit explicit parent settings                           |
| Field or group `undefined`                      | Same as omission                                           |
| Field `null`, such as `percentages.space: null` | Remove that explicit field. Use the current locale default |
| Group `null`, such as `ellipsis: null`          | Remove all explicit fields in that group                   |
| `hyphenation: null`                             | Remove all explicit hyphenation fields                     |
| `rules: {}`                                     | Inherit, does not reset all rules                          |
| `rules: null`                                   | Invalid whole-object reset                                 |
| `additional: []`                                | Replace inherited additions with an empty array            |
| `additional: null`                              | Reset additions to the default empty array                 |

These rules apply at creation, in variants, in calls, and in active nested scopes.
Later caller mutations cannot change the settings in an instance.
See the [checked examples](../guides/configuration.md).

## Locale-dependent validation

`HyphenationOptions` has optional readonly nullable fields:
`enabled: boolean`, `minWordLength: number`, `minLeft: number`, and `minRight: number`.
The default is `{ enabled: false, minWordLength: 6, minLeft: 2, minRight: 3 }` in en-gb.
In es-es, `minRight` defaults to `2`.
Minima must be integers at least as large as the current locale default.

A locale change revalidates explicit inherited minima, even when insertion is off.
Reset an invalid inherited minimum before the locale change, or in the same override.
The hyphenation slice will explain insertion resources and word limits.

<!-- puncta:example settings-validation -->

```ts
import { createPuncta, PunctaConfigError } from "@use-puncta/core";
import { enGb } from "@use-puncta/with-en-gb";
import { esEs } from "@use-puncta/with-es-es";

const puncta = createPuncta({
  locales: [enGb, esEs],
  locale: esEs.id,
  hyphenation: { enabled: false, minRight: 2 },
});
try {
  puncta.with({ locale: enGb.id, enabled: false });
} catch (error) {
  if (!(error instanceof PunctaConfigError)) throw error;
  console.log(error.code, error.optionPath.join("."), error.details.reason);
}
console.log(
  puncta
    .with({ locale: enGb.id, hyphenation: { minRight: null } })
    .text("Wait..."),
);
try {
  // @ts-expect-error Whole rules objects cannot be null.
  puncta.with({ enabled: false, rules: null });
} catch (error) {
  if (!(error instanceof PunctaConfigError)) throw error;
  console.log(error.code, error.optionPath.join("."), error.details.reason);
}
```

Output:

<!-- puncta:output settings-validation -->

```text
config.invalid-option hyphenation.minRight value
Wait…
config.invalid-option rules type
```

## Validation when disabled

Explicit API options still receive validation when `enabled` is `false`.
The same applies to fields in disabled rule groups.
Protected or disabled markup subtrees skip their declarative configuration parsing.
This differs from an explicit API argument.
See [configuration failures](../troubleshooting.md#configuration-fails).

## HTML markers

These attributes apply to active HTML elements.
Each explicit marker starts a new scope, with inherited explicit settings and the selected locale defaults.
Each attribute can operate without a `data-puncta=""` marker.

| Attribute             | Valid values                                    | Effect                                                                |
| --------------------- | ----------------------------------------------- | --------------------------------------------------------------------- |
| `data-puncta`         | Empty string or `"off"`                         | Empty string starts a scope. `"off"` protects the full subtree        |
| `data-puncta-locale`  | Loaded `"en-gb"` or `"es-es"` ID                | Selects the locale, with priority over `lang`                         |
| `data-puncta-options` | JSON object with only `rules` and `hyphenation` | Applies the shared merge, reset, and validation rules                 |
| `lang`                | Language tag                                    | Selects a supported loaded locale, or stops typography with a warning |

`data-puncta="on"` and `data-puncta="true"` are invalid.
The JSON object cannot contain `locale`, `enabled`, `detailed`, or format parameters.
Malformed JSON causes `markup.invalid-config`.
JSON scalars, arrays, `null`, unknown fields, or invalid option values cause `config.invalid-option`.
The empty object `{}` is valid and keeps inherited explicit settings.

`lang` accepts `en` and `en-gb` for en-gb, or `es` and `es-es` for es-es.
These aliases are not case-sensitive. They do not load a locale module.
Other valid tags have no locale alias. An example is `en-US`.

Empty, invalid, unsupported, or unloaded language values keep that region's text unchanged.
They produce `markup.language-unavailable`, with reason `empty`, `invalid`, `unsupported`, or `not-loaded`.

A supported nested language can start typography again in an unavailable-language region.
Invalid explicit settings there still cause configuration errors.
A `lang` attribute alone that selects the current locale keeps inline context.
An explicit marker creates an independent scope even when the effective settings do not change.

Protection has priority over all descendant markers.
`data-puncta="off"` also has priority over other markers on the same element.
Puncta does not read their JSON or locale values.
The same exclusion applies to automatically protected elements and disabled HTML input.
See [nested examples](../guides/html.md#use-markers-and-languages) and [protection](../guides/protection.md).

## Digit grouping

`rules.digitGrouping` uses the [configuration surfaces](#configuration-surfaces) and [reset rules](#inheritance-and-reset) on this page.
`minDigits` must be a safe integer from `4` through `Number.MAX_SAFE_INTEGER`. Both limits are permitted.
Fractions, `NaN`, infinities, and out-of-range values are invalid.
`enabled` and `normalizeExisting` accept booleans.
The defaults in the rule table apply to both locales.

All three fields accept `null` and `undefined`.
The group accepts an object, `null`, or `undefined`. Boolean shorthand is invalid.
Omitted or `undefined` fields inherit explicit values.

A `null` field removes its explicit value and uses the current locale default.
A `null` group resets all three fields. `rules: null` is invalid.

`minDigits` and `normalizeExisting` do not enable grouping by themselves.
A locale change keeps explicit values and resolves unset fields from the new locale.
Rule disable/enable changes keep explicit threshold and normalization settings.
With `normalizeExisting: false`, existing groups keep their spelling, but ungrouped eligible numbers can change.
See the [notation rules](locales-and-rules.md#digit-grouping) for recognition and threshold details.

Invalid explicit settings cause `PunctaConfigError` with `code: "config.invalid-option"`, even when processing or the rule is disabled.
`details.reason` is `"type"` for an incorrect type, `"value"` for an invalid number, or `"unknown"` for an unknown field.
`optionPath` identifies the field. The program below checks disabled processing.

<!-- puncta:example grouping-validation -->

```ts
import { createPuncta } from "@use-puncta/core";
import { enGb } from "@use-puncta/with-en-gb";

import { PunctaConfigError } from "@use-puncta/core";
const puncta = createPuncta({ locales: [enGb], locale: enGb.id });
try {
  puncta.text("12345", {
    enabled: false,
    rules: { digitGrouping: { minDigits: 3 } },
  });
} catch (error) {
  if (!(error instanceof PunctaConfigError)) throw error;
  console.log(error.code, error.optionPath.join("."), error.details.reason);
}
```

<!-- puncta:output grouping-validation -->

```text
config.invalid-option rules.digitGrouping.minDigits value
```

Protected declarative content is not inspected.
An HTML `data-puncta="off"` marker has priority over options on the same host.
Running React components still validate their own props.
SHY removal validates shared settings but does not group digits or produce grouping warnings.
See [protection](../guides/protection.md) and [React validation](react.md#check-configuration-failures).
