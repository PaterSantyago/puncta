# Puncta

Puncta is an MIT-licensed ESM library scaffold. It currently contains two technical
packages: `@use-puncta/core` and `@use-puncta/with-react`. There is no domain
functionality yet. Locales and public npm releases are subsequent work.

## Development

Install [nvm](https://github.com/nvm-sh/nvm), then:

```sh
nvm install
nvm use
npm install --global pnpm@12.4.1
pnpm install --frozen-lockfile
pnpm check
```

Node **24.21.0 LTS** is pinned for development and CI. Build tools require a recent
Node patch (tsdown requires at least 24.11 on Node 24); that is separate from the
consumer runtime contract, currently verified on Node 24 LTS. Public package
manifests do not impose development-only engine constraints on applications.

Stable versions rechecked against the npm registry on 2026-09-15: pnpm 12.4.1,
React and React types 19.3.0, TypeScript 7.0.2, tsdown 0.23.0, Biome 2.5.13,
Prettier 3.9.6, Verdaccio 6.10.3. The lockfile fixes their dependency graph;
strict peer checks stay enabled. The real build verifies tool compatibility.
tsdown currently warns that the TypeScript 7 compiler API is experimental;
independent typechecking and actual declaration generation both pass without
suppressing peer conflicts or compiler checks.

## Checks

| Command             | Purpose                                                    |
| ------------------- | ---------------------------------------------------------- |
| `pnpm lint`         | Biome lint for program files and JSON                      |
| `pnpm format:check` | Read-only Biome formatting plus Prettier for Markdown/YAML |
| `pnpm format`       | Apply both formatters in their separate scopes             |
| `pnpm typecheck`    | Independent TypeScript source check                        |
| `pnpm build`        | Clean ESM and declarations build in dependency order       |
| `pnpm pack:check`   | Produce and inspect final pnpm archives in `artifacts/`    |
| `pnpm test:install` | Install existing archives in isolated consumers            |
| `pnpm check`        | Run all checks, build, pack, and installation verification |

Archive verification checks package manifests, root exports, declarations,
documents, external imports and converted workspace dependencies. Private
workspace modules are excluded. The installation check runs a temporary Verdaccio
bound to localhost, with a dedicated store and disposable local credentials.
`@use-puncta/*` never proxies to npm; other dependencies may be downloaded from npm.
No real npm publishing credentials, paid registry or permanent server is needed.
The process has startup and command timeouts and removes temporary resources on
success, failure, SIGINT and SIGTERM.

Both npm and pnpm consumers live outside the workspace, have fresh lockfiles and
isolated caches/stores, and install the adapter by name and exact version. The
application supplies React. The check publishes the adapter first and proves
installation fails without core, then publishes core and proves successful public
ESM import, transitive core, shared React, no locales and private internal paths.
Missing input archives also fail before starting the registry.

## GitHub Flow

The initial bootstrap is committed to `main`. After bootstrap, create a short
branch, commit a focused change, push it, and open a pull request:

```sh
git switch -c feature/describe-change
pnpm check
git add <changed-files>
git commit -m "feat: describe change"
git push -u origin HEAD
gh pr create
```

Pull requests and pushes to `main` run the same immutable installation and
`pnpm check`. The protected `main` branch requires the `check` status on an
up-to-date branch before merging. No mandatory Git hooks or extra orchestration
service is required. GitHub Issues hold specifications and implementation tasks.

## Packages

- [Core](packages/core/README.md): shared technical locale shape and identifier.
- [React adapter](packages/with-react/README.md): component displaying a locale id;
  regular core dependency and React `^19.3.0` peer, without mandatory React DOM.

These packages are verified through local registry archives. This does not claim
that the first public npm release has happened.
