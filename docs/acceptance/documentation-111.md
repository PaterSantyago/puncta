# Digit-grouping documentation acceptance

[Documentation index](../README.md)

Scope: [issue 111](https://github.com/PaterSantyago/puncta/issues/111).
Implementation base: `a6b8b83833b8ce65447bc4e564e1afc5eb83b7f1`.
Library behavior, public API, package manifests, and release versions are unchanged.

## Coverage

The [coverage inventory](documentation-coverage.json) maps the displayed programs to their Markdown source.
The settings reference defines all grouping fields and defaults.
The rules reference defines notation, thresholds, bonds, ranges, and conservative exclusions.
Configuration, HTML, and React guides show public calls and scope boundaries.
The diagnostics reference defines grouping warnings, source coordinates, and separator ownership.

Core and React package entries now link to these canonical definitions.
Their previous grouping anchors stay available.
The full diagnostic catalog is pending in issue 114.

| Displayed program     | Checked requirement                                                                                                                      |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `grouping-options`    | Opt-in, default/changed threshold, fraction digits, inherited settings, pause/enable, field/group reset                                  |
| `grouping-validation` | Invalid threshold error, exact option path and reason with processing disabled                                                           |
| `grouping-notation`   | Both locales, decimal/comma distinction, existing separators, mixed spaces, threshold and normalization                                  |
| `grouping-bonds`      | Full unit/currency/percent designations, composites/additions, ranges, invalid endpoints, formatting switches that operate independently |
| `grouping-html`       | Transparent elements/comments/lang, explicit scopes, protection, line boundaries, insertion/replacement ownership                        |
| `grouping-react`      | Components, Provider inheritance, pure reports, exact bigint, transparent and explicit scope boundaries                                  |
| `grouping-warnings`   | Excluded and ambiguous input, exact warning fields, high-threshold/normalization behavior, endpoint exclusion priority                   |
| `grouping-positions`  | Original UTF-16 offsets, non-BMP input, entity mapping, unchanged separators, warning across leaves                                      |

Source review compared the notation and range definitions with `packages/core/src/digit-grouping.ts` and `number-bonds.ts`.
The inventory compares `RulesOptions` and `ruleDefaults` with their public type and settings source fingerprints.
Both grouping entries now have status `covered`.
The wider source/result/diagnostic types keep their pending or partial status for issue 114.

## Verification

Checks passed with Node 24.21.0, pnpm 12.4.1, React/React DOM 19.3.0, and TypeScript 7.0.2.
All four matching functional package archives use manifest version `0.1.0-alpha.0`.
These archives are not the public scaffold packages.

| Check                            | Result                                                                                                                                                                                 |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Eight new displayed programs     | Passed exact output checks through public distribution exports                                                                                                                         |
| `pnpm docs:check`                | Passed: 26 pages, 287 local links/anchors, 38 displayed programs, five pending coverage groups                                                                                         |
| `pnpm typecheck`                 | Passed for the workspace and SSR consumer                                                                                                                                              |
| `pnpm check`                     | Passed: lint, format, documentation, types, build, archives, 286 functional tests, three release tests, six local publication simulations, installed consumers, and release validation |
| Installed npm and pnpm consumers | All 38 displayed programs compiled and executed in each full consumer, with exact output comparison                                                                                    |
| Final prose changes              | Focused formatting, documentation, and diff checks passed                                                                                                                              |

The existing npm and pnpm consumers check displayed sources against matching archives.
This change adds no duplicate regression runner or new library tests.
The full run used stable example source. Final changes only adjusted prose and this evidence record.

Existing browser evidence from issue 110 applies to unchanged grouping runtime claims.
Its Chromium 145.0.7632.6, Firefox 146.0.1, and WebKit 26.0 runs passed 13 grouping updates per engine and all three hydration modes.
See [issue 110 evidence](documentation-110.md#checks) and [grouping runtime acceptance](digit-grouping.md#react-runtime-slice-91).
New displayed React programs check public component rendering and pure reports in installed consumers.
This slice adds no new mounted behavior claim and does not repeat browser or RSC runs.

## Review and limits

A different agent reviewed revision `247844bb8beaaebdb797450783fd9214aa5b3646` against the implementation base.
The factual, coverage, navigation, and scope review had no findings.
The standards review found three P2 language groups: ordinary wording, verbal -ing constructions, and passive voice with a known actor.
The author applied the requested corrections. A different agent must still check those corrections.

The author checked prose against the official ASD-STE100 Issue 9 rules and dictionary.
Exact identifiers, code, and literal examples keep their spelling.
No project dictionary applies. The final language correction check is pending.

Package README links point to the documentation branch. Local target pages and anchors passed verification.
The coordinator checked 20 remote documentation URLs. All returned HTTP 200.
Public functional installation and release-specific links stay pending until publication.
No publication, tag, release version change, or new environment support promise is part of this result.

## Review corrections

The corrections use approved ordinary wording, conditions for the three rule-disable statements, and active voice for known actors.
Code and output blocks are unchanged from the reviewed revision.
Focused documentation and formatting checks passed after these corrections.
The full suite was not repeated.
