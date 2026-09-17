# @use-puncta/with-react

ESM React 19.3 adapter for typography, optional en-gb/es-es hyphenation and
separate SHY removal. Core is a regular dependency;
React is a peer dependency, and React DOM is supplied by the application.

```tsx
import { createPuncta } from "@use-puncta/core";
import { enGb } from "@use-puncta/with-en-gb";
import { Puncta, PunctaProvider } from "@use-puncta/with-react";
import { transformReact } from "@use-puncta/with-react/pure";

const instance = createPuncta({ locales: [enGb], locale: enGb.id });
const example = (
  <PunctaProvider instance={instance}>
    <Puncta>Wait...</Puncta>
    <Puncta options={{ rules: { ellipsis: { enabled: false } } }}>
      Wait...
    </Puncta>
  </PunctaProvider>
);
const report = transformReact("Wait...", { instance, detailed: true });
```

`Puncta` renders `Wait…` without a DOM wrapper. Its root entry preserves
`"use client"`. The `/pure` entry has no client directive, hooks or Context;
`transformReact` returns a ReactNode by default or `ReactResult` with
`detailed: true`. Reports use numeric array indices and `"children"` transitions
and `"fallback"` transitions for source paths; they have no `outputChanged` field.

`stripSoftHyphensReact(children, { instance, ...options })` from `/pure` removes
all accessible U+00AD without running typography. It has the same options and
ordinary/detailed result forms as `transformReact`; `format`, `mode`, `context`
and `protect` are rejected. Protection, unavailable language, disabled scopes,
attributes and opaque content retain SHY. Removal needs no insertion resource;
its options and language minima are still validated.

Text, arrays, Fragments and ordinary host children share inline recognition.
Cross-leaf replacements belong to the first affected leaf; empty elements survive.
Numbers and bigint contribute their text while retaining their type when unchanged.
Null, undefined and booleans create no boundary. Original children, keys, refs and
other props are retained; attributes and `dangerouslySetInnerHTML` are not transformed.
User components, portals, promises and arbitrary iterables remain opaque without
being called, awaited or iterated. Suspense content, fallback and surrounding text
have independent recognition contexts. Reports address the original input tree.

`PunctaProvider` configures children without transforming its immediate text.
`Puncta` and Provider receive original children from outer scopes. Both support
`instance?`, `locale?`, `enabled?` and `options?` (rules/hyphenation only). A root
instance is required at runtime; providing another instance under Context is an
error. Component arguments are validated even when processing is disabled.
An independent pure call always needs its own explicit instance, ignores Context,
and returns no hidden Provider. Components within that result use their normal
render-time Context.

Accessible host elements support the same declarative markers and lang rules as
HTML. Full disabling remains inherited protection, whereas individual rules can be
reset or re-enabled. Context bridges add no DOM elements. Keyed state and refs survive reordering,
including behind several hosts within a protected subtree. Configuration and new children recompute from source.

Protection crosses opaque user components through Context: a nested Puncta or
Provider cannot override an inherited ban with `enabled={true}`. Protected children
are not traversed. The core protected-element catalog also applies to host elements;
React `hidden={false}` does not protect, and `contentEditable={false}` cannot undo
inherited protection. External DOM ancestors are never inspected. Pure transforms
preserve protection structurally but do not install Context for future components.

Known reconciliation limit: switching protection on an ancestor of several accessible
hosts can remount deeper stateful children. The eager traversal stops at the newly
protected host, removing Context bridges previously inserted below it. Direct-child
marker changes and reordering with unchanged protection are tested; arbitrary deep
protection toggles do not have a state-preservation guarantee. The implementation
does not inspect protected descendants to retain those bridges.

Node 24.21.0 and React/React DOM 19.3.0 checks cover `renderToString`,
`renderToPipeableStream` and `renderToReadableStream` through the compatible
`react-dom/server.node` entry. Controlled Suspense delays verify transformed bytes
before content resolves, independent contexts, concurrent requests and abort/retry
with original source ownership. See `docs/acceptance/ssr-streaming.md` in the repository
for commands and React document-preamble buffering limits. The full Chromium,
Firefox and WebKit suite (`pnpm test:browser`) covers the shared corpus, mounted
updates/reorders and hydration for all three SSR modes. See
`tests/browser/README.md` for the pinned browser builds and scope.

In React Server Components, call `instance.text(source, options)` explicitly
with server-owned locale modules and configuration. Import `Puncta` and
`PunctaProvider` from the client entry in a client module, where you import its
locales and create its own instance. Only serializable data and ordinary Flight
children slots cross the boundary; never pass instances, locale modules or
callbacks from the server. The client Provider supplies no server Context.
The `/pure` entry does not turn arbitrary RSC trees into accessible JSX.

The private `examples/rsc` consumer verifies this boundary using pinned Next.js
16.3.5, application React/React DOM 19.3.0 and Node 24.21.0. Next App Router
uses its bundled React; this fixture observes `19.3.0-canary-cbb046ab-20260731`
on both server and client and records it separately. Its production build imports the
public ESM exports without source aliases; actual Flight client references,
HTML before JavaScript, hydration and interactive updates are checked in all
three browsers (`pnpm build && pnpm test:rsc`). See
[the integration instructions](../../examples/rsc/README.md). This is a tested
consumer, not a guarantee for all framework versions or edge runtimes; no server
JSX component or server Provider is supplied.

MIT licensed. Public publication is separate work.

## Opt-in standalone digit grouping

The shared nullable `rules.digitGrouping` option is available through component
`options`, Provider/instance settings and `transformReact`. Both locales default to
`{ enabled: false, minDigits: 5, normalizeExisting: true }`.

```tsx
<Puncta
  instance={instance}
  options={{ rules: { digitGrouping: { enabled: true } } }}
>
  {"12"}
  <em>345</em>
</Puncta>;
// Server text: "12\u202f<em>345</em>"
transformReact("12345", {
  instance,
  rules: { digitGrouping: { enabled: true } },
});
// "12\u202f345"
```

The first slice supports standalone ungrouped integers and locale decimals through
transparent leaves, including arrays and Fragment. Insertions at a leaf boundary
belong to the left leaf. Protection and opaque components still stop recognition;
the original children are not mutated. Existing groups, ranges and number-bond
constructions are deferred and excluded from grouping. This slice establishes
component `renderToString` coverage; new grouping streaming/hydration fixtures
belong to later acceptance slices. See [core settings and current limits](../core/README.md#opt-in-digit-grouping-first-implementation-slice).
