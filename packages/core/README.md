# @use-puncta/core

Synchronous ESM typography, with explicitly installed locales and no React or DOM
requirement. The implementation covers quotes, apostrophes, ordinary spaces, punctuation intervals,
ellipses, dashes, ranges, minus, units, percentages and currencies, plus optional
digit grouping and algorithmic hyphenation in en-gb and es-es. Recognition spans transparent inline
leaves and respects nested configuration scopes.

```ts
import { createPuncta } from "@use-puncta/core";
import { enGb } from "@use-puncta/with-en-gb";

const puncta = createPuncta({ locales: [enGb], locale: enGb.id });
puncta.text("Hello ,  world..."); // "Hello, world…"
puncta.html("<span>Wait...</span>"); // "<span>Wait…</span>"
puncta.text("😀 Wait...", { detailed: true });
```

`text` and `html` return strings by default. `detailed: true` returns `result`,
`hasEdits`, `outputChanged`, `edits`, `sources`, `appliedRules` and `warnings`.
Ranges use UTF-16 offsets in original text leaves. A boolean variable produces a
union return type. Four or more consecutive dots stay unchanged. Repeating the
conversion creates no new edits. Read a locale identifier from `locale.id`;
`localeId` has been removed.

The `spaces` rule collapses repeated U+0020 spaces and fixes unambiguous punctuation
intervals. It retains line endings, blank lines, indentation, tabs, existing NBSP,
numeric punctuation and dates. Opt-in digit grouping additionally preserves
complete numeric candidates and repeated spaces separating independent numbers;
it can normalize valid integer-group separators as described below. In es-es it removes ordinary inner spaces after
existing `¿`/`¡` and before `?`/`!`; it does not supply missing signs. Textual double-hyphen markers and recognised dashes use spaced en dashes in
en-gb and closed em-dash insertions in es-es. A known unit disambiguates
`10-12 kg` → `10–12\u00a0kg` and `-5 kg` → `−5\u00a0kg`. Standalone ranges
require `rules.ranges.standalone: true`; ordinary word hyphens and dialogue
markers are preserved. `rules.dashes.normalizeExisting: false` retains formatted
dash styles while still recognising explicit markers.

Spacing around ambiguous ellipses (including separated dots), spaced numeric
punctuation and periods directly between text stays conservative. Detailed results
use `typography.ambiguous`, `ruleId: "spaces"` and original `location.ranges` for
those intervals. Recognition of ellipses continues when their conversion is off,
so general space cleanup cannot destroy their intervals. Warnings may repeat on
unchanged ambiguous text; disabled rules and protected text produce no rule warnings.

Quotes use `‘…’` then `“…”` in en-gb, and `«…»`, `“…”`, `‘…’` in es-es,
continuing by alternating single/double pairs. `rules.quotes.normalizeExisting: false`
retains formatted pairs and selects straight-pair styles compatible with their
immediate neighbours. Unpaired or ambiguous delimiters are preserved with
`quotes.unpaired` or `typography.ambiguous` warnings. No missing signs are added,
and punctuation stays on its original side of each quote. Spanish inner ordinary
spaces are removed by the independently switchable `spaces` rule.

Punctuation apostrophes become U+2019 under `apostrophes`; turning off that rule
still recognises their role within a quote. Letter apostrophe U+02BC is retained.
Feet/inches and unresolved quote roles are not guessed. Quotes can span a single
line break, br/wbr, or an opaque inline fragment. Blank lines, blocks and Suspense
end a quote context. A child typography scope has independent depth while the
outer pair can surround it. Protected content never supplies quote delimiters.

Known case-sensitive units bind to numbers with U+00A0 NBSP, including composite
notations such as `km/h` and `m²`. The angle degree stays attached (`30°`), while
`°C` and `°F` take NBSP. `rules.units.additional` adds literal whole designations;
its array replaces inherited additions, removes case-sensitive duplicates and
rejects empty strings, edge whitespace and control characters. Additions retain
the distinct percentage, currency and angle roles.

Percentages use no space in en-gb and NBSP in es-es; set
`rules.percentages.space` to `"none"` or `"nbsp"` to override. Currency codes
`GBP`, `EUR`, `USD` use NBSP before or after a number. Symbols `£`, `€`, `$` attach
before the number in en-gb and use NBSP after it in es-es. The opposite symbol
order preserves its original interval and reports `currency.order`; currency and
number order are never changed. Numeric separators retain their spelling unless
opt-in digit grouping explicitly normalizes eligible integer groups. A currency between two numbers
belongs to its attached side (no ordinary space, including existing NBSP). When
both sides have equal attachment, the construction remains unchanged with
`typography.ambiguous`. These recognised intervals survive general space cleanup
even when their own rule is disabled. New bonds stop at line breaks, opaque
fragments and nested typography scopes.

