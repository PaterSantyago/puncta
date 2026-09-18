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

Use the [server-rendering guide](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/docs/guides/server-rendering.md)
for synchronous SSR, hydration, streaming, Suspense, and RSC ownership.
See [checked environments](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/docs/compatibility.md#server-environments)
and [the runnable RSC integration](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/examples/rsc/README.md).

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
