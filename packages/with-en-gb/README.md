# @use-puncta/with-en-gb

Explicitly installed en-gb locale module. Named ESM export: `enGb`.

```ts
import { createPuncta } from "@use-puncta/core";
import { enGb } from "@use-puncta/with-en-gb";

const puncta = createPuncta({ locales: [enGb], locale: enGb.id });
puncta.text("Wait..."); // "Wait…"
```

The module is immutable, exposes readonly `id` and package `version`, and is ready
synchronously after import. There is no global registration or runtime loading.
Quotes, apostrophes, spaces, punctuation intervals, ellipsis, textual dashes, numeric ranges, minus, units, percentages and currencies are implemented; the full locale
profile and hyphenation resources are subsequent work. Core is a peer dependency.

MIT licensed. Public publication is separate work.
