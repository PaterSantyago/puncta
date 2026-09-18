# Settings reference

[Documentation index](../README.md)

This page defines shared settings and the ten standard typography rule groups.
The [configuration guide](../guides/configuration.md) shows complete examples.
The digit-grouping and hyphenation guides are pending.
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
The HTML, React, protection, and removal slices will complete their format-specific procedures.

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

| Group           | Fields and permitted values                         | Default in both locales, unless specified                                        |
| --------------- | --------------------------------------------------- | -------------------------------------------------------------------------------- |
| `quotes`        | `enabled: boolean`, `normalizeExisting: boolean`    | `true`, `true`                                                                   |
| `apostrophes`   | `enabled: boolean`                                  | `true`                                                                           |
| `spaces`        | `enabled: boolean`                                  | `true`                                                                           |
| `ellipsis`      | `enabled: boolean`                                  | `true`                                                                           |
| `dashes`        | `enabled: boolean`, `normalizeExisting: boolean`    | `true`, `true`                                                                   |
| `ranges`        | `enabled: boolean`, `standalone: boolean`           | `true`, `false`                                                                  |
| `minus`         | `enabled: boolean`                                  | `true`                                                                           |
| `units`         | `enabled: boolean`, `additional: readonly string[]` | `true`, `[]`                                                                     |
| `percentages`   | `enabled: boolean`, `space: "none" \| "nbsp"`       | `true`, `"none"` in en-gb, `"nbsp"` in es-es                                     |
| `currencies`    | `enabled: boolean`                                  | `true`                                                                           |
| `digitGrouping` | Dedicated reference pending                         | Off, see [existing details](../../packages/core/README.md#opt-in-digit-grouping) |

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
