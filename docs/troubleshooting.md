# Troubleshooting

[Documentation index](README.md)

This page covers installation, settings, HTML, protection, and the ten standard rule groups.
React, grouping, hyphenation, and detailed diagnostic procedures are pending.

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
