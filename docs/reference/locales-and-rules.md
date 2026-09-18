# Locales and rules

[Documentation index](../README.md)

A locale selects a typography profile. These profiles are selected editorial
conventions, not the only correct styles for these languages.
en-gb uses an Oxford-style quotation choice. es-es uses an RAE-oriented choice.

## Locale exports

| Package                  | Named value export | Active ID |
| ------------------------ | ------------------ | --------- |
| `@use-puncta/with-en-gb` | `enGb: Locale`     | `"en-gb"` |
| `@use-puncta/with-es-es` | `esEs: Locale`     | `"es-es"` |

`LocaleId` is the union `"en-gb" | "es-es"`.
`Locale` exposes readonly `id: LocaleId` and `version: string`.
`version` identifies the locale package version.
Use `locale.id`. The functional API does not expose the scaffold field `localeId`.

The object is immutable and opaque: import it from its package. Do not construct one.

Each module is ready synchronously after import, including its hyphenation resource.
No global registration or automatic locale download occurs.
Core and each required locale must be direct dependencies.
See [installation](../getting-started/installation.md) and
[the multiple-locale example](../guides/configuration.md#change-locale-and-reset-a-field).

## Rule examples

All ten groups below are on by default in both locales.
Optional [digit grouping](#digit-grouping) is off.
Hyphenation insertion and removal are different operations. See the [hyphenation guide](../guides/hyphenation.md).

This complete example runs the same input through both locales.
The output has columns for the group, en-gb, and es-es.
The `visible` function writes each U+00A0 as `\u00a0` so that bonds are explicit.
Actual results contain NBSP characters, not six-character escape strings.
The [settings reference](settings.md#rule-fields-and-defaults) owns option defaults and permitted values.

<!-- puncta:example locale-rules -->

```ts
import { createPuncta } from "@use-puncta/core";
import { enGb } from "@use-puncta/with-en-gb";
import { esEs } from "@use-puncta/with-es-es";

const puncta = createPuncta({ locales: [enGb, esEs], locale: enGb.id });
const cases = [
  ["quotes", '"Hello"'],
  ["apostrophes", "It's ready"],
  ["spaces", "Hello ,  world..."],
  ["ellipsis", "Wait..."],
  ["dashes", "Llegó --sin avisar-- ayer"],
  ["ranges", "10-12 kg"],
  ["minus", "-5 kg"],
  ["units", "10kg; 30°; 20°C"],
  ["percentages", "10 %"],
  ["currencies", "£ 10; 10 €; 20USD"],
] as const;
const visible = (value: string) => value.replaceAll("\u00a0", "\\u00a0");
for (const [rule, source] of cases) {
  console.log(
    rule,
    "|",
    visible(puncta.text(source)),
    "|",
    visible(puncta.text(source, { locale: esEs.id })),
  );
}
```

Output:

<!-- puncta:output locale-rules -->

```text
quotes | ‘Hello’ | «Hello»
apostrophes | It’s ready | It’s ready
spaces | Hello, world… | Hello, world…
ellipsis | Wait… | Wait…
dashes | Llegó – sin avisar – ayer | Llegó —sin avisar— ayer
ranges | 10–12\u00a0kg | 10–12\u00a0kg
minus | −5\u00a0kg | −5\u00a0kg
units | 10\u00a0kg; 30°; 20\u00a0°C | 10\u00a0kg; 30°; 20\u00a0°C
percentages | 10% | 10\u00a0%
currencies | £10; 10 €; 20\u00a0USD | £ 10; 10\u00a0€; 20\u00a0USD
```

### Quotes

The en-gb sequence starts with `‘…’`, then `“…”`.
The es-es sequence starts with `«…»`, then `“…”`, then `‘…’`.
Deeper levels alternate single and double pairs.
`normalizeExisting: false` keeps formatted pairs and uses compatible styles for nearby straight pairs.
Unpaired or ambiguous quote signs stay unchanged, with `quotes.unpaired` or `typography.ambiguous` warnings.
Puncta does not add missing signs or move punctuation across a quote.

The `spaces` rule removes ordinary inner spaces in Spanish quotes.
Quotes can cross a single line break, `br`/`wbr`, or an opaque inline fragment.
Blank lines, blocks, and Suspense end the quote context.

A child typography scope has independent quote depth. An outer pair can surround it.
Protected text does not supply quote signs.

### Apostrophes

Punctuation apostrophes become U+2019 `’`.
Letter apostrophe U+02BC `ʼ` stays unchanged.
A disabled apostrophe rule still recognizes apostrophe roles inside quotations.
Puncta does not guess feet/inches or unresolved quote roles.

### Spaces

The rule reduces repeated U+0020 spaces and corrects clear punctuation intervals.
Line endings, blank lines, indentation, tabs, existing NBSP, dates, and numeric punctuation stay unchanged.
In es-es, it removes ordinary inner spaces after `¿`/`¡` and before `?`/`!`.
It does not add missing Spanish signs.
Ambiguous ellipsis intervals, spaced numeric punctuation, and periods between text can cause `typography.ambiguous` warnings.

### Ellipsis

Three consecutive dots become U+2026 `…`.
Four or more consecutive dots stay unchanged.
Separated dots do not become an ellipsis.
The spaces rule recognizes ellipsis intervals even when ellipsis conversion is off.

### Dashes

Textual double-hyphen markers and recognized prose dashes use spaced U+2013 `–` in en-gb.
Paired insertions use U+2014 `—` against the inner text in es-es.
An isolated `word -- word` stays unchanged in es-es with an ambiguity warning.
Ordinary word hyphens and dialogue markers stay unchanged.
`normalizeExisting: false` keeps existing formatted dash styles but still converts explicit markers.

### Ranges

With a known unit, `10-12 kg` becomes `10–12\u00a0kg`.
The range separator is U+2013. The number/unit bond is U+00A0.
Set `standalone: true` to process standalone numeric ranges.
A range is not a subtraction expression.

### Minus

A recognized numeric minus becomes U+2212 `−`.
A known unit makes the role clear in `-5 kg`.
Word hyphens do not become minus signs.
The range rule controls range separators independently.

### Units

Known case-sensitive units use a U+00A0 NBSP bond with the number.
Composite units include `km/h` and `m²`.
The angle degree attaches directly, as in `30°`.
Temperature units `°C` and `°F` use NBSP.
Unknown unit suffixes stay unchanged unless `additional` supplies the complete designation.
See [additional units and array replacement](../guides/configuration.md#add-units-and-replace-an-array).

New bonds do not cross line breaks, opaque fragments, or typography scope boundaries.

### Percentages

The en-gb profile attaches `%`. The es-es profile uses U+00A0 before `%`.
The `space` option overrides that convention.
A locale change keeps an explicit override until a null reset removes it.
See [the locale reset example](../guides/configuration.md#change-locale-and-reset-a-field).

### Currencies

Codes `GBP`, `EUR`, and `USD` use NBSP before or after a number.
Symbols `£`, `€`, and `$` attach before numbers in en-gb.
In es-es, they use NBSP after numbers.
Puncta never changes the order of number and currency.
The opposite symbol order keeps its original interval and causes `currency.order`.

A currency between two numbers belongs to the side with no U+0020 space.
An existing NBSP also counts as attachment.
Equal attachment is ambiguous: the interval stays unchanged with `typography.ambiguous`.

Numeric separators keep their spelling unless optional digit grouping changes them.
The spaces rule keeps recognized number-bond intervals even when their own rule is off.

## Unchanged and ambiguous input

This example shows limits and an explicit standalone-range choice.
Warnings are available in detailed reports. Not every unchanged input produces a warning.
Disabled rules and protected text produce no rule warnings.

<!-- puncta:example locale-limits -->

```ts
import { createPuncta } from "@use-puncta/core";
import { enGb } from "@use-puncta/with-en-gb";
import { esEs } from "@use-puncta/with-es-es";

const puncta = createPuncta({ locales: [enGb, esEs], locale: enGb.id });
for (const source of [
  '"Hello',
  "Wait....",
  "well-known",
  "10-12",
  "10widget",
  "aʼb",
  "1 , 2",
  "10 £   20",
  "10\u00a0£20",
]) {
  const report = puncta.text(source, { detailed: true });
  console.log(
    JSON.stringify(report.result).replaceAll("\u00a0", "\\u00a0"),
    report.warnings.map((w) => w.code).join(",") || "none",
  );
}
console.log(puncta.text("10-12", { rules: { ranges: { standalone: true } } }));
console.log(puncta.text("¿ Hola ?", { locale: esEs.id }));
const currency = puncta.text("10 £", { detailed: true });
console.log(currency.result, currency.warnings.map((w) => w.code).join(","));
console.log(
  puncta.text("‘Hello’", {
    locale: esEs.id,
    rules: { quotes: { normalizeExisting: false } },
  }),
);
console.log(
  puncta.text("word — word", {
    rules: { dashes: { normalizeExisting: false } },
  }),
);
```

Output:

<!-- puncta:output locale-limits -->

```text
"\"Hello" quotes.unpaired
"Wait...." none
"well-known" none
"10-12" none
"10widget" none
"aʼb" none
"1 , 2" typography.ambiguous
"10 £   20" typography.ambiguous
"10\u00a0£20" typography.ambiguous
10–12
¿Hola?
10 £ currency.order
‘Hello’
word — word
```

## Related tasks

Use [configuration](../guides/configuration.md) to select or override a profile.
Use [troubleshooting](../troubleshooting.md) when an expected change is missing.

## Digit grouping

The `digitGrouping` rule inserts U+202F NNBSP in eligible integer digits, in groups of three from the right.
It does not change digits, decimal signs, or fractional digits.
Grouping is text processing, not numeric conversion.
An optional leading `+`, `-`, or U+2212 `−` is permitted.
The minus rule operates independently and can change an ASCII minus sign.

| Input notation           | en-gb                                                             | es-es                   |
| ------------------------ | ----------------------------------------------------------------- | ----------------------- |
| Decimal sign             | `.`                                                               | `.` or `,`              |
| Existing space separator | One U+0020 SPACE, U+00A0 NBSP, U+2009 THIN SPACE, or U+202F NNBSP | Same                    |
| Existing comma separator | Permitted, without space separators in the same number            | Comma is a decimal sign |
| Existing group widths    | 1–3 digits first, then exactly three per group                    | Same                    |

Mixtures of the four permitted group spaces are valid.
`normalizeExisting: true` changes valid separators to U+202F when the integer digit count is at or above `minDigits`.
`false` keeps the full existing grouped spelling.
Puncta does not remove existing groups below the threshold.
An existing U+202F that stays unchanged produces no edit.
See [canonical option definitions](settings.md#digit-grouping).

This full program compares both locales. Install both locale packages.
The output uses escapes for invisible separators.

<!-- puncta:example grouping-notation -->

```ts
import { createPuncta } from "@use-puncta/core";
import { enGb } from "@use-puncta/with-en-gb";
import { esEs } from "@use-puncta/with-es-es";
const visible = (text: string) =>
  text
    .replaceAll("\u202f", "\\u202f")
    .replaceAll("\u00a0", "\\u00a0")
    .replaceAll("\u2009", "\\u2009");
const puncta = createPuncta({
  locales: [enGb, esEs],
  locale: enGb.id,
  rules: { digitGrouping: { enabled: true } },
});
for (const source of [
  "12345.6700",
  "12345,6700",
  "1,234",
  "12,345.00",
  "12 345",
  "1.234,50",
  "1234 567",
  "12\u2009345\u00a0678",
]) {
  console.log(
    visible(source),
    "|",
    visible(puncta.text(source)),
    "|",
    visible(puncta.text(source, { locale: esEs.id })),
  );
}
console.log(
  visible(puncta.text("1,234", { rules: { digitGrouping: { minDigits: 4 } } })),
);
console.log(
  visible(
    puncta.text("12 345", {
      rules: { digitGrouping: { normalizeExisting: false } },
    }),
  ),
);
console.log(visible(puncta.text("1 234")));
```

<!-- puncta:output grouping-notation -->

```text
12345.6700 | 12\u202f345.6700 | 12\u202f345.6700
12345,6700 | 12345,6700 | 12\u202f345,6700
1,234 | 1,234 | 1,234
12,345.00 | 12\u202f345.00 | 12,345.00
12 345 | 12\u202f345 | 12\u202f345
1.234,50 | 1.234,50 | 1.234,50
1234 567 | 1234 567 | 1234 567
12\u2009345\u00a0678 | 12\u202f345\u202f678 | 12\u202f345\u202f678
1\u202f234
12 345
1 234
```

In es-es, `1,234` is a decimal. `1.234,50` has conflicting signs.
In en-gb, `12345,6700` is malformed grouping.
Terminal punctuation and lists are outside each number. For example, `12345, 67890` contains two eligible integers.

### Number bonds and ranges

Known units, percentages, angular degrees, and currencies supply numeric recognition context.
The full designation must be known. Composite units and explicit additions are included.
Internal U+202F group separators and exterior U+00A0 number bonds have different functions.
Currency order, percent spacing, and minus formatting keep their own rules and warnings.

An en-dash range can contain two valid endpoints.
An ASCII hyphen is eligible only with a known unit or `rules.ranges.standalone: true`.
U+2212 is a minus sign, not a range separator.
Both endpoints must be eligible before one or both endpoints can change.
The threshold and normalization choice then apply independently to each endpoint.

An invalid endpoint keeps the full range ungrouped.
A leading-zero or technical endpoint causes no grouping warning, even if the other endpoint has malformed grouping.
If no endpoint is excluded, malformed grouping causes one warning for the full range.
When you disable formatting for units, ranges, percentages, or currencies, their recognition context stays available.
Grouping does not convert the range separator itself.
Recognized prose dashes bound numeric context even when dash formatting is disabled.

Grouping operates with quotes, spacing, ellipsis, and optional hyphenation in text, HTML, and accessible React children.

<!-- puncta:example grouping-bonds -->

```ts
import { createPuncta } from "@use-puncta/core";
import { enGb } from "@use-puncta/with-en-gb";
const visible = (text: string) =>
  text
    .replaceAll("\u202f", "\\u202f")
    .replaceAll("\u00a0", "\\u00a0")
    .replaceAll("\u2009", "\\u2009");
const puncta = createPuncta({
  locales: [enGb],
  locale: enGb.id,
  rules: {
    digitGrouping: { enabled: true },
    units: { additional: ["widget/s"] },
  },
});
for (const source of [
  "12345kg",
  "12345 km/h",
  "12345widget/s",
  "12345 °",
  "12345 %",
  "EUR12345",
  "12345-67890kg",
  "1234–67890",
  "00123–123456",
  "12 34–123456",
  "12345-67890",
  "12345−67890",
]) {
  console.log(visible(puncta.text(source)));
}
console.log(
  visible(
    puncta.text("1,234–56789", {
      rules: { digitGrouping: { normalizeExisting: false } },
    }),
  ),
);
console.log(
  visible(
    puncta.text("12345-67890", {
      rules: { ranges: { standalone: true, enabled: false } },
    }),
  ),
);
console.log(
  visible(
    puncta.text("12345-67890kg; 12345%; EUR12345", {
      rules: {
        ranges: { enabled: false },
        units: { enabled: false },
        percentages: { enabled: false },
        currencies: { enabled: false },
      },
    }),
  ),
);
```

<!-- puncta:output grouping-bonds -->

```text
12\u202f345\u00a0kg
12\u202f345\u00a0km/h
12\u202f345\u00a0widget/s
12\u202f345°
12\u202f345%
EUR\u00a012\u202f345
12\u202f345–67\u202f890\u00a0kg
1234–67\u202f890
00123–123456
12 34–123456
12345-67890
12345−67890
1,234–56\u202f789
12\u202f345-67\u202f890
12\u202f345-67\u202f890kg; 12\u202f345%; EUR12\u202f345
```

### Excluded and ambiguous numbers

Malformed groups, conflicting separators, and spaces before numeric punctuation keep the full candidate unchanged.
Examples are `1234 567`, `12 34`, and `1 , 234`.
Each candidate produces one grouping ambiguity warning.
A high threshold or `normalizeExisting: false` does not stop this warning.

Grouping excludes these forms without grouping warnings:

- Leading zeros, missing integer parts, and non-ASCII or mixed digits.
- Combining marks, identifiers, unknown suffixes, and scientific notation.
- Slash/colon numeric structures, arithmetic expressions, and three or more dotted or hyphenated segments.

Puncta does not identify numbers as years or telephone numbers.
A four-digit year stays unchanged at the default threshold but can change with `minDigits: 4`.
Use [protection](../guides/protection.md) for text that must not change.
Other rules can still produce their own changes or warnings on excluded input.

With grouping enabled, repeated group spaces, tabs, and line breaks keep their separation on repeated processing.
Space cleanup keeps malformed candidate spelling and normalized groups.
With grouping disabled, ordinary spacing rules apply.
See [grouping diagnostics](diagnostics.md#digit-grouping) for checked warnings and source positions.

## Hyphenation

Hyphenation is opt-in for both locales. See [settings and minima](settings.md#hyphenation).
Each locale includes an immutable Liang pattern resource with a conservative Puncta refinement and no whole-word exception table.
The locale package's `hyphenation-manifest.json` identifies the resource and refinement.
Its `NOTICE.md` identifies upstream sources and licenses.

| Locale  | Supported letters and case                                           |
| ------- | -------------------------------------------------------------------- |
| `en-gb` | Latin a–z, lowercase or one initial capital                          |
| `es-es` | Latin a–z plus á, é, í, ó, ú, ü, ñ, lowercase or one initial capital |

Spanish supports equivalent decomposed graphemes without a change to their source spelling.
All capitals, mixed case, digits, apostrophes, ordinary hyphens, and existing SHY cause whole-word exclusion.
Unsupported graphemes and mixed scripts keep the word unchanged and can cause detailed warnings.
Protected text causes no insertion warnings.
Opaque, protected, and scope boundaries prevent insertion in adjacent incomplete words.

Spanish words with `tl` stay unchanged with `hyphenation.language-ambiguity`.
Regional pronunciation differences give different divisions.
Puncta has no English pronunciation detector.
The algorithm does not always insert SHY at all permitted positions. Evidence from a fixed corpus does not show accuracy for all words.

The [English corpus record](../acceptance/en-gb-hyphenation-corpus.md) and [Spanish corpus record](../acceptance/es-es-hyphenation-corpus.md) document language evidence selected before engine comparison.
English compound construction and pronunciation give `back|bone`.
The RAE syllable-division rules give Spanish `ca|mi|no`.
The [checked programs](../guides/hyphenation.md#enable-insertion) show these results and excluded forms.
A permitted position does not always cause a rendered line break.
