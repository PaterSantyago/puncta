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
