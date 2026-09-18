# Process HTML

[Documentation index](../README.md)

Use `html()` to apply typography to text in an HTML string.
First, [install core and the required locales](../getting-started/installation.md).
All examples below are complete programs.

HTML parsing does not sanitize input. Puncta does not remove scripts or event attributes.
Use an independent HTML sanitizer when your application must produce safe HTML.

## Select fragment or document

The default mode is `"fragment"`. The default fragment context is `"div"`.
Select `"document"` for a complete document.
Puncta never selects a mode from the source content.

<!-- puncta:example html-modes -->

```ts
import { createPuncta } from "@use-puncta/core";
import { enGb } from "@use-puncta/with-en-gb";

const puncta = createPuncta({ locales: [enGb], locale: enGb.id });
console.log(puncta.html("<p>Wait...</p>"));
console.log(puncta.html("<p>Wait...</p>", { mode: "document" }));
console.log(puncta.html("<tr><td>Wait...</td></tr>", { context: "table" }));
console.log(puncta.html("Wait... &amp; <b>x</b>", { context: "title" }));
console.log(puncta.html("Wait...", { context: "code" }));
```

Output:

<!-- puncta:output html-modes -->

```text
<p>Wait…</p>
<html><head></head><body><p>Wait…</p></body></html>
<tbody><tr><td>Wait…</td></tr></tbody>
Wait… &amp; &lt;b&gt;x&lt;/b&gt;
Wait…
```

The context tells the parser how to interpret a fragment.
It adds no output wrapper and no protected ancestor.
Thus, `context: "code"` does not protect the supplied text.
An actual `<code>` element in the source does protect its contents.

