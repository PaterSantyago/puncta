# Quotes and apostrophes (#44)

The literal corpus in `tests/quotes.test.mjs` follows the accepted
[#28 resolution](https://github.com/PaterSantyago/puncta/issues/28#issuecomment-5683640825),
sections 2, 8 and the quote/apostrophe rows of section 9. It covers all applicable
quote literals; dash, number, currency and hyphenation rules belong to later slices.
Boundary, diagnostics and option expectations follow #30–#33.

| Requirement                                                      | Public verification                                                                                                                                           |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| en-gb/es-es outer and nested pairs, arbitrary alternating levels | Literal corpus, four-level literal, existing formatted pairs                                                                                                  |
| Preserved styles and neighbouring pair compatibility             | All canonical normalizeExisting:false examples; conflicting preserved children remain unchanged with warning                                                  |
| Apostrophes independent of quote formatting                      | Contractions, O'Neill, plural possessive, disabled apostrophes within quotation; U+02BC and feet/inches preservation                                          |
| Text/HTML/pure React/component equivalence                       | Every two-leaf partition of every quote corpus row; text, parse5-decoded HTML, pure tree and actual Puncta SSR; repeated structured conversion                |
| Quote boundaries                                                 | LF/CR/CRLF, blank lines, br/wbr, opaque code/img, blocks, child Spanish scope, custom component, Suspense content/fallback/outside                            |
| No protected-text inspection                                     | Explicit text ranges, opaque code with an internal unpaired delimiter; generated whole-input protection identity including warning suppression                |
| Independent settings and reset                                   | text/with, per-field and group null, HTML markers, pure tree, Provider/Puncta and changed locale                                                              |
| Original coordinates and final edits                             | Astral prefix; exact quote entities; distinct delimiters; split inner-space deletion with preserved empty elements; before reconstructed from original leaves |
| Spacing and ellipsis interaction                                 | Spanish inner-space removal, independent spaces disable, final nonoverlapping edits, no punctuation moved through a quote                                     |
| Idempotence                                                      | All literals/partitions, 60,000 bounded generated inputs with fixed seed 4401, six minimized regressions plus colon-spacing regression                        |

Run `pnpm build && node --test tests/quotes.test.mjs`; the full repository gate is
`pnpm check`. The environment is Node 24.21.0 and React/React DOM 19.3.0. This slice
checks renderToString; the later full browser, streaming and RSC matrix is not
claimed here. The existing limitation for arbitrary deep protection toggles is
unchanged; keyed reorder guarantees are not broadened.

Recognition is conservative rather than a universal linguistic parser. Missing
partners, incompatible preserved neighbours and ambiguous delimiters are retained;
protected text is not inspected to resolve them. Removing an interval that would
create a new technical token is also conservative, while a known punctuation-space
insertion is considered in that decision. Warnings can recur on unchanged input.
