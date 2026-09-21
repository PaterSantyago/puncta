# Independent alpha releases

## Describe the change in the ordinary PR

Run `pnpm change @use-puncta/with-en-gb --bump patch --summary 'Describe the change'` and commit the generated `.changeset/*.md` alongside the code. Select the packages actually affected. Use `--bump none` for an explicit no-release intent. The directory uses pnpm's native intent format; the Changesets CLI is not installed.

`pnpm change status` previews pending work. `pnpm version -r` consumes it, updates dependent workspace ranges and records consumption in `.changeset/ledger.yaml`. The configured alpha lanes keep prerelease versions independent. `versioning.changelog.storage: repository` keeps changelogs available for review. The pnpm registry check preserves an unpublished package's manifest version, initially `0.1.0-alpha.0`, without an extra increase. Subsequent locale changes need not release core or other locales. Changes to core may require dependent releases.

## Review and merge the release PR

After an ordinary PR merges, **Prepare release PR** applies the native plan and maintains `release/pending` with the standard `GITHUB_TOKEN`. The repository setting **Allow GitHub Actions to create and approve pull requests** must be enabled. Workflow permissions are scoped explicitly; no PAT or additional App is required.

The preparation workflow explicitly dispatches **Check** at `release/pending`. It therefore creates the required `check` result on the new head even when the bot's push does not trigger `pull_request`. A maintainer can retry with `gh workflow run check.yml --ref release/pending`. If GitHub also creates a PR run marked **action_required**, an owner must approve it. Use **Approve and run** in that run, or `gh api --method POST repos/PaterSantyago/puncta/actions/runs/<run-id>/approve`. Wait for its current-head check. This is GitHub’s approval path and does not weaken branch protection. Never merge on a check for an older head. Branch protection requires the current branch to be up to date with main and green.

Review `release/plan.json`, manifests, pnpm lockfile and package changelogs. The plan contains only public workspace packages selected by the shared `@use-puncta/core` / `@use-puncta/with-*` convention. The plan's alpha version suffix and explicit `next` tag are validated separately. CI packs actual manifests, checks their core ranges, and installs those archives through Verdaccio with npm and pnpm to prove dependency and peer compatibility.

## Retrieve verified artifacts

After the release PR merges, **Check** builds, packs, and tests the final merge commit. It then saves `checked-<commit>`. The **Authorize release artifacts** workflow runs only after main Check succeeds. It verifies a merged same-repository bot PR from `release/pending`, the exact merge commit, and successful checks on its actual head. A matching title or commit prefix is insufficient. Ordinary PRs produce no authorized release.

The authorization job downloads the existing checked archives, verifies their SHA-256 digests and plan binding, and uploads `release-<commit>`. It does not rebuild. This artifact contains:

- npm tarballs (the plan identifies those selected for publication);
- `plan.json`: versions, actual packed manifests, changelog hashes, tag and preparation base commit;
- `verification.json`: final checked commit, plan hash and each selected archive hash;
- `authorization.json`: GitHub PR and workflow-run evidence.

Download with `gh run download <authorization-run-id> --name release-<commit>`. Artifacts expire after 30 days, so retain the authorized bundle before expiry. A subsequent publishing task must recheck hashes and use these exact tarballs without rebuilding, with `--tag next --access public`. The Check and authorization workflows do not publish. Once trusted publishing is enabled, the separate publication workflow consumes this authorized bundle; first publication still uses the owner’s 2FA flow.

## Add a public package

Follow the package template in the README, seed the first version at `0.1.0-alpha.0`, and add a native change intent. Preparation places every discovered public package on the native alpha lane automatically. Public discovery, plan generation and archive checking use the shared convention and do not enumerate locales. Add its public API to the consumer matrix to verify actual compatibility before release.

## Local verification

`pnpm test:release` tests authorization refusals and native independent version planning against an isolated registry fixture. `pnpm check` also performs lint, formatting, typechecking, build, archive validation and the installed consumer matrix. `pnpm release:prepare` mutates the checkout; use it on a disposable branch for local review. The real automation and its explicit head checks must also be exercised in GitHub before relying on the workflow.

## Publish or resume the retained release

