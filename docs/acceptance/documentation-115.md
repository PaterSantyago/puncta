# Pre-release documentation acceptance

[Documentation index](../README.md)

Scope: [issue 115](https://github.com/PaterSantyago/puncta/issues/115).
Implementation base: `dce85e78ee7568b7ad63544f0963b4227c26f47b`.
Candidate SHA and final command results will follow the committed check run.
Independent full-document review is pending. This report does not yet record acceptance.

## Contracts and coverage

The [specification index](https://github.com/PaterSantyago/puncta/issues/106) links the four authoritative decisions.
The [coverage inventory](documentation-coverage.json) maps canonical definitions, displayed programs, integration excerpts, and production source.
Library source and manifests are unchanged from functional baseline `83b8c7acd5d6cfbe33c47f87c4c26f050628415f`.
No accepted behavior change needs reconciliation after that baseline.

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
| Locales/rules    | [Locales and rules](../reference/locales-and-rules.md): both exports, opaque immutable resources, eleven groups, locale differences, exclusions and ambiguity                                   |
| Diagnostics      | [Diagnostics](../reference/diagnostics.md): codes, source/rule/locale fields, UTF-16 coordinates, entities, parser repairs, multi-leaf edits and serialization                                  |
| Integration      | [React](../guides/react.md) and [server rendering](../guides/server-rendering.md): opaque boundaries, original children, state limits, SSR/hydration/streaming, RSC ownership                   |

The locale READMEs now link to canonical grouping and hyphenation definitions.
Their old reference heading stays available for existing links.
Obsolete migration notices and the configuration guide's temporary package detour are removed.
Compatibility now links directly to the four historical scaffold tag READMEs.
The author read the tag list through the GitHub API. All four tags identify `01362421c190d80719932e5a878fdc99762bbd70`.
No tag was changed.

## Reader journeys

The author followed all accepted routes, with direct entry from the index and package READMEs.
The local link check verifies files and anchors throughout the registered pages.

| Intent               | Route and result                                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| First string         | Root → installation → text/HTML quick start: `Wait…`                                                                     |
| First React result   | Adapter README/index → installation → React quick start → React guide: accessible children and custom-component boundary |
| HTML                 | Quick start → HTML → protection: mode/context, serialization, transparent boundaries and excluded content                |
| Settings and locales | Index → configuration → locale rules → settings: overrides, reset, both locales and opt-in grouping                      |
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

Final command results are pending the candidate run.
Checks use Node 24.21.0, npm 11.19.0, pnpm 12.4.1, TypeScript 7.0.2, and React/React DOM 19.3.0.
All four matching built archives have manifest version `0.1.0-alpha.0`.
Their source provenance is the functional baseline above, not the public scaffold tag.

The existing installed npm/pnpm harness compiles and executes all 49 displayed programs and compares exact output.
The eight integration excerpts stay linked to full canonical runnable sources.
Reference declarations are labeled as declarations. Shell installation templates are labeled as templates.
Output blocks are labeled separately and are not executable examples.
Browser and RSC commands run separately from `pnpm check`.

## Review and limits

The author used the official ASD-STE100 Issue 9 rules and dictionary and the prior slice findings.
Code, identifiers, literal examples, and established technical terms keep their specified forms.
No project dictionary applies.
Full independent factual, navigation, and language review is pending.
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
