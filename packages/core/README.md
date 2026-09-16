# @use-puncta/core

Synchronous ESM typography, with explicitly installed locales and no React or DOM
requirement. This first implementation covers unambiguous ellipses only (#39).

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
`outputChanged` and `hasEdits` are independent. Exact input ranges are currently
provided for unchanged raw text encoding; entity/CRLF source mapping reports
`accuracy: "unavailable"` until the dedicated source-mapping slice. Attributes
are not transformed. HTML is not sanitized.

This is a narrow implementation, not completion of the first-version contract.
Full rule settings and `with()`, hyphenation, plain-text protection ranges,
HTML document/other fragment contexts, language/declarative areas, complex inline
boundaries, cross-leaf edits, entity provenance and the full warning catalogue
remain subsequent work. Do not use this slice as a general-purpose typography
processor for technical or protected content. Basic code/pre/script/style nodes
are skipped, but full protection is not implemented. Unsupported call options are
rejected rather than treated as implemented settings.

MIT licensed. The API remains experimental; public publication is separate work.
