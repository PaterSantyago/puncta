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

## Existing reference material

These sections contain reference material until the separate reference pages are
complete. Its migration and full documentation review are pending.

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
profile is implemented. Core is a peer dependency.

Enable algorithmic soft hyphens explicitly with
`puncta.with({ hyphenation: { enabled: true } })`. The default minimum word length
is 6, with at least 2 letters before and 3 after each position; these minima can
be raised. The alphabet is a–z, with lowercase or one initial capital. Existing
SHY, digits, apostrophes, real hyphens, other case forms and protected text prevent
automatic insertion in the complete word. Unsupported characters and mixed
scripts are preserved with warnings only in detailed results.

The packaged immutable resource uses Liang patterns without whole-word
exceptions. Its conservative refinement can omit valid positions; no universal
linguistic accuracy or pronunciation inference is claimed. Ordinary words span
transparent leaves; an opaque or locale boundary conservatively prevents
insertion in an adjoining partial word. Each new SHY is an original-coordinate
`hyphenation.insert` edit. Reprocessing does not add more SHY. Use
`stripSoftHyphens` for a separate clean export. See `NOTICE.md` for code/data
attribution.

MIT licensed. Public publication is separate work.

Optional `rules.digitGrouping` defaults to
`{ enabled: false, minDigits: 5, normalizeExisting: true }`. Standalone ASCII
integers and `.` decimals use U+202F, for example `12345.6700` →
`12\u202f345.6700`, preserving the fraction as text. Valid comma groups or groups
using SPACE/NBSP/THIN SPACE/NNBSP normalize above the threshold; comma/space mixtures
and malformed groups retain their spelling with a grouping warning.
`normalizeExisting: false` retains all existing groups. Known units, currencies and percentages admit the same grouping; internal U+202F
remains distinct from exterior bonds. Eligible ranges require two valid endpoints;
ASCII hyphens need a known unit or standalone-range recognition. See [the core API and limits](../core/README.md#opt-in-digit-grouping).

U+202F is Puncta’s chosen English typography profile, not a claim that all British
style guides use spaces. The default threshold is also a product choice; a bare
`2026` groups when `minDigits: 4`, so protect years or identifiers explicitly.
