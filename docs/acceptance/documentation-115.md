# Pre-release documentation acceptance

[Documentation index](../README.md)

Scope: [issue 115](https://github.com/PaterSantyago/puncta/issues/115).
Implementation base: `dce85e78ee7568b7ad63544f0963b4227c26f47b`.
Checked candidate: `6b9ea52fcac3b37e177b30d68bc43cb55d11b1f5`.
Final prose corrections do not change executable examples or integration source.
The corrected documentation passes the separate full factual, navigation, and language review.
Public functional installation stays pending in issue 116.

## Contracts and coverage

The [specification index](https://github.com/PaterSantyago/puncta/issues/106) links the four authoritative decisions.
The [coverage inventory](documentation-coverage.json) maps canonical definitions, displayed programs, integration excerpts, and production source.
Library source and manifests are unchanged from functional baseline `83b8c7acd5d6cfbe33c47f87c4c26f050628415f`.
No library behavior changed after that baseline.

The author compared public entrypoints and declarations with their linked definitions.
This included every field and union in core types, React props and pure options, and all method overloads.
The settings comparison included all eleven rule groups, four hyphenation fields, locale defaults, resets, and valid configuration surfaces.
The diagnostic comparison included ten thrown codes and nine warning codes, their production causes, result fields, locations, and actions.
Source fingerprints detect changes. They do not replace this semantic comparison.

| Surface          | Canonical definitions and audit                                                                                                                                                                 |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core runtime     | [Core reference](../reference/core.md): creation, snapshot, variants, text/HTML and six removal overloads, error constructor and fields                                                         |
| Public types     | [Core type index](../reference/core.md#public-type-index) and [React index](../reference/react.md#exports-and-public-types): named exports, fields, unions, generic edit range, readonly values |
| Options/defaults | [Settings](../reference/settings.md): instance/call/React/markup applicability, omitted/undefined/null distinctions, array replacement, disabled validation and locale revalidation             |
| Locales/rules    | [Locales and rules](../reference/locales-and-rules.md): the two exports, opaque immutable resources, eleven groups, locale differences, exclusions and ambiguity                                |
| Diagnostics      | [Diagnostics](../reference/diagnostics.md): codes, source/rule/locale fields, UTF-16 coordinates, entities, parser repairs, multi-leaf edits and serialization                                  |
| Integration      | [React](../guides/react.md) and [server rendering](../guides/server-rendering.md): opaque boundaries, original children, state limits, SSR/hydration/streaming, RSC ownership                   |

The locale READMEs now link to canonical grouping and hyphenation definitions.
Their old reference heading stays available for existing links.
Obsolete migration notices and the configuration guide's temporary package detour are removed.
Compatibility now links directly to the four historical scaffold tag READMEs.
The author read the tag list through the GitHub API. All four tags identify `01362421c190d80719932e5a878fdc99762bbd70`.
No tag was changed.

## Reader journeys

The author used all accepted routes, with direct entry from the index and package READMEs.
The local link check verifies files and anchors throughout the registered pages.

| Intent               | Route and result                                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| First string         | Root → installation → text/HTML quick start: `Wait…`                                                                     |
| First React result   | Adapter README/index → installation → React quick start → React guide: accessible children and custom-component boundary |
| HTML                 | Quick start → HTML → protection: mode/context, serialization, transparent boundaries and excluded content                |
| Settings and locales | Index → configuration → locale rules → settings: overrides, reset, the two locales and opt-in grouping                   |
| SHY                  | Index → hyphenation → settings/core/React: insertion, separate removal, protected SHY and layout limits                  |
| Server               | React quick start/index → server guide → compatibility: SSR, hydration, streams and local RSC ownership                  |
| Unexpected output    | Troubleshooting → diagnostics → related guide: code, cause, source position and corrective action                        |
| Signature lookup     | Each package README/index → core or React reference directly                                                             |
| Contributor          | Root/index → CONTRIBUTING → existing build, archive, browser/RSC and release instructions                                |

The user path keeps functional installation templates separate from verified local archive checks.
It does not claim that public scaffold packages have the functional API.
Existing contributor content and maintainer release pages stay available.
The contributor instructions now state the documentation update requirement for public behavior changes.

## Verification

The main project check passed with exit code 0.
Browser, RSC, link, and negative omission checks also passed.
Checks use Node 24.21.0, npm 11.19.0, pnpm 12.4.1, TypeScript 7.0.2, and React/React DOM 19.3.0.
All four matching built archives have manifest version `0.1.0-alpha.0`.
Their source provenance is the functional baseline above, not the public scaffold tag.

The existing installed npm/pnpm harness compiles and executes all 49 displayed programs and compares exact output.
The eight integration excerpts stay linked to full canonical runnable sources.
Reference declarations are labeled as declarations. Shell installation templates are labeled as templates.
Output blocks are labeled separately and are not executable examples.
Browser and RSC commands run separately from `pnpm check`.

| Check                 | Result                                                                                                                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm docs:check`     | Pass: 32 pages, 449 local links/anchors, 49 programs, eight integration excerpts. Only public installation is pending.                                                                            |
| `pnpm check`          | Pass, exit 0: lint, formatting, documentation, types, build, archives, 286 functional tests, three release tests, six local publication simulations, installed consumers, and release validation. |
| `pnpm test:browser`   | Pass, exit 0: 149 shared cases per engine, mounted updates, React quick start, and all three hydration modes                                                                                      |
| `pnpm test:rsc`       | Pass, exit 0: Flight, HTML without JavaScript, hydration, client updates and separate server configuration in all three engines                                                                   |
| Current external URLs | All 35 reader-facing targets returned HTTP 200, with redirects followed. Future release URLs are not part of this count.                                                                          |
| Negative omissions    | Missing export, default, and diagnostic inventory entries each caused a check failure. Restored files passed.                                                                                     |

| Engine   | Version      | Playwright revision |
| -------- | ------------ | ------------------- |
| Chromium | 145.0.7632.6 | 1208                |
| Firefox  | 146.0.1      | 1509                |
| WebKit   | 26.0         | 2248                |

The browser environment is macOS arm64, Darwin 27.0.0, Playwright 1.58.2, and esbuild 0.28.2.
RSC uses Next.js 16.3.5 and framework React `19.3.0-canary-cbb046ab-20260731` on server and client.
This framework version is separate from application React/React DOM 19.3.0.
These results do not establish support for untested runtimes or framework versions.

These are local command results, not public CI results.
Durable reports: [browser](evidence/documentation-115-browser.json), [RSC](evidence/documentation-115-rsc.json),
[source provenance](evidence/documentation-115-source-evidence.json), and [external links](evidence/documentation-115-external-links.json).
Full session logs are in `/tmp/puncta-docs-coordination/`:

- `115-check.log` and `115-check-exit.txt`: main check log and final exit status.
- `115-browser.log`, `115-browser-exit.txt`, and `115-browser.json`: browser check and candidate-bound report.
- `115-rsc.log`, `115-rsc-exit.txt`, and `115-rsc.json`: RSC check and candidate-bound report.
- `115-source-evidence.json`: candidate SHA, displayed source/output hashes, integration source/excerpt hashes, and declaration inventory.
- `115-external-links.json`: URL, source page, HTTP status, curl exit, and verification result for each current external target.
- `115-negative.log`: omission failures and restored documentation check.
- `115-provenance.log`: comparison of current source hashes with the candidate reports.
- `115-historical-readmes.json`: historical README content read through the GitHub API.
- `115-fence-audit.txt`: classification of unmarked fences as declarations or shell commands.

All eight integration source/excerpt hashes match the browser/RSC reports.
The React quick-start source hash also matches the browser report.
Reports are saved outside `artifacts/`, which package checks clear.

## Review and limits

The author used the official ASD-STE100 Issue 9 rules and dictionary and the prior slice findings.
Code, identifiers, literal examples, and established technical terms keep their specified forms.
No project dictionary applies.
A separate agent reviewed all 22 current reader pages and the new contributor documentation-change section.
The review used candidate `6b9ea52fcac3b37e177b30d68bc43cb55d11b1f5` and the corrected working tree.
It compared the full content with the four decisions, public source, and official ASD-STE100 Issue 9.
It found stale navigation text, an incorrect description of invalid React instances, and ordinary-language issues.
The author corrected all findings and improved direct guide links.
The separate reviewers confirmed no unresolved factual, navigation, coverage, or language issue in the corrected content.

The language corrections address ordinary words, restricted meanings, active forms, punctuation, and sequential instructions.
Technical identifiers, literals, and every code/output fence stayed unchanged.
The review records are `review-115.md` and `review-115-standards.md` in the session evidence directory.
The review is not a language certificate or a claim that every dictionary entry was read.
Historical contributor and internal acceptance records keep their original scope.

The full project run started at the checked candidate.
Later prose and evidence corrections changed no executable example, integration source, library source, or manifest.
Focused documentation, formatting, source-provenance, and diff checks verify those corrections.
The installed npm and pnpm consumers each compiled and executed all 49 displayed programs.
No skipped or unavailable check counts as a pass.

## Publication handoff

[Issue 116](https://github.com/PaterSantyago/puncta/issues/116) owns the checks after publication:

1. Record the published compatible versions and immutable release tags from the authorized release process.
2. Replace version placeholders with those versions and update Unreleased notices and package documentation links.
3. Run npm and pnpm public installation paths with core and the selected locale as direct dependencies. Add the adapter and compatible React for React use.
4. Confirm the installed versions, public imports, declarations, and exact first results against public functional packages.
5. Check release/tag URLs after the targets exist. Record a timeout as unverified, not as a pass or a missing page.
6. Save the public installation and link evidence with the release record.

Public functional installation and future release/tag checks stay pending until publication.
They are not prerequisites for this pre-release archive acceptance.
This issue publishes no package, selects no release version, and changes no release tag.
