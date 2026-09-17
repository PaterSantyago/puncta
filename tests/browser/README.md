# Browser acceptance (#55)

After `pnpm install --frozen-lockfile` and `pnpm build`, run:

```sh
pnpm exec playwright install chromium firefox webkit
pnpm test:browser
```

On Linux, use `playwright install --with-deps chromium firefox webkit` to install
system libraries too. The separate `browser` CI job runs this exact matrix. The
ordinary `pnpm check` gate does not download or launch browsers. The old
`node tests/browser/run-scopes.mjs` command now runs the complete matrix too.

Node 24.21.0, pnpm 12.4.1, React/React DOM 19.3.0, Playwright 1.58.2, esbuild
0.28.2 and browser-compatible assert 2.1.0 are pinned in the repository. Every
engine must launch and pass; missing binaries and failures are errors. Chromium
uses the full pinned Chromium binary in headless mode, not a separately selected
system browser. Firefox and WebKit use Playwright's pinned builds.

`artifacts/browser/acceptance.json` records the commit, operating system, actual
`browser.version()`, executable path, Playwright build metadata, user agent,
frozen corpus manifests, every passing shared test name and mounted/hydration
results. CI retains it as `browser-<commit>`. Build revisions may have platform
specific overrides; the executable path identifies the selected installation.

## Verified local builds

The #55 local run on Darwin 27.0.0 arm64 passed all 145 shared tests, 14 mounted
updates, eight protection/reorder scenarios and all three hydration renderers in
each engine:

| Engine   | Actual version | Playwright build |
| -------- | -------------- | ---------------- |
| Chromium | 145.0.7632.6   | 1208             |
| Firefox  | 146.0.1        | 1509             |
| WebKit   | 26.0           | 2248             |

The generated report records the corresponding executable paths and commit;
CI produces its own Linux build records rather than copying this local result.

## Requirement → check

| Requirement                                         | Evidence in every engine                                                                                                                                                                                                                                                                                                           |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared text and Unicode rules, exact NBSP/SHY       | `shared.mjs` imports the same 13 functional suites and 145 tests used by Node: ellipsis, spaces, quotes, dashes, number bonds, inline context, protection, scopes, HTML parsing, SHY removal, both hyphenation locales and combined processing. Literal expectations are not regenerated from browser output.                      |
| Independent linguistic corpus                       | All 313 English and 361 Spanish frozen words, required/allowed positions and 51 negative cases; the runner verifies both locale freeze manifests against the fixture bytes before bundling. No corpus data is changed for this matrix.                                                                                             |
| Unicode and coordinates                             | Shared suites retain NFC/NFD, combining marks across inline leaves, non-BMP text, entities, CRLF, original UTF-16 source ranges, final edit replay, left-leaf insertions, empty elements and exact/covering/unavailable provenance assertions. Coordinates refer to each input's own source, not another representation's offsets. |
| Idempotence and protection properties               | The existing seeded combined-processing generator and exhaustive inline partitions run unchanged, alongside literal independent oracles, warning priorities and source preservation checks.                                                                                                                                        |
| Node SSR → browser hydration                        | `hydration-server.mjs` renders with Node `renderToString`, `renderToPipeableStream` and `renderToReadableStream`; the client uses the same versions, original children and options. Both streams reach the browser with a pending Suspense boundary before its gate is released.                                                   |
| Streaming and Suspense                              | The runner observes exact shell/fallback/protected text and a hydrated shell before releasing the server promise. It then observes resolved content, releases the client promise, waits for the content effect and verifies exact NBSP/SHY and the original server DOM nodes.                                                      |
| Updates and ownership                               | `scopes.mjs`: 14 source/locale/options/marker updates, including adding/removing SHY from original children and locale-specific quotes, keep the clicked counter and DOM node. Shared suites also cover nested ownership, explicit inheritance/reset and pure React results.                                                       |
| Key/ref/state and inherited protection              | `protection.mjs`: eight mounted scenarios under Puncta/Provider, three keyed reorders each, deep component state/ref identity, preserved attributes, independent neighbours and protection that nested enabled scopes cannot override.                                                                                             |
| No additional wrappers or hidden hydration failures | Mounted element counts, direct server paragraph children, unchanged shell/content node identity, no recoverable errors, console warnings/errors or page errors. No hydration-warning suppression is used.                                                                                                                          |

The browser adapters replace only Node test registration, fixture reads and
assert imports. Unknown Node APIs and unsupported test registration fail. Shared
server-render assertions use React's browser server entry point; the dedicated
HTTP fixture uses the real Node server entry point. Its document-owned synchronous
client script follows the root: this starts hydration before the pending stream
finishes, including WebKit, which can defer an async bootstrap script during
parsing. Numeric polling observes the shell effect without relying on animation
frames during a pending document. A 4 KiB metadata value in the document head
makes the initial response larger to exercise pending-document delivery on Linux
WebKit. It is outside the Puncta root and does not change its text or structure;
this fixture does not establish a universal buffering threshold. No browser script injection
is required. Bundling disables root
TypeScript path aliases so package imports resolve to built artifacts throughout.
The corpus freeze/resource preparation validators and Node-only stream isolation
tests remain in `pnpm check`; filesystem hashes, subprocess resource generation
and absence of browser globals are not browser scenarios.

This matrix verifies exact text and lifecycle behavior, not identical visual line
breaks across fonts, widths or engines. Arbitrary deep protection toggles retain
the documented Context-bridge reconciliation limit in the React README; fixed
protection during keyed reorders and direct-child protection toggles are tested.
RSC is a separate acceptance slice.

## Grouping runtime (#91)

The shared public numeric-leaf tests run in every engine. The HTTP hydration
fixture includes U+202F in shell/fallback/content and exact large-bigint text;
server/client text and original shell child-node identities must match for all
three renderers. `grouping.mjs` adds ten mounted updates after hydration: enable,
disable, normalization, threshold, locale, number/bigint/exponential children and
keyed reorder. It checks the clicked counter, DOM text node, key/ref ownership,
element count and recoverable errors. Literal expectations distinguish automatic
separators from explicit source spaces and U+202F. Existing protection and deep
reconciliation limitations remain unchanged. Execution evidence is in
[the grouping matrix](../../docs/acceptance/digit-grouping.md#react-runtime-slice-91).
