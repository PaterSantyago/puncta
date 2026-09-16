# Spanish hyphenation resource

The installed locale statically includes a Liang table for the shared core engine.
`node scripts/hyphenation/prepare-es-es.mjs --check` reproduces every generated
byte without network access. Omit `--check` to regenerate. The recipe never reads
acceptance fixtures, word lists or completed-word positions.

## Fixed source and preparation

The sole data input is
[hyph-es.tex at 5684c0f](https://github.com/hyphenation/tex-hyphen/blob/5684c0f51c0b81133db2efbe60a408b4155a3ff5/hyph-utf8/tex/generic/hyph-utf8/patterns/tex/hyph-es.tex),
Spanish 5.0 (2019-09-24). Its exact SHA-256 is
`6a2e5f39a991a23d1cd8a23dbd0f6fe96a9f07561a6695f4f3320f47030e236c`.
Preparation validates this hash, strips comments, accepts exactly one patterns
block, and verifies alphabet, 4,694 records, unique character paths and absence
of doubly anchored patterns. The unchanged baseline reproduces both research
hashes: canonical patterns
`7ae8fa8d6a61ea4111c4a0412d019b62e7c07a62673121d0b711c5bc08d8e00c`
and compiled table
`c5ea234b536f78465e33b233b1beb75799eb5cf9143c561c74c137376243cd5b`.

The audited upstream generator and its spelling-family data are described in
[the fixed research](https://github.com/PaterSantyago/puncta/blob/af35f410829a7c45f0af82c692c49acf075c9e7f/docs/research/liang-engine-and-resources.md).
The generator is not executed here. `eshyphexh.tex`, hyphenation blocks,
whole-word exceptions, compiled exceptions and dictionaries are excluded.
The pattern shape checks supplement the provenance audit; shape alone cannot
prove the historical origin of every pattern. The raw TeX audit input is not
shipped in the npm package.

## Puncta refinement 1

The baseline produces no erroneous positions on the independently frozen
361-word corpus, but omits seven mandatory final `no` boundaries. Its general
`2no.` pattern blocks them. Puncta adds eleven `V3no.` patterns, one for each
vowel letter in `aeiouáéíóúü`. The boundary is between the vowel and the single n;
only a terminal `no` is affected. This is a spelling class, not an enumeration of
completed words or a restored exception list. Maximum-weight merging preserves
other coordinates and stronger baseline restrictions.

[RAE DPD, guion §2.1](https://www.rae.es/dpd/guion) requires syllable boundaries
and explicitly allows the final division of teléfono.
[Instituto Cervantes, Plan curricular B1–B2 §3.1.1](https://cvc.cervantes.es/ENSENANZA/biblioteca_ele/plan_curricular/niveles/03_pronunciacion_inventario_b1-b2.htm)
assigns a single intervocalic consonant to the following syllable. Together these
support the general final-no boundary. Independently selected boundary holdouts
are recorded separately in
[es-es-refinement.json](../../tests/fixtures/hyphenation/es-es-refinement.json).
They are pointwise checks, not complete word oracles. The frozen acceptance
corpus and all its mandatory positions remain unchanged.

The [manifest](manifest.json) records separate hashes for baseline, refinement,
merged patterns and compiled table. This shipped derivative is not represented
as the unchanged research table. Compilation uses the same controlled ESM
compiler as English, with the same maximum-weight and anchor semantics.

## Admission, mapping and distribution

The core admits a–z, á/é/í/ó/ú/ü/ñ, normalizes supported graphemes privately to NFC,
and maps candidate boundaries back to original UTF-16 offsets. Source base
letters must themselves be in the supported alphabet: canonical folding of the
Kelvin sign does not make it a supported letter. No source letters are rewritten.
The `tl` policy skips the whole word after expected skips and alphabet checks;
it does not claim to identify all pronunciation or morphological ambiguities.

Spanish data are MIT/X11, attributed to Javier Bezos, CervanTeX and Francesc
Carmona. The full original header is in the shipped `NOTICE.md`; the compiler's
ISC notice stays beside the shared build tool, and the kernel's in core.
The locale archive also contains `hyphenation-manifest.json`. Packed and
installed artifact gates verify notices and the installed table checksum, with
Spanish-only and both-locale consumers. No runtime file or network loading occurs.
