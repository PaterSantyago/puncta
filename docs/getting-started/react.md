# Use Puncta with React

[Documentation index](../README.md)

Install core, the React adapter, and a locale from the same functional package set.
Use the [npm or pnpm installation procedure](installation.md).
This guide describes the unreleased functional version, not the public scaffold.
Your application supplies React and React DOM.

## Prepare an instance and process children

This full TSX program uses React DOM to print the rendered HTML.
Use `Example` as a component in your application.
`PunctaProvider` supplies settings. `Puncta` processes accessible children without a DOM wrapper.

<!-- puncta:example react-start -->

```tsx
import { createPuncta } from "@use-puncta/core";
import { enGb } from "@use-puncta/with-en-gb";
import { Puncta, PunctaProvider } from "@use-puncta/with-react";
import { renderToStaticMarkup } from "react-dom/server";

const instance = createPuncta({ locales: [enGb], locale: enGb.id });
export function Example() {
  return (
    <PunctaProvider instance={instance}>
      <p>Wait...</p>
      <Puncta>
        <p>Wait...</p>
      </Puncta>
    </PunctaProvider>
  );
}
console.log(renderToStaticMarkup(<Example />));
```

<!-- puncta:output react-start -->

```text
<p>Wait...</p><p>Wait…</p>
```

The first paragraph stays unchanged. A Provider does not transform its direct text children or host text.
An outer `Puncta` does not inspect the output of a custom component.
Put `Puncta` in that component, as shown in the [custom component example](../guides/react.md#process-a-custom-component).

## Use an instance without a Provider

A root `Puncta` can receive `instance` directly.
Every root `Puncta` or Provider must receive an instance when no Puncta Context exists.
Do not supply `instance` to a nested `Puncta` or Provider in that Context.

<!-- puncta:example react-direct -->

```tsx
import { createPuncta } from "@use-puncta/core";
import { enGb } from "@use-puncta/with-en-gb";
import { Puncta } from "@use-puncta/with-react";
import { renderToStaticMarkup } from "react-dom/server";

const instance = createPuncta({ locales: [enGb], locale: enGb.id });
console.log(renderToStaticMarkup(<Puncta instance={instance}>Wait...</Puncta>));
```

<!-- puncta:output react-direct -->

```text
Wait…
```

## Next steps

- [Process custom components, nested scopes, or pure input trees](../guides/react.md).
- [Look up props, options, and results](../reference/react.md).
- [Change settings and locales](../guides/configuration.md).

- [Use SSR, hydration, streaming, and RSC](../guides/server-rendering.md).
