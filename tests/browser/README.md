# Mounted scope and protection checks (#41–#43)

This optional check exercises the public React components in StrictMode: source and
option updates, language/marker changes, preservation of direct child state and DOM
identity, and hydration. Space-rule disable/reset, Spanish punctuation and source updates
are included in the ten mounted updates; hydration also exercises punctuation and
spaces. Eight protection scenarios also reorder keyed stateful
components behind multiple hosts under Puncta and Provider, checking inherited
protection, refs, props, an independent neighbour, and the absence of DOM wrappers.
It is narrower than the full browser/server matrix planned for #55.

From the repository root, after `pnpm build`, prepare an isolated tool runtime:

```sh
npm install --prefix /tmp/puncta-scope-browser --no-audit --no-fund \
  playwright@1.58.2 esbuild@0.28.2
node /tmp/puncta-scope-browser/node_modules/playwright/cli.js install chromium
PUNCTA_BROWSER_RUNTIME=/tmp/puncta-scope-browser node tests/browser/run-scopes.mjs
```

`PUNCTA_CHROMIUM` optionally selects an existing Chromium executable. React and React
DOM come from the locked repository dependencies (19.3.0), not the temporary runtime.
The script fails on an assertion, console warning/error, page error or recoverable
hydration error. It prints the browser version and successful check counts.

The reorder scenarios keep protection fixed during each mounted run. The existing
scope scenario checks marker toggles with a direct child. These checks do not claim
state preservation for arbitrary deep protection toggles; see the React README for
the known Context-bridge reconciliation limit.

Verified for this slice on Node 24.21.0 and Chromium 151.0.7922.34. No Firefox/WebKit,
streaming or RSC claim is implied by this check.
