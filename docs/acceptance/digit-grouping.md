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

Implementation revision: `b17dd8e665db2854038b5d3918ec19c72b60778c`, tested on
2026-09-17 with macOS arm64, Node 24.21.0, pnpm 12.4.1 and locked dependencies.
The commands are the same reproduction sequence listed for #87 above; new results
below apply to this revision. Subsequent documentation-only commits record them.

Independent two-axis review compared against
`64e245f07df4f04cafef7cffd323d8493e355f80`. Standards review found no actionable
violations or smells. Spec review identified spaced-colon partial formatting and
list punctuation incorrectly joining a following missing-integer form. Additional
review caught a prose-label colon swallowing its number on the first pass. All
were fixed with public red/green regressions. Self-review also corrected es-es
`0,123 456` being mistaken for a leading-zero integer: a single zero integer does
not suppress fractional-group warnings. Both independent reviewers confirmed no
remaining findings on the implementation revision above.

All applicable local commands passed on that implementation revision:

| Check                                 | Result                                                                                                                                                                                       |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused grouping suite                | 23/23 PASS; seed 8801, 120 generated cases                                                                                                                                                   |
| `pnpm check` after final review fixes | PASS: lint, formatting, typecheck, build, package archives, 239 functional tests, 3 release tests, 6 local publication simulations, installed npm/pnpm consumers and release-plan validation |
| Production SSR + grouping             | 35/35 PASS                                                                                                                                                                                   |
| Browser regression                    | Chromium 145.0.7632.6, Firefox 146.0.1 and WebKit 26.0 PASS; 145 shared assertions per engine, mounted updates and all three hydration renderers, no hydration errors                        |
| RSC regression                        | All three engines PASS: Flight, server HTML, hydration and interactive updates                                                                                                               |
| Existing scaling gate                 | PASS, run separately after every other local build/test completed                                                                                                                            |

Scaling used three warmups and seven measured samples per input:

| Scenario | Input lengths  | Small median (ms) | Large median (ms) | 4× ratio |
| -------- | -------------- | ----------------- | ----------------- | -------- |
| spaces   | 4,000 / 16,000 | 1.821             | 6.438             | 3.536×   |
| words    | 1,000 / 4,000  | 1.009             | 3.433             | 3.401×   |
| mixed    | 4,300 / 17,200 | 4.030             | 18.079            | 4.486×   |

These unchanged browser/RSC/scaling fixtures are regression evidence, not the
new grouping runtime or scaling scenarios reserved for #91/#92. Their grouping
setting remains disabled. Source-level standalone normalization is covered by the
new public text/HTML/pure React/component SSR tests. Generated browser/RSC
artifacts remain in `artifacts/browser/acceptance.json` and
`artifacts/rsc/report.json`; CI checks and uploads artifacts for the exact PR head.
No manual verification, release or public publication was performed.

## Number bonds and ranges: slice #89

