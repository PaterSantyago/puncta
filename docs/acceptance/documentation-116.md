# Post-publication documentation acceptance

## Scope

This report follows [pre-release acceptance](documentation-115.md) and records
[the public-installation task](https://github.com/PaterSantyago/puncta/issues/116).
The published functional version is `0.1.0-alpha.1` for core, the React adapter,
and both locales. Release commit: `932ab23b959c92eef435cca7fb55a08ec12d93bc`.
The documentation correction starts from `f2051e71b0be1fff8bae739ec079d85a2745fff4`.

## Authorized publication

- [Final release Check](https://github.com/PaterSantyago/puncta/actions/runs/35363003355).
- [Artifact authorization](https://github.com/PaterSantyago/puncta/actions/runs/35364186174).
- [Successful OIDC publication and public consumers](https://github.com/PaterSantyago/puncta/actions/runs/35367122861).

The retained archives were compared with the public npm tarballs by SHA-256.
All four package tags identify the release commit. Each public package has
provenance metadata. `next` selects `alpha.1`; `latest` still selects `alpha.0`.
No package version, npm tag, or Git release tag is changed by this task.

## Verification

Checks ran on 2026-09-18 with Node 24.21.0, npm 11.19.0, pnpm 12.4.1,
TypeScript 7.0.2, and React/React DOM 19.3.0.

| Check                         | Result                                                                                                                                                                                                                                              | Evidence                                                                   |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Displayed install commands    | Pass: four shell commands copied from the installation page, plus four documented Spanish/both-locale variants. All eight fresh projects select exact `alpha.1` packages and print `Wait…`. No release-age exception or existing lockfile was used. | [Installation results](evidence/documentation-116-installation.json)       |
| Public installed consumers    | Pass: six first-result consumers and eight adapter/locale combinations across npm and pnpm; public imports, dependency versions, declarations, SSR, and all 49 displayed programs per package manager.                                              | [Public matrix](evidence/documentation-116-public-matrix.json)             |
| Registry and release identity | Pass: four tarball SHA-256 digests match the authorized bundle; provenance exists; all four remote package tags identify the release commit. Published README link targets return HTTP 200.                                                         | [Registry and artifact evidence](evidence/documentation-116-registry.json) |
| Current external links        | Pass: 58 URLs from current reader pages, package entries, and contributor entry. Release and historical URLs return HTTP 200. GitHub fragments were also checked against the referenced Git objects.                                                | [Link results](evidence/documentation-116-links.json)                      |

The public matrix uses the release harness's exact-version pnpm age exceptions
for `@next` consumers. The separate displayed-command checks use the documented
exact versions without exceptions. This distinguishes normal user installation
from immediate release verification.

A first link-check attempt failed because the local Python certificate store
could not validate TLS. The completed check used curl with normal certificate
validation. No failed or skipped check is counted as a pass.

Library code, package manifests, declarations, and displayed TypeScript/TSX
programs are unchanged from the accepted release. The browser/RSC result is the
successful release Check linked above. The documentation PR also runs the normal
project and browser checks before merge.

## Review

Two independent agents reviewed standards/language and specification coverage.
The language review used the official ASD-STE100 Issue 9 rules and dictionary,
including Rule 1.1, plus the project glossary. Code and literal examples were not
subjected to a prose vocabulary gate. The author corrected a status link that
pointed to an old snapshot and replaced new uses of “retain” and “remain”.
Final review of this report and the corrected revision is pending.

## Acceptance status

Current source corrections and public installation checks are complete.
The documentation task and its parent stay open: published README notices and
working-branch links do not meet the agreed release-entry requirements.
Recording this limitation is not a waiver. Completing that requirement needs an
explicitly authorized follow-up publication or an explicit change to the
acceptance criteria. This task does neither.

## Artifact boundaries

Current source documentation replaces the unreleased notices and version
placeholders with the published versions. Package guide/reference links use
immutable package tags; their installation links use the current guide.
The completed active release plan is removed as required by the release procedure.
Its original stays at the release commit.

The published archive README files and tag snapshots keep their pre-publication
notices. Their existing documentation-branch links remain historical references.
This task verifies those targets and records their old text; it does not claim
that current source edits update npm metadata, tarballs, or immutable tag content.
Use the current installation page for corrected commands and release status.

Historical acceptance reports stay unchanged. Their statements describe the
checks performed before publication.
