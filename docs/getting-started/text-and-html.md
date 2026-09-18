# Process text and HTML

[Documentation index](../README.md)

First, [install core and a locale](installation.md). The examples that follow use
British English. Each example has all necessary imports and returns a string.

## Process text

Create an instance with an explicit locale. Pass the source string to `text()`.

<!-- puncta:example text-start -->

```ts
import { createPuncta } from "@use-puncta/core";
import { enGb } from "@use-puncta/with-en-gb";

const puncta = createPuncta({ locales: [enGb], locale: enGb.id });
console.log(puncta.text("Wait..."));
```

Output:

<!-- puncta:output text-start -->

```text
Wait…
```

## Process HTML

Pass an HTML fragment to `html()`.

<!-- puncta:example html-start -->

```ts
import { createPuncta } from "@use-puncta/core";
import { enGb } from "@use-puncta/with-en-gb";

const puncta = createPuncta({ locales: [enGb], locale: enGb.id });
console.log(puncta.html("<span>Wait...</span>"));
```

Output:

<!-- puncta:output html-start -->

```text
<span>Wait…</span>
```

HTML parsing does not sanitize input. Use a separate sanitizer for untrusted HTML.
The output can change its HTML notation because the parser serializes the result.
Puncta does not keep HTML byte for byte.

## Next steps

See [configuration](../guides/configuration.md) to change rules or locales,
and [core signatures](../reference/core.md) for return types.
Use the [HTML guide](../guides/html.md) for modes, contexts, and scopes.
Use the [protection guide](../guides/protection.md) for text ranges and protected markup.
Before you select a different environment, read [compatibility](../compatibility.md).
