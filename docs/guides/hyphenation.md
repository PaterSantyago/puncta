# Insert and remove soft hyphens

[Documentation index](../README.md)

Prerequisites: install core and the selected locales through the [installation procedure](../getting-started/installation.md).
For React examples, also install the adapter, React, and React DOM.
Each example is a full program. The `visible` helper prints SHY as `\u00ad`.
The result strings contain U+00AD, not the escape notation.

A soft hyphen (SHY) marks a permitted word-break opportunity in a word.
It is not an ordinary hyphen or an explicit line break.
Fonts, width, CSS, and the rendering environment control rendered line breaks.
Puncta does not control layout.

## Enable insertion

Set `hyphenation.enabled: true` on an instance, call, or nested typography scope.
Insertion operates after typography and uses the selected locale's resource.
The [settings reference](../reference/settings.md#hyphenation) gives minima and reset behavior.
The [locale reference](../reference/locales-and-rules.md#hyphenation) gives word admission and language limits.

<!-- puncta:example hyphenation-insert -->

```ts
import { createPuncta } from "@use-puncta/core";
import { enGb } from "@use-puncta/with-en-gb";
import { esEs } from "@use-puncta/with-es-es";

const puncta = createPuncta({ locales: [enGb, esEs], locale: enGb.id });
const visible = (text: string) => text.replaceAll("\u00ad", "\\u00ad");
const enabled = puncta.with({ hyphenation: { enabled: true } });
console.log(visible(puncta.text("backbone")));
console.log(visible(enabled.text("backbone")));
console.log(visible(enabled.text("camino", { locale: esEs.id })));
console.log(
  visible(enabled.text("backbone", { hyphenation: { minWordLength: 9 } })),
);
console.log(visible(enabled.text("backbone", { hyphenation: { minLeft: 5 } })));
const raised = enabled.with({ hyphenation: { minRight: 5 } });
console.log(visible(raised.text("backbone")));
console.log(
  visible(raised.text("backbone", { hyphenation: { minRight: null } })),
);
console.log(visible(raised.text("backbone", { hyphenation: null })));
console.log(visible(enabled.text("back\u00adbone")));
```

<!-- puncta:output hyphenation-insert -->

```text
backbone
back\u00adbone
ca\u00admi\u00adno
backbone
backbone
backbone
back\u00adbone
backbone
back\u00adbone
```

A field reset keeps the other inherited fields. A reset of all `hyphenation` fields also sets insertion to off.
An existing SHY prevents more insertion in that word.
Other typography rules can operate.

## Check words that stay unchanged

Detailed calls return warnings for unsupported characters, mixed scripts, and Spanish `tl` ambiguity.
Case exclusions, short words, digits, apostrophes, hyphens, and existing SHY do not cause an insertion warning.
Protected text does not cause insertion warnings.
This program prints each result and its warning codes.

<!-- puncta:example hyphenation-exclusions -->

```ts
import { createPuncta } from "@use-puncta/core";
import { enGb } from "@use-puncta/with-en-gb";
import { esEs } from "@use-puncta/with-es-es";

const puncta = createPuncta({ locales: [enGb, esEs], locale: enGb.id });
const visible = (text: string) => text.replaceAll("\u00ad", "\\u00ad");
const enabled = puncta.with({ hyphenation: { enabled: true } });
for (const word of [
  "Backbone",
  "BACKBONE",
  "backBone",
  "short",
  "backbone2",
  "back-bone",
  "back'bone",
  "back\u00adbone",
  "caféine",
  "backbоne",
]) {
  const report = enabled.text(word, {
    detailed: true,
    rules: { apostrophes: { enabled: false } },
  });
  console.log(
    visible(report.result),
    report.warnings.map((warning) => warning.code).join(",") || "none",
  );
}
const spanish = enabled.text("atleta", { locale: esEs.id, detailed: true });
console.log(
  spanish.result,
  spanish.warnings.map((warning) => warning.code).join(","),
);
const protectedWord = enabled.text("caféine", {
  protect: [{ start: 0, end: 7 }],
  detailed: true,
});
console.log(protectedWord.result, protectedWord.warnings.length);
```

<!-- puncta:output hyphenation-exclusions -->

```text
Back\u00adbone none
BACKBONE none
backBone none
short none
backbone2 none
back-bone none
back'bone none
back\u00adbone none
caféine hyphenation.unsupported-characters
backbоne hyphenation.mixed-scripts
atleta hyphenation.language-ambiguity
caféine 0
```

The `о` in `backbоne` is Cyrillic U+043E.
Its shape is almost the same as Latin `o`, but it is not an English letter.

## Insert across HTML and React leaves

Transparent leaves can form one word. Puncta gives an insertion at a leaf boundary to the left leaf.
Protected, opaque, or scope boundaries prevent insertion in adjacent incomplete words.
The space before `<code>` completes the word before it.
Use the [HTML boundaries](html.md#context-boundaries) and [React boundaries](react.md#understand-child-boundaries) to select a scope.

<!-- puncta:example hyphenation-trees -->

```tsx
import { createPuncta } from "@use-puncta/core";
import { enGb } from "@use-puncta/with-en-gb";
import { esEs } from "@use-puncta/with-es-es";

import { transformReact } from "@use-puncta/with-react/pure";
import { renderToStaticMarkup } from "react-dom/server";

const puncta = createPuncta({ locales: [enGb, esEs], locale: enGb.id });
const visible = (text: string) => text.replaceAll("\u00ad", "\\u00ad");
const enabled = puncta.with({ hyphenation: { enabled: true } });
console.log(
  visible(enabled.html("<b>back</b><em>bone</em> <code>backbone</code>")),
);
console.log(
  visible(
    renderToStaticMarkup(
      transformReact(<p>camino</p>, { instance: enabled, locale: esEs.id }),
    ),
  ),
);
```

<!-- puncta:output hyphenation-trees -->

```text
<b>back\u00ad</b><em>bone</em> <code>backbone</code>
<p>ca\u00admi\u00adno</p>
```

## Remove SHY from text

Use `stripSoftHyphens` for export. It removes author SHY and Puncta SHY from text that it can process, without typography or digit grouping.
It does not use word admission or insertion minima to select characters for removal.
Text ranges and automatic technical-text protection also apply.
See [core removal options and overloads](../reference/core.md#stripsofthyphens).

<!-- puncta:example hyphenation-remove-text -->

```ts
import { createPuncta } from "@use-puncta/core";
import { enGb } from "@use-puncta/with-en-gb";
import { esEs } from "@use-puncta/with-es-es";

const puncta = createPuncta({ locales: [enGb, esEs], locale: enGb.id });
const visible = (text: string) => text.replaceAll("\u00ad", "\\u00ad");
const grouped = puncta.with({ rules: { digitGrouping: { enabled: true } } });
const source = "back\u00adbone back\u00adbone Wait... 12345";
const report = grouped.stripSoftHyphens(source, {
  protect: [{ start: 0, end: 9 }],
  hyphenation: { enabled: false },
  detailed: true,
});
console.log(visible(report.result));
console.log(report.edits.map((edit) => edit.ruleIds.join(",")).join(","));
console.log(
  visible(grouped.stripSoftHyphens("back\u00adbone", { enabled: false })),
);
```

<!-- puncta:output hyphenation-remove-text -->

```text
back\u00adbone backbone Wait... 12345
hyphenation.remove
back\u00adbone
```

## Remove SHY from HTML

Select `format: "html"`. Without this field, the method treats the input as plain text.
HTML removal uses the same fragment, document, and context options as `html()`.
The parser can change HTML serialization. Removal is not byte-for-byte HTML preservation or sanitization.
Attributes, protected elements, disabled scopes, and unavailable-language regions keep SHY.

<!-- puncta:example hyphenation-remove-html -->

```ts
import { createPuncta } from "@use-puncta/core";
import { enGb } from "@use-puncta/with-en-gb";
import { esEs } from "@use-puncta/with-es-es";

const puncta = createPuncta({ locales: [enGb, esEs], locale: enGb.id });
const visible = (text: string) => text.replaceAll("\u00ad", "\\u00ad");
const grouped = puncta.with({ rules: { digitGrouping: { enabled: true } } });
const source =
  '<p title="back\u00adbone">back&shy;bone Wait... 12345</p><code>back&shy;bone</code><span data-puncta="off">back&shy;bone</span>';
console.log(visible(grouped.stripSoftHyphens(source, { format: "html" })));
console.log(
  visible(
    grouped.stripSoftHyphens("<tr><td>ca&shy;mi&shy;no</td></tr>", {
      format: "html",
      context: "tbody",
    }),
  ),
);
```

<!-- puncta:output hyphenation-remove-html -->

```text
<p title="back\u00adbone">backbone Wait... 12345</p><code>back\u00adbone</code><span data-puncta="off">back\u00adbone</span>
<tr><td>camino</td></tr>
```

## Remove SHY from React

Import `stripSoftHyphensReact` from the `/pure` entry and supply an instance.
The function does not use Provider Context or render opaque components.
It keeps SHY in protected hosts, attributes, disabled scopes, and opaque content.
See [React removal overloads](../reference/react.md#stripsofthyphensreact) for result types and option validation.

<!-- puncta:example hyphenation-remove-react -->

```tsx
import { createPuncta } from "@use-puncta/core";
import { enGb } from "@use-puncta/with-en-gb";
import { esEs } from "@use-puncta/with-es-es";

import { stripSoftHyphensReact } from "@use-puncta/with-react/pure";
import { renderToStaticMarkup } from "react-dom/server";

const puncta = createPuncta({ locales: [enGb, esEs], locale: enGb.id });
const visible = (text: string) => text.replaceAll("\u00ad", "\\u00ad");
const grouped = puncta.with({ rules: { digitGrouping: { enabled: true } } });
const report = stripSoftHyphensReact(
  <div title={"back\u00adbone"}>
    {"back\u00adbone Wait... 12345"}
    <code>{"ca\u00admi\u00adno"}</code>
    <span data-puncta="off">{"back\u00adbone"}</span>
  </div>,
  { instance: grouped, detailed: true, hyphenation: { enabled: false } },
);
console.log(visible(renderToStaticMarkup(report.result)));
console.log(report.edits.map((edit) => edit.ruleIds.join(",")).join(","));
```

<!-- puncta:output hyphenation-remove-react -->

```text
<div title="back\u00adbone">backbone Wait... 12345<code>ca\u00admi\u00adno</code><span data-puncta="off">back\u00adbone</span></div>
hyphenation.remove
```

## Resources and validation

A compatible resource from the selected locale package is necessary for insertion.
Both supplied locales include their resource. Puncta does not fetch a resource during a call.
Missing or incompatible insertion resources cause `hyphenation.resource-unavailable` or `hyphenation.resource-incompatible` before a result returns.
Use matching functional core and locale packages. Do not construct custom locale objects.

Removal needs no insertion resource, even in nested scopes.
It validates shared settings, locale selection, minima, and format-specific options.
`hyphenation.enabled: false` does not disable removal. Shared `enabled: false` does.
See [locale-change validation](../reference/settings.md#locale-dependent-validation) for a reset example.

For unchanged words or missing line breaks, use [hyphenation troubleshooting](../troubleshooting.md#no-soft-hyphens-or-no-line-breaks).
