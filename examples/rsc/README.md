# Puncta in React Server Components

This private integration consumer uses Next.js **16.3.5** App Router (production
webpack build), application React/React DOM **19.3.0**, Node **24.21.0** and pnpm
**12.4.1**. The lockfile pins the full graph. Next is only a dependency of this
private example; none of the four published packages depend on it.

Next App Router uses its own bundled React builds, as described in the
[Next documentation](https://nextjs.org/docs). The example displays the actual
server and client React versions and the test records them separately from the
application dependency versions. This build reports
`19.3.0-canary-cbb046ab-20260731` on both server and client. This consumer demonstrates one compatible
framework configuration, not a new general Next.js or edge runtime guarantee.

## Run

From the repository root:

```sh
nvm use
pnpm install --frozen-lockfile
pnpm build
pnpm --filter puncta-example-rsc start --port 3000
```

Open <http://127.0.0.1:3000>. `pnpm build` builds the public ESM packages before
this example; Next also typechecks the example against their declarations.
There are no source aliases, `transpilePackages` overrides or custom React
resolution aliases. To repeat only the example build/typecheck after the package
artifacts exist:

```sh
pnpm --filter puncta-example-rsc typecheck
pnpm --filter puncta-example-rsc build
```

## Integration

[app/page.tsx](app/page.tsx) is a real Server Component. `ServerText` imports
its own locale modules and calls `instance.text()` synchronously with Spanish
hyphenation enabled. No initialization, fetch, effect or DOM processing is needed.
It emits `«ca\u00admi\u00adno»…` before the client attaches.

[app/client-panel.tsx](app/client-panel.tsx) starts with `"use client"`. It imports
both locales independently, creates its own immutable instance and configures
`PunctaProvider`. `Puncta` transforms accessible children during rendering; the
controls change source text, locale and hyphenation through React state.

The server passes a string and normal Flight-serializable children slots to the
client panel. Instances and locale modules contain behavior and must remain on
their own side of the boundary; no such values or callbacks cross it. In a larger
application, plain serializable settings can also be passed to the client and
used there to create/configure its instance.

The page also imports `Puncta` directly from the public package entry and renders
it in a children slot. The framework must treat that export as a client reference
because the package preserves `"use client"`; its render receives the client
Provider's Context. This exercises the package's boundary as well as the
application's client directive.

`ServerText`, although displayed under the client Provider's children slot, has
already run on the server with its explicit Spanish instance. Client configuration
changes cannot affect it. The raw server sibling stays `"camino"...` throughout:
a Provider configures Puncta components, and does not transform arbitrary children
or act as server Context. No server JSX adapter or arbitrary RSC traversal is
provided. The `/pure` export is not a server Provider substitute.

## Verify

After `pnpm build`:

```sh
pnpm exec playwright install chromium firefox webkit
pnpm test:rsc
```

On Linux CI use `playwright install --with-deps` to install system dependencies.
The test starts and stops a loopback production Next server on an available port;
it does not use a development server or replace RSC with ordinary React SSR.
It checks:

- A real `text/x-component` Flight response includes the `Puncta` client reference,
  the raw source prop and the server-normalized string with SHY.
- HTML with JavaScript disabled already contains all expected transformed text.
- Chromium, Firefox and WebKit attach the client without console/runtime warnings,
  then update source, locale and hyphenation and return to the original output.
- The direct package client reference receives updated Provider configuration,
  while server text and the raw server sibling stay unchanged.

Literal text oracles use the agreed quote/ellipsis profiles, `back|bone` from the
independently reviewed en-gb corpus and Spanish syllables `ca|mi|no`; they are not
computed with the implementation under test. Escapes above denote actual U+00AD
characters, not a guarantee of a visible line break.

`artifacts/rsc/` records Flight, HTML before JavaScript for each engine, the server
log and a JSON report with commit, Node/framework/application React versions,
actual framework React versions, Playwright browser revisions and executable
paths. The existing CI browser job builds this example and runs the check on
Linux alongside `pnpm test:browser`. The example remains outside release archives;
archive installation/exports checks are independently covered by `pnpm check`.
