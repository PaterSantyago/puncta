# Protect text

[Documentation index](../README.md)

Protected text does not receive typography analysis or changes.
First, [install core and a locale](../getting-started/installation.md).
All examples below are full programs.

## Protect original text ranges

Use `protect` on a plain-text call to protect specified text.
The offsets refer to the original source, before any typography changes.
They count UTF-16 units, as JavaScript string indices do.
`start` is inclusive and `end` is exclusive.

Both offsets must be grapheme boundaries.
A grapheme can contain more than one Unicode code point or UTF-16 unit.
For example, an emoji can have two UTF-16 units.
An accent can belong to the same grapheme as its preceding letter.

<!-- puncta:example protection-ranges -->

```ts
import { createPuncta, type ProtectedRange } from "@use-puncta/core";
import { enGb } from "@use-puncta/with-en-gb";

const puncta = createPuncta({ locales: [enGb], locale: enGb.id });
const source = "😀 Wait... Wait...";
const start = source.indexOf("Wait...");
const protect: readonly ProtectedRange[] = [{ start, end: start + 7 }];
console.log(protect[0].start, protect[0].end);
console.log(puncta.text(source, { protect }));
console.log(puncta.text(source));
```

Output:

<!-- puncta:output protection-ranges -->

```text
3 10
😀 Wait... Wait…
😀 Wait… Wait…
```

Protection applies only to the call that receives `protect`.
It is not an instance setting and is not available for HTML calls.
For HTML, use elements or [off markers](#protect-markup-and-keep-protection).
The [core reference](../reference/core.md#protectedrange) defines range validation and merging.

Protected text is an opaque gap.
Text on its two sides cannot join into a word or a number bond.
An outer quote can include the gap, but the protected text cannot affect quote recognition.

## Automatic technical-text protection

Puncta automatically protects recognized technical tokens in accessible text.
No option is necessary.
These forms include URLs with a scheme or `www.`, email addresses, valid IP addresses, and version strings.
An example version is `v1.2.3`.
A scheme can be `https:`, `mailto:`, or a different valid scheme prefix.

<!-- puncta:example protection-technical -->

```ts
import { createPuncta } from "@use-puncta/core";
import { enGb } from "@use-puncta/with-en-gb";

const puncta = createPuncta({ locales: [enGb], locale: enGb.id });
console.log(puncta.text("https://example.com/a... Wait..."));
console.log(
  puncta.text("www.example.com/a... user@example.com 192.0.2.1 v1.2.3 Wait..."),
);
console.log(puncta.html("<b>https://example.com/</b><em>a...</em> Wait..."));
```

Output:

<!-- puncta:output protection-technical -->

```text
https://example.com/a... Wait…
www.example.com/a... user@example.com 192.0.2.1 v1.2.3 Wait…
<b>https://example.com/</b><em>a...</em> Wait…
```

Technical-token recognition also works across transparent inline leaves.
URL punctuation can belong to a path, query, or fragment.
Puncta keeps this punctuation.

This protection does not include all technical text.
Puncta does not parse Markdown, code syntax, file paths, or arbitrary identifiers.
Use explicit ranges for those plain-text regions, or protected elements in HTML.

## Protect markup and keep protection

Use `code` for code text, or `data-puncta="off"` for a different subtree.
An off marker protects the element and all its descendants.
A nested marker or language cannot start typography again in it.

<!-- puncta:example protection-markup -->

```ts
import { createPuncta } from "@use-puncta/core";
import { enGb } from "@use-puncta/with-en-gb";

const puncta = createPuncta({ locales: [enGb], locale: enGb.id });
console.log(puncta.html("<code>Wait...</code><p>Wait...</p>"));
console.log(
  puncta.html(
    '<span data-puncta="off"><b data-puncta="" data-puncta-options="bad">Wait...</b></span>',
  ),
);
console.log(puncta.html('<span hidden="false">Wait...</span>'));
console.log(puncta.html('<span aria-hidden="true">Wait...</span>'));
console.log(puncta.html('<span contenteditable="true">Wait...</span>'));
const report = puncta.html("<custom-note>Wait...</custom-note> Wait...", {
  detailed: true,
});
console.log(report.result);
console.log(report.warnings.map((warning) => warning.code).join(", "));
```

Output:

<!-- puncta:output protection-markup -->

```text
<code>Wait...</code><p>Wait…</p>
<span data-puncta="off"><b data-puncta="" data-puncta-options="bad">Wait...</b></span>
<span hidden="false">Wait...</span>
<span aria-hidden="true">Wait…</span>
<span contenteditable="true">Wait...</span>
<custom-note>Wait...</custom-note> Wait…
markup.element-unsupported
```

The invalid JSON in the off subtree causes no configuration error.
Puncta skips declarative configuration in protected elements and off subtrees.
But explicit API arguments still receive validation when `enabled` is `false`.
See the [validation example](../reference/core.md#format-validation).

An API call with effective `enabled: false` protects its full HTML input from typography.
No descendant can cancel that protection.
A different call or instance variant can set `enabled: true` again.
This is different from a descendant in a protected subtree.

### Protected and opaque elements

The HTML element categories below apply without CSS inspection.
Protection includes all descendants, even HTML descendants in SVG or MathML.
Unknown elements are opaque and protected, with a `markup.element-unsupported` warning.
An already protected subtree does not produce additional element warnings from its descendants.

| Category                      | Protected elements                                              |
| ----------------------------- | --------------------------------------------------------------- |
| Code and preformatted text    | `code`, `pre`, `script`, `style`, `kbd`, `samp`                 |
| Form values                   | `textarea`, `select`, `input`, `option`, `optgroup`, `datalist` |
| Inactive content              | `template`, `noscript`                                          |
| Foreign or annotation content | `svg`, `math`, `ruby`                                           |
| Embedded and media content    | `iframe`, `object`, `embed`, `canvas`, `audio`, `video`, `img`  |

The presence of `hidden` protects a subtree, even with `hidden="false"`.
`contenteditable` protects it with an empty value, `"true"`, or `"plaintext-only"`, without case sensitivity.
`contenteditable="false"` cannot cancel protection from an ancestor.
`aria-hidden` alone does not protect text.

An opaque fragment stops word and bond recognition on both sides.
Inline protected elements use this boundary.
Block elements also stop quote context. The `pre` element is an example.
The `br`, `wbr`, and `hr` elements have no processed text and use their [structural boundaries](html.md#context-boundaries).

Protection keeps parsed text, not the original HTML bytes.
Attributes receive no typography changes, but the parser and serializer can change their spelling.
See [serialization limits](html.md#understand-serialization).
React uses the same host-element protection rules, with React boolean prop semantics.
React-specific procedures are in the [adapter instructions](../../packages/with-react/README.md).

Related: [HTML guide](html.md), [range API](../reference/core.md#protectedrange),
[text symptoms](../troubleshooting.md#protected-text-does-not-change).
