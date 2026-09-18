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

The hyphenation slice will move this section to its canonical guide and reference.

`stripSoftHyphensReact(children, { instance, ...options })` from `/pure` removes
all accessible U+00AD without typography processing. It uses the same options and
ordinary/detailed result forms as `transformReact`. It rejects `format`, `mode`, `context`, and `protect`.
Protection, unavailable language, disabled scopes, attributes, and opaque content keep SHY.
Removal operates without an insertion resource. Options and language minima are still validated.

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

Standalone integers, existing groups and locale decimals work through transparent
leaves, including arrays and Fragment. Insertions at a leaf boundary belong to the
left leaf; a replaced group separator remains in its original leaf. Invalid
candidates retain their text and detailed reports locate the whole candidate
across its source leaves. Protection and opaque components stop recognition; the
original children are not mutated. Known number bonds and eligible two-endpoint
ranges share that transparent context, including disabled exterior formatting.
Grouping and normalization are delivered by `renderToString`,
`renderToPipeableStream` and `renderToReadableStream`, including shell/fallback
before suspended content resolves. Concurrent requests isolate grouping options,
locales and reports; abort/retry starts again from original children.
The mixed corpus includes normalized groups, ranges, exterior bonds and surrounding
typography in independent shell/fallback/content scopes. Chromium, Firefox and
WebKit checks cover hydration and updates without DOM repair,
extra wrappers or replacement of the original shell/content nodes. See
[core settings and current limits](../core/README.md#opt-in-digit-grouping).

### Inheritance and grouping reports

`PunctaProvider` passes grouping settings without transforming its immediate text;
`Puncta` transforms its accessible children. Both accept the shared nullable
`options.rules.digitGrouping`. For example, an outer explicit threshold survives
pausing and re-enabling the rule in nested components:

```tsx
<PunctaProvider
  instance={instance}
  options={{ rules: { digitGrouping: { enabled: true, minDigits: 4 } } }}
>
  <Puncta options={{ rules: { digitGrouping: { enabled: false } } }}>
    1234
    <Puncta options={{ rules: { digitGrouping: { enabled: true } } }}>
      1234
    </Puncta>
  </Puncta>
</PunctaProvider>
```

The outer number stays `1234`; the inner number becomes `1\u202f234`.
A null field restores the current locale's default; a null group resets every
field and disables grouping. Changing locale retains explicit fields. A fully
disabled ancestor remains inherited protection, even if a child enables the rule
or processing. Running components still validate their own props; declarative
options in content protected from traversal are not read.

Pure `transformReact` uses its required explicit instance, independently of any
Context where the returned tree is later rendered. Arrays and Fragment preserve
accessible numeric context; nested scopes and opaque components interrupt it.
Reports keep original source paths, UTF-16 offsets and separate separator edits.
A warning can address several original leaves. Insertions at transparent seams
belong to the left nonempty leaf; digits remain in their original children.
React reports have `hasEdits` and no `outputChanged`. Original children are not
mutated. `stripSoftHyphensReact` validates these shared options while only
removing SHY, without grouping or its warnings.

### Numeric children and runtime updates

A number or bigint contributes `String(value)`. Changed leaves become strings;
unchanged leaves keep their original number/bigint type, including when grouping
is disabled. Bigints retain their exact decimal digits. Exponential number
representations such as `1e21` are excluded from grouping. Precision already lost
before calling Puncta cannot be recovered. Transparent seams between numeric and
string/host leaves use the same left-leaf insertion ownership as ordinary text.

Changing locale, grouping settings or children recomputes from original children.
Disabling grouping removes automatically inserted separators; source separators
remain subject to the ordinary rules and normalization contract. It does not strip
explicit U+202F or restore source commas from a previously transformed string
passed back as new input. For keys, refs, state, and protection-change limits, see
[state during updates](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/docs/guides/react.md#preserve-state-during-updates).

The RSC consumer exercises explicit server-owned grouping separately from the
client Provider, numeric client children and Flight children slots. Client locale
or grouping updates do not change server-owned text. Pure transforms still require
an explicit instance and do not read Context. See
[digit grouping runtime acceptance](../../docs/acceptance/digit-grouping.md#react-runtime-slice-91)
for the test matrix and execution evidence.
