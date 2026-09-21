# @use-puncta/with-en-gb

The British English locale for Puncta. Named ESM export: `enGb`.

This README is for functional alpha `0.1.0-alpha.2`. The earlier `0.1.0-alpha.0`
scaffold does not have this API.

## Start

Install `@use-puncta/core` and `@use-puncta/with-en-gb` as direct dependencies.
Use version `0.1.0-alpha.2` for both packages. The
[installation page](https://github.com/PaterSantyago/puncta/blob/%40use-puncta%2Fwith-en-gb%400.1.0-alpha.2/docs/getting-started/installation.md)
contains the npm and pnpm commands for this version.

<!-- puncta:example package-with-en-gb -->

```ts
import { createPuncta } from "@use-puncta/core";
import { enGb } from "@use-puncta/with-en-gb";

const puncta = createPuncta({ locales: [enGb], locale: enGb.id });
console.log(puncta.text("Wait..."));
```

Output:

<!-- puncta:output package-with-en-gb -->

```text
Wait…
```

See the [quick start](https://github.com/PaterSantyago/puncta/blob/%40use-puncta%2Fwith-en-gb%400.1.0-alpha.2/docs/getting-started/text-and-html.md)
and [documentation index](https://github.com/PaterSantyago/puncta/blob/%40use-puncta%2Fwith-en-gb%400.1.0-alpha.2/docs/README.md).
The guide and reference links use this package’s immutable `0.1.0-alpha.2` tag.
Use the installation page for commands that select this version.

## Guide and reference

- [Configure settings and locales](https://github.com/PaterSantyago/puncta/blob/%40use-puncta%2Fwith-en-gb%400.1.0-alpha.2/docs/guides/configuration.md).
- [Core signatures](https://github.com/PaterSantyago/puncta/blob/%40use-puncta%2Fwith-en-gb%400.1.0-alpha.2/docs/reference/core.md).
- [Settings and defaults](https://github.com/PaterSantyago/puncta/blob/%40use-puncta%2Fwith-en-gb%400.1.0-alpha.2/docs/reference/settings.md).
- [Locale rules](https://github.com/PaterSantyago/puncta/blob/%40use-puncta%2Fwith-en-gb%400.1.0-alpha.2/docs/reference/locales-and-rules.md).

## Existing reference material

Use the [hyphenation guide](https://github.com/PaterSantyago/puncta/blob/%40use-puncta%2Fwith-en-gb%400.1.0-alpha.2/docs/guides/hyphenation.md) for insertion and removal.
See [locale admission and evidence](https://github.com/PaterSantyago/puncta/blob/%40use-puncta%2Fwith-en-gb%400.1.0-alpha.2/docs/reference/locales-and-rules.md#hyphenation) and [minima and resets](https://github.com/PaterSantyago/puncta/blob/%40use-puncta%2Fwith-en-gb%400.1.0-alpha.2/docs/reference/settings.md#hyphenation).
Use the [digit-grouping reference](https://github.com/PaterSantyago/puncta/blob/%40use-puncta%2Fwith-en-gb%400.1.0-alpha.2/docs/reference/locales-and-rules.md#digit-grouping) for notation, examples, and exclusions.
`NOTICE.md` contains upstream attribution and licenses.

MIT licensed.
