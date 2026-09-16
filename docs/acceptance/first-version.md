# First functional version: acceptance report

This report implements [#58](https://github.com/PaterSantyago/puncta/issues/58)
against the canonical decisions indexed by [#38](https://github.com/PaterSantyago/puncta/issues/38).
The [requirement matrix](requirement-matrix.md) maps every decision's substantive
sections and literal examples to reproducible checks. It also identifies
contractual exclusions. Historical slice reports remain useful evidence of
language review and fixes; this report records the combined final run.

## Reproduce

Use Node 24.21.0 and pnpm 12.4.1, then run these commands sequentially from the
repository root. Do not run pack/build concurrently with a gate or measurement.

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium firefox webkit
# On Linux use: pnpm exec playwright install --with-deps chromium firefox webkit
pnpm check
pnpm test:browser
pnpm test:rsc
node scripts/measure-acceptance.mjs /tmp/puncta-acceptance-measurements.json
pnpm --filter puncta-example-ssr start
```

`pnpm check` includes lint, formatting, typechecking, builds (including production
Next), archive inspection, all functional/release/publish tests, eight isolated
npm/pnpm consumers and release-plan validation. `pack:check` removes `artifacts/`,
so copy browser/RSC reports before another pack. The measurement command reads
existing archives; it checks their distribution bytes against the modules being
measured. It never publishes, modifies resources or imposes performance thresholds.
The SSR example prints `Wait…` twice. The [RSC example](../../examples/rsc/README.md)
is an executable public-import integration with serializable children, server core
calls and a separate client-owned instance.

## Revision and execution record

Final execution evidence is pending the exact-candidate gate. No unfinished row
is a pass. The completed record will bind command exits, browser/RSC results,
archives, corpus/resources and measurements to one tested commit. A subsequent
report-only commit cannot include its own hash; it will explicitly name that
candidate and leave the product/tests/lockfile unchanged. PR CI runs on GitHub's
synthetic merge commit, whose parents identify the submitted head and develop base.

## Language evidence and resource provenance

Both version-1 corpora were independently reviewed and frozen on 2026-09-16,
before their runtime engine evaluation. The frozen words, required/allowed
positions, settings, per-word sources/rationale and agent review remain in
`tests/fixtures/hyphenation/`. Runtime and preparation code do not consume them.
The [English corpus rationale](en-gb-hyphenation-corpus.md) and
[Spanish corpus rationale](es-es-hyphenation-corpus.md) explain source use and
exhaustiveness. The English evidence uses Council of Europe word-division rules,
British dictionary pronunciation/spelling and independent morphological analysis;
Spanish uses RAE/ASALE DPD word-division/syllabification rules and DLE entries.
Their exact source links and word-specific justifications are in the frozen JSON.
Engine output is never a linguistic oracle.

| Locale | Words | Mandatory words | Mandatory positions | Negative cases | Incorrect additions | Missing mandatory | Optional omissions      |
| ------ | ----: | --------------: | ------------------: | -------------: | ------------------: | ----------------: | ----------------------- |
| en-gb  |   313 |              60 |                  60 |             19 |                   0 |                 0 | 42 positions / 33 words |
| es-es  |   361 |              60 |                 120 |             32 |                   0 |                 0 | 1 position / 1 word     |

These established corpus results are rechecked in the final gate and independently
recounted by the measurement command. All applicable entries run through plain
text, HTML and pure React, preserving exact characters. Positive and negative
corpora are also exercised in each browser. Required words and required positions
are distinct counts. Category membership overlaps; category counts must not be
summed to obtain the unique-word or unique-position totals.

Detailed word omissions remain in [English results](en-gb-hyphenation-result.md)
and [Spanish results](es-es-hyphenation-result.md). All eight removed English
upstream exception words remain tested and account for 17 optional missing
positions; no exceptions are restored. Spanish omits only `desamparo` at UTF-16
position 2 (`prefixes`). General productive-family refinements have separate
linguistic rationales and holdouts. Zero errors on these examples does not establish
universal accuracy or make the patterns a dictionary.

The [English](../../resources/en-gb/manifest.json) and
[Spanish](../../resources/es-es/manifest.json) manifests pin the same tex-hyphen
commit `5684c0f51c0b81133db2efbe60a408b4155a3ff5` and controlled hyphen kernel
commit `86a09f1c1282dea8708b9b6f6bde7ad58e7d7c17`. Both use resource refinement 1.
Manifests contain source, baseline, refinement, prepared-pattern and table SHA-256;
locale archives include them along with notices. Recipes reproduce bytes from
fixed inputs without whole-word exception tables or exception compilation.
Core includes the derivative kernel/Unicode notices. The archive and installed
consumer gates inspect those shipped documents and table identities.

## Measured size and processing time

Final measurements are pending. `scripts/measure-acceptance.mjs` records each
archive's compressed bytes, sum of uncompressed file bytes, distribution JavaScript
bytes and SHA-256. These are package-own sizes, excluding transitive dependencies,
and are not tree-shaken browser bundle sizes.

It measures two locales × three input sizes × text/HTML/pure React × ordinary/
detailed result × hyphenation off/on, plus instance creation. Inputs are exact
repeated literal seeds recorded with UTF-16 lengths, UTF-8 bytes and hashes.
There are three warmups and nine retained samples per scenario; per-call median,
minimum, maximum and raw samples are saved. Imports/input construction are outside
warm-call timing. HTML includes parsing/serialization; React measures pure tree
transformation, not SSR or mounting. Instance creation is measured separately
with warm imports and ten new instances per sample. No forced GC or outlier
filtering is used. This is a local descriptive measurement, not a benchmark claim
across machines, a cold-start result or an arbitrary acceptance threshold.

## Public use and limits

```ts
import { createPuncta } from "@use-puncta/core";
import { enGb } from "@use-puncta/with-en-gb";
import { esEs } from "@use-puncta/with-es-es";

const puncta = createPuncta({ locales: [enGb, esEs], locale: enGb.id });
puncta.text('"Hello", 24kg...'); // ‘Hello’, 24\u00a0kg…
puncta.html('<span lang="es">"Hola" 50%</span>');
// <span lang="es">«Hola» 50&nbsp;%</span>
const spanish = puncta.with({
  locale: esEs.id,
  hyphenation: { enabled: true },
});
spanish.text("camino"); // ca\u00admi\u00adno
spanish.stripSoftHyphens("ca\u00admi\u00adno"); // camino
const report = puncta.text("😀 Wait...", { detailed: true });
// report.edits uses original UTF-16 source ranges, not display columns.
```

[Puncta/Provider and pure React examples](../../packages/with-react/README.md)
use explicit instances and original children. Runtime consumers verify their
public ESM APIs and ordinary/detailed declaration overloads from actual archives.
The core and React READMEs describe settings, protection and diagnostics in detail.

The profiles are editorial choices: Oxford-style British quotes and the agreed
RAE-oriented Spanish profile, not all valid style systems. Hyphenation admits
ASCII a–z in en-gb and a–z plus áéíóúüñ in es-es, including unambiguously equivalent
NFD graphemes; lowercase and initial-capital words only. Whole words with digits,
apostrophes, hyphens, mixed case/ALL CAPS or existing SHY are skipped. Unsupported
characters/mixed scripts warn; Spanish `tl` is conservatively skipped as a whole
word with a language-ambiguity warning. English has no general pronunciation
ambiguity detector. Protected/scope/opaque word edges can omit otherwise valid
positions. Minima are 6/2/3 (en-gb) and 6/2/2 (es-es), and can only be raised.
Author SHY remain authoritative until explicitly removed.

Fonts, width, CSS and rendering determine actual line breaks. HTML preserves the
standardly parsed tree and attribute values, not original malformed bytes or
entity spelling; it does not sanitize. React sees only supplied accessible
children, not arbitrary component output, props, portals or promises. The tested
adapter preserves key/ref/props and state during fixed-protection reorders and
direct-child protection toggles. Arbitrary deep protection toggles can remove
Context bridges and remount descendants; no universal state-identity promise is
made. External DOM ancestors are not inspected.

RSC uses server-owned core instances and independently created client instances
behind the client entry. Ordinary Flight children are supported; instances,
locale modules and callbacks do not cross the serialization boundary. The client
Provider is not server Context. No separate server JSX adapter, arbitrary RSC
traversal or special edge-platform guarantee is supplied. Only actually executed
versions/environments are claimed. Acceptance uses real local-registry archives;
no public npm release or release promotion is performed.