`scripts/publish.mjs` consumes the authorized bundle without building or packing. It validates authorization, commit, plan digest, archive bytes and actual packed manifests before any registry write. It retains a copy in `<state>/bundle` and atomically records package outcomes and attempt history in `<state>/result.json`. Keep that directory outside the checkout and retain it beyond the Actions artifact expiry.

For the first publication, the owner logs into npm with their normal 2FA flow, then runs:

```sh
node scripts/publish.mjs --bundle /absolute/path/to/authorized-bundle --state /absolute/path/to/release-state --mode bootstrap
```

The command uses the owner's interactive npm authentication; never paste passwords, tokens or OTPs into issue comments. Bootstrap does not promise provenance. The four first versions remain `0.1.0-alpha.0`; do not regenerate archives to resume. Recover with the same command, or use `--bundle /absolute/path/to/release-state/bundle` and the same state directory. A local Git lock prevents two publisher processes in the same repository; only remove `.git/puncta-publish.lock` after confirming that a crashed process is no longer running. Coordinate owner bootstrap with automation; leave `NPM_OIDC_ENABLED` disabled until bootstrap and publishers are ready.

Publication uses `npm publish <archive> --access public --tag next --ignore-scripts`, in dependency order. Before a write, it checks whether the exact version exists. Existing versions must match the authorized archive by SHA-256. Different bytes or a conflicting Git tag stop the release. No version is overwritten or unpublished, and recovery does not move dist-tags.

npm can accept a publication before its version, archive, dist-tags, or installation index is readable. After npm accepts a package, the executor saves `accepted: true` and `status: awaiting-registry` in `result.json`. It also records acceptance when the exact version metadata is already present, before it waits for the archive. A retry with the same bundle and state waits for accepted versions without sending another `npm publish`, even if the version endpoint returns 404 again. The executor uses earlier attempt records when a later attempt stops before it reaches an accepted package.

Each package has one five-minute waiting budget shared by its initial registry lookup and all readiness checks. Time spent in `npm publish` is excluded from this budget. The executor does not interrupt a publication write when the read-wait budget expires. Read attempts use increasing delays of one, two, four, eight, then at most 15 seconds. Individual HTTP requests, including response bodies, have a timeout of at most 30 seconds and cannot exceed the remaining budget. HTTP 404 after acceptance, HTTP 429, server errors, and network failures can be temporary. HTTP 401/403, invalid metadata, and archive digest mismatches stop immediately. An initial version 404 permits publication only when the saved state has no acceptance record for that version.

The executor waits for the expected `next` tag in both the dedicated dist-tags response and the installation index. It also requires the expected version in that index. It never changes an unexpected tag to make a check pass. If readiness does not complete in time, the attempt stops with an incomplete result and keeps its acceptance records. Investigate a persistent tag mismatch before recovery. Resume with the same bundle **and state**; a fresh state cannot identify an accepted version that npm still hides.

Use `--registry-wait-ms <milliseconds>` to change the per-package budget, from 1 to 900000 milliseconds. The default is 300000. The workflow has a separate 30-minute job limit; allow time for all packages and consumer checks when changing the budget. A longer delay is not a reason to repeat `npm publish`. No local or remote Git release tags are created until the registry and consumer checks pass.

After all planned versions match, the full npm/pnpm consumer matrix installs the adapter and selected locales through `@next` from that registry. It checks resolved versions, including transitive core, against manifests in the retained archives. It prints requested and resolved versions for each scenario. This includes packages outside an independent locale plan, whose `next` tags must still resolve to their checked versions. The consumer never publishes or rebuilds these packages. Each package's observed dist-tags are saved in `result.json`, including `latest` if the registry returns it; the executor never promotes `latest`. Only after this verification does the command create immutable local tags named `<package>@<version>` at the checked release commit. Public modes fetch remote tags before publication and reject conflicts. The owner then pushes these exact tags without force, for example:

```sh
git push --atomic origin 'refs/tags/@use-puncta/core@0.1.0-alpha.0' 'refs/tags/@use-puncta/with-react@0.1.0-alpha.0' 'refs/tags/@use-puncta/with-en-gb@0.1.0-alpha.0' 'refs/tags/@use-puncta/with-es-es@0.1.0-alpha.0'
```

A rejected tag push does not undo npm publication. Resolve the conflict without moving a published release tag; retain the state and report the release incomplete until its remote tags are confirmed.

