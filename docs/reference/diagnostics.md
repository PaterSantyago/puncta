# Diagnostics

[Documentation index](../README.md)

This page defines digit-grouping diagnostics and source positions.
The full diagnostic catalog and result schemas are pending in issue 114.
See [core reports](core.md#reports) and [React results](react.md#reactresult) for current result definitions.

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
Input mappings use `exact` for mapped boundaries, `covering` for a range through a multi-codepoint origin, or `unavailable` with a reason.
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
