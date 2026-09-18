# Settings, locales, and typography documentation

[Documentation index](../README.md)

Scope: [issue 108](https://github.com/PaterSantyago/puncta/issues/108).
Parent specification: [issue 106](https://github.com/PaterSantyago/puncta/issues/106).
Implementation base: `c8c00f8ce8d077372d8865c466b404b12c4fb14e`.
The library source is unchanged from the functional baseline
`83b8c7acd5d6cfbe33c47f87c4c26f050628415f`.
All package manifests remain at `0.1.0-alpha.0`. These local archives contain the
functional source, not the public scaffold.

## Acceptance mapping

| Requirement                                                                                                            | Canonical pages and evidence                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Creation, variants, snapshots, signatures, type index, ordinary/detailed/boolean results                               | [Core reference](../reference/core.md), `core-results`, `configuration-variants`                                                                              |
| Surfaces, defaults, values, omission/undefined, field/group resets, invalid whole-object null, array replacement       | [Settings](../reference/settings.md), `configuration-locales`, `configuration-units`, `settings-validation`                                                   |
| Both exports and ten non-grouping rule groups                                                                          | [Locales and rules](../reference/locales-and-rules.md), `locale-rules`, `locale-limits`                                                                       |
| Multiple locales, explicit overrides, variants that operate independently, nested reset, custom units, array snapshots | [Configuration](../guides/configuration.md), four configuration examples, including `configuration-scopes`                                                    |
| Package entries, navigation, symptoms                                                                                  | Core and locale READMEs, [index](../README.md), [troubleshooting](../troubleshooting.md)                                                                      |
| Displayed-source checks and source comparison                                                                          | [Coverage inventory](documentation-coverage.json), [documentation checker](../../scripts/documentation.mjs), [installed consumers](../../scripts/install.mjs) |
| Independent factual and language review                                                                                | Pending, coordinator assigns a independent reviewer                                                                                                           |

## Checks

The displayed-source checks use the existing isolated npm/pnpm registry.
Each manager checks three minimal consumers: core with en-gb, core with es-es,
and core with both locales. TypeScript is the only extra direct dependency.
The existing eight adapter/locale consumer combinations also run.

The inventory has a canonical target and status for each core public declaration,
both locale exports, shared option keys, and source default tables.
It also records entrypoint re-exports, named aliases, and type-star exports.
Hashes compare those source sections with the reviewed snapshot.
If a hash differs, review the meaning of the related reference.
Hashes do not prove the meaning of prose or replace the independent review.
The checker also compares declaration names, so a new exported declaration fails until the inventory includes it.

The final acceptance slice must complete React, diagnostic codes, and all pending definitions.

The full implementation run at `de71514a4814abb858df55942b11fe59409d6218` passed on 2026-09-18.
It used Node 24.21.0,
npm 11.19.0, pnpm 12.4.1, and TypeScript 7.0.2.

| Check                     | Result                                                                                                   |
| ------------------------- | -------------------------------------------------------------------------------------------------------- |
| `pnpm check`              | Passed: lint, formatting, documentation, types, build, archives, tests, installation, release validation |
| Functional tests          | 286 passed, no failures or skipped tests                                                                 |
| Release tests             | 3 passed, no failures or skipped tests                                                                   |
| Publication tests         | 6 passed in disposable registries, no real publication                                                   |
| Displayed examples        | All 14 compiled and ran with npm and pnpm, exact outputs matched                                         |
| Minimal consumers         | Three package combinations per manager passed                                                            |
| Existing adapter matrix   | All eight combinations passed                                                                            |
| `pnpm docs:check`         | 17 pages, 147 local links and anchors, 14 examples, eight coverage groups pending                        |
| Negative inventory checks | A missing public type and an incorrect source hash each failed, the restored inventory passed            |

The first full run failed on the nested HTML example: serialization uses `&nbsp;`
for U+00A0. The corrected displayed output passed the final full run.
After final prose and evidence edits, formatting and documentation checks passed again.
The review corrections change the documentation checker, prose, and two displayed currency cases.
The library source is unchanged.

## Language and limits

The author used the official
[ASD-STE100 Issue 9 rules and dictionary](https://www.asd-ste100.org/assets/files/ASD-STE100_ISSUE9.pdf)
for the prose pass, including verb forms, active voice, sentence length, and ordinary vocabulary.
API identifiers and literal input/output remain exact.
An independent agent reviewed revision `de71514a4814abb858df55942b11fe59409d6218`.
The review found gaps in export checks, the currency attachment definition, and three groups of language issues.
The author applied the corrections below. Independent recheck is pending.

The installed check caught an incorrect initial Spanish dash expectation.
A single `word -- word` is ambiguous in es-es. A paired insertion supplies the changed-output example.
The documentation now matches the source and existing dash acceptance evidence.

Grouping details, SHY procedures, full HTML/protection parameters, React definitions,
and detailed diagnostic schemas remain in their assigned later slices.
Their useful legacy material remains in package READMEs.
No library behavior, package versions, release tags, or public registry contents changed.
Browser, SSR, and RSC documentation verification is outside this slice.

Public functional installation and release-specific links remain pending until publication.
The coordinator checked all seven package README branch URLs on 2026-09-18.
Each returned HTTP 200. Release-specific URLs remain pending.

## Review corrections

The export inventory now records named re-exports, their aliases, and type-star statements.
Negative checks removed the error re-export, added an alias, and changed the type-star target.
Each mutation failed the inventory comparison. The restored source passed.
The earlier missing-type and incorrect-hash checks also passed.

The currency reference now defines attachment by the absence of U+0020.
An existing NBSP counts as attachment.
The displayed `locale-limits` example includes both unchanged ambiguous currency cases from the review.

The prose corrections remove semicolons, divide long paragraphs, and use the specified ordinary wording and verb forms.
Code and literal input/output keep their original punctuation.
After these corrections, `pnpm lint`, `pnpm typecheck`, `pnpm docs:check`,
and `pnpm format:check` passed.
`pnpm test:install` compiled and ran all 14 displayed examples with npm and pnpm.
The two currency cases matched their stated results. All eight adapter consumer combinations also passed.
Independent review of the corrections is pending.
