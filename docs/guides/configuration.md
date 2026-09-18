# Configure typography

[Documentation index](../README.md)

Use instance settings for common choices. Use call settings for one result.
First, [install core and each required locale](../getting-started/installation.md).
Install both locale packages to run these examples.

## Change settings and create a variant

`createPuncta` creates a snapshot of the locale registry and explicit settings.
Later changes to caller objects and arrays do not change that instance.
`with` returns an instance that operates independently with the same locale registry.
A call override changes only that call.

<!-- puncta:example configuration-variants -->

```ts
import { createPuncta, type PunctaOptions } from "@use-puncta/core";
import { enGb } from "@use-puncta/with-en-gb";
import { esEs } from "@use-puncta/with-es-es";

const rules = { ellipsis: { enabled: false } };
const locales = [enGb, esEs];
const puncta = createPuncta({ locales, locale: enGb.id, rules });
rules.ellipsis.enabled = true;
locales.length = 0;
const reset: PunctaOptions = { rules: { ellipsis: null } };
const variant = puncta.with(reset);
console.log(puncta.text("Wait..."));
console.log(variant.text("Wait..."));
console.log(puncta.text("Wait...", reset));
console.log(puncta.text("Wait..."));
console.log(puncta.with({ locale: "es-es" }).text("10%"));
```

Output (the last line contains `10\u00a0%`):

<!-- puncta:output configuration-variants -->

```text
Wait...
Wait…
Wait…
Wait...
10 %
```

## Change locale and reset a field

Load all required locale modules at creation. Then select a loaded locale by ID.
A locale change keeps explicit overrides. Defaults come from the new locale.
Use `null` on a field to remove its explicit value.
Use `null` on a rule group to remove all its explicit values.

<!-- puncta:example configuration-locales -->

```ts
import { createPuncta } from "@use-puncta/core";
import { enGb } from "@use-puncta/with-en-gb";
import { esEs } from "@use-puncta/with-es-es";

const puncta = createPuncta({ locales: [enGb, esEs], locale: enGb.id });
const explicit = puncta.with({ rules: { percentages: { space: "none" } } });
console.log(puncta.text("10%"));
console.log(puncta.text("10%", { locale: esEs.id }));
console.log(explicit.with({ locale: esEs.id }).text("10%"));
console.log(
  explicit.text("10%", {
    locale: esEs.id,
    rules: { percentages: { space: null } },
  }),
);
console.log(
  explicit.text("10%", {
    locale: esEs.id,
    rules: { percentages: { space: undefined } },
  }),
);
```

Output (lines 2 and 4 contain `10\u00a0%`):

<!-- puncta:output configuration-locales -->

```text
10%
10 %
10%
10 %
10%
```

## Add units and replace an array

`additional` supplies literal unit designations. A new array replaces inherited
additions. It does not remove built-in units. An empty array removes all additions.
Puncta copies the array when it creates the instance or variant.

<!-- puncta:example configuration-units -->

```ts
import { createPuncta } from "@use-puncta/core";
import { enGb } from "@use-puncta/with-en-gb";

const additional = ["widget"];
const puncta = createPuncta({
  locales: [enGb],
  locale: enGb.id,
  rules: { units: { additional } },
});
additional.push("sample");
const variant = puncta.with({ rules: { units: { additional: ["sample"] } } });
console.log(puncta.text("10widget; 20sample; 30kg"));
console.log(variant.text("10widget; 20sample; 30kg"));
console.log(
  variant.text("20sample; 30kg", { rules: { units: { additional: [] } } }),
);
```

Output (each visible number/unit space is U+00A0, `\u00a0`):

<!-- puncta:output configuration-units -->

```text
10 widget; 20sample; 30 kg
10widget; 20 sample; 30 kg
20sample; 30 kg
```

## Nested scopes

The order is instance settings, call settings, then nested typography scopes.
Each scope inherits explicit settings and can override them.
Its selected locale supplies defaults for fields without an explicit value.

