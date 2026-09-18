# Troubleshooting

[Documentation index](README.md)

This page covers installation, settings, HTML, protection, and all eleven rule groups.
Hyphenation and the full diagnostic procedures are pending.

## The API is missing

Public `0.1.0-alpha.0` is the historical scaffold, without the functional API.
Check the [release status](compatibility.md#release-status) and
[installation contract](getting-started/installation.md).

## Text does not change

Check `enabled`, the relevant rule group, and inherited overrides.
A call override changes one call. A variant does not change its parent.
Use a [null reset](reference/settings.md#inheritance-and-reset) to remove an explicit override.
Then compare the input with the [rule limits](reference/locales-and-rules.md#unchanged-and-ambiguous-input).

Unknown units, ordinary word hyphens, and four-dot sequences can correctly stay unchanged.
Set `standalone: true` to process standalone ranges. Digit grouping and hyphenation insertion are off by default.
Protected text does not receive typography changes.

## A locale change keeps the previous style

A locale change keeps explicit values. Reset the relevant field or group with `null`.
An omitted field or `undefined` inherits. It does not reset.
See the [checked locale example](guides/configuration.md#change-locale-and-reset-a-field).

## Additional units disappear

Each new `additional` array replaces inherited additions.
Supply all the custom designations for use in the variant.
Built-in units remain available. See [the unit example](guides/configuration.md#add-units-and-replace-an-array).

## Configuration fails

Catch `PunctaConfigError` and inspect `code`, `optionPath`, and `details`.
For `locale.unavailable`, load the module at creation. Then select its ID.
For `locale.duplicate`, remove the duplicate registry entry.
For `locale.incompatible`, use the matching supported package export.

For `config.invalid-option`, check the [valid surfaces and values](reference/settings.md).
Wrong types, unknown fields, and whole-object null resets are invalid.

An inherited hyphenation minimum can become invalid in another locale.
Reset or increase it in the same locale override.
Disabled processing does not stop explicit argument validation.
See [the checked failure and correction](reference/settings.md#locale-dependent-validation).

## A warning occurs again without a change

An unresolved quote or ambiguous interval can produce a warning on each call.
`hasEdits: false` does not mean that `warnings` is empty.
Correct the source when its intended role is clear.
See [unchanged and ambiguous input](reference/locales-and-rules.md#unchanged-and-ambiguous-input).
The complete diagnostic catalogue is pending.

## HTML output has unexpected markup

Check the [mode and context](guides/html.md#select-fragment-or-document).
Document mode can add `html`, `head`, and `body` elements.
Use the correct table context for the rows or cells in a fragment.
The parser can repair markup and change entity or attribute spelling.

Compare `hasEdits` with `outputChanged` in a detailed result.
A serialization change can occur without a typography edit.
Do not use edit ranges as patches to reconstruct HTML output.
See [serialization limits](guides/html.md#understand-serialization).

## Protected text does not change

Check for [protected elements](guides/protection.md#protected-and-opaque-elements), `hidden`, editable content, and ancestor off markers.
A descendant cannot cancel inherited protection.
Check `lang` and the loaded locales if the result has `markup.language-unavailable`.
Use a supported loaded language or an explicit locale marker for that region.

For plain text, check explicit ranges against the original source.
Do not count Unicode code points or use offsets from a previous result.
For `protect.invalid-range`, use full graphemes in the source bounds.
See [range validation](reference/core.md#protectedrange).

A URL can keep punctuation that looks like sentence punctuation.
That punctuation can be part of the URL itself.
Use the intended source delimiter and check the [technical-token limits](guides/protection.md#automatic-technical-text-protection).

## An inline edit stops at an element

A new scope or an opaque element stops word and bond recognition.
A `lang` that selects the current locale keeps context, but an explicit Puncta marker starts a new scope.
Remove an unnecessary marker when the text must share its parent's context.
See [context boundaries](guides/html.md#context-boundaries).

## Text in a custom React component stays unchanged

An outer `Puncta` cannot inspect the component's rendered output.
Put `Puncta` in the custom component and supply an instance through a Provider.
See the [checked component example](guides/react.md#process-a-custom-component).
A Provider alone supplies settings but does not transform text.

## React reports a missing or nested instance

Supply `instance` at the root `Puncta` or Provider.
Remove the prop from components in an existing Puncta Context.
Every pure call must receive its own explicit instance.
See [React configuration failures](reference/react.md#check-configuration-failures).

## State resets after a protection change

A protection change above multiple hosts can remount deeper stateful children.
Do not depend on state preservation across arbitrary deep protection changes.
See [the reconciliation limit](guides/react.md#preserve-state-during-updates).

## Digit grouping does not change a number

Set `rules.digitGrouping.enabled: true` explicitly.
Check the integer digit count against `minDigits`. Fractional digits do not count.
Use [the configuration example](guides/configuration.md#enable-digit-grouping) to check threshold and reset behavior.
An explicit scope, protection, or opaque component can stop a number across leaves.
See [HTML boundaries](guides/html.md#group-digits-across-inline-elements) and [React boundaries](guides/react.md#group-digits-in-react).

Check the [locale notation and exclusions](reference/locales-and-rules.md#digit-grouping).
Leading zeros, unknown suffixes, scientific notation, and unsupported numeric structures stay ungrouped.
These exclusions do not cause grouping warnings.
Malformed groups cause `typography.ambiguous` even with a high threshold or disabled normalization.
Use [the grouping diagnostic example](reference/diagnostics.md#digit-grouping) to identify the full candidate.

## Existing group separators do not change

Check `normalizeExisting` and the integer threshold.
Below the threshold, existing separators stay unchanged. Puncta does not remove existing groups.
`normalizeExisting: false` keeps the full grouped spelling.
An existing U+202F produces no grouping edit.
The U+00A0 bond between a number and its unit belongs to the units rule, not digit grouping.

## Grouping does not correct lost digits

Puncta does not convert numeric values. It cannot give exact digits after JavaScript precision loss.
Supply a string or exact bigint when the original digits matter.
An exponential numeric representation is excluded.
A transformed string supplied as new input has its own explicit separators.
To recompute a React result without grouping, keep the original children as input.