The public pnpm consumer fixtures exclude only the exact package versions from the checked bundle from `minimumReleaseAge`. Without these temporary exceptions, pnpm's default one-day delay can resolve an older version even when the request uses `@next`. Other dependencies retain the default age policy. The fixture settings do not change repository or user configuration, and resolved versions must still match the checked archives.

## Subsequent OIDC releases

`publish.yml` uses GitHub-hosted Ubuntu with Node 24.21.0 and pinned npm 11.19.0, which supports trusted publishing of the exact `.tgz` archives. Configure and verify a separate publisher for every package as described in [Trusted publisher setup](#trusted-publisher-setup). Enable `NPM_OIDC_ENABLED=true` only after all four configurations match. A successful configuration readback or Verdaccio run is not a real OIDC release.

The workflow reacts to successful artifact authorization, refreshes the merged PR and exact successful checks through GitHub, and downloads the existing authorized bundle. Ordinary commits with no authorized release artifact exit without publication. Manual recovery is `gh workflow run publish.yml --ref main -f authorization_run=<successful-authorization-run-id>`; a manual request without an authorized artifact fails. All automated attempts share one non-cancelling concurrency group. The publishing job alone receives `id-token: write`, uses `--provenance`, runs consumers, and pushes only the plan's tags atomically without force. PR checks receive no npm credentials. No permanent npm publishing token is configured.

An always-run upload retains both the input bundle and partial results for 30 days, including a failed consumer or tag push. Resume using the original authorization run while its artifact exists; download and preserve the recovery artifact before expiry. The executor records local completion; the workflow is successful only after the remote tag push. Provenance identifies the publishing workflow execution; the separately checked bundle's verification and authorization records bind the archive hashes to the actual release commit. No rebuilt tarball is substituted.

The npm requirements and automatic provenance behavior are documented in [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/) and [npm provenance](https://docs.npmjs.com/generating-provenance-statements/). `pnpm test:publish` proves successful publication, registry failure and retained-state recovery, matching remote archive skips, conflicting archive refusal, and lock/tamper refusal through Verdaccio and the CLI.

## Trusted publisher setup

The owner completes npm authentication and 2FA in their own terminal/browser. Use Node from `.nvmrc` and npm 11.19.0; `npm trust` requires npm 11.15.0 or newer. Do not redirect or pipe interactive trust commands: npm needs terminal input and output to open its 2FA flow. Never record login challenges, passwords, tokens or one-time codes in release evidence.

All four packages use the following configuration:

| Package settings                                                          | Provider       | Repository             | Workflow filename | Environment | Permission           |
| ------------------------------------------------------------------------- | -------------- | ---------------------- | ----------------- | ----------- | -------------------- |
| [core](https://www.npmjs.com/package/@use-puncta/core/access)             | GitHub Actions | `PaterSantyago/puncta` | `publish.yml`     | empty       | direct `npm publish` |
| [with-react](https://www.npmjs.com/package/@use-puncta/with-react/access) | GitHub Actions | `PaterSantyago/puncta` | `publish.yml`     | empty       | direct `npm publish` |
| [with-en-gb](https://www.npmjs.com/package/@use-puncta/with-en-gb/access) | GitHub Actions | `PaterSantyago/puncta` | `publish.yml`     | empty       | direct `npm publish` |
| [with-es-es](https://www.npmjs.com/package/@use-puncta/with-es-es/access) | GitHub Actions | `PaterSantyago/puncta` | `publish.yml`     | empty       | direct `npm publish` |

For each package, inspect `npm trust list <package> --json --registry=https://registry.npmjs.org` first. If there is no configuration, create it with:

```sh
npm trust github @use-puncta/core --repository PaterSantyago/puncta --file publish.yml --allow-publish --yes --registry=https://registry.npmjs.org
```

Repeat with `@use-puncta/with-react`, `@use-puncta/with-en-gb` and `@use-puncta/with-es-es`. The explicit `--allow-publish` grants direct publication; stage-only permission cannot run this workflow. npm may offer a five-minute 2FA grace window for configuring multiple packages. If a configuration already exists, inspect it and reuse it only if it matches; stop on a mismatch rather than automatically revoking or replacing it.

Read back each package with `npm trust list <package> --json`. Check `type: github`, `repository: PaterSantyago/puncta`, `file: publish.yml`, no environment, and `permissions` containing `createPackage`. Retain only these nonsecret configuration fields and the trust configuration ID with the verification date. Compare against the actual workflow before enabling:

```sh
gh variable set NPM_OIDC_ENABLED --repo PaterSantyago/puncta --body true
gh variable get NPM_OIDC_ENABLED --repo PaterSantyago/puncta
```

The publication job must keep `runs-on: ubuntu-latest`, npm 11.19.0, job-only `id-token: write`, exact authorized archive publication with `--provenance`, and no permanent npm publish token. Its GitHub repository must stay public, the npm packages must be public, and their `repository.url` must identify this repository for public provenance. Review these conditions when changing repository visibility or workflow identity. Adding a GitHub environment requires matching it in every affected npm publisher configuration.

### Bootstrap a future package

A newly discovered workspace package is not automatically trusted by npm. Prepare its first release through the same change intent, independent alpha plan, release PR and checked artifact process. Before merging that first release PR, disable automated publishing with `gh variable set NPM_OIDC_ENABLED --repo PaterSantyago/puncta --body false` and ensure no publication job is running. Coordinate other releases during this window.

The owner publishes the exact authorized bundle with `--mode bootstrap` and 2FA, including any other packages selected in that plan. Verify archive hashes, the npm/pnpm consumer matrix, observed `next` tags and remote package tags as described above. Then create and read back a separate trusted publisher for the new package using its exact name and the same repository, workflow and direct-publish permission. Recheck existing package configurations and only then re-enable the repository variable. Resume partial bootstrap from the retained bundle and state without repacking or replacing an existing version.

### Evidence boundaries

After a release is fully verified and its remote tags exist, remove the completed `release/plan.json` in the next ordinary PR. It is an active plan, not an archive: retaining it would compare future package edits against already published manifests. Keep the original authorized bundle and immutable release commit instead. The [first release plan](https://github.com/PaterSantyago/puncta/blob/01362421c190d80719932e5a878fdc99762bbd70/release/plan.json) remains available at its release commit. The next preparation with real change intents creates a fresh plan.

The initial four `0.1.0-alpha.0` publications were confirmed in [#13](https://github.com/PaterSantyago/puncta/issues/13#issuecomment-5681990798). Checks verified archive hashes, eight npm/pnpm consumer scenarios, and remote package tags. The npm registry exposed both `next` and `latest` for those first versions. The executor never explicitly promoted `latest`.

The four `0.1.0-alpha.1` packages were published through npm OIDC with provenance.
The [completed publication run](https://github.com/PaterSantyago/puncta/actions/runs/35367122861)
verified the authorized archive hashes, public npm/pnpm consumers, and remote package tags.
All four tags identify `932ab23b959c92eef435cca7fb55a08ec12d93bc`.
The [functional release plan](https://github.com/PaterSantyago/puncta/blob/932ab23b959c92eef435cca7fb55a08ec12d93bc/release/plan.json)
stays at that commit; the completed plan was removed from the current checkout.
At the alpha.1 publication, `next` selected `0.1.0-alpha.1`; `latest` stayed on `0.1.0-alpha.0`.
See the [post-publication documentation report](acceptance/documentation-116.md).

Trusted publisher setup is recorded in [the configuration task](https://github.com/PaterSantyago/puncta/issues/14).
The successful functional publication supplies the real OIDC and provenance evidence.
The historical alpha.0 archives were not changed or republished.

References: [npm trust CLI](https://docs.npmjs.com/cli/v11/commands/npm-trust/), [trusted publishing](https://docs.npmjs.com/trusted-publishers/) and [provenance prerequisites](https://docs.npmjs.com/generating-provenance-statements/), checked 2026-09-15.

The four `0.1.0-alpha.2` packages correct the README notices and version-specific links.
The [completed workflow](https://github.com/PaterSantyago/puncta/actions/runs/35596508069)
published through OIDC and checked the authorized archives and public consumers.
All four tags identify `989c8e4bd49b382343d437717500e28ee77a287a`.
The [corrective release plan](https://github.com/PaterSantyago/puncta/blob/989c8e4bd49b382343d437717500e28ee77a287a/release/plan.json)
stays at that commit. The completed active plan is removed from the current checkout.
At verification, `next` selects `0.1.0-alpha.2`; `latest` stays on `0.1.0-alpha.0`.
See the [corrective documentation report](acceptance/documentation-116-alpha2.md).
