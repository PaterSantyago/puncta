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
Quotes, apostrophes, spaces, punctuation intervals, ellipsis, units, percentages and currencies are implemented; the full locale
profile and hyphenation resources are subsequent work. Core is a peer dependency.

MIT licensed. Public publication is separate work.
