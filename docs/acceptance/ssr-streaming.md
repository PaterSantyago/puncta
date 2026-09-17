# SSR and streaming acceptance

Issue [#54](https://github.com/PaterSantyago/puncta/issues/54) is checked at the
public React component and pure-function interfaces by
`tests/ssr-streaming.test.mjs`. The test uses the built workspace packages and the
application's installed React DOM. It does not create a browser, window or document.

## Environment and reproduction

Tested on macOS arm64 with Node **24.21.0**, pnpm **12.4.1** and React/React DOM
**19.3.0**, using the lockfile. `react-dom/server.node` exports all three APIs on
this exact version: `renderToString`, `renderToPipeableStream` and
`renderToReadableStream`. The fixture imports the application's installed
`server.node.js` entry directly, as other workspace SSR tests do; React DOM is not
a dependency of the Puncta adapter.

```sh
pnpm install --frozen-lockfile
pnpm build
node --test tests/ssr-streaming.test.mjs
NODE_ENV=production node --test tests/ssr-streaming.test.mjs
pnpm typecheck
```

`pnpm check` includes these tests in its functional suite along with lint,
formatting, typechecking, builds, archive validation and installed consumer gates.
No added dependency, production hook or test-only library export is needed.

## Evidence

| Requirement                     | Observable check                                                                                                                                                                                                                                                                                                                           |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Synchronous SSR                 | Exact English quote/NBSP/SHY output from `renderToString`; repeat from the same original children and recompute with changed settings. Spanish SHY and transparent-leaf placement pass all three renderers.                                                                                                                                |
| Delivery before resolution      | Each streaming API delivers the transformed shell, fallback and following sibling while a controlled content promise is still pending and `allReady` is false. Only then does the test resolve the promise and consume completion.                                                                                                         |
| Independent Suspense contexts   | Unmatched outer quotes remain literal on opposite sides of Suspense; content and fallback get independent complete quotation pairs. `back`/`bone` across the boundary do not form a hyphenated word; `backbone` inside content does. Available content can be delivered as a partial React segment before the delayed component completes. |
| Parallel request isolation      | Four simultaneously pending requests mix both streaming APIs, en-gb/es-es and hyphenation/rule overrides. Reverse-order resumption produces each literal expected output twice, with no settings or source leakage.                                                                                                                        |
| Cancellation and retry          | Both streaming APIs abort after fallback delivery. Reusing the same source tree after resolution yields the expected fresh output. Changed settings recompute from the original ASCII quotation/ellipsis text without retained automatic SHY.                                                                                              |
| Nested ownership and protection | Immediate Provider text remains raw, its nested Puncta uses Spanish, independent siblings transform, and code/off subtrees propagate protection through an opaque Card and enabled nested Provider/Puncta, including after retry.                                                                                                          |
| Local reports                   | Explicit detailed calls retain original source text and local source IDs across interleaved requests. Returned reports do not change when other calls run; mutating one report does not mutate another or a later call. Disabled quote rules do not acquire another request's warnings.                                                    |
| Render purity                   | Repeated component renders do not publish typography warnings through console methods. Explicit detailed calls still return warnings. Pure traversal does not invoke opaque components, await thenables or enumerate arbitrary iterables.                                                                                                  |

Expected language results are literals from the agreed profiles and independent
English `backbone` / Spanish `adhesivo` corpus analyses; the test does not derive
its expected output from another Puncta transform. Stream assertions address
application text and ordering, not React's generated boundary IDs or recovery
script implementation. A test failure aborts its open streams; delivery waits
have a bounded timeout, with no timing sleep used to trigger promise resolution.

The existing implementation needed no production change for this slice. Inspection
of the React adapter confirms that it transforms synchronously in the render path,
without effects, DOM access, runtime locale loading or diagnostic publication.
Mutable recognition contexts and report arrays are created per transformation;
instances and locale resources remain explicitly supplied. Test-local delays,
Writable collection and report observations belong to the fixture, not Puncta.

## React transport behavior and limits

Streaming fixtures supply an explicit `html` / `head` / `body` envelope. On React
19.3.0, rendering root sibling fragments with a pending Suspense boundary can
invoke `onShellReady` yet retain all bytes while React waits for possible document
preamble content. Its installed `preparePreamble` implementation releases this
wait when head and body are present. A bare fragment timeout was reproduced in
both stream APIs during fixture development; the envelope allows actual early
byte delivery to be tested. Puncta does not control React's transport buffering.

`renderToString` cannot wait for suspended content; the test checks its transformed
fallback and a fresh successful render after resolution. React's streaming
recovery scripts may contain browser APIs as serialized script text. They are not
executed by the Node fixture or used by Puncta to finish typography. Delivered
application text already has its final typography; later React chunks complete
Suspense boundaries without a Puncta text-repair phase.

This is evidence for the exact Node/React versions above. It does not complete the
three-browser hydration matrix (#55) or RSC integration (#56), promise guarantees
for arbitrary opaque component internals, or expand the documented state-remount
limitation for deep protection toggles in the React README. No public npm release
is part of this check.

## Grouping interaction regression (#89)

The new `tests/digit-grouping-bonds.test.mjs` suite checks number bonds and ranges
through component `renderToString`, including every transparent split and seeded
multi-leaf inputs. This adds synchronous component evidence only. The existing
streaming fixtures were a regression gate at #89; grouping-specific streaming and
hydration acceptance belongs to #91. Current commands and results are recorded in
[digit grouping, slice #89](digit-grouping.md#number-bonds-and-ranges-slice-89).

## Grouping runtime (#91)

`tests/ssr-streaming.test.mjs` adds grouping-specific assertions to the existing
controlled delivery harness. Both stream APIs deliver numeric shell leaves and a
normalized comma group, plus an independent grouped fallback while content is
still suspended. Digits on opposite sides of Suspense remain separate. Aborting
at that point and retrying the same source tree after resolution produces exact
grouped content. Turning the rule off recomputes raw numbers and source commas.

Five simultaneous requests mix both APIs, en-gb/es-es, thresholds, normalization
and a disabled rule. Reverse-order resolution checks exact output, stable issued
bytes, original source reports, locale-specific warnings and caller-mutation
isolation. No DOM, warning publication or production hook is introduced.

The browser HTTP fixture includes grouping in shell, fallback and content (with
an exact large bigint); all three renderers hydrate in all three engines. Existing
NBSP/SHY checks remain. The shell's original text/element child nodes are retained
as well as shell/content element identity. Runtime update checks cover source,
locale, threshold, normalization, disabling/re-enabling and keyed state/ref identity.
See [the execution matrix](digit-grouping.md#react-runtime-slice-91).

## Final mixed grouping acceptance (#93)

Both stream renderers now deliver the complete English mixed oracle in shell and
the Spanish oracle in fallback before controlled Suspense resolution, then in
content. `renderToString` checks the same independent expectations. The browser
HTTP fixture combines range/unit grouping with quotes, hyphenation, normalization,
locale boundaries and protection; mounted updates also cover range/decimal/bond
inputs with grouping toggled and locale changed. Existing cancellation, concurrent
request isolation, DOM identity and RSC checks remain required. Current results
are recorded in [final execution](digit-grouping.md#final-execution-93).
