# Process React children

[Documentation index](../README.md)

First, follow the [React quick start](../getting-started/react.md).
All examples on this page are full TSX programs. They use installed public packages.

## Process a custom component

An outer `Puncta` does not call a custom component to inspect its output.
Put a `Puncta` in the component to process its text.
The inner component uses the Provider's settings when React renders it.

<!-- puncta:example react-component -->

```tsx
import { createPuncta } from "@use-puncta/core";
import { enGb } from "@use-puncta/with-en-gb";
import { Puncta, PunctaProvider } from "@use-puncta/with-react";
import { renderToStaticMarkup } from "react-dom/server";

const instance = createPuncta({ locales: [enGb], locale: enGb.id });
function PlainMessage() {
  return <p>Wait...</p>;
}
function Message() {
  return (
    <Puncta>
      <p>Wait...</p>
    </Puncta>
  );
}
console.log(
  renderToStaticMarkup(
    <PunctaProvider instance={instance}>
      <Puncta>
        <PlainMessage />
        <Message />
      </Puncta>
    </PunctaProvider>,
  ),
);
```

<!-- puncta:output react-component -->

```text
<p>Wait...</p><p>Wait…</p>
```

## Use nested scopes and protection

A nested component receives original children, not text transformed by an outer scope.
It inherits explicit settings and can override or reset individual rules.
A locale change selects new defaults but keeps explicit settings.
The [settings reference](../reference/settings.md) defines values and resets.

<!-- puncta:example react-scopes -->

```tsx
import { createPuncta } from "@use-puncta/core";
import { enGb } from "@use-puncta/with-en-gb";
import { esEs } from "@use-puncta/with-es-es";
import { Puncta, PunctaProvider } from "@use-puncta/with-react";
import { renderToStaticMarkup } from "react-dom/server";

const instance = createPuncta({ locales: [enGb, esEs], locale: enGb.id });
function Message() {
  return <Puncta enabled={true}>Wait...</Puncta>;
}
console.log(
  renderToStaticMarkup(
    <PunctaProvider
      instance={instance}
      options={{ rules: { ellipsis: { enabled: false } } }}
    >
      <Puncta>
        <p>Wait...</p>
        <Puncta locale="es-es" options={{ rules: { ellipsis: null } }}>
          <p>{'"Hola..."'}</p>
        </Puncta>
        <span data-puncta="off">
          <Message />
        </span>
        <code>
          <Message />
        </code>
      </Puncta>
    </PunctaProvider>,
  ),
);
```

<!-- puncta:output react-scopes -->

```text
<p>Wait...</p><p>«Hola…»</p><span data-puncta="off">Wait...</span><code>Wait...</code>
```

A fully disabled or protected ancestor protects all descendants.
A nested `Puncta` or Provider cannot cancel this protection with `enabled={true}`.
Context carries protection through opaque custom components.
Puncta does not traverse protected descendants or read their declarative options.
A component that React renders still validates its own props.

