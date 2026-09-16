# @use-puncta/with-react

ESM React 19.3 adapter for quotes, apostrophes, spaces, punctuation intervals and ellipses. Core is a regular dependency;
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

Real SSR checks and an optional mounted Chromium/hydration check cover this slice
(see `tests/browser/run-scopes.mjs` in the repository). Three-browser/server-streaming
acceptance and RSC integration remain subsequent work. Quotes, apostrophes, spaces and ellipsis are implemented; accepting other shared settings does not claim
their transformations are complete. See the core README for remaining scope.

MIT licensed. Public publication is separate work.
