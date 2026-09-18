# Diagnostics documentation acceptance

[Documentation index](../README.md)

Scope: [issue 114](https://github.com/PaterSantyago/puncta/issues/114).
Implementation base: `29b9e9d1f5dc0ef55acc4cc871d5e2ae854df0b8`.
The change does not change library behavior, API, package versions, or publication status.

## Coverage

The [diagnostic reference](../reference/diagnostics.md) gives ten thrown codes and nine warning codes.
Each catalog gives causes, actions, fields, and disabled/protected behavior.
The page also gives all result, source, edit, range, location, and warning types.
Core and React references link to these canonical definitions.
The core README links to the guides and no longer has temporary diagnostic material.

Three new displayed programs show a full error and warning, warnings that occur again without edits, multi-leaf edits, and React paths.
They also check an emoji prefix, parser-repair provenance, and serialization without typography edits.
The two existing grouping programs check entity provenance and original UTF-16 positions.
The documentation explains the `covering` shape without a claim that a current rule edits part of one decoded entity origin.

Troubleshooting gives symptom routes for unchanged text, components, HTML serialization, SHY and line breaks, locale/settings errors, package mismatch, and grouping exclusions.
It links to the canonical catalog and the existing guides.
The [coverage inventory](documentation-coverage.json) records these pages, programs, and public types.
Its named diagnostic inventory records each code, category, canonical target, and production source files.

The checker scans production core, shared, and React TypeScript files for dotted diagnostic literals.
It excludes the two dotted rule identifiers `hyphenation.insert` and `hyphenation.remove`.
It compares code names and source file sets, then checks catalog rows, targets, and source links.
It does not use full-file fingerprints as a substitute for code-name checks.
Messages, `parserCode`, and reason values are not diagnostic codes.

## Checks

The main `pnpm check` passed with exit code 0.
It checked candidate `ba87d365b3b8f2279b2942d02215f767e6fb853e` and the prose corrections made during the run.
Correction commit `796a5c90abeea5d5d5daab31722facad170a2dc7` changes no executable source or displayed code/output block.
The final documentation and format checks also passed after those corrections.

Both npm and pnpm consumers compiled and executed all 49 displayed programs.
The installed harness extracted the displayed source and compared the output.
The eight integration excerpts and their canonical source files are unchanged.
Checks used Node 24.21.0, pnpm 12.4.1, TypeScript 7.0.2, and React/React DOM 19.3.0.
The matching functional archives have manifest version `0.1.0-alpha.0`.
They are not the public scaffold.

| Command or check                    | Result                                                                                                                                                                              |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm typecheck`                    | Pass: workspace and SSR consumer                                                                                                                                                    |
| Local displayed diagnostic programs | Pass: all three new programs against built public entrypoints                                                                                                                       |
| `pnpm docs:check`                   | Pass: 31 pages, 428 local links/anchors, 49 displayed programs, eight integration excerpts, two expected pending coverage groups                                                    |
| `pnpm check`                        | Pass: lint, format, documentation, types, build, archives, 286 functional tests, three release tests, six publication simulations, installed npm/pnpm consumers, release validation |
| Negative omission checks            | Pass: new source code, missing error row, missing warning inventory entry                                                                                                           |
| Correction fence comparison         | Pass: all code/output fences unchanged from the candidate                                                                                                                           |

The negative-check script restored the files after each probe.
The final documentation check passed after these probes.
The coordinator checked all 30 package documentation branch URLs. All returned HTTP 200.

Session evidence is in `/tmp/puncta-docs-coordination/`:

- `114-check.log` and `114-check-exit.txt`: main project check and exit code 0.
- `114-types.log`: focused workspace and SSR types.
- `114-local-examples.log`: displayed diagnostic programs against local built public entrypoints.
- `114-negative.log`: code omission probes and restored documentation check.
- `114-corrections-docs.log`, `114-corrections-format.log`, and `114-corrections-fences.log`: focused correction checks.
- `114-remote-links.json`: package documentation URL results.

## Review and limits

The author used the official ASD-STE100 Issue 9 rules and dictionary and the corrections from reviews 109–113.
Code, API identifiers, literals, and technical terms keep their specified forms.
No project dictionary applies.
A separate factual and language review checked the candidate and the correction commit.
It found a Markdown table error, an incomplete `covering` mapping definition, and six language correction groups.
The author corrected all findings. The reviewer confirmed that the content has no unresolved findings.
The review record is `/tmp/puncta-docs-coordination/review-114.md`.
Review of the final evidence revision is pending coordinator confirmation.

This change adds no rendered-behavior claim or integration-source change.
Browser and RSC evidence from [issue 113](documentation-113.md#checks) applies to the unchanged examples.
These separate checks are not part of `pnpm check`.

The functional release is unpublished.
Public installation and release/tag validation are pending until publication.
No package publication or release/tag change is part of this issue.
