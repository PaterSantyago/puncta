# @use-puncta/with-react

Use Puncta to process accessible React children without a DOM wrapper.
This package is an ESM adapter with TypeScript declarations.
The declared React peer range is `^19.3.0`. Your application supplies React DOM.

## Install

The functional API is unreleased. The public `0.1.0-alpha.0` scaffold does not have this API.
Use matching core, adapter, and locale packages from the functional version.
Declare core directly when your application imports it.
Follow the [npm or pnpm installation procedure](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/docs/getting-started/installation.md).

## Example

This full TSX program prints the rendered HTML.
An outer `Puncta` cannot inspect custom component output.
Put `Puncta` in your component to process that text.

<!-- puncta:example package-react -->

```tsx
import { createPuncta } from "@use-puncta/core";
import { enGb } from "@use-puncta/with-en-gb";
import { Puncta, PunctaProvider } from "@use-puncta/with-react";
import { renderToStaticMarkup } from "react-dom/server";

const instance = createPuncta({ locales: [enGb], locale: enGb.id });
const example = (
  <PunctaProvider instance={instance}>
    <Puncta>Wait...</Puncta>
  </PunctaProvider>
);
console.log(renderToStaticMarkup(example));
```

<!-- puncta:output package-react -->

```text
Wait…
```

## Guide and reference

- [React quick start](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/docs/getting-started/react.md).
- [React guide: scopes, protection, pure calls, and state limits](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/docs/guides/react.md).
- [React API and public types](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/docs/reference/react.md).

These links use the documentation branch until a functional release exists.
At release, the links must point to the matching release.

## Soft-hyphen removal

Use the [React removal example](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/docs/guides/hyphenation.md#remove-shy-from-react)
and [pure removal reference](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/docs/reference/react.md#stripsofthyphensreact).

## Server integration

The server-rendering slice will move the existing integration details below to its guide.

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

## License

MIT.

## Opt-in digit grouping

Use the [grouping guide](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/docs/guides/configuration.md#enable-digit-grouping)
and [notation, bonds, ranges, and exclusions](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/docs/reference/locales-and-rules.md#digit-grouping).
The [settings reference](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/docs/reference/settings.md#digit-grouping)
defines defaults, validation, inheritance, and reset.

### Inheritance and grouping reports

See [grouping in React](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/docs/guides/react.md#group-digits-in-react)
for component and pure calls, scopes, source paths, and separator ownership.

### Numeric children and runtime updates

See [numeric children](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/docs/guides/react.md#group-digits-in-react)
and [state during updates](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/docs/guides/react.md#preserve-state-during-updates).
These sections define precision, recomputation, and protection-change limits.
