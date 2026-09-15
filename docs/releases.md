# Independent alpha releases

## Describe the change in the ordinary PR

Run `pnpm change @use-puncta/with-en-gb --bump patch --summary 'Describe the change'` and commit the generated `.changeset/*.md` alongside the code. Select the packages actually affected. Use `--bump none` for an explicit no-release intent. The directory uses pnpm's native intent format; the Changesets CLI is not installed.

`pnpm change status` previews pending work. `pnpm version -r` consumes it, updates dependent workspace ranges and records consumption in `.changeset/ledger.yaml`. The configured alpha lanes keep prerelease versions independent; `versioning.changelog.storage: repository` keeps changelogs reviewable. pnpm checks the registry: an unpublished package debuts at the manifest version, initially `0.1.0-alpha.0`, without an extra bump. Subsequent locale changes need not release core or other locales. Changes to core may require dependent releases.

## Review and merge the release PR

After an ordinary PR merges, **Prepare release PR** applies the native plan and maintains `release/pending` with the standard `GITHUB_TOKEN`. The repository setting **Allow GitHub Actions to create and approve pull requests** must be enabled. Workflow permissions are scoped explicitly; no PAT or additional App is required.

The preparation workflow explicitly dispatches **Check** at `release/pending`. It therefore creates the required `check` result on the new head even when the bot's push does not trigger `pull_request`. A maintainer can retry with `gh workflow run check.yml --ref release/pending`. If GitHub additionally creates a PR run marked **action_required**, an owner must use **Approve and run** in that run, or `gh api --method POST repos/PaterSantyago/puncta/actions/runs/<run-id>/approve`, and wait for its current-head check. This is GitHub’s approval path and does not weaken branch protection. Never merge on a check for an older head. Branch protection requires the current branch to be up to date with main and green.

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

## Publish or resume the retained release

`scripts/publish.mjs` consumes the authorized bundle without building or packing. It validates authorization, commit, plan digest, archive bytes and actual packed manifests before any registry write. It retains a copy in `<state>/bundle` and atomically records package outcomes and attempt history in `<state>/result.json`. Keep that directory outside the checkout and retain it beyond the Actions artifact expiry.

For the first publication, the owner logs into npm with their normal 2FA flow, then runs:

```sh
node scripts/publish.mjs --bundle /absolute/path/to/authorized-bundle --state /absolute/path/to/release-state --mode bootstrap
```

The command uses the owner's interactive npm authentication; never paste passwords, tokens or OTPs into issue comments. Bootstrap does not promise provenance. The four first versions remain `0.1.0-alpha.0`; do not regenerate archives to resume. Recover with the same command, or use `--bundle /absolute/path/to/release-state/bundle` and the same state directory. A local Git lock prevents two publisher processes in the same repository; only remove `.git/puncta-publish.lock` after confirming that a crashed process is no longer running. Coordinate owner bootstrap with automation; leave `NPM_OIDC_ENABLED` disabled until bootstrap and publishers are ready.

Publication uses `npm publish <archive> --access public --tag next --ignore-scripts`, in dependency order. On retry, it downloads each existing version's actual tarball and compares SHA-256 before skipping. A 404 means absent; registry errors stop the attempt. Different bytes, a conflicting Git tag, or an unexpected `next` tag stop the release with a recorded error. No version is overwritten or unpublished, and no dist-tag is moved automatically during recovery. Investigate and prepare a correcting release for a content mismatch. Registry visibility delays are recoverable by rerunning the same bundle.

npm can expose a newly published version and its dist-tags while the package index used by installation still returns 404. The executor reads the dedicated dist-tags endpoint, records the observed tags, and checks index visibility up to six times with two-second gaps before proceeding to another package. Each request has a 30-second timeout. If the index remains unavailable, publication stops with a recoverable incomplete result; wait for npm to expose it and rerun the same bundle and state. The existing version is verified and skipped on that retry.

After all planned versions match, the full npm/pnpm consumer matrix installs the adapter and selected locales through `@next` from that registry. It checks the resolved versions, including transitive core, against the manifests in the retained archive set and prints the requested and resolved versions for each scenario. This includes packages outside an independent locale plan, whose `next` tags must still resolve to their checked versions. The consumer never publishes or rebuilds these packages. Each package's observed dist-tags are saved in `result.json`, including `latest` if the registry returns it; the executor never promotes `latest`. Only after this verification does the command create immutable local tags named `<package>@<version>` at the checked release commit. Public modes fetch remote tags before publication and reject conflicts. The owner then pushes these exact tags without force, for example:

```sh
git push --atomic origin 'refs/tags/@use-puncta/core@0.1.0-alpha.0' 'refs/tags/@use-puncta/with-react@0.1.0-alpha.0' 'refs/tags/@use-puncta/with-en-gb@0.1.0-alpha.0' 'refs/tags/@use-puncta/with-es-es@0.1.0-alpha.0'
```

A rejected tag push does not undo npm publication. Resolve the conflict without moving a published release tag; retain the state and report the release incomplete until its remote tags are confirmed.

## Subsequent OIDC releases

`publish.yml` is ready for GitHub-hosted Ubuntu with Node 24 and pinned npm 11.19.0. Configure each package's npm trusted publisher for owner `PaterSantyago`, repository `puncta`, workflow filename `publish.yml` (no environment is configured here). After bootstrap and publisher setup, enable the repository Actions variable `NPM_OIDC_ENABLED=true`. Until then the publishing job stays disabled. These remain owner tasks; a successful Verdaccio run is not a real OIDC release.

The workflow reacts to successful artifact authorization, refreshes the merged PR and exact successful checks through GitHub, and downloads the existing authorized bundle. Ordinary commits with no authorized release artifact exit without publication. Manual recovery is `gh workflow run publish.yml --ref main -f authorization_run=<successful-authorization-run-id>`; a manual request without an authorized artifact fails. All automated attempts share one non-cancelling concurrency group. The publishing job alone receives `id-token: write`, uses `--provenance`, runs consumers, and pushes only the plan's tags atomically without force. PR checks receive no npm credentials. No permanent npm publishing token is configured.

An always-run upload retains both the input bundle and partial results for 30 days, including a failed consumer or tag push. Resume using the original authorization run while its artifact exists; download and preserve the recovery artifact before expiry. The executor records local completion; the workflow is successful only after the remote tag push. Provenance identifies the publishing workflow execution; the separately checked bundle's verification and authorization records bind the archive hashes to the actual release commit. No rebuilt tarball is substituted.

The npm requirements and automatic provenance behavior are documented in [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/) and [npm provenance](https://docs.npmjs.com/generating-provenance-statements/). `pnpm test:publish` proves successful publication, registry failure and retained-state recovery, matching remote archive skips, conflicting archive refusal, and lock/tamper refusal through Verdaccio and the CLI.
