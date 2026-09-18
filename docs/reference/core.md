# Core reference

[Documentation index](../README.md)

Import public values and types from `@use-puncta/core`.
All operations are synchronous. Core operates without React or a browser DOM.
This page covers instance configuration, text/HTML parameters, and return overloads.
See [diagnostics](diagnostics.md) for report fields and original source coordinates.

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
See the [error catalogue](diagnostics.md#errors) and [location union](diagnostics.md#configlocation).

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
See the [HTML guide](../guides/html.md) and [protection guide](../guides/protection.md).
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

### Format parameters

Reference declarations (not executable examples):

```ts
interface ProtectedRange {
  readonly start: number;
  readonly end: number;
}
interface TextOptions extends PunctaOptions {
  readonly protect?: readonly ProtectedRange[];
  readonly detailed?: boolean;
}
interface HtmlOptions extends Omit<TextOptions, "protect"> {
  readonly mode?: "fragment" | "document";
  readonly context?: string;
}
```

| Parameter  | Default            | Valid input and applicability                             |
| ---------- | ------------------ | --------------------------------------------------------- |
| `source`   | Necessary          | String for both methods. An empty string is permitted     |
| `detailed` | `false`            | Boolean for both methods, selects the return overload     |
| `protect`  | No explicit ranges | Readonly array of `ProtectedRange`, plain text only       |
| `mode`     | `"fragment"`       | `"fragment"` or `"document"`, HTML only                   |
| `context`  | `"div"`            | Supported lowercase HTML element name, fragment mode only |

The shared fields come from [PunctaOptions](settings.md#shared-fields).
Omitted format parameters or explicit `undefined` use their defaults.
`null` is invalid for these parameters.
Whole call options must be an object, not `null` or an array.
Unknown fields are invalid. This also applies to fields from a different format.

For `context`, use a supported HTML name. Examples are `div`, `table`, `tbody`, `tr`, `title`, and `code`.
The [element lists](../guides/html.md#supported-element-names) define all supported names.
The context affects parsing only, without a wrapper or inherited protection.
Unknown or custom names, uppercase names, `svg`, and `math` are invalid.

An explicit `context` is invalid in document mode, even `"div"`.
See the [mode examples](../guides/html.md#select-fragment-or-document).

### ProtectedRange

Each range has readonly numeric `start` and `end` fields.
They refer to the original source in UTF-16 units.
The interval includes `start` and excludes `end`.
Both must be integers at grapheme boundaries, with `0 <= start <= end <= source.length`.
Additional range fields, missing fields, and non-object entries are invalid.

Puncta sorts a private copy and combines adjacent or overlapping ranges.
Empty valid ranges have no effect. The input array stays unchanged.
An incorrect `protect` container type causes `config.invalid-option`.
An invalid entry causes `protect.invalid-range`, with its index in `details.index` and `optionPath`.
Validation applies even when typography is disabled.

`protect` is available on `text()` and text-format `stripSoftHyphens()` calls.
It is not available on HTML, instances, or React surfaces.
See the [original-offset example](../guides/protection.md#protect-original-text-ranges).

### Format validation

Explicit source and options receive validation before typography, even for empty or protected input.
Invalid source types, mode values, contexts, or options cause `config.invalid-option`.
The fields in a disabled rule group must still be valid.
The [shared validation rules](settings.md#validation-when-disabled) also apply.

Active HTML markers receive validation during traversal.
Invalid JSON causes `markup.invalid-config`.
Invalid marker values or JSON option fields cause `config.invalid-option`.
An explicit locale missing from the registry causes `locale.unavailable`.
Protected elements and off subtrees skip their declarative configuration.
An unavailable `lang` produces a warning instead of an explicit locale error.

<!-- puncta:example core-format-validation -->

```ts
import { createPuncta, PunctaConfigError } from "@use-puncta/core";
import { enGb } from "@use-puncta/with-en-gb";

const puncta = createPuncta({ locales: [enGb], locale: enGb.id });
const calls = [
  () =>
    puncta.text("😀 Wait...", {
      enabled: false,
      protect: [{ start: 1, end: 2 }],
    }),
  () => puncta.html("", { enabled: false, mode: "document", context: "div" }),
  // @ts-expect-error HTML calls cannot use text protection ranges.
  () => puncta.html("<code>Wait...</code>", { protect: [] }),
  () => puncta.html('<span data-puncta-options="bad">Wait...</span>'),
];
for (const call of calls) {
  try {
    call();
  } catch (error) {
    if (!(error instanceof PunctaConfigError)) throw error;
    console.log(error.code, JSON.stringify(error.optionPath));
  }
}
```

Output:

<!-- puncta:output core-format-validation -->

```text
protect.invalid-range ["protect",0]
config.invalid-option ["context"]
config.invalid-option ["protect"]
markup.invalid-config []
```

The first range splits the emoji's surrogate pair.
A range in a decomposed letter/accent grapheme also fails.
The API and marker errors identify different configuration locations.
See [location definitions](diagnostics.md#configlocation).

### stripSoftHyphens

Call `instance.stripSoftHyphens(source, options?)` synchronously with a string.
It removes U+00AD from text that it can process, without typography or digit grouping.
`format` defaults to `"text"`. The method returns a string unless `detailed` is true.
These declarations show all six overloads:

```ts
stripSoftHyphens(source: string, options: StripHtmlOptions & { detailed: true }): HtmlResult;
stripSoftHyphens(source: string, options: StripTextOptions & { detailed: true }): TextResult;
stripSoftHyphens(source: string, options?: StripSoftHyphensOptions & { detailed?: false }): string;
stripSoftHyphens(source: string, options: StripHtmlOptions): string | HtmlResult;
stripSoftHyphens(source: string, options: StripTextOptions): string | TextResult;
stripSoftHyphens(source: string, options: StripSoftHyphensOptions): string | TextResult | HtmlResult;
```

A boolean `detailed` value gives the format-specific union.
If both formats are permitted in the options type, both report types are also permitted in the return type.
The options types have these fields:

| Type                      | Fields and defaults                                                                                                               |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `StripTextOptions`        | All `TextOptions` fields plus optional readonly `format: "text"`. Accepts `protect` and `detailed`. Rejects `mode` and `context`. |
| `StripHtmlOptions`        | All `HtmlOptions` fields plus required readonly `format: "html"`. Accepts `mode`, `context`, and `detailed`. Rejects `protect`.   |
| `StripSoftHyphensOptions` | Union of the two types above. `format` selects the applicable type.                                                               |

Both formats inherit shared settings from the instance.
See [format parameters](#format-parameters) for mode, context, protection, and detailed defaults and validation.
A missing options object means `{}`. An object set to `null`, unknown fields, and invalid format values are invalid.
Settings and locale minima validation apply even when removal is disabled.
Invalid options throw `PunctaConfigError` with `config.invalid-option` or the applicable locale/protection code.

Removal needs no insertion resource and does not depend on `hyphenation.enabled`.
Shared `enabled: false` prevents removal.
Protected text, technical tokens, HTML attributes, disabled scopes, and unavailable-language regions keep SHY.
The HTML parser and serializer also operate.
See [text and HTML removal examples](../guides/hyphenation.md#remove-shy-from-text).

Reports use `hyphenation.remove` deletion edits with original UTF-16 ranges.
`hasEdits` includes these deletions. `outputChanged` compares the result with the input string.
HTML serialization can change the output without a removal edit.
Insertion through `text()` or `html()` instead uses `hyphenation.insert` edits after typography.
Puncta gives an insertion at a transparent leaf boundary to the left leaf.

### Check removal types and validation

This full program checks ordinary, detailed, and boolean result forms through public declarations.
It also checks invalid format options and minima with removal disabled.

<!-- puncta:example hyphenation-removal-types -->

```ts
import {
  createPuncta,
  PunctaConfigError,
  type TextResult,
  type HtmlResult,
  type StripTextOptions,
  type StripHtmlOptions,
  type StripSoftHyphensOptions,
} from "@use-puncta/core";
import { enGb } from "@use-puncta/with-en-gb";
import {
  stripSoftHyphensReact,
  type ReactResult,
} from "@use-puncta/with-react/pure";
import type { ReactNode } from "react";

const instance = createPuncta({ locales: [enGb], locale: enGb.id });
const source = "back\u00adbone";
const ordinary: string = instance.stripSoftHyphens(source);
const text: TextResult = instance.stripSoftHyphens(source, { detailed: true });
const html: HtmlResult = instance.stripSoftHyphens(source, {
  format: "html",
  detailed: true,
});
const detailed: boolean = source.length > 0;
const textOptions: StripTextOptions = { detailed };
const htmlOptions: StripHtmlOptions = { format: "html", detailed };
const options: StripSoftHyphensOptions = detailed ? textOptions : htmlOptions;
const textUnion: string | TextResult = instance.stripSoftHyphens(
  source,
  textOptions,
);
const htmlUnion: string | HtmlResult = instance.stripSoftHyphens(
  source,
  htmlOptions,
);
const union: string | TextResult | HtmlResult = instance.stripSoftHyphens(
  source,
  options,
);
const node: ReactNode = stripSoftHyphensReact(source, { instance });
const react: ReactResult = stripSoftHyphensReact(source, {
  instance,
  detailed: true,
});
const reactUnion: ReactNode | ReactResult = stripSoftHyphensReact(source, {
  instance,
  detailed,
});
console.log(ordinary, text.result, html.result, node, react.result);
console.log(
  typeof textUnion,
  typeof htmlUnion,
  typeof union,
  typeof reactUnion,
);
for (const invalid of [
  { format: "xml" },
  { format: "text", mode: "document" },
  { format: "html", protect: [] },
  { enabled: false, hyphenation: { enabled: false, minRight: 2 } },
]) {
  try {
    instance.stripSoftHyphens(source, invalid as StripSoftHyphensOptions);
    throw new Error("Expected a configuration error");
  } catch (error) {
    if (!(error instanceof PunctaConfigError)) throw error;
    console.log(error.code, error.optionPath.join("."));
  }
}
```

<!-- puncta:output hyphenation-removal-types -->

```text
backbone backbone backbone backbone backbone
object object object object
config.invalid-option format
config.invalid-option mode
config.invalid-option protect
config.invalid-option hyphenation.minRight
```

## Public type index

All types below are named type exports from `@use-puncta/core`.
The inventory compares this index with the source exports.
Shared report types have one home in [diagnostics](diagnostics.md#result-types).

| Type                                                              | Definition and status                                                                                                                         |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `LocaleId`, `Locale`                                              | [Locale exports](locales-and-rules.md#locale-exports)                                                                                         |
| `PunctaOptions`                                                   | [Shared fields](settings.md#shared-fields)                                                                                                    |
| `RuleOptions`, `RulesOptions`                                     | [Rule fields](settings.md#rule-fields-and-defaults)                                                                                           |
| `HyphenationOptions`                                              | [Hyphenation settings](settings.md#hyphenation)                                                                                               |
| `PunctaInstance`                                                  | [Creation](#createpuncta) and [methods](#instance-methods)                                                                                    |
| `TextOptions`, `HtmlOptions`                                      | [Format parameters](#format-parameters)                                                                                                       |
| `StripTextOptions`, `StripHtmlOptions`, `StripSoftHyphensOptions` | [Removal options](#stripsofthyphens)                                                                                                          |
| `ProtectedRange`                                                  | [Original-source range](#protectedrange)                                                                                                      |
| `RuleId`                                                          | Rule identifier union: ten [standard groups](locales-and-rules.md#rule-examples), `digitGrouping`, `hyphenation.insert`, `hyphenation.remove` |
| `TextResult`, `HtmlResult`                                        | [Result types](diagnostics.md#result-types)                                                                                                   |
| `Source`, `InputRange`, `TextRange`, `HtmlRange`                  | [Source and ranges](diagnostics.md#source-and-ranges)                                                                                         |
| `Edit`, `AppliedRule`, `ConfigLocation`, `PunctaWarning`          | [Edits](diagnostics.md#edit-and-appliedrule), [locations](diagnostics.md#configlocation), and [warnings](diagnostics.md#punctawarning)        |

## Reports

Use `detailed: true` for a report instead of a string.
The [result reference](diagnostics.md#result-types) gives all `TextResult` and `HtmlResult` fields.
See [worked error and warning output](diagnostics.md#read-an-error-and-a-warning) and [multi-leaf HTML edits](diagnostics.md#read-an-edit-across-leaves).