Both the locale modules and the active locale are required. A call can explicitly
select another loaded locale. Invalid arguments throw `PunctaConfigError` with
`code`, `details`, `optionPath` and `location`. Instances snapshot their registry
and all explicit settings, so changing caller objects or arrays cannot change an
instance. `with(overrides)` returns an independent instance with the same registry.
`locale`, `enabled`, `rules` and `hyphenation` are shared settings. Rule groups merge
by field; omitted/undefined fields inherit, null fields or groups restore the
current locale defaults. Arrays replace inherited additions. A locale change keeps
explicit overrides and revalidates language minima, even with hyphenation disabled.

```ts
const paused = puncta.with({ rules: { ellipsis: { enabled: false } } });
paused.text("Wait..."); // "Wait..."
paused.text("Wait...", { rules: { ellipsis: null } }); // "Wait…"
```

HTML supports `data-puncta=""`, `data-puncta="off"`, `data-puncta-locale` and
JSON `data-puncta-options` (rules/hyphenation only). Each marker creates an independent
scope. Explicit locale wins over lang on the same element. `lang` accepts en/en-gb
and es/es-es without case sensitivity; repeating the current language preserves
inline context. Unavailable language preserves text with a structured warning;
a nested supported language resumes processing unless protected. Disabled subtrees
and protected elements skip declarative configuration parsing.

Plain-text calls accept `protect: [{ start, end }]` in original UTF-16 offsets.
Ranges must end at grapheme boundaries; adjacent/overlapping ranges merge, empty
ranges have no effect, and invalid ranges throw `protect.invalid-range`. Protection
belongs to that call, not an instance. Recognised URLs with an explicit scheme or
`www.`, email, IP addresses and `v1.2.3` versions are protected automatically,
including across transparent inline joins. URL bodies conservatively retain
punctuation that may belong to a path or query. Markdown and other technical text
require explicit protection.

HTML protects code/pre/script/style, kbd/samp, form values (including standalone
option), template/noscript, SVG/MathML/ruby and embedded/media content. The presence
of `hidden` and editable content protect entire subtrees; `aria-hidden` alone does
not. Protected contents and nested declarative settings are not analysed. Unknown
elements remain opaque and produce `markup.element-unsupported` warnings.

HTML uses parse5 8.0.0. `mode` defaults to `"fragment"` with explicit `"div"`
context; `mode: "document"` parses a full document. The mode is never inferred.
For contextual fragments, use a supported standard HTML element name such as
`{ context: "table" }` or `{ context: "title" }`. Context names use lowercase HTML
spelling and the shared supported-element table; unknown/custom names and
SVG/MathML contexts are rejected. `context` is forbidden in document mode.

The context affects parsing only: it adds neither an output wrapper nor a
protected ancestor. Protection applies to elements in the supplied markup.
HTML title uses RCDATA, so entities are decoded and `<b>` inside it is text.
Standard parser recovery defines the tree; typography preserves that tree and
attribute values without sanitizing HTML. SVG/MathML subtrees remain protected,
including integration points containing HTML descendants.

Serialization can change the HTML string without typographic edits, including
with `enabled: false`: `outputChanged` and `hasEdits` are independent. Protected
text and attributes are preserved after parsing, without a byte-for-byte promise.
Available parser diagnostics use `html.parse`, `source: "parser"` and
`details.parserCode`, with original input positions or an explicit unavailable
location. Protection does not suppress parsing diagnostics. An absence of warnings
does not establish validity or imply that no recovery took place. Edit reports
explain typography; they are not patches for reproducing serialized HTML.

Raw-text fragment contexts retain literal entities during serialization. Inputs
containing an actual HTML `plaintext` element retain their original markup
scaffold, with changed text serialized through parser token origins. This avoids
adding closing tags that a later parse would consume as plaintext, and preserves
foster-parented table structure. The implementation's character-token integration
is pinned to parse5 8.0.0 and covered by malformed-input regression tests.

Inline elements and comments share recognition context. For example,
`<b>.</b><em>..</em>` becomes `<b>…</b><em></em>`: a replacement belongs to the
first affected leaf, while empty elements and untouched letters stay in place.
A new insertion at a leaf boundary belongs to the left nonempty leaf; an existing
space stays owned by its original leaf. Reports distinguish replace/insert/delete
and map text warnings through the same source coordinates as edits.
Blocks, br/wbr/hr and opaque fragments interrupt this recognition without adding
characters. Source paths index the parsed tree, including comments and elements
inserted by the parser. Multi-leaf edits have separate ranges without intervening
tags. Entity/CRLF decoding and astral characters retain UTF-16 provenance;
unmappable parser repairs report `accuracy: "unavailable"` with a reason.

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
