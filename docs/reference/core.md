# Core reference

[Documentation index](../README.md)

Import public values and types from `@use-puncta/core`.
All operations are synchronous. Core operates without React or a browser DOM.
This page covers instance configuration and text/HTML return overloads.
Detailed source coordinates, HTML parameters, and SHY removal have pending slices.

## Runtime exports

### createPuncta

Signature (reference declaration, not an executable example):

```ts
function createPuncta(
  options: PunctaOptions & {
    readonly locales: readonly Locale[];
    readonly locale: LocaleId;
  },
): PunctaInstance;
```

`locales` supplies imported locale modules. `locale` selects the active loaded ID.
Both are required. Other fields use the [shared settings](settings.md#shared-fields).

The returned instance has `with`, `text`, `html`, and `stripSoftHyphens` methods.
It creates a snapshot of the registry, locale resources, and explicit settings.
Caller mutations cannot change it. No global registry exists.

Invalid modules cause `locale.incompatible`. Duplicate IDs cause `locale.duplicate`.
A selected ID missing from the registry causes `locale.unavailable`.
Missing fields, wrong types, unknown keys, and invalid values cause `config.invalid-option`.
Enabled insertion also validates its locale resource.

Import supported locale modules. Arbitrary locale objects and plugins are unsupported.

### PunctaConfigError

`PunctaConfigError` extends `Error`. Use `instanceof` to identify it.
Its `name` is `"PunctaConfigError"`.

Constructor signature (reference only):

```ts
new PunctaConfigError(
  code: string,
  message: string,
  details?: Readonly<Record<string, unknown>>,
  optionPath?: readonly (string | number)[],
  location?: ConfigLocation,
);
```

The readonly fields are `code`, `details`, `optionPath`, and `location`.
`message` comes from `Error`. Do not depend on its exact English text.
Defaults are `{}` for `details`, `[]` for `optionPath`, and
`{ kind: "unavailable", reason: "Configuration argument" }` for `location`.
`optionPath` identifies the invalid field. Numeric parts identify array entries.

For `config.invalid-option`, `details.reason` is `required`, `type`, `value`, or `unknown`.
See the [checked error example](settings.md#locale-dependent-validation).
The complete code and location catalogue is pending in the diagnostics slice.

## Instance methods

### with

Signature: `with(overrides: PunctaOptions): PunctaInstance`.

Supply an object, including `{}` for a variant with no changed settings.
The method returns an instance that operates independently with the same registry.
It does not change its parent. It cannot add locale modules.
Settings merge by field and receive validation immediately.
See [merge and reset rules](settings.md#inheritance-and-reset) and
[variant examples](../guides/configuration.md#change-settings-and-create-a-variant).

### text and html

Overload declarations (reference only):

```ts
text(source: string, options: TextOptions & { detailed: true }): TextResult;
text(source: string, options?: TextOptions & { detailed?: false }): string;
text(source: string, options: TextOptions): string | TextResult;

html(source: string, options: HtmlOptions & { detailed: true }): HtmlResult;
html(source: string, options?: HtmlOptions & { detailed?: false }): string;
html(source: string, options: HtmlOptions): string | HtmlResult;
```

`source` must be a string. Options default to `{}` and inherit instance settings.
`detailed` defaults to `false`. `true` returns a report. A boolean variable gives a union result type.

`TextOptions` adds `protect` and `detailed` to `PunctaOptions`.
`HtmlOptions` removes `protect` and adds `mode` and `context`.

HTML defaults to fragment mode with `div` context. Parsing does not sanitize HTML.
See the [existing HTML and protection details](../../packages/core/README.md).
Invalid source types or options cause `config.invalid-option`.
Invalid text protection ranges cause `protect.invalid-range`.

<!-- puncta:example core-results -->

```ts
import {
  createPuncta,
  type TextResult,
  type HtmlResult,
} from "@use-puncta/core";
import { enGb } from "@use-puncta/with-en-gb";

const puncta = createPuncta({ locales: [enGb], locale: enGb.id });
const ordinary: string = puncta.text("Wait...");
const explicitFalse: string = puncta.html("<p>Wait...</p>", {
  detailed: false,
});
const text: TextResult = puncta.text("Wait...", { detailed: true });
const html: HtmlResult = puncta.html("<p>Wait...</p>", { detailed: true });
function textResult(detailed: boolean): string | TextResult {
  return puncta.text("Wait...", { detailed });
}
function htmlResult(detailed: boolean): string | HtmlResult {
  return puncta.html("<p>Wait...</p>", { detailed });
}
console.log(ordinary, explicitFalse);
console.log(text.result, text.hasEdits, text.outputChanged);
console.log(html.result, html.hasEdits, html.outputChanged);
console.log(textResult(false), typeof textResult(true));
console.log(htmlResult(false), typeof htmlResult(true));
```

Output:

<!-- puncta:output core-results -->

```text
Wait… <p>Wait…</p>
Wait… true true
<p>Wait…</p> true true
Wait… object
<p>Wait…</p> object
```

### stripSoftHyphens

This method removes U+00AD independently of typography.
Its format-specific overloads and complete behavior belong to the pending hyphenation slice.
See [existing removal instructions](../../packages/core/README.md).

## Public type index

All types below are named type exports from `@use-puncta/core`.
The inventory compares this index with the source exports.
A pending definition is not complete coverage.

| Type                                                              | Definition and status                                                                                                                         |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `LocaleId`, `Locale`                                              | [Locale exports](locales-and-rules.md#locale-exports)                                                                                         |
| `PunctaOptions`                                                   | [Shared fields](settings.md#shared-fields)                                                                                                    |
| `RuleOptions`, `RulesOptions`                                     | [Rule fields](settings.md#rule-fields-and-defaults), grouping details pending                                                                 |
| `HyphenationOptions`                                              | [Locale validation](settings.md#locale-dependent-validation), insertion details pending                                                       |
| `PunctaInstance`                                                  | [Creation](#createpuncta) and [methods](#instance-methods), removal overloads pending                                                         |
| `TextOptions`, `HtmlOptions`                                      | [Text and HTML](#text-and-html), complete format parameters pending                                                                           |
| `StripTextOptions`, `StripHtmlOptions`, `StripSoftHyphensOptions` | Pending removal slice, [source declaration](../../packages/core/src/types.ts)                                                                 |
| `ProtectedRange`                                                  | Pending protection slice, [source declaration](../../packages/core/src/types.ts)                                                              |
| `RuleId`                                                          | Rule identifier union: ten [standard groups](locales-and-rules.md#rule-examples), `digitGrouping`, `hyphenation.insert`, `hyphenation.remove` |
| `TextResult`, `HtmlResult`                                        | [Reports](#reports), detailed coordinates pending                                                                                             |
| `Source`, `InputRange`, `TextRange`, `HtmlRange`                  | Pending diagnostics slice, [source declaration](../../packages/core/src/types.ts)                                                             |
| `Edit`, `AppliedRule`, `ConfigLocation`, `PunctaWarning`          | Pending diagnostics slice, [source declaration](../../packages/core/src/types.ts)                                                             |

## Reports

`TextResult` contains readonly `result: string`, `hasEdits: boolean`, and `outputChanged: boolean`.
It also contains readonly arrays: `edits: Edit[]`, `sources: Source[]`,
`appliedRules: AppliedRule[]`, and `warnings: PunctaWarning[]`.
`HtmlResult` has the same fields, with `Edit<HtmlRange>[]` for `edits`.

`hasEdits` means that typography changed source text.
`outputChanged` compares the complete output string with the input.
HTML serialization can change output without typography edits.

Warnings can occur again when the text does not change.
The diagnostics slice will define report fields and coordinates in full.
