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
The implementation revision and CI result are recorded in the linked pull request;
this document is committed with that implementation.

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

Execution results will be recorded after running these commands. Existing browser,
RSC, production-streaming and scaling suites are regression checks here, not proof
of the deferred grouping scenarios. No manual check, release or publication is
required or performed.
