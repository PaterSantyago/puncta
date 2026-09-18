# Diagnostics

[Documentation index](../README.md)

Use a detailed call to get source positions, edits, and warnings.
A configuration error throws before the operation returns a result.
Use diagnostic codes and fields for application decisions. English messages and reason sentences can change.
For a symptom, start with [troubleshooting](../troubleshooting.md).

## Errors

All configuration errors below use [`PunctaConfigError`](core.md#punctaconfigerror).
Its fields are `name`, `message`, `code`, `details`, `optionPath`, and `location`.
Errors have no `source`, `ruleId`, or top-level `locale` field.
Some errors give a locale in `details.locale`.
The [location union](#configlocation) applies to arguments and markup.

| Code                                | Cause and fields                                                                                                                                          | Action                                                                                                                              |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `config.invalid-option`             | Missing value, incorrect type or value, or unknown field. `details.reason`: `required`, `type`, `value`, or `unknown`. `optionPath` identifies the field. | Use the permitted [settings and surfaces](settings.md). Check nested fields and array indices.                                      |
| `locale.unavailable`                | Selected locale is not loaded. `details.locale` gives the selection. `optionPath: ["locale"]`.                                                            | Load its module in `createPuncta`, then select its ID. A variant cannot add modules.                                                |
| `locale.duplicate`                  | Registry has the same locale ID twice. `details.locale` gives the ID. `optionPath: ["locales", index]`.                                                   | Remove the duplicate entry.                                                                                                         |
| `locale.incompatible`               | Registry entry has an unsupported ID, version type, or locale format. Empty `details`. `optionPath: ["locales", index]`.                                  | Use the supported locale export from a matching functional package. Do not construct locale objects.                                |
| `protect.invalid-range`             | Invalid range entry or bounds, or a split grapheme. `details.index` gives the entry. `optionPath: ["protect", index]`.                                    | Use integer original UTF-16 bounds at full grapheme boundaries. See [protection ranges](core.md#protectedrange).                    |
| `markup.invalid-config`             | Invalid JSON in `data-puncta-options`. Empty `details` and `optionPath`. Attribute `location`.                                                            | Correct the JSON. Valid JSON with invalid settings throws `config.invalid-option` instead.                                          |
| `hyphenation.resource-unavailable`  | Selected locale has no insertion resource. `details.locale`; `optionPath: ["hyphenation", "enabled"]`.                                                    | Install matching functional core and locale packages. See [resource validation](../guides/hyphenation.md#resources-and-validation). |
| `hyphenation.resource-incompatible` | Insertion resource has incompatible metadata or structure. Same fields as resource-unavailable.                                                           | Use the matching supported locale export. Do not modify private resource data.                                                      |
| `instance.missing`                  | Root React component or pure call has no instance. Empty `details`; `optionPath: ["instance"]`.                                                           | Supply an instance at the root component/Provider or on each pure call.                                                             |
| `instance.nested`                   | A component supplies `instance` in an existing Puncta Context. Empty `details`; `optionPath: ["instance"]`.                                               | Remove the nested prop. Use inherited Context and setting overrides.                                                                |

Explicit arguments receive validation even with `enabled: false`.
This includes protection ranges, locale selection, rule settings, and hyphenation minima.
If insertion is enabled, resource validation also applies with `enabled: false`.
Removal does not need insertion resources.

Puncta does not inspect protected declarative descendants.
A host off marker takes precedence over its other Puncta attributes.
A React component that runs validates its own props, even in protected Context.
See [protection](../guides/protection.md) and [React errors](react.md#check-configuration-failures).

## Warnings

Warnings do not throw. Detailed reports have `warnings: readonly PunctaWarning[]`.
A string or ReactNode return value has no warning field.
A warning can occur again on the next call with `hasEdits: false`.
An unchanged result is not proof that the input has no warnings.

| Code                                 | Cause                                                                                                                 | Source, rule, locale, details                                                                                                                                     | Action                                                                                                                                                                                        |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `typography.ambiguous`               | Unclear quote, dash, range, minus, currency attachment, spacing, ellipsis, technical-token change, or digit grouping. | `source: "rule"`; related `ruleId`; active locale; empty `details`; text location.                                                                                | Check the rule and original candidate. Correct the source if its intended form is clear. Protect intentional notation. See [rule limits](locales-and-rules.md#unchanged-and-ambiguous-input). |
| `quotes.unpaired`                    | Quote has no matching pair in its recognition context.                                                                | `source: "rule"`, `ruleId: "quotes"`; active locale; empty `details`; text location.                                                                              | Correct the quote pair or protect intentional text. Check context boundaries.                                                                                                                 |
| `currency.order`                     | Currency order does not agree with the selected profile.                                                              | `source: "rule"`, `ruleId: "currencies"`; active locale; empty `details`; full construction text location.                                                        | Check the locale and [currency profile](locales-and-rules.md#currencies). Correct the source order if necessary. Puncta does not reorder it.                                                  |
| `hyphenation.unsupported-characters` | Candidate word has characters outside the locale alphabet.                                                            | `source: "rule"`, `ruleId: "hyphenation.insert"`; active locale; empty `details`; word text location.                                                             | Check the word and selected locale. The word gets no insertion.                                                                                                                               |
| `hyphenation.mixed-scripts`          | Candidate word uses more than one script.                                                                             | Same fields as unsupported-characters.                                                                                                                            | Check for unintended foreign letters. See [the mixed-script example](../guides/hyphenation.md#check-words-that-stay-unchanged).                                                               |
| `hyphenation.language-ambiguity`     | Spanish candidate contains `tl`, with regional pronunciation differences.                                             | `source: "rule"`, `ruleId: "hyphenation.insert"`, `locale: "es-es"`; empty `details`; word text location.                                                         | Keep the word unchanged or supply editorial SHY positions. See [language limits](locales-and-rules.md#hyphenation).                                                                           |
| `markup.language-unavailable`        | `lang` is empty, invalid, unsupported, or not loaded.                                                                 | `source: "markup"`, `ruleId: null`, `locale: null`; `details.value` and `details.reason`: `empty`, `invalid`, `unsupported`, or `not-loaded`; attribute location. | Use a supported loaded language or an explicit locale marker. The unavailable-language region gets no typography.                                                                             |
| `markup.element-unsupported`         | Unsupported HTML host element.                                                                                        | `source: "markup"`, `ruleId: null`; parent locale or `null`; `details.tagName`, `details.namespace`; element location.                                            | Use a supported host or accept its opaque boundary. Puncta does not process its descendants.                                                                                                  |
| `html.parse`                         | HTML parser reports a problem.                                                                                        | `source: "parser"`, `ruleId: null`, `locale: null`; `details.parserCode`; input location or unavailable location.                                                 | Check the HTML and fragment context. The parser can repair the tree. This warning is not a sanitization result.                                                                               |

Rule warnings use original text ranges and the active locale.
`typography.ambiguous` uses the rule that found the input that caused the warning as `ruleId`.
This includes technical-token checks that prevent changes to token meaning.
Disabled rules and protected text cause no warnings from those rules.
Other enabled rules can report their own warnings for the same input.
Hyphenation insertion warnings also need insertion enabled and a candidate that passes the initial admission checks.

Disabled or protected subtrees cause no markup warnings from their descendants.
An unsupported unprotected host causes a warning before Puncta stops at its boundary.
HTML parsing operates even when typography is disabled or markup has protection.
Thus `html.parse` warnings can occur in both cases.
Pure React calls do not parse HTML and have no parser warnings.

## Result types

The fields below are readonly. The array types are readonly arrays.
[`text`, `html`](core.md#text-and-html), [removal](core.md#stripsofthyphens), and [pure React](react.md#transformreact) overloads select the return type.

| Field           | `TextResult`                                | `HtmlResult`                     | `ReactResult`     |
| --------------- | ------------------------------------------- | -------------------------------- | ----------------- |
| `result`        | `string`                                    | `string`                         | `ReactNode`       |
| `hasEdits`      | `boolean`: at least one typography edit     | Same                             | Same              |
| `outputChanged` | `boolean`: output string differs from input | Same, with serialization changes | No field          |
| `edits`         | `readonly Edit[]`                           | `readonly Edit<HtmlRange>[]`     | `readonly Edit[]` |
| `sources`       | `readonly Source[]`                         | Same                             | Same              |
| `appliedRules`  | `readonly AppliedRule[]`                    | Same                             | Same              |
| `warnings`      | `readonly PunctaWarning[]`                  | Same                             | Same              |

`hasEdits` does not measure HTML serialization changes or React tree identity.
`outputChanged` compares the full input and output strings.
HTML can have `outputChanged: true` with `hasEdits: false`.
Do not use typography edits as patches to reconstruct serialized HTML.

### Source and ranges

`Source` has `id: number`, `text: string`, and `path: readonly (number | "children" | "fallback")[]`.
`id` identifies a source leaf in this call. `text` is its original text.
Sources include the text leaves that the operation visits, not a full copy of protected or opaque subtrees.
Plain text has one source with `id: 0` and `path: []`, even with protection ranges.

For HTML, `text` is decoded text. Numeric path entries index the parsed tree.
Comments count in these indices. Elements that the parser inserts also have an effect on paths.
For React, paths address the original input tree, not rendered DOM or component output.
Numeric entries index arrays. `"children"` enters element children and `"fallback"` enters a Suspense fallback.
Numeric React children use their string representation for source text.

`TextRange` has `sourceId: number`, `start: number`, and `end: number`.
`HtmlRange` adds `inputRange: InputRange`.
All range fields are readonly. A text range uses the original source leaf's UTF-16 units, with an inclusive start and exclusive end.
An insertion has `start === end`.

A non-BMP character uses two UTF-16 units. A grapheme can use more than one code point.
Do not count displayed characters or use offsets from the transformed result.
A multi-leaf edit has one range for each source part in source order.
Its `before` is the joined source text from those ranges.

### InputRange

This union maps decoded HTML positions to original HTML string positions.
The offsets also use UTF-16 units and an exclusive end.

| Shape                                                  | Meaning                                                                                                                                            |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `{ accuracy: "exact", start: number, end: number }`    | Both boundaries map to the original input. An entity can have a different length from its decoded text.                                            |
| `{ accuracy: "covering", start: number, end: number }` | A boundary divides the decoded text of one origin. The input span includes that full origin. It is not an accurate patch range.                    |
| `{ accuracy: "unavailable", reason: string }`          | No contiguous input span that the parser can map. For example, parser repairs can join text from separate input spans. No `start` or `end` fields. |

Entity decoding, CRLF normalization, and non-BMP text keep source provenance when decoding agrees with the parsed leaf.
Unavailable mapping does not remove the decoded `sourceId`, `start`, or `end`.
Use those fields to find the source leaf. Do not calculate HTML offsets when the mapping is unavailable.

### Edit and AppliedRule

`Edit<Range = TextRange>` has the readonly fields below.

| Field     | Type and meaning                                      |
| --------- | ----------------------------------------------------- |
| `kind`    | `"replace"`, `"insert"`, or `"delete"`                |
| `before`  | `string`: original text across the ranges             |
| `after`   | `string`: replacement text. Empty for deletion        |
| `locale`  | `LocaleId`: active locale for this edit               |
| `ruleIds` | `readonly RuleId[]`: rules that made the edit         |
| `ranges`  | `readonly Range[]`: positions in the original sources |

`AppliedRule` has `ruleId: RuleId` and `locale: LocaleId`.
`appliedRules` records rule/locale pairs that made edits. A warning does not add a pair.
See the [RuleId union](core.md#public-type-index) for all rule identifiers.

### ConfigLocation

All fields in this union are readonly.

| `kind`          | Other fields                                                              | Use                                                                   |
| --------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `"element"`     | `path: Source["path"]`, optional `inputRange: InputRange`                 | HTML or React host                                                    |
| `"attribute"`   | `path: Source["path"]`, `name: string`, optional `inputRange: InputRange` | Host attribute or prop                                                |
| `"input"`       | `start: number`, `end: number`                                            | Original HTML parser position in UTF-16 units                         |
| `"unavailable"` | `reason: string`                                                          | No structural or input position, for example a configuration argument |

HTML element and attribute locations have input mappings when possible.
React locations have input-tree paths and no HTML input mapping.
`optionPath` identifies the configuration field. It is separate from a tree `path`.

### PunctaWarning

`code` and `message` are strings. `details` is `Readonly<Record<string, unknown>>`.
`source` is `"rule" | "markup" | "parser"`.
`locale` is `LocaleId | null`. `ruleId` is `RuleId | null`.
All fields are readonly.

`location` is `ConfigLocation` or `{ kind: "text", ranges: readonly (TextRange | HtmlRange)[] }`.
Use `kind` and `accuracy` to narrow the unions before you read their fields.
The [warning catalog](#warnings) gives the code-specific fields.

## Read an error and a warning

This full program shows all public error fields and a full warning.
It prints the error message but uses the code and fields for decisions.
The displayed messages are checked examples, not fixed English API contracts.
The second call shows that the warning can occur again without edits.

<!-- puncta:example diagnostics-error-warning -->

```ts
import { createPuncta, PunctaConfigError } from "@use-puncta/core";
import { enGb } from "@use-puncta/with-en-gb";

const puncta = createPuncta({ locales: [enGb], locale: enGb.id });
try {
  puncta.text("😀 Wait...", {
    enabled: false,
    protect: [{ start: 1, end: 2 }],
  });
} catch (error) {
  if (!(error instanceof PunctaConfigError)) throw error;
  console.log(
    JSON.stringify({
      name: error.name,
      message: error.message,
      code: error.code,
      details: error.details,
      optionPath: error.optionPath,
      location: error.location,
    }),
  );
}
const first = puncta.text('"open', { detailed: true });
console.log(JSON.stringify(first));
const second = puncta.text(first.result, { detailed: true });
console.log(
  second.hasEdits,
  second.warnings.map((warning) => warning.code).join(","),
);
```

<!-- puncta:output diagnostics-error-warning -->

```text
{"name":"PunctaConfigError","message":"Protection must use valid original grapheme boundaries.","code":"protect.invalid-range","details":{"index":0},"optionPath":["protect",0],"location":{"kind":"unavailable","reason":"Configuration argument"}}
{"result":"\"open","hasEdits":false,"outputChanged":false,"edits":[],"sources":[{"id":0,"text":"\"open","path":[]}],"appliedRules":[],"warnings":[{"code":"quotes.unpaired","source":"rule","message":"Unpaired quote was preserved.","details":{},"locale":"en-gb","ruleId":"quotes","location":{"kind":"text","ranges":[{"sourceId":0,"start":0,"end":1}]}}]}
false quotes.unpaired
```

## Read an edit across leaves

This full program compares a multi-leaf HTML edit with serialization without edits.
The first edit replaces three dots across three leaves with one ellipsis.
The comment counts in the parsed-tree path but does not stop recognition.
The emoji uses two UTF-16 units, so the first dot starts at offset 2.

<!-- puncta:example diagnostics-html -->

```ts
import { createPuncta } from "@use-puncta/core";
import { enGb } from "@use-puncta/with-en-gb";

const puncta = createPuncta({ locales: [enGb], locale: enGb.id });
console.log(
  JSON.stringify(puncta.html("😀.<em>.</em><!--note-->.", { detailed: true })),
);
const serialization = puncta.html("<P title='x'>&amp;</P>", { detailed: true });
console.log(
  serialization.result,
  serialization.hasEdits,
  serialization.outputChanged,
);
const repaired = puncta.html("<table>a<tr><td>x</td></tr>...</table>", {
  detailed: true,
});
console.log(JSON.stringify(repaired.edits[0].ranges));
```

<!-- puncta:output diagnostics-html -->

```text
{"result":"😀…<em></em><!--note-->","hasEdits":true,"outputChanged":true,"sources":[{"id":0,"text":"😀.","path":[0]},{"id":1,"text":".","path":[1,0]},{"id":2,"text":".","path":[3]}],"edits":[{"kind":"replace","before":"...","after":"…","locale":"en-gb","ruleIds":["ellipsis"],"ranges":[{"sourceId":0,"start":2,"end":3,"inputRange":{"accuracy":"exact","start":2,"end":3}},{"sourceId":1,"start":0,"end":1,"inputRange":{"accuracy":"exact","start":7,"end":8}},{"sourceId":2,"start":0,"end":1,"inputRange":{"accuracy":"exact","start":24,"end":25}}]}],"appliedRules":[{"ruleId":"ellipsis","locale":"en-gb"}],"warnings":[]}
<p title="x">&amp;</p> false true
[{"sourceId":0,"start":1,"end":4,"inputRange":{"accuracy":"unavailable","reason":"Parser text cannot be mapped to a contiguous input span"}}]
```

The last range has no HTML input position that the parser can map because the parser joined separate input spans.
The decoded source range stays available.
For an entity replacement with an `exact` mapping, see [grouping source positions](#grouping-source-positions).
`covering` is a permitted mapping shape for boundaries that divide one decoded origin.
That origin can be a non-BMP entity with two UTF-16 units, or an entity with more than one code point.
These examples do not depend on a typography rule that edits only part of such an origin.

## Read React paths

This full program uses the pure API. It does not render the result.
The source paths refer to the supplied element, array, and Suspense branches.
The report has no `outputChanged` field.

<!-- puncta:example diagnostics-react -->

```tsx
import { createPuncta } from "@use-puncta/core";
import { enGb } from "@use-puncta/with-en-gb";
import { transformReact } from "@use-puncta/with-react/pure";
import { Suspense } from "react";

const instance = createPuncta({ locales: [enGb], locale: enGb.id });
const report = transformReact(
  <p>
    {[
      "😀.",
      <em key="dot">.</em>,
      ".",
      <Suspense key="s" fallback="Wait...">
        Ready...
      </Suspense>,
    ]}
  </p>,
  { instance, detailed: true },
);
console.log(JSON.stringify(report.sources));
console.log(JSON.stringify(report.edits));
console.log(report.hasEdits, "outputChanged" in report);
```

<!-- puncta:output diagnostics-react -->

```text
[{"id":0,"text":"😀.","path":["children",0]},{"id":1,"text":".","path":["children",1,"children"]},{"id":2,"text":".","path":["children",2]},{"id":3,"text":"Ready...","path":["children",3,"children"]},{"id":4,"text":"Wait...","path":["children",3,"fallback"]}]
[{"kind":"replace","before":"...","after":"…","locale":"en-gb","ruleIds":["ellipsis"],"ranges":[{"sourceId":0,"start":2,"end":3},{"sourceId":1,"start":0,"end":1},{"sourceId":2,"start":0,"end":1}]},{"kind":"replace","before":"...","after":"…","locale":"en-gb","ruleIds":["ellipsis"],"ranges":[{"sourceId":3,"start":5,"end":8}]},{"kind":"replace","before":"...","after":"…","locale":"en-gb","ruleIds":["ellipsis"],"ranges":[{"sourceId":4,"start":4,"end":7}]}]
true false
```

## Digit grouping

| Diagnostic                                                          | Cause                                                                     | Action                                                                                                       |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `typography.ambiguous`, `source: "rule"`, `ruleId: "digitGrouping"` | Malformed grouping, conflicting separators, or spaced numeric punctuation | Check the full candidate against the active locale notation. Correct the source or protect intentional text  |
| `config.invalid-option`                                             | Invalid explicit grouping settings, even with disabled processing         | Use `optionPath` and `details.reason`. Correct the field according to [settings](settings.md#digit-grouping) |

A grouping warning includes the active `locale` and the full original candidate location across accessible leaves.
A malformed range produces one grouping warning for the full range unless an endpoint is excluded.
A high threshold and `normalizeExisting: false` do not stop ambiguity warnings.
A warning can occur again with no edits. English message strings are not lookup keys.

Not every excluded number causes a warning.
Leading zeros and unsupported numeric structures are excluded without grouping warnings.
Other rules can produce their own diagnostics. The example filters by `ruleId` to show only grouping warnings.
Disabled grouping and protected content produce no grouping warnings.

<!-- puncta:example grouping-warnings -->

```ts
import { createPuncta } from "@use-puncta/core";
import { enGb } from "@use-puncta/with-en-gb";

const puncta = createPuncta({
  locales: [enGb],
  locale: enGb.id,
  rules: { digitGrouping: { enabled: true } },
});
for (const source of [
  "0012345",
  ".12345",
  "١12345",
  "AB12345",
  "12345foo",
  "12345e6",
  "12345/67890",
  "12345:67890",
  "2026-09-12345",
  "12345 + 67890",
  "1234 567",
  "12 34",
  "1 , 234",
  "12 34–123456",
  "00123–12 34",
]) {
  const report = puncta.text(source, { detailed: true });
  console.log(
    report.result,
    report.warnings.filter((w) => w.ruleId === "digitGrouping").length,
  );
}
const report = puncta.text("12 34", {
  detailed: true,
  rules: { digitGrouping: { minDigits: 99, normalizeExisting: false } },
});
const warning = report.warnings.find((w) => w.ruleId === "digitGrouping");
console.log(
  report.hasEdits,
  warning?.code,
  warning?.source,
  warning?.ruleId,
  warning?.locale,
);
console.log(JSON.stringify(warning?.location));
```

<!-- puncta:output grouping-warnings -->

```text
0012345 0
.12345 0
١12345 0
AB12345 0
12345foo 0
12345e6 0
12345/67890 0
12345:67890 0
2026-09-12345 0
12345 + 67890 0
1234 567 1
12 34 1
1 , 234 1
12 34–123456 1
00123–12 34 0
false typography.ambiguous rule digitGrouping en-gb
{"kind":"text","ranges":[{"sourceId":0,"start":0,"end":5}]}
```

## Grouping source positions

All edit offsets use original UTF-16 positions.
An insertion has an empty range. Each source separator replacement has its own edit.
Unchanged digits stay in their original source leaves.
`appliedRules` includes `digitGrouping` only if that rule made an edit.

The public `RuleId` union includes `"digitGrouping"`. Handle this value in code that checks every `RuleId` value.
An unchanged U+202F produces no grouping edit or applied-rule entry.

For HTML, `before` and `after` are decoded text.
An entity separator replacement maps to the full original entity spelling.
Input mappings use `exact` for mapped boundaries, `covering` for a boundary that divides one decoded origin, or `unavailable` with a reason.
Supported digit and separator entities map at their boundaries. Grouping uses only these boundaries for positions in entities.
The [HTML source example](../guides/html.md#group-digits-across-inline-elements) shows separator ownership.

The output writes U+202F as `\u202f` to make the separator visible.
The first output below has insertions at offsets 4 and 7.
The initial emoji has two UTF-16 units. Offsets do not refer to the transformed result.
The HTML replacement has decoded range `[0, 1)` and original input range `[6, 11)` for `&#32;`.

<!-- puncta:example grouping-positions -->

```ts
import { createPuncta } from "@use-puncta/core";
import { enGb } from "@use-puncta/with-en-gb";

const puncta = createPuncta({
  locales: [enGb],
  locale: enGb.id,
  rules: { digitGrouping: { enabled: true } },
});
const text = puncta.text("😀 1234567.00", { detailed: true });
console.log(JSON.stringify(text.edits.map((edit) => edit.ranges)));
const html = puncta.html("12<em>&#32;</em>345", { detailed: true });
console.log(JSON.stringify(html.edits[0]).replaceAll("\u202f", "\\u202f"));
const unchanged = puncta.text("12\u202f345", { detailed: true });
console.log(unchanged.hasEdits, unchanged.appliedRules.length);
const split = puncta.html("12<em> </em>34", { detailed: true });
console.log(
  JSON.stringify(
    split.warnings.find((w) => w.ruleId === "digitGrouping")?.location,
  ),
);
```

<!-- puncta:output grouping-positions -->

```text
[[{"sourceId":0,"start":4,"end":4}],[{"sourceId":0,"start":7,"end":7}]]
{"kind":"replace","before":" ","after":"\u202f","locale":"en-gb","ruleIds":["digitGrouping"],"ranges":[{"sourceId":1,"start":0,"end":1,"inputRange":{"accuracy":"exact","start":6,"end":11}}]}
false 0
{"kind":"text","ranges":[{"sourceId":0,"start":0,"end":2,"inputRange":{"accuracy":"exact","start":0,"end":2}},{"sourceId":1,"start":0,"end":1,"inputRange":{"accuracy":"exact","start":6,"end":7}},{"sourceId":2,"start":0,"end":2,"inputRange":{"accuracy":"exact","start":12,"end":14}}]}
```

The final warning locates all three leaves of the malformed candidate `12 34`.
Its input ranges exclude the HTML tags between those leaves.

HTML edit replay describes transformed source text, not parser repairs or serialized HTML.
Serialization alone can set `outputChanged` without `hasEdits` or a grouping edit.
React has no `outputChanged`. Its source paths address original children, not rendered DOM nodes.
See the [React grouping report](../guides/react.md#group-digits-in-react) for a cross-leaf insertion.

## Source inventory

The [named inventory](../acceptance/documentation-coverage.json) checks diagnostic codes against current production source.
It separates the ten error codes from the nine warning codes.
The source links below include definitions, emission sites, and code comparisons.
English messages, parser codes, and reason sentences are not diagnostic lookup keys.

| Code                                 | Source                                                                                                                                                             |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `config.invalid-option`              | [config.ts](../../packages/core/src/config.ts), [scopes.ts](../../packages/shared/scopes.ts), [index.tsx](../../packages/with-react/src/index.tsx)                 |
| `currency.order`                     | [number-bonds.ts](../../packages/core/src/number-bonds.ts), [typography.ts](../../packages/core/src/typography.ts)                                                 |
| `html.parse`                         | [html.ts](../../packages/core/src/html.ts)                                                                                                                         |
| `hyphenation.language-ambiguity`     | [hyphenation.ts](../../packages/core/src/hyphenation.ts)                                                                                                           |
| `hyphenation.mixed-scripts`          | [hyphenation.ts](../../packages/core/src/hyphenation.ts)                                                                                                           |
| `hyphenation.resource-incompatible`  | [hyphenation.ts](../../packages/core/src/hyphenation.ts)                                                                                                           |
| `hyphenation.resource-unavailable`   | [hyphenation.ts](../../packages/core/src/hyphenation.ts)                                                                                                           |
| `hyphenation.unsupported-characters` | [hyphenation.ts](../../packages/core/src/hyphenation.ts)                                                                                                           |
| `instance.missing`                   | [scopes.ts](../../packages/shared/scopes.ts)                                                                                                                       |
| `instance.nested`                    | [index.tsx](../../packages/with-react/src/index.tsx)                                                                                                               |
| `locale.duplicate`                   | [index.ts](../../packages/core/src/index.ts)                                                                                                                       |
| `locale.incompatible`                | [index.ts](../../packages/core/src/index.ts)                                                                                                                       |
| `locale.unavailable`                 | [settings.ts](../../packages/core/src/settings.ts), [scopes.ts](../../packages/shared/scopes.ts)                                                                   |
| `markup.element-unsupported`         | [elements.ts](../../packages/shared/elements.ts)                                                                                                                   |
| `markup.invalid-config`              | [scopes.ts](../../packages/shared/scopes.ts)                                                                                                                       |
| `markup.language-unavailable`        | [scopes.ts](../../packages/shared/scopes.ts)                                                                                                                       |
| `protect.invalid-range`              | [protection.ts](../../packages/core/src/protection.ts)                                                                                                             |
| `quotes.unpaired`                    | [quotes.ts](../../packages/core/src/quotes.ts)                                                                                                                     |
| `typography.ambiguous`               | [number-bonds.ts](../../packages/core/src/number-bonds.ts), [quotes.ts](../../packages/core/src/quotes.ts), [typography.ts](../../packages/core/src/typography.ts) |
