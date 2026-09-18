# Troubleshooting

[Documentation index](README.md)

This page covers installation, settings, and the ten standard rule groups.
HTML, React, grouping, hyphenation, and detailed diagnostic procedures are pending.

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
