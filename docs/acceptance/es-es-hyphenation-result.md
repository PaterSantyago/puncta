# Spanish hyphenation acceptance result

This report covers #51, the shared Liang kernel, Spanish resource refinement 1,
and the independently frozen corpus from #49. The 361-word corpus, its 60 mandatory
words and 32 negative cases are unchanged. No runtime or preparation code reads
acceptance fixtures. These findings describe tested examples, not general accuracy.

## Language result

Plain text, HTML and pure React pass all 361 positive entries with **zero erroneous
positions and zero missing mandatory positions**. All 32 negative cases pass
with the specified skip and warning priority on all three surfaces. The only
optional omission is `desamparo` at UTF-16 position 2, category `prefixes`:
**one optional position in one word**. Other categories have zero omissions.

The unchanged 4,694-pattern research baseline has zero incorrect positions and omissions in 27 words. Seven mandatory positions are missing: camino, casino, divino, domino, felino, gusano, and humano, each at position 4.
Its general `2no.` pattern suppresses these final-syllable boundaries.
The versioned `V3no.` spelling-class layer resolves that suppression without
whole-word exceptions. Independent pointwise family holdouts also pass; their
linguistic rationale and sources are separate from algorithm output.
See [resource preparation](../../resources/es-es/README.md).

## Requirement evidence

| Requirement                                           | Verification                                                                                                                                                                                                                                                            |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Controlled shared ESM kernel and synchronous resource | Both locale modules use the same core positional kernel. `hyphenation-resources.test.mjs` reproduces baseline and derivative hashes and compares to an independent full-pattern calculation.                                                                            |
| Fixed inputs, no forbidden exceptions, notices        | Exact TeX SHA-256, unique paths, one patterns block, no hyphenation block or doubly anchored patterns, max merging and byte reproduction are asserted by `prepare-es-es.mjs --check`. Pack and consumer gates check shipped notices, manifest and installed table hash. |
| Alphabet, case, minima, warning priority              | All 32 frozen negative entries across text/HTML/React, plus Kelvin-sign source-alphabet regression, raised minima and incompatible-resource cases.                                                                                                                      |
| NFC/NFD and original coordinates                      | Every positive word in lowercase and initial capital, decomposed accents, transparent splits including inside a grapheme, original spelling, grapheme-boundary edits and left-leaf placement.                                                                           |
| Frozen positive corpus                                | All 361 entries, all required positions, exact source preservation, no incorrect positions; omissions logged by word and category.                                                                                                                                      |
| Locale changes, reset and isolation                   | Defaults select each new locale; explicit es-es minRight 2 errors in en-gb, null restores 3. HTML and React scopes, independent instances and immutable resource snapshots.                                                                                             |
| Diagnostics and repeated processing                   | Original UTF-16 ranges, entity input ranges, repeated ambiguity warnings, original edit replay, manual SHY and protection; 2,000 generated Spanish cases test idempotence and replay.                                                                                   |
| Installed Spanish-only and both-locale use            | Consumer gate exercises text/HTML/pure React and renderToString, NFD, ambiguity, removal, resource hashes, locale switching and minimum reset in npm/pnpm isolated installations.                                                                                       |

Focused functional/resource tests and typechecking pass. Independent root checks also pass:

- 792 Spanish NFC/NFD/case variants.
- 6,320 transparent splits across the three surfaces.
- 60,000 mixed-locale idempotence/replay cases and 9,000 equivalent-input cases.
- Exact entity coordinates, warning ranges, and source-alphabet priority.

English's 313-word corpus and independent 5,438 split checks remain unchanged.
Run `pnpm check` for the complete repository and installed-artifact gate.
Its execution result, review closeout and exact-head CI status are recorded
in PR #72 and the issue #51 completion report.

## Technical-token regressions

Spanish exposes four punctuation interactions found during generated testing.
A punctuation edit guarded against creating a technical token must remain guarded
after SHY insertion. The lookahead now ignores SHY when comparing token creation;
actual technical-range recognition is unchanged. Ellipsis substitution also
preserves dots when the change would create a newly protected technical token
and alter quotation recognition on a later call. Independent neighboring
punctuation still transforms. Focused regressions cover all three inputs.

## Scope and limitations

Tested local runtime: Node 24.21.0, React/React DOM 19.3.0; build tool tsdown 0.23.0.
This slice verifies synchronous APIs and installed SSR smoke scenarios. It does
not claim the later full browser, streaming, hydration or RSC acceptance matrix.
No public npm publication is performed.

The Spanish upstream is a general resource, constrained here by es-es admission
and whole-word `tl` ambiguity skips. Arbitrary pronunciation or morphology is not
inferred. Existing SHY are authoritative. Source case and normalization are
preserved; actual line layout remains the renderer's responsibility. HTML is
compared after standard parsing. Scope and opaque boundaries conservatively
skip adjoining fragments; an accessible delimiter inside the scope removes that
uncertainty. Undisclosed React component content is not traversed.
