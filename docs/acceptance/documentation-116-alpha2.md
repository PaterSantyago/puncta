# Corrective documentation release acceptance

## Scope

Version `0.1.0-alpha.2` corrects the README files for all four public packages.
The owner explicitly authorized this additional release on 2026-09-21.
The API is unchanged from `0.1.0-alpha.1`.
The [earlier report](documentation-116.md) records the original publication and
its README limitation. This report follows [pre-release acceptance](documentation-115.md)
and supplies the final evidence for [issue 116](https://github.com/PaterSantyago/puncta/issues/116).

## Publication

Release commit: `989c8e4bd49b382343d437717500e28ee77a287a`.

- [Documentation correction PR](https://github.com/PaterSantyago/puncta/pull/123).
- [Generated release PR](https://github.com/PaterSantyago/puncta/pull/124).
- [Final release Check](https://github.com/PaterSantyago/puncta/actions/runs/35594707642).
- [Artifact authorization](https://github.com/PaterSantyago/puncta/actions/runs/35595585374).
- [Completed OIDC publication](https://github.com/PaterSantyago/puncta/actions/runs/35596508069).

All four public archive digests match the authorized bundle. Each package has
provenance metadata. The four package tags identify the release commit.
At verification, `next` selects `0.1.0-alpha.2`; `latest` selects `0.1.0-alpha.0`.
Earlier package versions and Git tags are unchanged.

The publication workflow was resumed after npm processed each accepted version.
Each resume used the same authorized bundle and verified existing package bytes.
One release-PR check exceeded its 15-minute limit. Its retry passed; the final
release Check also passed. The stopped runs are not counted as successful checks.

## Checks

Checks ran on 2026-09-21 with Node 24.21.0, npm 11.19.0, and pnpm 12.4.1.

| Check                       | Result                                                                                                                                                      | Evidence                                                                     |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Exact installation commands | Eight fresh npm/pnpm projects install the documented alpha.2 packages and print `Wait…`. No release-age exception or existing lockfile is used.             | [Installation evidence](evidence/documentation-116-alpha2-installation.json) |
| Public consumer matrix      | Public imports, package versions, declarations, SSR, and all 49 displayed programs pass with each package manager.                                          | [Consumer evidence](evidence/documentation-116-alpha2-public-matrix.json)    |
| Published README files      | Archive README bytes match the reviewed source. The README files do not contain obsolete notices or working-branch links. All README links return HTTP 200. | [Registry evidence](evidence/documentation-116-alpha2-registry.json)         |
| Reader links                | 64 external URLs pass. GitHub heading fragments match the referenced Git objects.                                                                           | [Link evidence](evidence/documentation-116-alpha2-links.json)                |

The public consumer matrix uses exact checked-version pnpm age exceptions for
`@next`. The separate documented-command checks do not use these exceptions.
The final release Check includes the separate browser and RSC job.
No failed or skipped check is counted as a pass.

## Review and completion

Independent factual/specification and ASD-STE100 Issue 9 reviews examined the
correction against baseline `e4299d62070fbbfe1d6079d6a1e34b0000446d2e`.
The author corrected one unapproved verb and made the historical alpha.1 evidence
explicit. Both reviewers confirmed that their findings were resolved at `e489f49`.
The language review used the official rules and dictionary. Technical identifiers
and literal examples were unchanged.

The independent factual review checked installation records, link results, README
hashes, and successful CI runs. It found no factual or specification issue.
The language review found one unapproved adjective and an unclear description
of OIDC. The author corrected both. OIDC authenticates publication; the workflow
performs the archive and consumer checks.

The [coverage inventory](documentation-coverage.json) records the completed
public-installation requirement. The corrected public README files, matching
release documentation, and fresh installation checks resolve the earlier limitation.
The completed active release plan is removed from the working branch. Its original
stays at the release commit. Historical reports and evidence are unchanged.
