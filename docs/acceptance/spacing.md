# Spaces and punctuation intervals (#43)

The literal corpus is versioned with `tests/spaces.test.mjs`. Its source is the
accepted [#28 resolution](https://github.com/PaterSantyago/puncta/issues/28#issuecomment-5683640825),
sections 3, 8 and 9. Added boundary literals follow its preservation rules; expected
strings are independent of the implementation. They are not outputs from another
typography engine. No language hyphenation corpus is claimed by this slice.

| Requirement                                                                              | Public verification                                                                                                                                                                   |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Collapse ordinary spaces; retain indentation, blank lines, tabs, NBSP, numbers and dates | Ordinary-space literals for both locales; LF/CR/CRLF cases; punctuation and numeric exceptions                                                                                        |
| Existing Spanish signs, no missing signs added, no punctuation movement through quotes   | Spanish corpus and existing-sign test; plain text, HTML, pure React and real component SSR                                                                                            |
| Three-dot replacement; four-plus dots unchanged; ambiguous intervals preserved           | Common corpus and existing `ellipsis.test.mjs`; ASCII/U+2026/separated-dot variants                                                                                                   |
| Inline equivalence and ownership                                                         | Every two-leaf partition of the literal corpus, including surrogate pairs and combining sequences; insertion on the left; cross-leaf deletion/replacement and retained empty elements |
| Original UTF-16 diagnostics                                                              | Exact text edits, HTML entity positions, multi-leaf warning ranges, sources used to reconstruct every edit's `before`; existing CRLF/entity provenance tests                          |
| Protection and structural boundaries                                                     | New per-rule protection cases plus `protection.test.mjs`; br/wbr/hr/img/block boundaries; warnings suppressed in protected text                                                       |
| Independent switches and scope inheritance/reset                                         | Plain calls, `with`, declarative HTML/pure React and nested Puncta/Provider tests; spaces disabled while ellipsis remains enabled and conversely                                      |
| Repeat without new edits                                                                 | Each expected literal and every structured partition; 20,000 bounded generated inputs, fixed seed 4301, both locales; separate whole-input protection identity assertion              |
| Preserve future special intervals                                                        | Literal NBSP units/percentages, currency ordering and formatted dashes; no special rule is implemented here                                                                           |
| Mounted source/settings updates and hydration                                            | `tests/browser/run-scopes.mjs`: ten updates retaining the stateful child and DOM identity; Spanish punctuation/spaces hydration; existing eight protection reorder scenarios          |

Run the corpus with `pnpm build && node --test tests/spaces.test.mjs`. The repository
check remains `pnpm check`. Browser reproduction and pinned tooling are documented
in [the browser harness](../../tests/browser/README.md). This slice uses Node
24.21.0 and React/React DOM 19.3.0; browser evidence is Chromium 151.0.7922.34, not
the future three-browser, streaming and RSC acceptance matrix.

Ambiguous ellipsis intervals, spaced numeric punctuation and punctuation periods
between text are preserved with a `spaces` warning. This conservative choice does
not parse Markdown, infer missing punctuation, or implement future quote/dash/unit
rules. Spaces do not cross opaque or structural boundaries. The previously recorded
React limit for arbitrary deep protection toggles remains unchanged.
