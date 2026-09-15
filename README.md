# Puncta

Puncta is an MIT-licensed ESM library scaffold. It contains four technical packages:
`@use-puncta/core`, `@use-puncta/with-react`, `@use-puncta/with-en-gb` and
`@use-puncta/with-es-es`. There is no domain functionality yet. Public npm
releases are subsequent work.

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
| `pnpm typecheck`    | Package sources and separate private example typecheck     |
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
isolated caches/stores, and install packages by name and exact version. The
application supplies React and React DOM, never core. The check publishes the
adapter first and proves installation fails without core, then publishes the
remaining archives and runs this matrix independently with each package manager:

| Direct Puncta dependencies | Verification                                   |
| -------------------------- | ---------------------------------------------- |
| with-react                 | Transitive core; no locales                    |
| with-react + with-en-gb    | en-gb types and SSR; no es-es                  |
| with-react + with-es-es    | es-es types and SSR; no en-gb                  |
| with-react + both locales  | Both locales' types and SSR in one application |

Every row checks public ESM imports, the installed dependency graph and shared
React/core resolution. Locale rows compile a separate TypeScript application
against installed declarations without source aliases, then render with
`react-dom/server` on Node 24 without browser globals. Missing input archives fail
before starting the registry.

## Private SSR example

[examples/ssr](examples/ssr/src/index.ts) explicitly passes both locales to the
technical component. After installing dependencies:

```sh
pnpm typecheck
pnpm build
pnpm --filter puncta-example-ssr start
```

Output: `<span>en-gb</span><span>es-es</span>`. The example has its own typecheck
and uses source aliases for development. The isolated consumers above verify the
published declarations independently. The example and root are private and are
excluded from the public package set.

## Adding a locale

1. Copy `packages/with-en-gb` without its `dist` or `node_modules`. Name the new
   package `@use-puncta/with-<name>` and choose its independent version. Keep the
   MIT license, README, ESM root export, declaration output and build script.
2. Export a value conforming to `Locale` from core with the new identifier. Keep
   core as `workspace:^` in both peerDependencies and devDependencies: the peer
   belongs to consumers; the devDependency lets pnpm resolve and pack the
   workspace peer. Add no React dependency and no registration in core.
3. Run `pnpm install` to update the lockfile. `packages/*` is a workspace glob,
   so recursive builds discover the new package. `scripts/workspace.mjs` uses
   `pnpm list -r` to discover public modules, excludes every private module and
   enforces `@use-puncta/core` or `@use-puncta/with-<name>` names. Packing and the
   test registry use that shared set; release tooling must use it too.
4. Add the locale's identifier/export name to `scripts/consumer.mjs`, add its
   individual and combined scenarios in `scripts/install.mjs`, and include it
   in the locale manifest/declaration assertions in `scripts/pack.mjs`. These
   checks must verify chosen locales and absence of unselected locales with
   both npm and pnpm. Extend the private example when useful.
5. Run `pnpm check`. Public npm publication is a separate release step; a new
   package needs its initial publication and trusted publisher configuration.

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

- [en-gb locale](packages/with-en-gb/README.md): named `enGb` export.
- [es-es locale](packages/with-es-es/README.md): named `esEs` export.

These packages are verified through local registry archives. This does not claim
that the first public npm release has happened.

## Release workflow

See [independent alpha releases](docs/releases.md) for native pnpm change intents, the automated release PR, required head checks and verified artifact retrieval. npm publication is a separate task.