[#89](https://github.com/PaterSantyago/puncta/issues/89) extends #88 with known
number designations and atomic range eligibility. Historical results above are
not evidence for this slice. The public suite is
`tests/digit-grouping-bonds.test.mjs`; existing standalone regressions remain in
`tests/digit-grouping.test.mjs`.

| #89 criterion                                   | Executable evidence                                                                                                                                                                                                                                                                                        |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Existing catalogues and complete designations   | Both locale literal unit/composite/addition/currency/percentage/angle examples; unknown tails, Unicode, technical and leading-zero exclusions                                                                                                                                                              |
| Full notation and exterior bonds                | Existing four group spaces and en-gb commas, both normalization modes, whole-number minus, currency-order diagnostics, separate internal U+202F and external U+00A0                                                                                                                                        |
| Range context                                   | En dash, ASCII with known unit/standalone enabled, disabled ranges formatting, U+2212 arithmetic, three-segment dates                                                                                                                                                                                      |
| Atomic eligibility and endpoint settings        | Both valid endpoints; leading zero, technical and unsupported endpoints; malformed groups/conflicts with one full-range diagnostic even at MAX_SAFE_INTEGER and normalization disabled; independent thresholds and normalization                                                                           |
| Independent formatting                          | All 16 combinations of units/ranges/percentages/currencies switches in both locales; explicit percentage spacing; existing atypical currency warnings                                                                                                                                                      |
| Public representations and reports              | Every two-leaf transparent split of compact literals through HTML/comments, Fragment/pure React and component renderToString; warning ranges, appliedRules, replay, repeat-pass empty edits; non-BMP original coordinates and entities                                                                     |
| Generated properties and disabled compatibility | Seed 8901, 120 cases with both locales, valid/excluded/ambiguous endpoints, separators, switches and custom units; literal endpoint oracles, digit/fraction preservation, replay, repeated processing, per-character HTML/React/SSR splits and mandatory coverage counts; full disabled-report comparisons |

Implementation follows red/green slices: the initial known-unit test and then
range-eligibility test failed before their implementation. A non-BMP preceding
context exposed operator coalescing swallowing signed numbers; the original
UTF-16 report regression now covers the fix. The generator assembles expected
results from independently selected literal endpoints, without calling a numeric
formatter or coercing values to JavaScript numbers. Failure messages include
initial seed, sample, state and complete source.

The previous conservative exclusions for supported bonds/ranges were removed
from the historical standalone test, because #89 now supplies their positive
and negative oracles. No existing structural exclusion was weakened.

New grouping streaming/hydration fixtures, expanded inheritance/coordinate
acceptance and grouping-specific scaling remain later slices (#90–92).
This slice uses component renderToString for new interaction coverage and runs
existing streaming, browser, RSC and scaling fixtures as regression gates.

### Execution and independent review

Implementation revision: `72a5bbc5579b91c5accc31cfcff71d344e854dc3`, tested on
2026-09-17. Environment: macOS arm64 (Darwin 27.0.0), Node 24.21.0, pnpm 12.4.1,
React/React DOM 19.3.0, Playwright 1.58.2, locked dependencies. Subsequent
documentation-only commits record these results. Browser and RSC artifact files
record this exact implementation SHA; CI separately checks the final PR head.

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build
node --test tests/digit-grouping-bonds.test.mjs tests/digit-grouping.test.mjs tests/number-bonds.test.mjs tests/dashes.test.mjs
pnpm check
NODE_ENV=production node --test tests/ssr-streaming.test.mjs tests/digit-grouping.test.mjs tests/digit-grouping-bonds.test.mjs
pnpm test:browser
pnpm test:rsc
pnpm test:scaling
```

| Check                                 | Result                                                                                                                                                                                             |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused grouping/bonds/dashes         | 58/58 PASS; new seed 8901, 120 cases, plus retained seed 8801, 120 cases                                                                                                                           |
| Final `pnpm check` after review fixes | PASS: lint, formatting, typecheck, build, archives, 249 functional tests, 3 release tests, 6 local publication simulations, installed npm/pnpm consumers and declarations, release-plan validation |
| Production streaming + grouping       | 45/45 PASS                                                                                                                                                                                         |
| Browser regression                    | Chromium 145.0.7632.6, Firefox 146.0.1, WebKit 26.0 PASS; 145 shared assertions per engine, mounted updates and three hydration renderers without hydration errors                                 |
| RSC regression                        | All three engines PASS: Flight, server HTML, hydration and interactive updates; Next 16.3.5                                                                                                        |
| Separate existing scaling gate        | PASS after all local builds/tests finished; three warmups and seven measured samples per input                                                                                                     |

| Scenario | Input lengths  | Small median (ms) | Large median (ms) | 4× ratio |
| -------- | -------------- | ----------------- | ----------------- | -------- |
| spaces   | 4,000 / 16,000 | 1.748             | 6.257             | 3.579×   |
| words    | 1,000 / 4,000  | 1.007             | 3.447             | 3.422×   |
| mixed    | 4,300 / 17,200 | 4.106             | 17.792            | 4.333×   |

These unchanged browser/RSC/scaling fixtures remain regression checks with
grouping disabled; they do not stand in for the dedicated later-slice scenarios.
Generated local artifacts are `artifacts/browser/acceptance.json` and
`artifacts/rsc/report.json`; CI uploads corresponding artifacts for its own head.
No manual check, release or public package publication was performed.

Independent Standards and Spec agents reviewed against fixed point
`d01c4e2626e1be80aba42a22d548e3e5ebd06d8d`. Standards found no actionable
violations or smells. Spec identified partial operand grouping when recognized
designations split arithmetic context: `£12345 + £67890` and
`12345 kg + 67890 kg`. A red/green public regression now covers currencies,
units, parentheses-compatible operator context, leading-zero currency ranges and
percent between operands, alongside a separate-quantities control. Recognition
retains the complete operator construction before classifying eligibility. Both
independent follow-up reviews confirmed no remaining findings on the tested
implementation revision. The full check was rerun after the review fix.

## Nested scopes, markup and source reports: slice #90

[#90](https://github.com/PaterSantyago/puncta/issues/90) establishes expanded
scope/report acceptance on top of #87–89. Its public integration suite is
`tests/digit-grouping-scopes.test.mjs`. All scenarios passed with the existing
production implementation; this slice adds regression coverage and documentation,
without a runtime change. Earlier PASS records remain historical evidence only.

| #90 criterion                          | Executable evidence                                                                                                                                                                                                                                                         |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared options, inheritance and resets | createPuncta, with, text/HTML call options, declarative HTML/React hosts, Provider/Puncta and pure; undefined, null fields/group, rejected rules:null; both locales                                                                                                         |
| Pausing and switching locale           | Explicit minDigits/normalizeExisting survive disable/re-enable and language switches; new-locale null resets; nested host and component scopes; inherited full protection                                                                                                   |
| Validation and traversal               | Exact optionPath/reason and unavailable call locations, original HTML attribute range/React path; disabled calls and running components; protected/off/hidden/editable options skipped before validation                                                                    |
| SHY operations                         | Text, HTML and pure React remove SHY and validate settings without grouping or its warnings                                                                                                                                                                                 |
| Context boundaries                     | Inline/comments/arrays/Fragment, same-locale lang aliases; LF/CRLF, br/wbr, blocks, explicit scope, locale switch, opaque component and protected fragments; protected text not inspected for continuation or warnings                                                      |
| Edit ownership and replay              | All two-leaf splits of six independent compact literals per locale; original source paths/UTF-16 ranges, left insertion ownership, separator replacements, separate edits, unchanged digits and children, per-source replay                                                 |
| Entities and recovery                  | Decoded SPACE/NBSP entities, digit entities, multi-codepoint entity before a number, astral prefix, full multi-leaf warning ranges, foster-parented noncontiguous sources with honest unavailable provenance                                                                |
| Report distinctions                    | appliedRules only for changes; serialization-only outputChanged vs hasEdits; no outputChanged in React; pure explicit instance independent of surrounding Context                                                                                                           |
| Generated trees                        | Seed 9001, 64 trees, literal oracles, random 1–3-character leaves inside arrays/Fragment/inline/comments, nested scopes, both locales, resets/threshold/normalization/protection, warnings, digit preservation, replay and repeat-pass empty edits; every scenario required |

The generator selects independently specified input/output literals rather than
reconstructing expected grouping with the formatter. Failures include seed,
sample, generator state, locale, source and options. All two-leaf splits include
UTF-16 surrogate boundaries; HTML parser warnings for isolated surrogate halves
are retained separately from grouping diagnostics. React's inter-leaf SSR text
comments are removed before comparing a split CRLF with decoded HTML because
those comments otherwise interrupt HTML newline normalization.

A supported digit or separator entity maps at its original boundaries. No HTML
entity expands to multiple supported grouping characters, so grouping cannot
produce a `covering` range inside one. The multi-codepoint entity control verifies
that grouping does not fabricate such an interior position; source-map `covering`
semantics remain unchanged. Recovery controls explicitly require `unavailable`
for both grouping edits and warnings on foster-parented noncontiguous text.

Development checks: locked install/build/typecheck/lint and 57 focused tests
passed (17 new #90 tests plus existing grouping/bonds/options suites). Initial
new-test failures corrected oracle assumptions about explicit config-error
locations, surrogate parser warnings, SSR comments between CR/LF and a manually
counted entity offset; none required changing production behavior. No artificial
runtime red/green claim is made for an already implemented contract.

Grouping-specific streaming/hydration and React numeric-child acceptance remain
#91; grouping-specific scaling and final parent acceptance remain #92. This slice
does not close or certify the whole parent #86. Full checks and independent
review results are recorded below.

### Execution and independent review

Implementation/acceptance revision: `230b48f43e3831b747bdf9f42043f3731b3a86d8`,
2026-09-17. Environment: Darwin 27.0.0 arm64, Node 24.21.0, pnpm 12.4.1,
React/React DOM 19.3.0 and Playwright 1.58.2 with locked dependencies. Subsequent
documentation-only commits record results; CI checks the final PR head.

Independent Standards and Spec reviews compared against
`cafd281d7c088532a4fbd0a4d0ec72f0ccbcd799`. Standards found no actionable
violations or smells; its optional clarity suggestion changed the separate digit
invariant to assert actual output rather than fixture integrity. Spec found two
coverage gaps: successful Provider-level options and checking other defaults
after a whole-group reset followed by re-enabling. Both now have explicit public
assertions, including nested scopes. Per-leaf output is also checked against
replayed source edits. Both follow-up reviews confirmed no remaining findings
at the revision above.

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm typecheck
node --test tests/digit-grouping-scopes.test.mjs tests/digit-grouping.test.mjs tests/digit-grouping-bonds.test.mjs tests/options-scopes.test.mjs
pnpm check
NODE_ENV=production node --test tests/ssr-streaming.test.mjs tests/digit-grouping.test.mjs tests/digit-grouping-bonds.test.mjs tests/digit-grouping-scopes.test.mjs
pnpm test:browser
pnpm test:rsc
pnpm test:scaling
```

| Check                                 | Result                                                                                                                                                                                                    |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused grouping/scopes               | 57/57 PASS, including 17 new tests; seed 9001 (64 trees), retained seeds 8801 and 8901 (120 cases each)                                                                                                   |
| Final `pnpm check` after review fixes | PASS: lint, formatting, typecheck, build, archives, 266 functional tests, 3 release tests, 6 local publication simulations, npm/pnpm installed consumers and declarations, release-plan validation        |
| Production streaming + grouping       | 62/62 PASS                                                                                                                                                                                                |
| Browser regression                    | Chromium 145.0.7632.6, Firefox 146.0.1, WebKit 26.0 PASS; 145 shared assertions per engine, 14 mounted updates, eight protection/reorder scenarios and three hydration renderers without hydration errors |
| RSC regression                        | All three engines PASS: Flight, server HTML, hydration and interactive updates; Next 16.3.5                                                                                                               |
| Separate existing scaling gate        | PASS after all local builds/tests completed; three warmups and seven measured samples per input                                                                                                           |

| Scenario | Input lengths  | Small median (ms) | Large median (ms) | 4× ratio |
| -------- | -------------- | ----------------- | ----------------- | -------- |
| spaces   | 4,000 / 16,000 | 1.796             | 6.514             | 3.626×   |
| words    | 1,000 / 4,000  | 0.953             | 3.354             | 3.520×   |
| mixed    | 4,300 / 17,200 | 3.929             | 17.862            | 4.546×   |

Browser/RSC artifacts at `artifacts/browser/acceptance.json` and
`artifacts/rsc/report.json` record the tested revision above. CI uploads equivalent
artifacts for its final PR head. The unchanged browser/RSC/scaling fixtures use
grouping disabled and remain regression checks; the dedicated grouping runtime
and scaling scenarios are still #91/#92. New source-level scopes/report scenarios
are verified by the public Node and component SSR suites. No mandatory manual
check, release or public package publication was performed; publication simulations
use an isolated local registry.

## React runtime (slice #91)

Issue [#91](https://github.com/PaterSantyago/puncta/issues/91) extends public React
acceptance after #90. No production implementation change was needed: the existing
render path already satisfies these contracts. Tests use independent literal
expectations, not another Puncta transform as an oracle. New tests passed against
the existing implementation; this is additional executable acceptance, not a claim
of a new production red/green fix. Existing regression tests remain.

| Requirement                                            | Executable evidence                                                                                                                                                                                                              |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| String(value), exact bigint, unchanged numeric types   | `digit-grouping-react.test.mjs`: changed number and 30-digit bigint, decimals, exponential exceptions, unchanged number/bigint/-0, both locales, disabled grouping                                                               |
| Transparent leaves, keys/refs, pure/Context/protection | Numeric array and Fragment seams retain digits/types, original input, key/ref/attributes; pure output ignores surrounding Provider settings; opaque and protected leaves remain boundaries                                       |
| Synchronous and streaming output                       | `ssr-streaming.test.mjs`: exact U+202F shell and normalized groups, independent fallback before controlled release, independent surrounding numbers, cancelled requests and fresh retries                                        |
| Request isolation                                      | Five concurrent requests across both stream APIs, locale/threshold/normalization/disabled settings, reverse resumption, unchanged reports and source ranges, caller mutation isolation                                           |
| Hydration and original nodes                           | `browser/hydration-*`: all three renderers, grouped shell/fallback/content, exact bigint, no errors; shell/content and shell child-node identity                                                                                 |
| Updates from original children                         | `browser/grouping.mjs`: ten updates distinguish automatic separators from original commas/spaces/U+202F, both locales, threshold, normalization, numeric children, keyed reorder, counter/ref/text-node identity and no wrappers |
| RSC boundaries                                         | Extended Next consumer: server-owned explicit grouping, client numeric leaves and package Flight slots, no-JS HTML and hydration, independent server settings, client source/locale/rule updates                                 |

Environment: Darwin arm64, Node 24.21.0, pnpm 12.4.1, React/React DOM 19.3.0,
Playwright 1.58.2, Next 16.3.5, frozen lockfile. Browser engines are Chromium
145.0.7632.6, Firefox 146.0.1 and WebKit 26.0. The RSC fixture separately records
Next's bundled React version. Execution revision and final checks are recorded
below after independent review.

Grouping-specific scaling, combined final acceptance and parent #86 completion
remain #92. This runtime slice does not certify or close the parent. No manual
visual gate, release or public publication is introduced.

### Execution and independent review

Acceptance revision: `26b5edbb3447825cf23554943b978e8de3a1c2d9`, 2026-09-17,
Darwin 27.0.0 arm64. A subsequent documentation-only commit records these results;
CI checks the final PR head. Both generated browser/RSC JSON reports identify this
acceptance revision. No new random generation was introduced in #91; the full
functional gate retains the earlier seeds and independent oracles.

Standards and Spec reviews independently compared the change against
`0e5b8ad18d0c6d7c2635acad0abe2c1913d7f2c3`. Spec found no actionable gap.
Standards suggested replacing positional warning-case checks with explicit
per-request expected locale data. That change passed focused checks and both
follow-up reviews confirmed zero remaining findings at the revision above.

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm typecheck
node --test tests/digit-grouping-react.test.mjs tests/ssr-streaming.test.mjs
pnpm check
NODE_ENV=production node --test tests/ssr-streaming.test.mjs tests/digit-grouping*.test.mjs
pnpm test:browser
pnpm test:rsc
pnpm test:scaling
```

| Check                               | Result                                                                                                                                                                                                            |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused numeric leaves + streaming  | 19/19 PASS, including seven new public-interface tests                                                                                                                                                            |
| Final `pnpm check` after review fix | PASS: lint, formatting, typecheck, build, archives, 273 functional tests, three release tests, six local publication simulations, npm/pnpm installed consumers/declarations and release-plan validation           |
| Production streaming + grouping     | 69/69 PASS                                                                                                                                                                                                        |
| Browser                             | All three engines PASS: 149 shared checks per engine, 14 existing mounted updates, eight protection/reorder scenarios, ten grouping updates, all three grouped SSR hydration modes; no hydration/runtime warnings |
| Production RSC                      | All three engines PASS: Flight, no-JS grouped server HTML, hydration, numeric client leaves, source/locale/rule updates, server configuration independence and node identity                                      |
| Existing scaling regression         | PASS, run separately after all local builds/tests finished; three warmups, seven measured samples per input                                                                                                       |

| Scenario | Input lengths  | Small median (ms) | Large median (ms) | 4× ratio |
| -------- | -------------- | ----------------- | ----------------- | -------- |
| spaces   | 4,000 / 16,000 | 1.690             | 6.092             | 3.605×   |
| words    | 1,000 / 4,000  | 0.972             | 3.224             | 3.319×   |
| mixed    | 4,300 / 17,200 | 3.679             | 16.839            | 4.576×   |

Artifacts: `artifacts/browser/acceptance.json` and `artifacts/rsc/report.json`;
CI uploads its own artifacts for the final PR head. The existing scaling scenarios
run with grouping disabled and establish regression evidence only. New numerical
scaling cases, long-input acceptance and final combined range/runtime mapping
remain #92. All #91 runtime criteria are covered; #86 remains incomplete.

## Long-input and scaling slice (#92)

This slice implements [#92](https://github.com/PaterSantyago/puncta/issues/92),
based on the same canonical recognition/API/acceptance decisions above.
`tests/digit-grouping-long.test.mjs` adds independent constructive number models,
without numeric coercion or copying the production recognizer. Long fixtures use
4,000 triples (over 12,000 integer digits), including a 1,200-digit fraction,
terminal zeros, both locale decimal conventions, signs and permitted separators.

| #92 criterion                                                  | Executable evidence                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Exact long valid/invalid and transparent inputs                | Both locale long-fixture tests cover continuous digits, valid groups, a short middle group and leading-zero exclusions through text, HTML and pure React with Fragment/inline leaves.                                                                                                                                                                                                                                                      |
| Precision, reports, replay, fixed points and maximum threshold | Full independent expected strings; edits contain only source separators/empty insertions, exact original UTF-16 ranges including non-BMP prefixes, HTML input coordinates, source replay, structured whole-candidate warning, unique applied rule and no second-pass edits; MAX_SAFE_INTEGER threshold uses ordinary-size inputs.                                                                                                          |
| Reproducible generation that actually changes/preserves/warns  | Seed 9201, 120 models; both locales, signs, decimal marks, thresholds 4/5/24/MAX_SAFE_INTEGER, normalization and explicit off mode, variable transparent widths. Coverage assertions require all three outcomes in both locales.                                                                                                                                                                                                           |
| Minimal failure evidence                                       | Failed generated cases greedily remove triples to a deletion-minimal count and minimize leaf width within the model; test output retains seed, sample, RNG state, full minimal model and source. This is model-domain shrinking, not a claim of globally shortest strings. A temporary wrong-separator mutation verified the failure path: seed 9201/sample 2 minimized to count 1, width 1, `😀 12 345.67000!`; the mutation was removed. |
| Separate numeric scaling including growing representations     | `scripts/check-scaling.mjs`: 12 enabled numeric scenarios plus the three existing regression cases, exact 4× source and tree growth, three warmups/seven samples, detailed calls, setup outside timers. [Complete measurements and environment](scaling.md#long-numeric-records-and-transparent-trees-92).                                                                                                                                 |
| Preserve disabled behavior and prior contracts                 | Existing seeds 8801/8901/9001 and #91 runtime fixtures remain intact. The measured regression fixes retain public interfaces; 3,000 disabled complete reports match the base bundle (development seed 9202).                                                                                                                                                                                                                               |

The new long suite passed 3/3 tests, and focused grouping/technical-context/
combined-processing/inline-context checks passed 87/87 at acceptance code revision
`886e6105bd332c47bec9f12ac1d750aaf872ab9b`. The isolated scaling gate passed 15/15;
all ratios are below 8×. Final checks and independent review are recorded below.

Final combined acceptance and documentation integration for parent #86 belong to
#93. This slice does not close or certify the entire parent; no release, public
publication or manual validation gate is introduced.

### Completion evidence

Final local check revision: `664922404d87f01f53cc1ba6966a645218760d2a`, 2026-09-17.
This follows the measured revision with only lint-compatible test syntax changes;
production code and scaling scenarios are identical. The next documentation-only
commit records these results; CI checks the final PR head. Environment is the
pinned setup recorded in [scaling](scaling.md#long-numeric-records-and-transparent-trees-92).

Two independent Astra medium reviews compared the implementation with
`531ae7960b6fb8658bfc95fa45f57749f0a7f2af`: Standards **0 findings**, Spec
**0 findings**. Both follow-up reviews checked `6649224` and the acceptance
mapping/measurements, again with **0 remaining findings**. The initial full check
stopped at two test lint issues; these were fixed before the successful final run.

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm typecheck
node --test tests/digit-grouping*.test.mjs tests/technical-context.test.mjs tests/combined-processing.test.mjs tests/inline-context.test.mjs
pnpm test:scaling
pnpm check
NODE_ENV=production node --test tests/ssr-streaming.test.mjs tests/digit-grouping*.test.mjs
pnpm test:browser
pnpm test:rsc
```

| Check                           | Result                                                                                                                                                                                                                             |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused public contracts        | 87/87 PASS, including new long-input suite 3/3 and retained seeds 8801/8901/9001                                                                                                                                                   |
| Final `pnpm check`              | PASS: lint, formatting, typecheck, build, archives, 276 functional tests, three release tests, six local publication simulations, npm/pnpm installed consumers and declarations, release-plan validation                           |
| Production streaming + grouping | 72/72 PASS                                                                                                                                                                                                                         |
| Browser                         | Chromium 145.0.7632.6, Firefox 146.0.1, WebKit 26.0: each 149 shared checks, 14 existing mounted updates, eight protection/reorder scenarios, ten grouping updates and three grouped hydration renderers PASS; no hydration errors |
| Production RSC                  | All three engines PASS: Flight, no-JS server HTML, hydration, grouping updates and DOM identity                                                                                                                                    |
| Separate scaling                | 15/15 PASS; ratios 3.529–5.506×, recorded in full in scaling acceptance; no concurrent builds/tests during measurement                                                                                                             |
| Disabled baseline comparison    | 3,000 full public text/HTML/React reports PASS against historical core and React bundles, seed 9202                                                                                                                                |

Generated browser/RSC artifacts are under `artifacts/browser/acceptance.json` and
`artifacts/rsc/report.json`; both identify the final local check revision. They
remain generated artifacts; CI uploads its own files for the final PR head. All
six #92 criteria have executable checks and current evidence. #93 still owns
combined final acceptance/documentation integration; parent #86 remains open.
