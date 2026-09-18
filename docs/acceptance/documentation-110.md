# React documentation acceptance

[Documentation index](../README.md)

Scope: [issue 110](https://github.com/PaterSantyago/puncta/issues/110).
Implementation base: `3d3bc34300da6ec67c75759ae17e938605c8be61`.
Library code, API, manifests, and release versions are unchanged.

## Coverage

The React quick start, guide, reference, and package entry now define the component and pure paths.
The [coverage inventory](documentation-coverage.json) maps eight new displayed programs to their source blocks.
It compares both React entrypoints and their public declarations with source fingerprints.
SHY removal, digit grouping, server integration, and the full diagnostic catalog have their own pending slices.

The programs show Provider and direct-instance use, opaque custom components, and an inner `Puncta`.
They check nested locales, rule reset, inherited protection, pure Context independence, numeric type changes, and configuration errors.
Arrays, Fragments, unchanged attributes, raw HTML, and the absence of `outputChanged` have checked results.
The guide also defines portals, promises, iterables, Suspense boundaries, and the protection-change remount limit.

## Checks

The implementation uses Node 24.21.0 and React/React DOM 19.3.0.
Installed declaration checks use TypeScript 7.0.2.
All four local package archives use manifest version `0.1.0-alpha.0` with functional source.
These are not the public scaffold archives.

| Command or check                  | Result                                                                                                                                                                         |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm docs:check`                 | Passed: 24 pages, 244 local links/anchors, 30 displayed programs. Six coverage groups stay pending.                                                                            |
| `pnpm typecheck`                  | Passed for the workspace and SSR consumer.                                                                                                                                     |
| Focused displayed React programs  | All eight documented outputs matched public distribution exports.                                                                                                              |
| `pnpm check`                      | Passed: lint, formatting, documentation, types, build, archive checks, 286 functional tests, three release tests, six publication tests, installation, and release validation. |
| `pnpm test:browser`               | Passed independently in Chromium 145.0.7632.6, Firefox 146.0.1, and WebKit 26.0.                                                                                               |
| Formatting, lint, and diff checks | Passed after the final author prose pass.                                                                                                                                      |

The existing npm and pnpm adapter consumers check the exact displayed TSX after direct core installation.
All 30 displayed programs compiled and ran in each consumer with both locales.
All documented outputs matched through npm and pnpm.
Existing declaration checks exercise all four public React types and ordinary, detailed, false, and boolean result forms.
They also reject unsupported option locations and `ReactResult.outputChanged`.

The existing browser runner mounts the exact `react-start` source through `createRoot`.
It compares the DOM HTML with the displayed output and records the source SHA-256.
Each engine passed 149 shared cases, 14 mounted updates, eight protection/reorder scenarios, and 13 grouping updates.
State and refs stayed intact in the supported scenarios. All three hydration modes passed without errors.
The runner writes its environment, builds, results, and source hash to `artifacts/browser/acceptance.json`.

Browser checks run independently of `pnpm check`.
The [existing browser procedure](../../tests/browser/README.md) defines the wider regression scope.
This evidence does not promise state preservation for arbitrary deep protection changes.

## Review and limits

A different agent checked revision `02f64d6ea096e107cc085049ba1818d05dc2abb9` against the implementation base.
The review used the official ASD-STE100 Issue 9 rules and dictionary.
It found two groups of P2 language issues and one P3 navigation issue.
The author applied all eight wording corrections and replaced the stale README pointer with the canonical state-limit link.
Independent review of these corrections is pending.

The author used the official Issue 9 rules and dictionary for a first prose pass.
No new project dictionary applies.
Public functional installation and release-specific links stay pending until publication.
The coordinator checked 13 package documentation URLs after the branch push on 2026-09-18.
All returned HTTP 200. Local checks also verify the new state-limit anchor.

Existing server, grouping, and removal sections in the package entry await their respective documentation slices.
Their migration and full language review are outside issue 110.
No publication, release tag, RSC check, or new support promise is part of this result.

## Review corrections

The language corrections replace unapproved ordinary words and one verbal -ing construction.
The navigation correction links the retained numeric-update section to the React guide's state and protection-change limits.
Code and output fences are identical to the reviewed revision.
Focused `pnpm docs:check` and `pnpm format:check` passed after these prose corrections.
The full suite was not repeated.
