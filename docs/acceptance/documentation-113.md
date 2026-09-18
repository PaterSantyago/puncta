# Server integration documentation acceptance

[Documentation index](../README.md)

Scope: [issue 113](https://github.com/PaterSantyago/puncta/issues/113).
Implementation base: `a1b289df6418deed13fd93f91e351ef0c0aada05`.
The change does not change library behavior, public API, package versions, or publication status.

## Coverage

The [server guide](../guides/server-rendering.md) owns SSR, hydration, streaming, Suspense, and RSC instructions.
The adapter README keeps its Server integration anchor and links to that guide.
Compatibility and troubleshooting link to the same definitions.
The [inventory](documentation-coverage.json) maps the complete `server-sync` program and eight canonical integration excerpts.

The installed consumers compile and run the displayed `server-sync` program through public package imports.
The integration checker compares each excerpt with its complete runnable source.
The browser report records full source and excerpt SHA-256 values for all five SSR/hydration excerpts.
The RSC report records those values for all three RSC excerpts.
These source checks do not replace the rendering assertions.

## Checks

The browser and RSC runs checked candidate `857bca0cc727928a39564aab6c36ca2033d3ffa4`.
The main project check and the browser/RSC jobs are separate.
The main check passed with exit code 0.

Both npm and pnpm consumers compiled and executed all 46 displayed programs.
The checks use Node 24.21.0, pnpm 12.4.1, TypeScript 7.0.2, and React/React DOM 19.3.0.
Matching functional archives have manifest version `0.1.0-alpha.0`.
They are not the public scaffold packages.

| Command             | Result                                                                                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm docs:check`   | Pass: 30 pages, 366 local links/anchors, 46 displayed programs, eight integration excerpts, three pending coverage groups                                                |
| `pnpm check`        | Pass: lint, format, docs, types, builds, archives, 286 functional tests, three release tests, six local publication simulations, installed consumers, release validation |
| `pnpm typecheck`    | Pass: workspace and SSR consumer                                                                                                                                         |
| `pnpm test:browser` | Pass: 149 shared cases per engine, existing mounted updates, React quick-start source, three hydration modes per engine                                                  |
| `pnpm test:rsc`     | Pass: Flight response, HTML without JavaScript, hydration and client updates in all three engines                                                                        |

| Engine   | Version      | Playwright revision |
| -------- | ------------ | ------------------- |
| Chromium | 145.0.7632.6 | 1208                |
| Firefox  | 146.0.1      | 1509                |
| WebKit   | 26.0         | 2248                |

The browser environment is macOS arm64, Darwin 27.0.0, with Playwright 1.58.2 and esbuild 0.28.2.
The RSC production app uses Next.js 16.3.5.
Its server and client React version is `19.3.0-canary-cbb046ab-20260731`.
This framework version is separate from the application's React dependency.

The browser check finds the shell and fallback before controlled Suspense resolution.
It checks resolved text, original DOM identities, and no recoverable hydration errors.
The RSC check verifies independent server configuration after client controls change.
Neither job replaces rendered behavior with a pure output check.

Session evidence is in `/tmp/puncta-docs-coordination/`:

- `113-check.log`: the main project check.
- `113-browser-final.log` and `113-browser-final.json`: the separate browser job and full report.
- `113-rsc-final.log` and `113-rsc-final.json`: the separate RSC job and full report.
- `113-source-hashes.log`: comparison of the current eight excerpts and source hashes with both successful reports.

The JSON reports record the checked candidate and canonical-source SHA-256 values.
The excerpt comparison ignores line indentation and final whitespace.
It keeps all other source text unchanged.
The reports also record excerpt hashes, browser revisions, and executable paths.
The reports were copied outside `artifacts/` because package checks clear that directory.

The main check started from the implementation base with the candidate changes in the worktree.
Executable documentation programs stayed unchanged during that run.
A later display of the existing browser output oracle adds the eighth excerpt.
The final browser run checked this excerpt at the committed candidate.
Final navigation and evidence edits change no executable source.

## Review and limits

A separate review checked candidate `857bca0cc727928a39564aab6c36ca2033d3ffa4` and the navigation and evidence corrections.
It compared the content with issue 113, its parent decisions, source code, and the official ASD-STE100 Issue 9 reference.
It found an incorrect hydration-check description and STE vocabulary errors.
The author corrected both. Final review of these corrections is pending.
All code and output fences stayed unchanged.
The author uses the official Issue 9 rules and dictionary and existing technical terms.
No project dictionary applies.
The functional release is unpublished.
Public installation and release/tag checks are pending until publication.
