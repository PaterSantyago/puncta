# HTML and protection documentation

[Documentation index](../README.md)

Scope: [issue 109](https://github.com/PaterSantyago/puncta/issues/109).
Parent specification: [issue 106](https://github.com/PaterSantyago/puncta/issues/106).
Implementation base: `8ae05007a58a04ab1af78c948f2b87f62453bea8`.
The library source is unchanged from functional baseline `83b8c7acd5d6cfbe33c47f87c4c26f050628415f`.
All four package manifests stay at `0.1.0-alpha.0`.
The checked local archives contain functional source, not the published scaffold.

## Acceptance mapping

| Requirement                                                                   | Canonical page and displayed examples                                                             |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Fragment/document modes, table and title contexts, context without protection | [HTML](../guides/html.md), `html-modes`                                                           |
| Markers, JSON reset, lang aliases and priority, nested unavailable/off scopes | [HTML](../guides/html.md), [settings](../reference/settings.md#html-markers), `html-scopes`       |
| Transparent leaves, edit ownership, boundaries, same-lang context             | [HTML](../guides/html.md#work-across-inline-elements), `html-joins`                               |
| Original UTF-16/grapheme ranges, call-only protection                         | [Protection](../guides/protection.md), `protection-ranges`                                        |
| Automatic technical tokens, URL punctuation, transparent joins                | [Protection](../guides/protection.md#automatic-technical-text-protection), `protection-technical` |
| Code, inherited off, hidden/editable attributes, opaque unknown elements      | [Protection](../guides/protection.md#protect-markup-and-keep-protection), `protection-markup`     |
| Parsing without sanitization, attributes, bytes, edits versus serialization   | [HTML](../guides/html.md#understand-serialization), `html-serialization`                          |
| Format types and parameter validation, disabled/protected behavior            | [Core](../reference/core.md#format-parameters), `core-format-validation`                          |
| Symptoms, navigation, source inventory                                        | [Troubleshooting](../troubleshooting.md), [coverage inventory](documentation-coverage.json)       |

## Verification

The existing documentation checker extracts each displayed TypeScript example and its expected output.
The existing isolated npm/pnpm consumers compile and execute those same sources through public package imports.
This slice adds eight examples to the fourteen from the earlier slices.
The examples check exact results, not only the absence of errors.

An additional source comparison checked all 128 supported element names against the shared element tables.
The `TextOptions`, `HtmlOptions`, and `ProtectedRange` inventory entries now point to full format definitions.
Their existing source fingerprints are unchanged.

`pnpm check` passed on 2026-09-18 with Node 24.21.0, npm 11.19.0,
pnpm 12.4.1, and TypeScript 7.0.2.

| Check                                          | Result                                                                                                 |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Full `pnpm check`                              | Passed: lint, formatting, docs, types, build, archives, tests, installed consumers, release validation |
| Functional tests                               | 286 passed, no failures or skipped tests                                                               |
| Release tests                                  | Three passed, no failures or skipped tests                                                             |
| Publication tests                              | Six passed in disposable registries, no public publication                                             |
| Displayed examples                             | All 22 compiled and ran through public imports with npm and pnpm, with exact output matches            |
| Minimal consumers                              | Core with en-gb, core with es-es, and core with both locales passed for each manager                   |
| Existing adapter consumers                     | All eight package combinations passed                                                                  |
| Final `pnpm docs:check`                        | 20 pages, 202 local links and anchors, 22 examples, seven coverage groups pending                      |
| Final `pnpm format:check` and whitespace check | Passed after prose and evidence updates                                                                |

The eight new examples also passed an earlier exact-output check against built entrypoints.
The full run used the existing installed consumers for the final example and declaration checks.
No library test or duplicate example runner was added to the repository.
An independent review of revision `71dd89aec7b17043b88dd8a5290117bcad583c51` found no factual, navigation, or coverage defects.
The review found two groups of language issues.
The corrections below await an independent recheck.

## Language and limits

The author consulted the official
[ASD-STE100 Issue 9 rules and dictionary](https://www.asd-ste100.org/assets/files/ASD-STE100_ISSUE9.pdf).
The author checked ordinary wording, permitted verb forms, active voice, sentence and paragraph length, and punctuation.
Exact API identifiers and literal outputs stay unchanged.
The independent language review is an additional acceptance requirement.

Full diagnostic schemas, React-specific procedures, and SHY removal are in their assigned slices.
Useful legacy material for those subjects stays in the core and adapter READMEs.
No library behavior, versions, tags, or public package contents changed.
Public functional installation and release-specific links are pending until publication.

## Review corrections

The author applied the two language finding groups from the independent review.
Ordinary wording and verb forms now use the specified alternatives from the official Issue 9 dictionary.
The author divided long paragraphs after the wording changes and in the verification record.
Code, literal inputs, expected outputs, library behavior, and the coverage inventory are unchanged.

The coordinator checked all ten absolute branch URLs from the package READMEs on 2026-09-18.
Each returned HTTP 200. Local file and anchor checks also passed.
Public functional installation and release-specific URLs are still pending until publication.

Focused documentation and formatting checks passed after these prose corrections.
The author did not run the full suite again.
The full-suite result above applies to the unchanged examples and library source.
The final independent factual and language recheck is pending.
