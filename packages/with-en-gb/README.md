# @use-puncta/with-en-gb

The British English locale for Puncta. Named ESM export: `enGb`.

**Unreleased functional version.** Public `0.1.0-alpha.0` is the historical
scaffold and does not have this API.

## Start

Install `@use-puncta/core` and `@use-puncta/with-en-gb` as direct dependencies.
Use the compatible functional release versions when they are available. The
[installation page](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/docs/getting-started/installation.md)
contains the npm and pnpm command templates and current release status.

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

See the [quick start](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/docs/getting-started/text-and-html.md)
and [documentation index](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/docs/README.md).
Release-specific URLs are pending. These links point to the documentation branch.

## Guide and reference

- [Configure settings and locales](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/docs/guides/configuration.md).
- [Core signatures](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/docs/reference/core.md).
- [Settings and defaults](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/docs/reference/settings.md).
- [Locale rules](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/docs/reference/locales-and-rules.md).

## Existing reference material

Use the [hyphenation guide](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/docs/guides/hyphenation.md) for insertion and removal.
See [locale admission and evidence](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/docs/reference/locales-and-rules.md#hyphenation) and [minima and resets](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/docs/reference/settings.md#hyphenation).
Use the [digit-grouping reference](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/docs/reference/locales-and-rules.md#digit-grouping) for notation, examples, and exclusions.
`NOTICE.md` contains upstream attribution and licenses.

MIT licensed. Public publication is separate work.
