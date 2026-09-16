# Dashes, ranges and minus acceptance

Issue [#46](https://github.com/PaterSantyago/puncta/issues/46) implements canonical
[#28](https://github.com/PaterSantyago/puncta/issues/28#issuecomment-5683640825),
with the shared options, protection and diagnostic contracts from #30–33.

The literal oracle in `tests/dashes.test.mjs` checks both locales through plain
text, HTML, pure React and component SSR at every two-leaf transparent split.
It also verifies repeat processing and original-source provenance.

| Input                                   | en-gb                                   | es-es                                 |
| --------------------------------------- | --------------------------------------- | ------------------------------------- |
| `word -- word`                          | `word – word`                           | Preserved ambiguous marker            |
| `Llegó --sin avisar-- ayer`             | `Llegó – sin avisar – ayer`             | `Llegó —sin avisar— ayer`             |
| `The plan — if approved — starts today` | `The plan – if approved – starts today` | `The plan —if approved— starts today` |
| `10-12 kg`                              | `10–12 kg`                              | `10–12 kg`                            |
| `-5 kg`                                 | `−5 kg`                                 | `−5 kg`                               |
| `10-12`, `5-3`, `well-known`, `- Hola`  | Preserved                               | Preserved                             |

Spaces in the numeric outputs above are U+00A0. Number notation stays unchanged.
Known unit recognition uses the same complete, case-sensitive catalogue and
`units.additional` additions as number bonds, even with unit formatting disabled.
`ranges.standalone: true` enables an isolated numeric range; chained signs,
dates and arithmetic remain ambiguous and produce `typography.ambiguous`.
Technical protection still applies.

`dashes.normalizeExisting: false` preserves existing typographic dash style and
intervals while processing explicit ASCII markers. `dashes.enabled: false`
also disables those markers. Independent range/minus switches, immutable
instance options, null resets, declarative scopes and Provider scopes have
public API tests. Special dash intervals take precedence over ordinary spaces.
No dialogue inference or soft hyphen insertion is included.
