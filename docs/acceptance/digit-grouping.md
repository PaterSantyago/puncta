# Standalone digit grouping: slice #87

This report covers [#87](https://github.com/PaterSantyago/puncta/issues/87) within
[#86](https://github.com/PaterSantyago/puncta/issues/86). It does not certify the
complete grouping contract. Canonical recognition, API and acceptance decisions
remain [#83](https://github.com/PaterSantyago/puncta/issues/83#issuecomment-5712793415),
[#84](https://github.com/PaterSantyago/puncta/issues/84#issuecomment-5713158505) and
[#85](https://github.com/PaterSantyago/puncta/issues/85#issuecomment-5713294764).

## Coverage

All runtime assertions below use public APIs in `tests/digit-grouping.test.mjs`.
Expected transformed strings are literal specification examples, including a
30-digit integer; no expected numeric result is obtained through JavaScript number.

| #87 criterion                            | Executable evidence                                                                                                                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Shared nullable option, defaults, RuleId | Explicit opt-in test, nullable validation test; installed `scripts/consumer-types.ts` verifies text/HTML/pure React options and RuleId                                                     |
| Safe threshold and exact config errors   | Both threshold literals, MAX_SAFE_INTEGER without allocating a huge string, invalid types/values/unknown fields, disabled-processing validation, field/group resets                        |
| Independent locale examples              | Both locale literal tests: integers, signs, decimal point/comma, fractional zeros, thresholds 4/5 and a long exact integer                                                                 |
| text/HTML/pure React/component SSR       | Both locale representation tests: transparent Fragment/inline boundary, left-leaf coordinates, immutable children, declarative HTML setting, code/off/opaque boundaries                    |
| Conservative first-slice boundaries      | Unsupported-construction table covers leading zeros, missing integer, identifiers/Unicode/SHY, existing groups, malformed punctuation, technical forms, arithmetic/ranges and number bonds |
| Source reports and repeat processing     | UTF-16 non-BMP offsets, separate insertions, source replay, appliedRules only for actual changes, second-pass empty edits, repeated numerical separators                                   |
| Disabled compatibility and documentation | Full report equality with omitted and explicitly disabled grouping; core, locale and React README scope statements                                                                         |

Existing groups are preserved in both normalization modes. Invalid grouping
warnings and complete recognition are intentionally deferred to #88. Numerical
bonds and ranges remain excluded from grouping until #89. Further inheritance,
representation/coordinate, generated-property/scaling and streaming/hydration
acceptance belongs to #90–93. No generated-property seed or grouping-specific
browser/scaling claim is made by this literal first-slice suite.

## Reproduction and execution

Environment: macOS arm64, Node 24.21.0, pnpm 12.4.1, React/React DOM 19.3.0,
locked dependencies. Runtime commands use the pinned Node directory in PATH.
Implementation revision: `6eb403d3205bc5fd3711595212a04843d28f730a`, tested on
2026-09-17. Subsequent documentation-only commits record these results. RSC uses
Next 16.3.5 and its bundled React `19.3.0-canary-cbb046ab-20260731`; the standalone
SSR and browser fixtures use React/React DOM 19.3.0. CI checks the pull request head
separately; its result is recorded on the pull request.

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
node --test tests/digit-grouping.test.mjs
pnpm check
NODE_ENV=production node --test tests/ssr-streaming.test.mjs tests/digit-grouping.test.mjs
pnpm test:browser
pnpm test:rsc
pnpm test:scaling
```

All listed local commands passed on the implementation revision above:

| Check                           | Result                                                                                                                                                                                       |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused grouping suite          | 12/12 PASS, including punctuation and parenthesized/tab-separated arithmetic regressions                                                                                                     |
| `pnpm check` after review fixes | PASS: lint, formatting, typecheck, build, package archives, 228 functional tests, 3 release tests, 6 local publication simulations, installed npm/pnpm consumers and release-plan validation |
| Production SSR + grouping       | 24/24 PASS                                                                                                                                                                                   |
| Browser regression              | Chromium 145.0.7632.6, Firefox 146.0.1, WebKit 26.0 PASS; 145 shared assertions per engine, mounted updates and all three hydration renderers, no hydration errors                           |
| RSC regression                  | All three engines PASS: Flight, server HTML, hydration and interactive updates                                                                                                               |
| Existing scaling gate           | PASS, separately after all other local builds/tests completed; measurements below                                                                                                            |

Scaling used three warmups and seven samples per input, with medians in milliseconds:

| Scenario | Input lengths  | Small median | Large median | 4× input ratio |
| -------- | -------------- | ------------ | ------------ | -------------- |
| spaces   | 4,000 / 16,000 | 1.744        | 6.194        | 3.552×         |
| words    | 1,000 / 4,000  | 0.964        | 3.366        | 3.494×         |
| mixed    | 4,300 / 17,200 | 4.108        | 17.602       | 4.285×         |

These browser, RSC, production-streaming and scaling suites are existing regression
checks, not proof of the deferred grouping scenarios. The scaling inputs use the
default disabled grouping setting; grouping-specific scaling remains #92. Browser
and RSC local artifacts are generated in `artifacts/browser/acceptance.json` and
`artifacts/rsc/report.json`; CI uploads equivalent artifacts for its checked head.
No generated seed applies to this literal suite. No manual check, release or public
publication was performed; the full check uses an isolated local test registry.

## Review

Standards review identified split ownership of grouping whitespace preservation;
recognition now returns its own preserved ranges. Follow-up review found no
remaining standards findings. Spec review found punctuation boundaries and
parenthesized/tab-separated arithmetic gaps; red-then-green public regressions
cover the fixes, and follow-up review confirmed all findings addressed.

## Existing groups and complete candidates: slice #88

[#88](https://github.com/PaterSantyago/puncta/issues/88) extends the historical #87
baseline above. Existing-group normalization and diagnostics are now implemented
for standalone candidates. Ranges and known unit/currency/percentage constructions
remain #89; expanded inheritance/coordinates, streaming/hydration, scaling and
final acceptance remain later slices. The historical #87 PASS results do not
certify these new changes.

| #88 criterion                      | Executable evidence in `tests/digit-grouping.test.mjs`                                                                                                                                                                                                                          |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Grammar and localization           | Four group spaces, allowed mixtures, en-gb commas, decimal fractions and trailing zeros; existing locale literal oracles; es-es conflict diagnostics                                                                                                                            |
| Threshold and normalization        | Default 5 and explicit 4, below-threshold preservation, both normalization settings, unchanged U+202F; generated threshold 12 and diagnostic MAX_SAFE_INTEGER                                                                                                                   |
| Expected exclusions                | Leading zeros, missing integer, Unicode/mixed digits, combining marks, identifiers/suffixes, scientific/date/time/fraction/version structures and arithmetic, including malformed operands and parentheses                                                                      |
| Full candidate and diagnostics     | Literal malformed groups, conflicting separators and punctuation-space examples; one structured grouping warning with full UTF-16 range, locale, empty details; large threshold and disabled normalization do not suppress it                                                   |
| Cleanup and boundaries             | Double/repeated and mixed group spaces, tabs, newlines, comma/period lists and repeat-pass empty edits; disabled compatibility retains the previous report                                                                                                                      |
| Public representations and reports | All two-leaf splits of compact normalized/ambiguous examples through HTML, pure React and component SSR; warning source ranges; separator ownership, independent replacement edits and exact entity input ranges                                                                |
| Generated properties               | Seed 8801, 120 cases combining both locales, valid/malformed groups, group-space mixtures, comma groups, signs, literal fractions, thresholds and normalization; exact output, digit/fraction preservation, replay, idempotence, per-character HTML/React splits and protection |

Expected valid generated results assemble independently selected literal groups
with U+202F; they do not invoke a formatter or convert numbers to JavaScript
number. Malformed cases shorten a full group and require unchanged output with a
warning. Failure messages retain initial seed, sample index, state and the exact
source, permitting replay and reduction to the offending candidate. During test
development seed 8801 exposed an oracle error comparing serialized `&nbsp;` to
decoded NBSP; the HTML comparison now decodes NBSP. No production change was made
for that test-only mismatch.

The new normalization, diagnostic and mixed-boundary assertions each failed
before their corresponding implementation changes. Focused suites and typecheck
run throughout development. The mixed-boundary regression preserves U+202F plus
two ordinary spaces, which cleanup previously shortened. Token coalescing also
keeps malformed groups inside arithmetic from producing fragment warnings.

Execution results and independent review for this slice are recorded below once
completed; no pending check is claimed as PASS.