HTML uses `data-puncta-options` for `rules` and `hyphenation` overrides.
React uses the `options` prop for those groups.
A protected or disabled subtree stays protected. Descendants cannot enable it.

This example resets an inherited percentage override inside a Spanish scope.
The outer text keeps the explicit `"none"` setting. The inner scope uses the Spanish default.

<!-- puncta:example configuration-scopes -->

```ts
import { createPuncta } from "@use-puncta/core";
import { enGb } from "@use-puncta/with-en-gb";
import { esEs } from "@use-puncta/with-es-es";

const puncta = createPuncta({
  locales: [enGb, esEs],
  locale: enGb.id,
  rules: { percentages: { space: "none" } },
});
console.log(
  puncta.html(
    `<div data-puncta-locale="es-es">10% <span data-puncta-options='{"rules":{"percentages":{"space":null}}}'>10%</span></div>`,
  ),
);
```

Output (the HTML entity `&nbsp;` represents U+00A0):

<!-- puncta:output configuration-scopes -->

```text
<div data-puncta-locale="es-es">10% <span data-puncta-options="{&quot;rules&quot;:{&quot;percentages&quot;:{&quot;space&quot;:null}}}">10&nbsp;%</span></div>
```

The HTML and React guides will give the complete scope procedures.
For now, see the [existing HTML instructions](../../packages/core/README.md)
and [React instructions](../../packages/with-react/README.md).

## Next steps

See [settings and validation](../reference/settings.md),
[core signatures](../reference/core.md), and
[locale rules and examples](../reference/locales-and-rules.md).
For configuration failures, see [troubleshooting](../troubleshooting.md).

## Enable digit grouping

Digit grouping inserts U+202F NNBSP between integer digit groups.
The number/unit bond uses U+00A0 NBSP.
Install core and en-gb to run this full program.
The output writes these invisible characters as escapes.
Output strings contain the characters, not the escape notation.

Set `enabled: true`. A threshold change does not enable the rule.
Use strings for exact input digits. Grouping does not convert text to a number.
It cannot give exact digits after JavaScript precision loss.

<!-- puncta:example grouping-options -->

```ts
import { createPuncta } from "@use-puncta/core";
import { enGb } from "@use-puncta/with-en-gb";
const visible = (text: string) =>
  text.replaceAll("\u202f", "\\u202f").replaceAll("\u00a0", "\\u00a0");
const puncta = createPuncta({ locales: [enGb], locale: enGb.id });
const grouped = puncta.with({ rules: { digitGrouping: { enabled: true } } });
console.log(puncta.text("12345"));
console.log(visible(grouped.text("12345.6700")));
console.log(grouped.text("1234.567890"));
console.log(
  visible(grouped.text("1234", { rules: { digitGrouping: { minDigits: 4 } } })),
);
const compact = grouped.with({
  rules: { digitGrouping: { minDigits: 4, normalizeExisting: false } },
});
const paused = compact.with({ rules: { digitGrouping: { enabled: false } } });
console.log(
  visible(
    paused.text("1234; 12 345", {
      rules: { digitGrouping: { enabled: true } },
    }),
  ),
);
console.log(
  compact.text("1234", { rules: { digitGrouping: { minDigits: null } } }),
);
console.log(compact.text("12345", { rules: { digitGrouping: null } }));
```

<!-- puncta:output grouping-options -->

```text
12345
12\u202f345.6700
1234.567890
1\u202f234
1\u202f234; 12 345
1234
12345
```

The decimal sign and fractional trailing zeros stay unchanged.
Only the integer digits count for `minDigits`.
A field reset uses the current locale default. A group reset also disables grouping.
When you disable only the rule, explicit settings stay available for later use.
See [settings](../reference/settings.md#digit-grouping),
[notation and exclusions](../reference/locales-and-rules.md#digit-grouping),
[HTML scopes](html.md#group-digits-across-inline-elements), and
[React children](react.md#group-digits-in-react).
