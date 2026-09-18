# Diagnostics documentation acceptance

[Documentation index](../README.md)

Scope: [issue 114](https://github.com/PaterSantyago/puncta/issues/114).
Implementation base: `29b9e9d1f5dc0ef55acc4cc871d5e2ae854df0b8`.
The change does not change library behavior, API, package versions, or publication status.

## Coverage

The [diagnostic reference](../reference/diagnostics.md) gives ten thrown codes and nine warning codes.
Each catalogue gives causes, actions, fields, and disabled/protected behavior.
The page also gives all result, source, edit, range, location, and warning types.
Core and React references link to these canonical definitions.
The core README links to the guides and no longer has temporary diagnostic material.

Three new displayed programs show a full error and warning, recurring warnings without edits, multi-leaf edits, and React paths.
They also check an emoji prefix, parser-repair provenance, and serialization without typography edits.
The two existing grouping programs check entity provenance and original UTF-16 positions.
The documentation explains the `covering` shape without a claim that a current rule edits part of a multi-codepoint entity.

Troubleshooting gives symptom routes for unchanged text, components, HTML serialization, SHY and line breaks, locale/settings errors, package mismatch, and grouping exclusions.
It links to the canonical catalogue and the existing guides.
The [coverage inventory](documentation-coverage.json) records these pages, programs, and public types.
Its named diagnostic inventory records each code, category, canonical target, and production source files.

The checker scans production core, shared, and React TypeScript files for dotted diagnostic literals.
It excludes the two dotted rule identifiers `hyphenation.insert` and `hyphenation.remove`.
It compares code names and source file sets, then checks catalogue rows, targets, and source links.
It does not use full-file fingerprints as a substitute for code-name checks.
Messages, `parserCode`, and reason values are not diagnostic codes.

## Checks

Focused workspace and SSR type checks passed.
Local built public entrypoints gave the displayed output for all three new programs.
The installed npm/pnpm checks and main project check are pending.
The installed harness will extract and compile the displayed programs, then compare their output.
There are 49 displayed programs and eight unchanged integration excerpts.

Negative checks passed for a new source code missing from the inventory, an error missing from its catalogue, and a warning missing from the inventory.
The negative-check script restored the files after each probe.
The final documentation check passed after these probes.

Session evidence is in `/tmp/puncta-docs-coordination/`:

- `114-types.log`: focused workspace and SSR types.
- `114-local-examples.log`: displayed diagnostic programs against local built public entrypoints.
- `114-negative.log`: code omission probes and restored documentation check.
- `114-check.log`: main project check, pending.

## Review and limits

The author used the official ASD-STE100 Issue 9 rules and dictionary and the corrections from reviews 109–113.
Code, API identifiers, literals, and technical terms keep their specified forms.
No project dictionary applies.
A separate factual and language review is pending.

This change adds no rendered-behavior claim or integration-source change.
Browser and RSC evidence from [issue 113](documentation-113.md#checks) applies to the unchanged examples.
These separate checks are not part of `pnpm check`.

The functional release is unpublished.
Public installation and release/tag validation are pending until publication.
Remote branch URLs need a check after the coordinator pushes the candidate.
