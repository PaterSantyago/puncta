# Server rendering

[Documentation index](../README.md)

Use this guide after the [React quick start](../getting-started/react.md).
Install matching functional core, adapter, and selected locale packages.
Your application must supply React and React DOM for SSR.
See [installation](../getting-started/installation.md) and [checked environments](../compatibility.md#server-environments).
The functional API is unreleased.

## Synchronous server calls

Core text and HTML calls return their results synchronously.
They need explicit locale modules and settings, but no DOM or initialization step.
This complete TSX program uses public imports.
It prints a core result and the HTML from `renderToString`.

<!-- puncta:example server-sync -->

```tsx
import { createPuncta } from "@use-puncta/core";
import { enGb } from "@use-puncta/with-en-gb";
import { Puncta, PunctaProvider } from "@use-puncta/with-react";
import { renderToString } from "react-dom/server";

const instance = createPuncta({ locales: [enGb], locale: enGb.id });
console.log(instance.text("Wait..."));
console.log(
  renderToString(
    <PunctaProvider instance={instance}>
      <Puncta>
        <p>Wait...</p>
      </Puncta>
    </PunctaProvider>,
  ),
);
```

<!-- puncta:output server-sync -->

```text
Wait…
<p>Wait…</p>
```

For HTML strings, use the [HTML guide](html.md) and [core reference](../reference/core.md).
For React elements, the adapter processes children that it can access during the render.
It does not need an effect or a later DOM repair step.
A Provider supplies settings but does not transform text directly inside it.

## Hydration and ownership

Use the same original children, locale packages, and settings on the server and client.
Create an instance in each environment from those inputs.
An instance or locale module contains behavior and cannot be a serialized prop.
Do not replace the original children with previously transformed output when settings change.
See [React updates](react.md#preserve-state-during-updates).

The [HTTP integration](../../tests/browser/hydration-server.mjs) shares its
[tree source](../../tests/browser/hydration-tree.mjs) with the
[hydration client](../../tests/browser/hydration-client.mjs).
These excerpts are parts of the integration source. They are not complete programs.
Use the complete files and [browser prerequisites](../../tests/browser/README.md) to run them.
The check compares each displayed excerpt with the same source before the browser run.

The synchronous route calls `renderToString` with the shared document tree:

<!-- puncta:integration server-string -->

```js
if (renderer === "ssr") {
  response.end(`<!doctype html>${renderToString(app)}`);
  return;
}
```

The client calls `hydrateRoot` with the same tree and its own instance.
`gate` controls test-only Suspense delays.
The callbacks record hydration and recoverable errors:

<!-- puncta:integration server-hydrate -->

```js
window.hydrationRoot = hydrateRoot(
  root,
  tree(
    gate,
    () => {
      window.hydrated = true;
    },
    () => {
      window.shellHydrated = true;
    },
  ),
  {
    onRecoverableError(error) {
      window.hydrationErrors.push(error.message);
    },
  },
);
```

All three browser engines check shell and protected text after shell hydration.
For both streaming modes, they check fallback text before content is released.
They then check resolved content after hydration and check that the shell/content nodes are the same.
They also check shell child identity and no hydration errors.
This includes NBSP, NNBSP, SHY, locale scopes, and protected text.
The shared tree file gives these expected text values.
JavaScript escapes identify NBSP, NNBSP, and SHY.
The browser checks shell, content, and protected values in all three SSR modes.
It checks fallback values in both streaming modes.

<!-- puncta:integration server-expected -->

```js
export const expected = {
  shell:
    "‘back\u00adbone 12\u202f345–67\u202f890\u00a0kg…’ 12\u202f345; 12\u202f345",
  fallback: "«Ya…» 67\u202f890–123\u202f456\u00a0kg",
  content:
    "«ca\u00admi\u00adno 12\u202f345\u00a0%…» 12,345; 123\u202f456\u202f789\u202f012\u202f345\u202f678\u202f901\u202f234\u202f567\u202f890",
  protected: '"backbone 24kg..." 12345',
};
```

## Streaming and Suspense

The checked Node integration uses `react-dom/server.node` from React DOM 19.3.0.
It supports `renderToPipeableStream` and `renderToReadableStream` in that environment.
The API names do not give a support guarantee for an untested edge runtime.

These excerpts are from the same HTTP handler as the synchronous route.
`app` is the shared document tree, and `response` is the Node HTTP response.
The handler creates `options`, records abort callbacks, and releases its test gate only after the browser finds the shell.
The complete source includes error and cleanup paths.

<!-- puncta:integration server-pipeable -->

```js
const stream = renderToPipeableStream(app, {
  ...options,
  onShellReady() {
    stream.pipe(response);
  },
  onShellError(error) {
    errors.push(error.message);
    response.destroy(error);
  },
});
```

The ReadableStream route sends each chunk to the same HTTP response:

<!-- puncta:integration server-readable -->

```js
const stream = await renderToReadableStream(app, {
  ...options,
  signal: controller.signal,
});
for await (const chunk of stream) response.write(chunk);
response.end();
```

Suspense content and fallback have separate recognition contexts.
Text on opposite sides of the boundary cannot form one word or number bond.
Put `Puncta` inside an opaque custom component to process its output.
See [React child boundaries](react.md#understand-child-boundaries).

The browser check detects transformed shell and fallback text before it releases content.
It then checks transformed content and hydration for both stream APIs.
The Node suite also checks concurrent requests, abort/retry, and original-source reports.
`renderToString` does not wait for suspended content. It gives the fallback.

React can buffer document-preamble bytes even after `onShellReady`.
The test supplies `html`, `head`, and `body` to check early delivery.
Puncta does not control transport buffering.
See the [SSR transport evidence](../acceptance/ssr-streaming.md#react-transport-behavior-and-limits).

## React Server Components

Use explicit core calls in Server Components.
The server must own its locale imports and instance.
The client module must import its own locales and create a separate instance.
Client ownership also applies when the framework renders the client module during SSR.

The [runnable Next integration](../../examples/rsc/README.md#run) gives the build and server commands.
It uses the public package exports without source aliases.
These excerpts are from its complete, type-checked source files.
The RSC job checks their source relation and runs the production build in all three browsers.

In [app/page.tsx](../../examples/rsc/app/page.tsx), `ServerText` processes Spanish text explicitly:

<!-- puncta:integration rsc-server -->

```tsx
function ServerText() {
  // Server Components cannot read the client Provider. All configuration is explicit.
  const instance = createPuncta({ locales: [enGb, esEs], locale: esEs.id });
  const text = instance.text('"camino"...', { hyphenation: { enabled: true } });
  return (
    <>
      <p id="server-text">{text}</p>
      <p id="server-grouped">
        {instance.text("1,234; 12345", {
          rules: { digitGrouping: { enabled: true, minDigits: 4 } },
        })}
      </p>
    </>
  );
}
```

The first paragraph contains `«ca\u00admi\u00adno»…` before JavaScript runs.
The escapes identify SHY characters.
They do not always cause a visible line break.

In [app/client-panel.tsx](../../examples/rsc/app/client-panel.tsx), the client module owns its resources:

<!-- puncta:integration rsc-client -->

```tsx
"use client";

import { createPuncta } from "@use-puncta/core";
import { enGb } from "@use-puncta/with-en-gb";
import { esEs } from "@use-puncta/with-es-es";
import { Puncta, PunctaProvider } from "@use-puncta/with-react";
import { type ReactNode, useState, version } from "react";

// The client module owns its instance and static resources, including during SSR.
const instance = createPuncta({ locales: [enGb, esEs], locale: enGb.id });
```

The same component supplies its local instance and state to the Provider.
`locale`, `hyphenation`, and `grouping` are client state values in the complete file:

<!-- puncta:integration rsc-provider -->

```tsx
      <PunctaProvider
        instance={instance}
        locale={locale}
        options={{
          hyphenation: { enabled: hyphenation },
          rules: { digitGrouping: { enabled: grouping, minDigits: 4 } },
        }}
      >
```

The server passes a source string and Flight children slots to `ClientPanel`.
Only serializable data crosses as configuration.
Do not pass instances, locale modules, or callbacks from server code as props.
Serializable settings can configure the client's local instance.

The initial client text is `‘back\u00adbone’…`.
Client controls change text, locale, hyphenation, and digit grouping.
Server text keeps its original Spanish configuration after those changes.
The raw server sibling stays `"camino"...`.
A client Provider does not supply server Context.

The integration also imports `Puncta` in a server module as a Flight client reference.
The package keeps `"use client"` for this boundary.
That reference can receive the client Provider's Context.
It is not a server Provider or a server JSX adapter.

Neither an outer `Puncta` nor `/pure` can inspect arbitrary RSC component output.
Use explicit server text calls or processing inside the client component that owns the text.
See [opaque components](react.md#process-a-custom-component) and [pure calls](../reference/react.md#transformreact).

## Run the checks

Use the pinned repository tools and install dependencies from the lockfile.
Run `pnpm build` before the integration jobs.
Install Chromium, Firefox, and WebKit with `pnpm exec playwright install chromium firefox webkit`.
On Linux, use the `--with-deps` option for system dependencies.

```sh
pnpm docs:check
node --test tests/ssr-streaming.test.mjs
pnpm test:browser
pnpm test:rsc
```

`pnpm check` includes the Node SSR tests and installed documentation examples.
The browser and RSC jobs are separate commands.
The browser job checks all three SSR modes in each engine.
The RSC job checks Flight data, HTML without JavaScript, hydration, and interactive updates.

See the [browser instructions](../../tests/browser/README.md),
[RSC instructions](../../examples/rsc/README.md), and
[documentation evidence](../acceptance/documentation-113.md).
For a mismatch or unchanged server text, use [troubleshooting](../troubleshooting.md#hydration-output-does-not-match).
