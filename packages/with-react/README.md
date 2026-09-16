# @use-puncta/with-react

ESM React 19.3 adapter for the first ellipsis slice. Core is a regular dependency;
React is a peer dependency, and React DOM is supplied by the application.

```tsx
import { createPuncta } from "@use-puncta/core";
import { enGb } from "@use-puncta/with-en-gb";
import { Puncta } from "@use-puncta/with-react";
import { transformReact } from "@use-puncta/with-react/pure";

const instance = createPuncta({ locales: [enGb], locale: enGb.id });
const example = <Puncta instance={instance}>Wait...</Puncta>;
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

An explicit instance is currently required for every component/pure call.
Provider/Context, full protection propagation and declarative language areas are
subsequent work. Real `renderToString` checks cover this slice; streaming, hydration
and RSC integration are not claimed. See the core README for the remaining scope.

MIT licensed. Public publication is separate work.
