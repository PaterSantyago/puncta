# Number bonds acceptance (#45)

Contract: canonical decisions #28, #30, #31, #32 and #33 linked from
[issue #45](https://github.com/PaterSantyago/puncta/issues/45).
Tests live in `tests/number-bonds.test.mjs`; expected text is independently
transcribed from the contract, never generated from the recogniser.

| Requirement                                       | Evidence                                                                                                                                                                       |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Full case-sensitive base catalogue and composites | Literal 44-unit input/output in both locales, whole designation negatives, unknown case, combining marks, suffixes and multiplication separators                               |
| Additional units                                  | Literal `a+b`, `x.y`, multiword designations, deduplication, array replacement, empty/null reset, invalid values even with rules disabled                                      |
| Percent and angle defaults                        | Exact U+00A0/no-space literals for both locales, explicit percentage override, independent switches and locale reset                                                           |
| Complete currency catalogue                       | Three symbols in both orders and locales, three codes in both orders; original numeric notation including leading decimals; original atypical intervals and `currency.order`   |
| Original provenance                               | UTF-16 insertion after emoji, entity deletion mapping, replacements owned by original space leaf, left-owned insertion and multi-leaf replacement                              |
| Equivalent representations                        | Canonical literals at every split across text, HTML, pure React and Puncta SSR; repeat processing emits no edits                                                               |
| Boundaries and protection                         | br/wbr, blocks, protected/unknown/disabled hosts, different and explicit scopes, opaque React components, technical tokens and protected ranges                                |
| Settings inheritance                              | Calls, `with`, declarative HTML/React, PunctaProvider; independent enabled fields and null defaults                                                                            |
| Interaction and invariants                        | Quotes/ellipsis/spaces literals, 12,000 seeded generated contexts over two locales and three configurations, original edits with replay, idempotence and full-range protection |

Numeric recognition never interprets or rewrites separators, signs or range
markers. It retains original spans for local interval edits. Range/minus
conversion remains #46. Currency recognition uses those same spans before any
unit spacing changes: `GBP1kg` becomes `GBP 1 kg` in one call.

For a currency with numbers on both sides, the attached side takes priority:
`1GBP 2` → `1 GBP 2`, `1 GBP2` → `1 GBP 2`. Existing NBSP counts as attachment,
so the decision remains stable on repeat processing. Equally attached sides are
ambiguous: `20  GBP  30` is retained with a `typography.ambiguous` warning. This
implements the contract's conservative ambiguity policy without moving currency.

Typography edits, including the currency warnings, project through the existing
shared structural context. No new public API or React reconciliation behavior is
introduced; the documented deep protection-toggle limitation remains unchanged.
