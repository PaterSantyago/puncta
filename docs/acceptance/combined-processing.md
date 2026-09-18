# Combined processing and final diagnostics

Task [#53](https://github.com/PaterSantyago/puncta/issues/53) verifies combined
operation of the public `text`, `html`, `transformReact`, `stripSoftHyphens`,
`stripSoftHyphensReact`, and synchronous `Puncta`/`PunctaProvider` SSR APIs.
Canonical contracts:
[#28](https://github.com/PaterSantyago/puncta/issues/28#issuecomment-5683640825),
[#29](https://github.com/PaterSantyago/puncta/issues/29#issuecomment-5683906630),
[#30](https://github.com/PaterSantyago/puncta/issues/30#issuecomment-5685323283),
[#31](https://github.com/PaterSantyago/puncta/issues/31#issuecomment-5694110824),
[#32](https://github.com/PaterSantyago/puncta/issues/32#issuecomment-5685627641),
[#33](https://github.com/PaterSantyago/puncta/issues/33#issuecomment-5695491875).

## Requirements and checks

The main file is `tests/combined-processing.test.mjs`. The table connects
functional contracts to observable checks. Tests do not use private passes,
coordinate tables, or internal recognition functions.

| Contract                                                                                                              | Check and independent basis                                                                                                                                                                                                                                                                                                                                                                                |
| --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #28: quotes, apostrophes, spacing, ellipses, dashes, ranges, minus signs, units, percentages, and currencies together | `combined literal oracle…`: two literal strings from the #28 profiles and independent backbone/camino references. Each transparent boundary is checked through HTML, pure React, and `Puncta` SSR, with exact U+00A0/U+00AD characters. All separate approved references remain in the corresponding files below.                                                                                          |
| #28 §8, #31 §4: a group switch does not disable its context                                                           | `each disabled group…`: each of ten groups is disabled separately. Other parts of the literal result stay the same. Units remain available for range/minus recognition, and apostrophes remain available for quote recognition. Group tests also check normalizeExisting, additional units, and null/reset.                                                                                                |
| #29, #33: language references with general typography enabled                                                         | `frozen linguistic oracles…`: all 313 English and 361 Spanish words through three inputs. Context includes quotes, spaces, a range, a unit, and an ellipsis. There are no extra positions. All required positions are present. Source spelling is unchanged. The fixed corpora are unchanged.                                                                                                              |
| #32 §3–4: final edits and original provenance                                                                         | `final reports…`: original UTF-16 positions after emoji, separate quotes and SHY, adjacent deletions/replacements, an entity, and a unit boundary. Final Spanish inner-space cleanup is one source edit, without an intermediate collapse. `verifyReport` checks before against source ranges, kind, source IDs, and unique appliedRules pairs.                                                            |
| #32: sequential processing does not expose intermediate coordinates                                                   | Typography calculates final replacements from the original representation. Hyphenation analyzes the final representation with a mapping to the source. `combined literal oracle…`, `final reports…`, and `generated combined settings…` check original positions after other changes. Independent edits are not combined. A rule that recognizes context but does not change text is not added to ruleIds. |
| #31 §10, #32 §2: hasEdits and outputChanged                                                                           | `verifyReport` checks both flags for strings and the presence of edits/appliedRules. React has no outputChanged. `html-parsing.test.mjs` and `ellipsis.test.mjs` separately check serialization without typography.                                                                                                                                                                                        |
| #31 §11, #32 §6–7: all warnings and their machine-readable fields                                                     | `every warning code…`: all nine codes, source, locale/ruleId, details, and location types. The same cause at two positions gives two warnings. An identical call gives the same warnings. `verifyReport` rejects duplicates by all machine-readable fields, excluding message. English text is checked only as a nonempty string.                                                                          |
| #31 §11: all errors, no partial result                                                                                | `all configuration error codes…`: all ten codes in ordinary/detailed mode. Checks cover error type, fields, absent result, and forbidden references to sources not returned. HTML and React checks include a late markup error after accessible text that can change.                                                                                                                                      |
| #28 §8, #29 §4, #33 §6: idempotence and repeatability                                                                 | Literal, corpus, and generated checks require unchanged output and empty edits/appliedRules on repeat. Generator: seed 530, 32-bit LCG with selection across the full range, 2000 inputs, and at least 1901 distinct inputs. A positive control verifies actual edits. Source edits must reproduce the plain-text result.                                                                                  |
| #29 §4: new settings apply to the source                                                                              | `fresh options…`: the source string is processed with different locales, switches, and hyphenation settings. Checks use with, call overrides, HTML, pure React, and Provider SSR. A repeated original call is unchanged. Dynamic React lifecycle belongs to #54.                                                                                                                                           |
| #29 §4, #31 §7: SHY removal after full processing                                                                     | `SHY removal after full processing…`: text, default fragment, table context, title context, document, and React. Other typography, attributes, and code are preserved. Repeated removal gives no edits. Exact deletions refer to the removal operation's input.                                                                                                                                            |
| #31 §7: removal does not require an insertion resource                                                                | `all configuration error codes…`: an instance without a resource successfully removes SHY. This includes a declarative scope with hyphenation enabled in HTML and React. with that enables insertion is still rejected before an instance is returned.                                                                                                                                                     |
| #28 §7–8, #29 §4: technical protection and context after SHY                                                          | `removal cannot expose a URI suffix…`: every boundary of URL/www families in both locales. A leading SHY before a real URL is removed. SHY inside a URL is preserved. `punctuation spacing…` and `all interval rules…`: ambiguous changes do not enable another group only on the next call. Independent ellipsis processing continues.                                                                    |
| #30: structural boundaries, protection, and sources for each representation                                           | `inline-context.test.mjs`, `protection.test.mjs`, `options-scopes.test.mjs`, group-specific all-split checks, and new combined all-split checks. Plain text has no elements/attributes. Parser warnings and inputRange apply only to HTML. React uses source-tree addresses, not HTML positions.                                                                                                           |

## Diagnostic catalog

| Code                               | Public scenario in combined-processing                                             |
| ---------------------------------- | ---------------------------------------------------------------------------------- |
| typography.ambiguous               | Standalone ambiguous arithmetic; a transformation conflicts with technical context |
| quotes.unpaired                    | An unpaired quotation mark in two independent blocks                               |
| currency.order                     | `20€` in en-gb                                                                     |
| hyphenation.unsupported-characters | A Greek word in en-gb                                                              |
| hyphenation.mixed-scripts          | Mixed Greek and Cyrillic letters                                                   |
| hyphenation.language-ambiguity     | `atlético` in es-es                                                                |
| markup.language-unavailable        | `lang="xx"`, null locale, value/reason                                             |
| markup.element-unsupported         | Unsupported `widget`, tagName/namespace                                            |
| html.parse                         | A duplicate attribute, parserCode, and source HTML position                        |
| config.invalid-option              | An incorrect enabled type                                                          |
| locale.unavailable                 | An explicitly unsupported locale                                                   |
| locale.incompatible                | An incorrect module format                                                         |
| locale.duplicate                   | A duplicate locale in the registry                                                 |
| hyphenation.resource-unavailable   | Hyphenation enabled without a resource                                             |
| hyphenation.resource-incompatible  | An incompatible resource enabled                                                   |
| instance.missing                   | A pure React call without instance                                                 |
| instance.nested                    | Puncta with instance inside a Provider                                             |
| markup.invalid-config              | Invalid JSON after accessible text in HTML/React                                   |
| protect.invalid-range              | A range that splits an emoji                                                       |

## Additional functional matrices

- [Spacing](spacing.md): all literal intervals, NBSP, Spanish punctuation,
  indentation, tabs, and ambiguous numbers.
- [Quotes](quotes.md): all profiles, mixed preserved pairs, apostrophes,
  lines/blocks, locales, and transparent boundaries.
- [Number bonds](number-bonds.md) and [dashes](dashes.md): all units, currencies,
  percentages, special intervals, disabled modes, and shared context.
- [SHY removal](strip-soft-hyphens.md): source SHY, protection, and format errors.
- [English](en-gb-hyphenation-result.md) and
  [Spanish](es-es-hyphenation-result.md): unchanged independent corpora,
  required positions, permitted-omission reports, and prepared resources.
- `tests/html-parsing.test.mjs`: document/fragment/context, parse5, title/RCDATA,
  namespaces, recovered nodes, entities/CRLF, exact/covering/unavailable,
  and the difference between serialization and typography.
- `tests/options-scopes.test.mjs`, `tests/inline-context.test.mjs`, and
  `tests/protection.test.mjs`: inheritance, reset, language, opacity, accessible leaves,
  word/bond/quotation boundaries, and protection before declarative settings are read.

## Corrections and result limits

SHY inside a word no longer creates a false boundary before a URL scheme suffix
or www. The previous defect could leave some SHY until a second clean export.
Combining marks also continue a word. A composed letter and its decomposed form
have the same boundary, without normalization of source characters.
A real URL after a leading SHY remains protected.

All groups use a consistent check for changes to technical context.
Removing a possible technical token from the word representation without SHY is
as significant as creating or changing that token. This prevents a space or NBSP
from resolving ambiguity for an adjacent ellipsis/dash only on repeat.
The ambiguous local interval is preserved with a warning. Independent changes
continue. The catalog of automatically protected forms is unchanged.

Verified environment: Node 24.21.0, React/React DOM 19.3.0, parse5 8.0.0,
entities 6.0.1, pnpm 12.4.1. This task does not claim full browser, streaming,
hydration, or RSC acceptance. Those belong to #54–#56.
The HTML report is not a source markup patch. parse5 remains responsible for
serialization and recovery. Language-position quality is verified against the
accepted corpus. It is not a promise for any arbitrary word.

## Candidate verification results

- The 12 new combined test groups passed. The focused run of seven files passed
  90/90 checks, including previous quote, spacing, and hyphenation properties.
- Independent run: 54 000 inputs in 18 profiles across both locales, with 47 343
  distinct inputs. Another 18 000 inputs contained SHY inside possible technical
  forms, with 15 992 distinct inputs. There were zero failures for typography
  idempotence, SHY removal idempotence, and plain-text reproduction from source edits.
- 10 800 comparisons of text/HTML/pure React/`Puncta` SSR in the same profiles:
  zero differences. All 222 transparent-boundary checks passed for regression URI
  families, full transformation followed by removal, and protection.
- Types, lint, and formatting were checked. The full package gate and independent
  reviews are recorded when the PR is completed. These results do not replace
  the deferred browser and server matrix.

## Включённая группировка и числовые связи (#89)

`tests/digit-grouping-bonds.test.mjs` проверяет совместные итоговые правки
группировки, минуса, диапазона и внешней связи в исходных UTF-16 координатах.
Все 16 сочетаний выключателей units/ranges/percentages/currencies сохраняют
распознавание полного числа; группировка не выполняет выключенное оформление.
Неправильный диапазон получает одно предупреждение digitGrouping на весь диапазон,
а прежняя диагностика других правил остаётся собственной. Прозрачные разбиения,
replay, повторная обработка и компонентный SSR покрыты независимыми эталонами;
[матрица и свидетельства #89](digit-grouping.md#number-bonds-and-ranges-slice-89)
отделены от исторических результатов выше.

## Final digit-grouping integration (#93)

`tests/digit-grouping-acceptance.test.mjs` adds independent combined oracles from
`tests/fixtures/digit-grouping.mjs`: both locales, quotes, textual dashes, minus,
range/unit bonds, normalization, decimals with trailing zeros, currencies,
percentages, invalid ranges and repeated numeric boundaries. Every transparent
split is checked through HTML, pure React and component SSR with original-source
replay, full grouping diagnostics and an edit-free repeat. Nested settings,
protection and entity coordinates have a separate mixed-document oracle.

These checks exposed prose dashes being treated as numerical operators; grouping
now consumes the existing recognized textual roles, including with dash formatting
disabled. See the [final matrix and execution](digit-grouping.md#final-contract-matrix-93).
