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
Optional digit grouping is off. Its dedicated section is pending.
See [existing grouping details](../../packages/core/README.md#opt-in-digit-grouping).
Hyphenation insertion and removal are different operations. Their guide is pending.

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
