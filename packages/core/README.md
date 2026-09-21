# @use-puncta/core

Synchronous text and HTML typography with a selected locale.

This README is for functional alpha `0.1.0-alpha.2`. The earlier `0.1.0-alpha.0`
scaffold does not have this API.

## Start

Install `@use-puncta/core` and `@use-puncta/with-en-gb` as direct dependencies.
Use version `0.1.0-alpha.2` for both packages. The
[installation page](https://github.com/PaterSantyago/puncta/blob/%40use-puncta%2Fcore%400.1.0-alpha.2/docs/getting-started/installation.md)
contains the npm and pnpm commands for this version.

<!-- puncta:example package-core -->

```ts
import { createPuncta } from "@use-puncta/core";
import { enGb } from "@use-puncta/with-en-gb";

const puncta = createPuncta({ locales: [enGb], locale: enGb.id });
console.log(puncta.text("Wait..."));
```

Output:

<!-- puncta:output package-core -->

```text
Wait…
```

See the [quick start](https://github.com/PaterSantyago/puncta/blob/%40use-puncta%2Fcore%400.1.0-alpha.2/docs/getting-started/text-and-html.md)
and [documentation index](https://github.com/PaterSantyago/puncta/blob/%40use-puncta%2Fcore%400.1.0-alpha.2/docs/README.md).
The guide and reference links use this package’s immutable `0.1.0-alpha.2` tag.
Use the installation page for commands that select this version.

## Guide and reference

- [Configure settings and locales](https://github.com/PaterSantyago/puncta/blob/%40use-puncta%2Fcore%400.1.0-alpha.2/docs/guides/configuration.md).
- [Core signatures](https://github.com/PaterSantyago/puncta/blob/%40use-puncta%2Fcore%400.1.0-alpha.2/docs/reference/core.md).
- [Settings and defaults](https://github.com/PaterSantyago/puncta/blob/%40use-puncta%2Fcore%400.1.0-alpha.2/docs/reference/settings.md).
- [Locale rules](https://github.com/PaterSantyago/puncta/blob/%40use-puncta%2Fcore%400.1.0-alpha.2/docs/reference/locales-and-rules.md).

- [HTML modes, scopes, and serialization](https://github.com/PaterSantyago/puncta/blob/%40use-puncta%2Fcore%400.1.0-alpha.2/docs/guides/html.md).
- [Text and markup protection](https://github.com/PaterSantyago/puncta/blob/%40use-puncta%2Fcore%400.1.0-alpha.2/docs/guides/protection.md).
- [Soft-hyphen insertion and removal](https://github.com/PaterSantyago/puncta/blob/%40use-puncta%2Fcore%400.1.0-alpha.2/docs/guides/hyphenation.md).
- [Reports, errors, warnings, and source coordinates](https://github.com/PaterSantyago/puncta/blob/%40use-puncta%2Fcore%400.1.0-alpha.2/docs/reference/diagnostics.md).
- [Troubleshooting](https://github.com/PaterSantyago/puncta/blob/%40use-puncta%2Fcore%400.1.0-alpha.2/docs/troubleshooting.md).

## Opt-in digit grouping

Use the [grouping guide](https://github.com/PaterSantyago/puncta/blob/%40use-puncta%2Fcore%400.1.0-alpha.2/docs/guides/configuration.md#enable-digit-grouping)
and [notation and exclusions](https://github.com/PaterSantyago/puncta/blob/%40use-puncta%2Fcore%400.1.0-alpha.2/docs/reference/locales-and-rules.md#digit-grouping).

### Grouping in nested scopes and source reports

See [HTML scope boundaries](https://github.com/PaterSantyago/puncta/blob/%40use-puncta%2Fcore%400.1.0-alpha.2/docs/guides/html.md#group-digits-across-inline-elements)
and [grouping diagnostics and source positions](https://github.com/PaterSantyago/puncta/blob/%40use-puncta%2Fcore%400.1.0-alpha.2/docs/reference/diagnostics.md#digit-grouping).

## Limits and licensing

The [compatibility page](https://github.com/PaterSantyago/puncta/blob/%40use-puncta%2Fcore%400.1.0-alpha.2/docs/compatibility.md) gives release status and tested environments.
Puncta does not sanitize HTML. SHY marks a line-break opportunity, not a rendered line break.
The selected locale profiles do not include all valid editorial conventions.

MIT licensed, with ISC kernel attribution and Unicode data licensing in `NOTICE.md`.
The API is experimental.
