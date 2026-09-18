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

All required local gates passed on commit `6381d3c820082647147cde9732173a4b5b78afde`
(tree `e7dda7a7f41965f4677640d2b4888ccd7939013d`). The clean tracked tree, archive
hashes, lockfile hash, frozen corpora and resource manifests are recorded in
[measurements.json](evidence/measurements.json). [run.json](evidence/run.json)
records command exits and transcript hashes; [browser.json](evidence/browser.json)
and [rsc.json](evidence/rsc.json) retain the detailed per-engine results.

| Gate                | Result on that candidate                                                                                                                                               |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`        | PASS: lint/format/typecheck/build/pack, 209 functional tests, 3 release tests, 6 publish tests, 8 installed consumers and release-plan validation                      |
| `pnpm test:browser` | PASS in every engine: 145 shared tests, 14 mounted updates, 8 protection/reorder scenarios, all 3 SSR/hydration renderers                                              |
| `pnpm test:rsc`     | PASS: real production Flight/client references, server/client boundary, initial HTML without JavaScript, hydration and text/locale/hyphenation updates in every engine |
| Measurement command | PASS: four archive identities/byte comparisons, independent linguistic totals and 74 timing scenarios                                                                  |
| Private SSR example | PASS: two `Wait…` lines; public README/report examples also independently executed against installed archives                                                          |

The initial candidate `4b2fca0bdca3dd1bf0fb15f313bcf7e4c48288bf`
passed its local check, then review found a missing literal `a cat` no-bond oracle.
The final candidate above adds it to the existing common spacing corpus. The full
check was repeated after that substantive coverage correction. A separate new Node test inserts a parser diagnostic without a position at the parse5 boundary. It retains actual tree construction/serialization. It verifies the defensive `unavailable` warning contract without claiming that a natural input triggers it.
Neither change alters runtime code, contract or frozen language corpus.

All four packages remain **0.1.0-alpha.0**. Local environment:

- Node **v24.21.0**, npm **11.19.0**, and pnpm **12.4.1**.
- React/React DOM **19.3.0**, Playwright **1.58.2**, and esbuild **0.28.2**.
- TypeScript **7.0.2**, tsdown **0.23.0**, and parse5 **8.0.0**.
- darwin **27.0.0**, **arm64**, Apple M3, 8 logical CPUs, and 17179869184 bytes RAM.
  The lockfile pins the dependency graph.

| Engine   | Observed local version | Playwright revision |
| -------- | ---------------------- | ------------------- |
| chromium | 145.0.7632.6           | 1208                |
| firefox  | 146.0.1                | 1509                |
| webkit   | 26.0                   | 2248                |

The private RSC consumer uses **Next 16.3.5**, production webpack, with application
React/React DOM **19.3.0**. Next's actually executed server/client React is
**19.3.0-canary-cbb046ab-20260731**, recorded separately in the RSC report.
These versions must not be conflated. Node SSR tests also cover parallel/reversed
requests, aborted/repeated renders, no browser globals and no diagnostic render
side effects. Both stream fixtures observe the transformed shell before releasing
content; they do not claim a byte-delivery deadline for every React fragment.

The report/evidence commit follows the tested candidate without changing product
source, tests, package documents, tools or lockfile. It cannot contain its own
commit hash. PR CI separately runs both required jobs (`check` and
`browser (Chromium, Firefox, WebKit)`) on Ubuntu and retains browser/RSC reports.
GitHub's synthetic merge SHA differs from the submitted head: its parents identify
the head and develop base. The PR's final check record is the authority for that
Linux execution; local results above are not relabelled as CI results.

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

| Locale/category                | Words | Allowed positions | Added | Mandatory positions | Incorrect | Missing mandatory | Optional omitted |
| ------------------------------ | ----: | ----------------: | ----: | ------------------: | --------: | ----------------: | ---------------: |
| en-gb / british-spelling       |    11 |                 4 |     3 |                   0 |         0 |                 0 |                1 |
| en-gb / closed-compound        |   174 |               174 |   157 |                  60 |         0 |                 0 |               17 |
| en-gb / derivatives-suffixes   |    28 |                32 |    18 |                   0 |         0 |                 0 |               14 |
| en-gb / different-lengths      |   313 |               217 |   175 |                  60 |         0 |                 0 |               42 |
| en-gb / monosyllable           |   105 |                 0 |     0 |                   0 |         0 |                 0 |                0 |
| en-gb / removed-exception-word |     8 |                17 |     0 |                   0 |         0 |                 0 |               17 |
| es-es / adjacent-vowels        |    11 |                22 |    22 |                   0 |         0 |                 0 |                0 |
| es-es / ch-ll-rr               |    12 |                24 |    24 |                   0 |         0 |                 0 |                0 |
| es-es / diacritics             |    12 |                25 |    25 |                   0 |         0 |                 0 |                0 |
| es-es / false-prefixes         |     5 |                12 |    12 |                   0 |         0 |                 0 |                0 |
| es-es / h                      |     7 |                13 |    13 |                   0 |         0 |                 0 |                0 |
| es-es / loanwords              |     5 |                 6 |     6 |                   0 |         0 |                 0 |                0 |
| es-es / prefixes               |     7 |                22 |    21 |                   0 |         0 |                 0 |                1 |
| es-es / regular-syllables      |   295 |               591 |   591 |                 120 |         0 |                 0 |                0 |
| es-es / x                      |     7 |                14 |    14 |                   0 |         0 |                 0 |                0 |

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

Measured package-own bytes (excluding dependencies; not tree-shaken browser bundles):

| Package                | Version       | `.tgz` bytes | Unpacked file bytes | Distribution JS bytes |
| ---------------------- | ------------- | -----------: | ------------------: | --------------------: |
| @use-puncta/core       | 0.1.0-alpha.0 |        30828 |              103954 |                 79789 |
| @use-puncta/with-en-gb | 0.1.0-alpha.0 |        40898 |              190618 |                181934 |
| @use-puncta/with-es-es | 0.1.0-alpha.0 |        15222 |              105903 |                 98296 |
| @use-puncta/with-react | 0.1.0-alpha.0 |        10956 |               33334 |                 23475 |

The script verifies each packed distribution file equals the workspace file used
for timing. It records every archive SHA-256, file count and byte total. The ordinary `text` examples below show median milliseconds per warm invocation. All 74 scenarios retain raw samples/minimum/median/maximum in [measurements.json](evidence/measurements.json). Scenarios include ordinary/detailed text, HTML, pure React, both insertion modes, three sizes, and separate creation.

| Locale | Text UTF-16 length | Typography only | Typography + SHY |
| ------ | -----------------: | --------------: | ---------------: |
| en-gb  |                 43 |        0.103 ms |         0.134 ms |
| en-gb  |                430 |        1.299 ms |         1.851 ms |
| en-gb  |               4300 |      100.652 ms |       108.583 ms |
| es-es  |                 34 |        0.067 ms |         0.114 ms |
| es-es  |                340 |        0.978 ms |         1.402 ms |
| es-es  |               3400 |       67.932 ms |        73.261 ms |

Warm-import instance creation medians: en-gb 3.728 ms, es-es 1.518 ms.

Inputs are exact literal seeds repeated 1, 10 or 100 times, recorded with UTF-16
lengths, UTF-8 bytes and SHA-256. Each scenario has three warmups and nine retained
samples. A warm processing sample contains one invocation; a creation sample
contains ten new instances and is divided by ten. Imports and input/tree
construction are outside timing. HTML includes parsing/serialization. React
measures pure tree transformation, not SSR or mounting. No forced GC or outlier
filtering is used; allocation/GC variability remains visible in the raw samples.
The measurements ran sequentially after gates, without concurrent builds/tests.
There are no millisecond/kilobyte acceptance thresholds, cold-start claims or
inferences about other machines. The repeated-seed results above grow faster
than input length; they do not support assuming linear throughput on longer inputs.

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
