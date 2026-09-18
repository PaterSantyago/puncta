# @use-puncta/core

Synchronous text and HTML typography with an explicitly selected locale.

**Unreleased functional version.** Public `0.1.0-alpha.0` is the historical
scaffold and does not have this API.

## Start

Install `@use-puncta/core` and `@use-puncta/with-en-gb` as direct dependencies.
Use the compatible functional release versions when they are available. The
[installation page](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/docs/getting-started/installation.md)
contains the npm and pnpm command templates and current release status.

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

See the [quick start](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/docs/getting-started/text-and-html.md)
and [documentation index](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/docs/README.md).
Release-specific URLs are pending. These links point to the documentation branch.

## Guide and reference

- [Configure settings and locales](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/docs/guides/configuration.md).
- [Core signatures](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/docs/reference/core.md).
- [Settings and defaults](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/docs/reference/settings.md).
- [Locale rules](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/docs/reference/locales-and-rules.md).

## Existing reference material

These sections contain reference material until the separate reference pages are
complete. Its migration and full documentation review are pending.

Shared settings and all eleven rule groups now have canonical definitions
in the references above. The material below covers the pending diagnostics slice.

HTML and protection have their own guides:

- [HTML modes, scopes, inline context, and serialization](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/docs/guides/html.md).
- [Text ranges, technical tokens, and protected markup](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/docs/guides/protection.md).
- [Format parameters and validation](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/docs/reference/core.md#format-parameters).

Detailed source-coordinate definitions are pending. Source paths index the parsed
tree, with comments and elements inserted by the parser. Entity/CRLF decoding
and astral characters retain UTF-16 provenance. Unmappable parser repairs report
`accuracy: "unavailable"` with a reason.

Use the [hyphenation guide](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/docs/guides/hyphenation.md) for insertion and text, HTML, or React removal.
The [core removal reference](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/docs/reference/core.md#stripsofthyphens) defines all format options and overloads.
The [locale reference](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/docs/reference/locales-and-rules.md#hyphenation) defines word admission and language limits.

These are selected editorial profiles: en-gb follows an Oxford-style quotation
choice; es-es follows the agreed RAE-oriented profile. They do not exhaust valid
editorial conventions. Frozen linguistic examples establish bounded evidence,
not universal accuracy; optional valid hyphenation positions can be omitted.
Actual line breaks depend on fonts, width, CSS and the rendering environment.
Puncta inserts opportunities rather than laying out text. HTML is not sanitized.

The repository's `docs/acceptance/first-version.md` records exact tested versions,
all acceptance commands, corpus/resource identities and measured sizes/timings.
Unsupported call options are rejected.

MIT licensed, with ISC kernel attribution and Unicode data licensing in `NOTICE.md`.
The API remains experimental; public publication is separate work.

## Opt-in digit grouping

Use the [grouping guide](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/docs/guides/configuration.md#enable-digit-grouping)
and [notation, bonds, ranges, and exclusions](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/docs/reference/locales-and-rules.md#digit-grouping).
The [settings reference](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/docs/reference/settings.md#digit-grouping)
defines defaults, validation, inheritance, and reset.

### Grouping in nested scopes and source reports

See [HTML scope boundaries](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/docs/guides/html.md#group-digits-across-inline-elements)
and [grouping diagnostics and source positions](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/docs/reference/diagnostics.md#digit-grouping).