Accessible host elements use the [HTML markers and language rules](../reference/settings.md#html-markers).
The [protected-element catalog](protection.md#protected-and-opaque-elements) also applies to React host elements.
React `hidden={false}` does not protect content.
`contentEditable={false}` cannot cancel inherited protection.
Puncta does not inspect DOM ancestors outside its input tree.

## Use the pure entry

`transformReact` operates on an input tree with an explicit instance.
It ignores React Context, even if React later renders the result in a Provider.
The call adds no hidden Provider. Components in its result use their normal render-time Context.

<!-- puncta:example react-pure -->

```tsx
import { createPuncta } from "@use-puncta/core";
import { enGb } from "@use-puncta/with-en-gb";
import { Puncta, PunctaProvider } from "@use-puncta/with-react";
import { transformReact, type ReactResult } from "@use-puncta/with-react/pure";
import { renderToStaticMarkup } from "react-dom/server";

const instance = createPuncta({ locales: [enGb], locale: enGb.id });
const report: ReactResult = transformReact(<p>Wait...</p>, {
  instance,
  detailed: true,
});
const opaque = transformReact(
  <Puncta>
    <p>Wait...</p>
  </Puncta>,
  { instance },
);
console.log(
  renderToStaticMarkup(
    <PunctaProvider instance={instance} enabled={false}>
      {report.result}
      {opaque}
    </PunctaProvider>,
  ),
);
console.log(report.hasEdits, "outputChanged" in report);
```

<!-- puncta:output react-pure -->

```text
<p>Wait…</p><p>Wait...</p>
true false
```

Pure calls preserve protected tree structure but do not install Context for future components.
Use the component API when protection must reach a nested `Puncta` through an opaque component.

## Understand child boundaries

| Input                                                     | Processing behavior                                                                       |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Strings, arrays, and Fragments                            | Accessible leaves share recognition context across transparent inline elements.           |
| Numbers and bigint                                        | Contribute `String(value)`. An unchanged leaf keeps its type. A changed leaf is a string. |
| `null`, `undefined`, booleans                             | Produce no text and no recognition boundary.                                              |
| Ordinary host elements                                    | Process children under the element's scope and boundary rules.                            |
| Custom components, portals, promises, arbitrary iterables | Opaque. Puncta does not call, await, or iterate them.                                     |
| `Suspense`                                                | Content, fallback, and surrounding text have independent recognition contexts.            |
| Attributes and `dangerouslySetInnerHTML`                  | Stay unchanged. Puncta does not process their text.                                       |

Block elements stop recognition context. Transparent inline elements permit cross-leaf edits.
A replacement belongs to the first affected leaf. Empty elements survive.
Puncta does not mutate original props or children.

<!-- puncta:example react-children -->

```tsx
import { Fragment } from "react";
import { createPuncta } from "@use-puncta/core";
import { enGb } from "@use-puncta/with-en-gb";
import { transformReact } from "@use-puncta/with-react/pure";
import { renderToStaticMarkup } from "react-dom/server";

const instance = createPuncta({ locales: [enGb], locale: enGb.id });
console.log(
  renderToStaticMarkup(
    transformReact(
      <Fragment>
        <b>.</b>
        {[null, false, <em key="end">..</em>]}
      </Fragment>,
      { instance },
    ),
  ),
);
for (const value of [12345, 12345n, 12, 12n]) {
  const result = transformReact(value, {
    instance,
    rules: { digitGrouping: { enabled: true } },
  });
  console.log(typeof result, String(result).replaceAll("\u202f", "\\u202f"));
}
console.log(
  renderToStaticMarkup(
    transformReact(
      <>
        <p title="Wait...">Wait...</p>
        <div dangerouslySetInnerHTML={{ __html: "<i>Wait...</i>" }} />
      </>,
      { instance },
    ),
  ),
);
```

<!-- puncta:output react-children -->

```text
<b>…</b><em></em>
string 12\u202f345
string 12\u202f345
number 12
bigint 12
<p title="Wait...">Wait…</p><div><i>Wait...</i></div>
```

This example enables digit grouping to show numeric type changes.
The output shows U+202F NNBSP as an escape. Full grouping details are pending.
Bigints keep their exact decimal digits.
Puncta cannot recover numeric precision lost before the call.

## Preserve state during updates

Puncta keeps element keys, refs, and props other than transformed children.
Context bridges add no DOM elements.
New settings and new children recompute from the source children.
Keep the original source when you update the component.

The mounted browser checks verify keyed reordering, refs, and state with unchanged protection.
They also verify direct-child marker changes.
This applies to stateful components behind multiple hosts in a protected subtree.

A protection change on an ancestor of multiple accessible hosts can remount deeper stateful children.
Traversal stops at a newly protected host and removes Context bridges below it.
Arbitrary deep protection changes have no state-preservation guarantee.
Puncta does not inspect protected descendants to keep those bridges.

See the [React API](../reference/react.md), [protection guide](protection.md), and
[browser acceptance procedure](../../tests/browser/README.md).
Server rendering and SHY removal guides are pending.
