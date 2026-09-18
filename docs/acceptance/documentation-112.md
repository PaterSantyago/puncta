# Hyphenation documentation acceptance

[Documentation index](../README.md)

Scope: [issue 112](https://github.com/PaterSantyago/puncta/issues/112).
Implementation base: `e658d7c77faa9f15de74c34433bd97fa1c52dc94`.
This change does not change library behavior, public APIs, manifests, or release versions.

## Coverage

The [coverage inventory](documentation-coverage.json) maps seven new displayed programs to their Markdown source.
The guide shows insertion and text, HTML, and React removal.
The settings reference gives fields, defaults, valid surfaces, inheritance, resets, and validation.
The core and React references give removal arguments, result types, and all overloads.
The locale reference gives word admission, conservative exclusions, and language evidence limits.
Package README sections link to these definitions and keep their existing heading anchors.

| Program                     | Checked requirement                                                                                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `hyphenation-insert`        | English and Spanish positives, insertion off, raised minima, field/group reset, existing SHY                                                                             |
| `hyphenation-exclusions`    | Initial capital, other case exclusions, short/digit/apostrophe/hyphen/SHY words, unsupported characters, mixed scripts, Spanish ambiguity, protected warning suppression |
| `hyphenation-trees`         | English insertion across transparent leaves, left-leaf boundary ownership, protected code, Spanish React insertion                                                       |
| `hyphenation-remove-text`   | Protected SHY retention, no typography or grouping, deletion rule ID, shared disable                                                                                     |
| `hyphenation-remove-html`   | Text/entity removal, attribute/code/off-scope retention, fragment context, no typography or grouping                                                                     |
| `hyphenation-remove-react`  | Pure detailed removal, attribute/code/off-scope retention, no typography or grouping                                                                                     |
| `hyphenation-removal-types` | Ordinary/detailed/boolean result types, all three formats, invalid format/foreign-format options, minima validation with removal disabled                                |

The prior `settings-validation` example checks a locale change with inherited Spanish minima and a field reset.
Source review compared the reference with core types, settings, insertion/removal code, and shared scopes.
It also compared React removal with the pure entry and tree processing.
The inventory now marks the hyphenation settings, removal types/functions, and `PunctaInstance` contract as covered.
Full diagnostics are part of issue 114.

The English and Spanish corpus records supply language evidence selected before engine comparison.
See [English evidence](en-gb-hyphenation-corpus.md) and [Spanish evidence](es-es-hyphenation-corpus.md).
The documented `backbone` and `camino` positions agree with those fixed records.
Source behavior is not the only language oracle.
Existing [removal acceptance](strip-soft-hyphens.md) covers generated protection/removal invariants and resource failures.
This change adds no duplicate product tests.

## Checks

Checks use Node 24.21.0, pnpm 12.4.1, React/React DOM 19.3.0, and TypeScript 7.0.2.
Matching functional archives keep manifest version `0.1.0-alpha.0`.
They are not the historical public scaffold packages.

- All seven new displayed programs passed exact output probes through public distribution exports.
- `pnpm typecheck` passed for the workspace and SSR consumer.
- `pnpm docs:check` passed: 28 pages, 334 local links/anchors, 45 displayed programs, and four pending coverage groups.
- `pnpm check` passed: lint, format, documentation, types, build, archives, 286 functional tests, three release tests, and six local publication simulations.
- Installed npm and pnpm consumers each compiled and executed all 45 displayed programs. Release validation passed.

The full run used stable displayed example source. Final changes corrected prose, navigation, and this evidence record.
Focused formatting, link, and diff checks passed after those changes.

The installed-consumer harness extracts the displayed TypeScript/TSX source and compares exact output with SHY escapes.
A browser run is not necessary for the new layout claims.
The guide says that SHY opportunities do not always cause rendered line breaks.
See [issue 110 acceptance](documentation-110.md#checks) for existing React browser evidence.

## Review and limits

The author used the official ASD-STE100 Issue 9 rules and dictionary and the established domain terms.
No project dictionary applies.

A separate review checked revision `fa95685cdd73bd55fc6c7c56354c01ab4dba8d09` against the implementation, issue 112, and the parent specification.
The review also checked the official ASD-STE100 Issue 9 rules and dictionary.
It found one incorrect React error code and STE vocabulary and grammar issues.

The author applied all corrections. A separate final review checked the corrections at
`f26361fd90d43a5850bca5ecadc72d6a0f60e2f8`. All 42 code/output fences are unchanged.
No factual or language finding is open for this slice.

All 42 code/output fences in the nine corrected files are unchanged.
Focused documentation, formatting, and diff checks passed after correction.
The corrections change no executable example. No full-suite repeat was necessary.

The functional packages are unreleased.
Public installation checks and release/tag links are pending until publication.
The coordinator checked 26 package documentation URLs after the push. All returned HTTP 200.
The session evidence is `112-remote-links.json` in the coordination directory.
Local links and anchors use the shared documentation checker.
