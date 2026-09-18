# @use-puncta/core

Synchronous text and HTML typography with an explicitly selected locale.

**Unreleased functional version.** Public `0.1.0-alpha.0` is the historical
scaffold and does not have this API.

## Start

Install `@use-puncta/core` and `@use-puncta/with-en-gb` as direct dependencies.
Use the compatible functional release versions when they are available. The
[installation page](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/docs/getting-started/installation.md)
contains the npm and pnpm command templates and current release status.

<!-- puncta:example package-core -->

```ts
import { createPuncta } from "@use-puncta/core";
import { enGb } from "@use-puncta/with-en-gb";

const puncta = createPuncta({ locales: [enGb], locale: enGb.id });
console.log(puncta.text("Wait..."));
```

Output:

<!-- puncta:output package-core -->

```text
Wait…
```

See the [quick start](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/docs/getting-started/text-and-html.md)
and [documentation index](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/docs/README.md).
Release-specific URLs are pending. These links point to the documentation branch.

## Guide and reference

- [Configure settings and locales](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/docs/guides/configuration.md).
- [Core signatures](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/docs/reference/core.md).
- [Settings and defaults](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/docs/reference/settings.md).
- [Locale rules](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/docs/reference/locales-and-rules.md).

## Existing reference material

These sections contain reference material until the separate reference pages are
complete. Its migration and full documentation review are pending.

Shared settings and the ten standard rule groups now have canonical definitions
in the references above. The material below covers pending diagnostics,
hyphenation, and digit-grouping slices.

HTML and protection have their own guides:

