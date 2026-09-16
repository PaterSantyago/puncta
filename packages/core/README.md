# @use-puncta/core

Synchronous ESM typography, with explicitly installed locales and no React or DOM
requirement. The current implementation covers quotes, apostrophes, ordinary spaces, punctuation intervals and
ellipses, units, percentages and currencies, including recognition across transparent inline leaves and nested
configuration scopes (#39–#45).

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
numeric punctuation and dates. In es-es it removes ordinary inner spaces after
existing `¿`/`¡` and before `?`/`!`; it does not supply missing signs. Dashes are not reformatted by this slice.

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
number notation are never reordered or rewritten. A currency between two numbers
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

HTML uses parse5 8.0.0 in fragment mode with explicit div context, without adding a
wrapper. Serialization can change the HTML string without typographic edits:
`outputChanged` and `hasEdits` are independent. Attributes are not transformed.
HTML is not sanitized.

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

This is a narrow implementation, not completion of the first-version contract.
All accepted shared option forms are validated and retained, but quotes, apostrophes, spaces, ellipsis, textual dashes, numeric ranges, minus, units, percentages and
currencies currently change text. Enabling another rule or hyphenation does not implement
that transformation. Hyphenation resources and their errors, HTML document/other fragment contexts and
the full warning catalogue remain subsequent work. Unsupported
call options are rejected rather than treated as implemented settings. Word admission and hyphenation require their own rule-specific acceptance.

MIT licensed. The API remains experimental; public publication is separate work.
