# Independent alpha releases

## Describe the change in the ordinary PR

Run `pnpm change @use-puncta/with-en-gb --bump patch --summary 'Describe the change'` and commit the generated `.changeset/*.md` alongside the code. Select the packages actually affected. Use `--bump none` for an explicit no-release intent. The directory uses pnpm's native intent format; the Changesets CLI is not installed.

`pnpm change status` previews pending work. `pnpm version -r` consumes it, updates dependent workspace ranges and records consumption in `.changeset/ledger.yaml`. The configured alpha lanes keep prerelease versions independent; `versioning.changelog.storage: repository` keeps changelogs reviewable. pnpm checks the registry: an unpublished package debuts at the manifest version, initially `0.1.0-alpha.0`, without an extra bump. Subsequent locale changes need not release core or other locales. Changes to core may require dependent releases.

## Review and merge the release PR

After an ordinary PR merges, **Prepare release PR** applies the native plan and maintains `release/pending` with the standard `GITHUB_TOKEN`. The repository setting **Allow GitHub Actions to create and approve pull requests** must be enabled. Workflow permissions are scoped explicitly; no PAT or additional App is required.

The preparation workflow explicitly dispatches **Check** at `release/pending`. It therefore creates the required `check` result on the new head even when the bot's push does not trigger `pull_request`. A maintainer can retry with `gh workflow run check.yml --ref release/pending`. Never merge on a check for an older head. Branch protection requires the current branch to be up to date with main and green.

Review `release/plan.json`, manifests, pnpm lockfile and package changelogs. The plan contains only public workspace packages selected by the shared `@use-puncta/core` / `@use-puncta/with-*` convention. The plan's alpha version suffix and explicit `next` tag are validated separately. CI packs actual manifests, checks their core ranges, and installs those archives through Verdaccio with npm and pnpm to prove dependency and peer compatibility.

## Retrieve verified artifacts

After the release PR merges, **Check** builds, packs and tests the final merge commit, then saves `checked-<commit>`. **Authorize release artifacts** runs only after successful main Check. It verifies a merged same-repository bot PR from `release/pending`, the exact merge commit, and successful checks on its actual head. A matching title or commit prefix is insufficient. Ordinary PRs produce no authorized release.

The authorization job downloads the existing checked archives, verifies their SHA-256 digests and plan binding, and uploads `release-<commit>`. It does not rebuild. This artifact contains:

- npm tarballs (the plan identifies those selected for publication);
- `plan.json`: versions, actual packed manifests, changelog hashes, tag and preparation base commit;
- `verification.json`: final checked commit, plan hash and each selected archive hash;
- `authorization.json`: GitHub PR and workflow-run evidence.

Download with `gh run download <authorization-run-id> --name release-<commit>`. Artifacts expire after 30 days, so retain the authorized bundle before expiry. A subsequent publishing task must recheck hashes and use these exact tarballs without rebuilding, with `--tag next --access public`. No npm publication is performed by these workflows. First publication with 2FA and later OIDC publishing are separate tasks.

## Add a public package

Follow the package template in the README, seed the first version at `0.1.0-alpha.0`, and add a native change intent. Preparation places every discovered public package on the native alpha lane automatically. Add a native change intent for that package. Public discovery, plan generation and archive checking use the shared convention and do not enumerate locales. Add its public API to the consumer matrix to verify actual compatibility before release.

## Local verification

`pnpm test:release` tests authorization refusals and native independent version planning against an isolated registry fixture. `pnpm check` also performs lint, formatting, typechecking, build, archive validation and the installed consumer matrix. `pnpm release:prepare` mutates the checkout; use it on a disposable branch for local review. The real automation and its explicit head checks must also be exercised in GitHub before relying on the workflow.
