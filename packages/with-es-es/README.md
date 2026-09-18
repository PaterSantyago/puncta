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
Puncta refinement. `NOTICE.md` contains the full upstream attribution and license.
No whole-word exception table is included.

MIT licensed. Public publication is separate work.