- [HTML modes, scopes, inline context, and serialization](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/docs/guides/html.md).
- [Text ranges, technical tokens, and protected markup](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/docs/guides/protection.md).
- [Format parameters and validation](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/docs/reference/core.md#format-parameters).

Detailed source-coordinate definitions are pending. Source paths index the parsed
tree, including comments and elements inserted by the parser. Entity/CRLF decoding
and astral characters retain UTF-16 provenance. Unmappable parser repairs report
`accuracy: "unavailable"` with a reason.

`stripSoftHyphens(source, options?)` removes author and previously inserted U+00AD
without typography. `format` defaults to `"text"`; explicit `"html"` uses the same
fragment/document modes and context options as `html()`. Text accepts `protect`; HTML accepts
`mode`/`context`; options from the other format are rejected. Shared options and
`detailed` work as usual, with `hyphenation.remove` deletions in original UTF-16
coordinates. Protection, attributes, disabled and unavailable-language regions
retain SHY. Disabling insertion does not disable removal.

Removal validates settings and language minima without needing an insertion
resource, including nested scopes.

Algorithmic SHY insertion is available with either installed locale and
`hyphenation: { enabled: true }`. It runs after typography while retaining
original source coordinates. Transparent leaves share word admission and seam
insertions belong to the left leaf. Missing or incompatible resources produce
`hyphenation.resource-unavailable` or `hyphenation.resource-incompatible` before
a result is returned. Separate SHY removal needs no insertion resource.

Hyphenation admits lowercase or initial-capital words of at least six letters.
English admits a–z; Spanish also admits á, é, í, ó, ú, ü and ñ, including
unambiguously equivalent decomposed graphemes. The minimum left part is two
letters; the minimum right part is three in en-gb and two in es-es. These minima
can be raised. ALL CAPS, mixed case, digits, apostrophes, hyphens and existing SHY
cause whole-word skips. Unsupported graphemes and mixed scripts preserve the
word with diagnostics; Spanish words containing `tl` are skipped with
`hyphenation.language-ambiguity`. No English pronunciation detector is promised.
Opaque/protected/scope edges conservatively skip adjoining word fragments.

Partial example: use the `puncta` instance from the Start example above.

```ts
const hyphenated = puncta.with({ hyphenation: { enabled: true } });
hyphenated.text("backbone"); // "back\u00adbone"
hyphenated.stripSoftHyphens("back\u00adbone"); // "backbone"
```

These are selected editorial profiles: en-gb follows an Oxford-style quotation
choice; es-es follows the agreed RAE-oriented profile. They do not exhaust valid
editorial conventions. Frozen linguistic examples establish bounded evidence,
not universal accuracy; optional valid hyphenation positions can be omitted.
Actual line breaks depend on fonts, width, CSS and the rendering environment.
Puncta inserts opportunities rather than laying out text. HTML is not sanitized.

The repository's `docs/acceptance/first-version.md` records exact tested versions,
all acceptance commands, corpus/resource identities and measured sizes/timings.
Unsupported call options are rejected.

MIT licensed, with ISC kernel attribution and Unicode data licensing in `NOTICE.md`.
The API remains experimental; public publication is separate work.

## Opt-in digit grouping

`rules.digitGrouping` is a nullable group with defaults
`{ enabled: false, minDigits: 5, normalizeExisting: true }` in both locales.
`minDigits` and `normalizeExisting` alone do not enable it. The fields follow the
same inheritance and null-reset model as other rule groups.

Partial example: use the `puncta` instance from the Start example above.

```ts
const grouped = puncta.with({ rules: { digitGrouping: { enabled: true } } });
grouped.text("12345.6700"); // "12\u202f345.6700"
grouped.text("2026"); // "2026"
grouped.text("2026", { rules: { digitGrouping: { minDigits: 4 } } }); // "2\u202f026"
grouped.html("12<em>345</em>"); // "12\u202f<em>345</em>"
grouped.text("12345-67890kg"); // "12\u202f345–67\u202f890\u00a0kg"
```

Standalone ASCII integers and decimals support an optional leading `+`, `-` or
`−`, decimal `.` in en-gb and decimal `.` or `,` in es-es. Only the integer digit
count controls the threshold; digits, decimal signs and fractional trailing zeros
remain text, without numeric conversion. The independent minus rule may still
format an ASCII sign.

Existing groups require 1–3 digits first, then exactly three per group, separated
by one SPACE, NBSP, THIN SPACE or NNBSP; mixtures of these spaces are allowed.
en-gb also accepts comma groups, without mixing commas and group spaces. es-es
reads `1,234` as a decimal; `1.234,50` is a conflict. `normalizeExisting: true`
changes valid separators to U+202F only at or above the threshold. `false` retains
the entire grouped spelling while still grouping ungrouped numbers. Existing
groups are never removed, and unchanged U+202F produces no edit.

Malformed groups (`1234 567`, `12 34`), conflicting separators and spaces before
numeric punctuation (`1 , 234`) retain the whole candidate and produce one
`typography.ambiguous` warning with `source: "rule"`, `ruleId: "digitGrouping"`,
the active locale and the whole original candidate location. A high threshold or
`normalizeExisting: false` does not suppress that warning. Terminal punctuation
and lists such as `12345, 67890` remain outside each number.

Leading zeros, missing integer parts, non-ASCII/mixed digits, combining marks,
identifiers and unknown suffixes remain ungrouped without grouping warnings.
Scientific notation, slash/colon numeric structures, three-or-more dotted or
hyphenated segments and arithmetic constructions also stay excluded. Years and
telephone numbers are not guessed. Protection retains its existing meaning.
Known units (including composites and additions), percentages, angular degrees
and currencies admit grouping through their existing complete-designation
catalogues. For example, `12345kg` becomes `12\u202f345\u00a0kg`: internal
NNBSP and the exterior NBSP bond have separate roles. Existing currency order,
percent spacing and minus rules retain their own edits and warnings.

En-dash ranges admit two valid endpoints. An ASCII hyphen admits grouping only
with a known unit or `rules.ranges.standalone: true`; U+2212 is not a range
separator. Both endpoints must be eligible: `00123–123456` remains ungrouped;
`12 34–123456` retains the whole range with one grouping warning. Threshold and
`normalizeExisting` apply independently to eligible endpoints, so en-gb
`1,234–56789` can become `1,234–56\u202f789` with normalization disabled.
Disabling units/ranges/percentages/currencies formatting preserves their
recognition context. Grouping never replaces a hyphen on behalf of ranges.
Recognized prose dashes also bound numeric context independently of their
formatting switch. Grouping works with surrounding quotes, spacing, ellipsis
and optional hyphenation through text, HTML and React, including streaming SSR.

`minDigits` accepts safe integers from 4 through `Number.MAX_SAFE_INTEGER`.
Invalid settings throw `PunctaConfigError` / `config.invalid-option` even if
processing is disabled: wrong types use `details.reason: "type"`, invalid numeric
values use `"value"`, and unknown fields use `"unknown"`, with the exact
`optionPath`. All three fields accept null or undefined; the group accepts an
object, null or undefined, never a boolean shorthand.

The public `RuleId` union gains `"digitGrouping"`; exhaustive consumers should
handle it. Detailed results record separate empty-range U+202F insertions at
original UTF-16 positions, replacements of individual source separators, and add `digitGrouping` to `appliedRules` only for actual
changes. Transparent boundaries assign insertions to the end of the left leaf;
replacements stay with their original separator leaf.
Protection and opaque boundaries retain their existing meaning. With grouping
enabled, two or more group spaces between numbers, tabs and line breaks retain
their separation on a second pass. Cleanup preserves candidate spelling and does
not undo normalized groups. With grouping disabled, previous cleanup and reports
remain unchanged. The complete criterion-to-test mapping and revision-specific results are recorded in
[the grouping acceptance report](../../docs/acceptance/digit-grouping.md).

### Grouping in nested scopes and source reports

Instance creation, `with`, text/HTML call options and `data-puncta-options` use
this same group. Missing or `undefined` fields inherit explicit values;
`null` fields return to the current locale's defaults. `digitGrouping: null`
resets all three fields, including `enabled` to false. `rules: null` is invalid.
Turning the rule off retains explicit threshold and normalization settings for
later re-enabling. A locale change preserves these explicit settings and resolves
unset fields from the new locale.

Partial example: use the `grouped` instance from the preceding example.

```ts
const compact = grouped.with({
  rules: { digitGrouping: { minDigits: 4, normalizeExisting: false } },
});
const paused = compact.with({ rules: { digitGrouping: { enabled: false } } });
paused.text("1234; 12 345", {
  rules: { digitGrouping: { enabled: true } },
}); // "1\u202f234; 12 345"
compact.text("1234", { rules: { digitGrouping: { minDigits: null } } }); // "1234"
```

An explicit nested scope interrupts a number even when its options equal the
parent's: `12<span data-puncta="">345</span>` stays ungrouped. Inline elements,
comments and a same-locale `lang` alias remain transparent; line breaks,
`br`/`wbr`, blocks, changed locales, opaque fragments and protection stop the
number. Protected contents are not inspected to continue a candidate or produce
grouping warnings. `data-puncta="off"` takes precedence over options on that
host, and descendants cannot re-enable the protected scope. Invalid explicit
call options still throw when processing is disabled. SHY removal validates the
shared settings but performs no grouping or grouping diagnostics.

Detailed edits keep unchanged digits in their original leaves. For example,
`12<em>&#32;</em>345` becomes `12<em>\u202f</em>345`: the sole replacement has
`before: " "`, `after: "\u202f"` and a decoded leaf range of `[0, 1)`. Its HTML
`inputRange` exactly covers the original `&#32;`. An insertion at
`12<em>345</em>` has the empty range `[2, 2)` in the left leaf. Multiple separators
separated by unchanged digits produce separate edits. Warnings locate the entire
original candidate across all its accessible leaves, using the scope's locale.

HTML `before`/`after` are decoded text. Input positions use `exact` for mapped
boundaries, `covering` when a decoded range cuts a multi-codepoint origin, and
`unavailable` with a reason for unmappable parser repairs. Grouping does not
invent positions inside an entity; the supported digit and separator entities
map at their boundaries. Replay reconstructs transformed source text, not parser
recovery or serialized markup. Thus serialization alone can set `outputChanged`
without `hasEdits`, `digitGrouping` edits or an applied-rule entry.
