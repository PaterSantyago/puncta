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
for source paths; they have no `outputChanged` field.

This slice covers text, arrays, Fragments and ordinary host children. Original
children, keys, refs and other props are retained; attributes and
`dangerouslySetInnerHTML` are not transformed. User components are not called.
An explicit instance is currently required for every component/pure call.

Provider/Context, Suspense, complex inline boundaries, cross-leaf processing,
full protection propagation and declarative language areas are subsequent work.
Only simple `renderToString` behavior is verified here; streaming, hydration and
RSC integration are not claimed. See the core README for the remaining scope.

MIT licensed. Public publication is separate work.
