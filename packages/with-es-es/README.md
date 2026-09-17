# @use-puncta/with-es-es

Explicitly installed es-es locale module. Named ESM export: `esEs`.

```ts
import { createPuncta } from "@use-puncta/core";
import { esEs } from "@use-puncta/with-es-es";

const puncta = createPuncta({ locales: [esEs], locale: esEs.id });
puncta.text("Wait..."); // "Wait…"
```

The module is immutable, exposes readonly `id` and package `version`, and is ready
synchronously after import. There is no global registration or runtime loading.
Core is a peer dependency. The locale includes a static Spanish Liang resource;
opt in with `hyphenation: { enabled: true }` to obtain `ca\u00admi\u00adno` from
`camino`. Defaults are six letters and two letters on each side. Only lowercase
and one initial capital are admitted, using a–z, á/é/í/ó/ú/ü/ñ. Decomposed accents
are supported without changing their original spelling.

Whole words containing `tl` are conservatively skipped with
`hyphenation.language-ambiguity` in detailed mode. Existing SHY, protection,
unsupported alphabets and expected skip policies remain authoritative. Results
are computed synchronously and do not promise perfect division of arbitrary
text or control actual rendered line breaks.

`hyphenation-manifest.json` identifies the fixed input, baseline and versioned
Puncta refinement. `NOTICE.md` contains the full upstream attribution and licence.
No whole-word exception table is included.

MIT licensed. Public publication is separate work.

Optional `rules.digitGrouping` defaults to
`{ enabled: false, minDigits: 5, normalizeExisting: true }`. Standalone ASCII
integers and `,` or `.` decimals use U+202F, for example `12345,6700` →
`12\u202f345,6700`. The decimal sign and fraction remain literal; `1,234` is a
decimal. Valid groups using SPACE/NBSP/THIN SPACE/NNBSP normalize above the threshold.
Malformed groups and conflicting punctuation such as `1.234,50` retain their
spelling with a grouping warning. `normalizeExisting: false` retains all existing
groups. Known units, currencies and percentages admit the same grouping; internal U+202F
remains distinct from exterior bonds. Eligible ranges require two valid endpoints;
ASCII hyphens need a known unit or standalone-range recognition. See
[the core API and limits](../core/README.md#opt-in-digit-grouping).
