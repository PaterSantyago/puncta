# @use-puncta/core

Synchronous ESM typography, with explicitly installed locales and no React or DOM
requirement. The current implementation covers unambiguous ellipses, including
recognition across transparent inline leaves (#39–#40).

```ts
import { createPuncta } from "@use-puncta/core";
import { enGb } from "@use-puncta/with-en-gb";

const puncta = createPuncta({ locales: [enGb], locale: enGb.id });
puncta.text("Wait..."); // "Wait…"
puncta.html("<span>Wait...</span>"); // "<span>Wait…</span>"
puncta.text("😀 Wait...", { detailed: true });
```

`text` and `html` return strings by default. `detailed: true` returns `result`,
`hasEdits`, `outputChanged`, `edits`, `sources`, `appliedRules` and `warnings`.
Ranges use UTF-16 offsets in original text leaves. A boolean variable produces a
union return type. Four or more consecutive dots stay unchanged. Repeating the
conversion creates no new edits. Read a locale identifier from `locale.id`;
`localeId` has been removed.

Both the locale modules and the active locale are required. A call can explicitly
select another loaded locale. Invalid arguments throw `PunctaConfigError` with
`code`, `details`, `optionPath` and `location`. Instances snapshot their registry
and selected locale, so changing the input array cannot change an instance.

HTML uses parse5 8.0.0 in fragment mode with explicit div context, without adding a
wrapper. Serialization can change the HTML string without typographic edits:
`outputChanged` and `hasEdits` are independent. Attributes are not transformed.
HTML is not sanitized.

Inline elements and comments share recognition context. For example,
`<b>.</b><em>..</em>` becomes `<b>…</b><em></em>`: a replacement belongs to the
first affected leaf, while empty elements and untouched letters stay in place.
Blocks, br/wbr/hr and opaque fragments interrupt this recognition without adding
characters. Source paths index the parsed tree, including comments and elements
inserted by the parser. Multi-leaf edits have separate ranges without intervening
tags. Entity/CRLF decoding and astral characters retain UTF-16 provenance;
unmappable parser repairs report `accuracy: "unavailable"` with a reason.

This is a narrow implementation, not completion of the first-version contract.
Full rule settings and `with()`, hyphenation, plain-text protection ranges,
HTML document/other fragment contexts, language/declarative areas and the full
warning catalogue remain subsequent work. Special protected elements and unknown
elements are opaque; attribute-driven protection is not yet implemented. Unsupported
call options are rejected rather than treated as implemented settings. The different
line/opaque/block boundary kinds are retained for future rules; quote continuation,
word admission and insertion placement require their own rule-specific acceptance.

MIT licensed. The API remains experimental; public publication is separate work.