A `table` context permits table rows and can add a `tbody` element.
A `title` context uses RCDATA: the parser decodes entities and reads tags as text.
Raw-text contexts, such as `script`, keep literal entities during serialization.
Use a supported lowercase HTML element name for `context`.
The [core reference](../reference/core.md#format-parameters) defines its limits.

## Use markers and languages

A marker starts a typography scope with settings from its parent.
The scope can change its locale and explicit settings.
The [settings reference](../reference/settings.md#html-markers) defines each marker and its valid values.

<!-- puncta:example html-scopes -->

```ts
import { createPuncta } from "@use-puncta/core";
import { enGb } from "@use-puncta/with-en-gb";
import { esEs } from "@use-puncta/with-es-es";

const puncta = createPuncta({ locales: [enGb, esEs], locale: enGb.id });
console.log(
  puncta.html(
    '<p>10% <span lang="ES">10%</span> ' +
      '<span lang="es" data-puncta-locale="en-gb">10%</span></p>',
  ),
);
console.log(
  puncta.html(
    '<span data-puncta-options=\'{"rules":{"ellipsis":{"enabled":false}}}\'>' +
      'Wait... <b data-puncta-options=\'{"rules":{"ellipsis":null}}\'>Wait...</b></span>',
  ),
);
const report = puncta.html(
  '<span lang="fr">Wait... <b lang="en">Wait...</b></span>' +
    '<span data-puncta="off"><b data-puncta="" lang="en">Wait...</b></span>',
  { detailed: true },
);
console.log(report.result);
console.log(report.warnings.map((warning) => warning.code).join(", "));
```

Output:

<!-- puncta:output html-scopes -->

```text
<p>10% <span lang="ES">10&nbsp;%</span> <span lang="es" data-puncta-locale="en-gb">10%</span></p>
<span data-puncta-options="{&quot;rules&quot;:{&quot;ellipsis&quot;:{&quot;enabled&quot;:false}}}">Wait... <b data-puncta-options="{&quot;rules&quot;:{&quot;ellipsis&quot;:null}}">Wait…</b></span>
<span lang="fr">Wait... <b lang="en">Wait…</b></span><span data-puncta="off"><b data-puncta="" lang="en">Wait...</b></span>
markup.language-unavailable
```

The Spanish percentage contains U+00A0 NBSP, serialized as `&nbsp;`.
An explicit `data-puncta-locale` has priority over `lang` on the same element.
The nested null reset removes the explicit ellipsis setting.
The nested scope then uses its locale default.

An unavailable language leaves its text unchanged and produces a warning.
A supported nested language can start typography again.
But descendants cannot cancel inherited protection or `data-puncta="off"`.
See [inherited protection](protection.md#protect-markup-and-keep-protection).

## Work across inline elements

Transparent inline elements, such as `b`, `em`, and `span`, share recognition context.
Comments do not interrupt this context.
Puncta can recognize one token across several text leaves.
A leaf is one text node in the parsed tree.

<!-- puncta:example html-joins -->

```ts
import { createPuncta } from "@use-puncta/core";
import { enGb } from "@use-puncta/with-en-gb";

const puncta = createPuncta({ locales: [enGb], locale: enGb.id });
const report = puncta.html("<b>.</b><em>..</em>", { detailed: true });
console.log(report.result);
console.log(JSON.stringify(report.edits[0].ranges));
console.log(puncta.html('<b>.</b><!-- note --><em lang="en">..</em>'));
console.log(puncta.html('<b>.</b><em data-puncta="">..</em>'));
console.log(puncta.html("<b>.</b><br><em>..</em>"));
console.log(puncta.html('"a<br>b"'));
```

Output:

<!-- puncta:output html-joins -->

```text
<b>…</b><em></em>
[{"sourceId":0,"start":0,"end":1,"inputRange":{"accuracy":"exact","start":3,"end":4}},{"sourceId":1,"start":0,"end":2,"inputRange":{"accuracy":"exact","start":12,"end":14}}]
<b>…</b><!-- note --><em lang="en"></em>
<b>.</b><em data-puncta="">..</em>
<b>.</b><br><em>..</em>
‘a<br>b’
```

The replacement goes into the first affected leaf.
The empty `em` element stays in place.
A new insertion at a leaf boundary goes into the nonempty leaf on the left.
An existing space stays in its original leaf.

Each edit range refers to original decoded text in one leaf.
Its `inputRange` refers to the original HTML string.
Tags between leaves are not part of these ranges.
Both coordinates use UTF-16 units.
Full diagnostic schemas belong to the pending diagnostics reference.

### Context boundaries

| Boundary                                  | Effect on text recognition         | Effect on quotes                     |
| ----------------------------------------- | ---------------------------------- | ------------------------------------ |
| Transparent inline element or comment     | Context continues                  | Context continues                    |
| `br`, `wbr`, or one text line break       | Words, bonds, and ellipsis stop    | A quote can continue                 |
| Block element, `hr`, or a blank text line | Context stops                      | Quote context stops                  |
| Opaque or protected fragment              | Text on opposite sides cannot join | An outer quote can span the fragment |
| New typography scope                      | The child has its own context      | The child has its own quote depth    |

These boundaries add no characters to the output.
Block elements include paragraphs, headings, lists, and table cells.
CSS display properties do not change these rules.
The [protection guide](protection.md#protected-and-opaque-elements) lists opaque and protected elements.

Each `data-puncta` marker starts an independent scope, even with the same effective settings.
A `lang` attribute alone keeps context when it selects the current locale.
A new child scope is opaque to its parent, but can process its own text.

### Supported element names

These lists define the supported element names and context boundaries.
Protected element names are in the [protection table](protection.md#protected-and-opaque-elements).
All names in these lists or that table are valid fragment contexts, except `svg` and `math`.

| Category            | Names                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Block boundary      | `address`, `article`, `aside`, `blockquote`, `body`, `caption`, `center`, `dd`, `details`, `dialog`, `dir`, `div`, `dl`, `dt`, `fieldset`, `figcaption`, `figure`, `footer`, `form`, `h1`, `h2`, `h3`, `h4`, `h5`, `h6`, `head`, `header`, `hgroup`, `html`, `legend`, `li`, `listing`, `main`, `menu`, `nav`, `ol`, `p`, `plaintext`, `pre`, `search`, `section`, `summary`, `table`, `tbody`, `td`, `tfoot`, `th`, `thead`, `title`, `tr`, `ul`, `xmp` |
| Transparent inline  | `a`, `abbr`, `acronym`, `area`, `b`, `base`, `basefont`, `bdi`, `bdo`, `big`, `button`, `cite`, `col`, `colgroup`, `data`, `del`, `dfn`, `em`, `font`, `i`, `ins`, `label`, `link`, `map`, `mark`, `meta`, `meter`, `nobr`, `output`, `picture`, `progress`, `q`, `rb`, `rp`, `rt`, `rtc`, `s`, `small`, `slot`, `source`, `span`, `strike`, `strong`, `sub`, `sup`, `time`, `track`, `tt`, `u`, `var`                                                   |
| Structural boundary | `br`, `wbr`, `hr`                                                                                                                                                                                                                                                                                                                                                                                                                                        |

These are typography categories, not a check of valid HTML nesting.
Protected status has priority over transparent status or child markers.
Unsupported elements stay protected and opaque.

## Understand serialization

Puncta uses the tree from the HTML parser, including parser repairs.
Typography keeps that tree and its attribute values.
It does not apply typography to attributes, including `title`, `alt`, and `href`.
Serialization does not promise the original bytes, attribute quotes, entity spelling, or tag case.
Protected text also has this limit after parsing.

<!-- puncta:example html-serialization -->

```ts
import { createPuncta } from "@use-puncta/core";
import { enGb } from "@use-puncta/with-en-gb";

const puncta = createPuncta({ locales: [enGb], locale: enGb.id });
const report = puncta.html("<P title='Wait...'>Wait...</P>", {
  enabled: false,
  detailed: true,
});
console.log(report.result);
console.log(report.hasEdits, report.outputChanged, report.edits.length);
console.log(
  puncta.html('<p onclick="run()">Wait...</p><script>run()</script>'),
);
console.log(puncta.html("<code>&#46;&#46;&#46;</code>"));
```

Output:

<!-- puncta:output html-serialization -->

```text
<p title="Wait...">Wait...</p>
false true 0
<p onclick="run()">Wait…</p><script>run()</script>
<code>...</code>
```

`hasEdits` reports typography changes. `outputChanged` compares the complete strings.
The example has a serialization change with no typography edits.
Edit reports are not patches to reconstruct serialized HTML.
The script and event attribute stay in the result: parsing is not sanitization.

Parser warnings use `html.parse`, with the parser code in `details.parserCode`.
Protection does not stop parser warnings.
No warnings does not prove valid HTML or the absence of parser repairs.
An input with an actual `plaintext` element keeps its original markup structure during text changes.
This special case prevents new closing tags from becoming plaintext on a later parse.

Related: [Protection](protection.md), [core API](../reference/core.md),
[HTML symptoms](../troubleshooting.md#html-output-has-unexpected-markup).
