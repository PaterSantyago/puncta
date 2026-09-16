# Independent es-es word-division corpus

Issue #49 supplies an independent linguistic oracle for later insertion work.
`tests/fixtures/hyphenation/es-es.json` contains admitted words and
`es-es-negative.json` contains separate policy cases. Neither is a runtime
lexicon. No engine comparison belongs to this change.

## Authority and individual reasoning

The primary authority is the RAE/ASALE
[Diccionario panhispánico de dudas, guion, second edition, §2](https://www.rae.es/dpd/guion),
consulted on 16 September 2026. Every record supplies an individual written
analysis and the rules applied to it. The annotations were written directly
from linguistic reasoning, then their literal separators were transcribed to
UTF-16 offsets. No Puncta output, other library, patterns, upstream exceptions
or research output tables supplied positions.

Each allowed set is intended complete under the recorded analysis and effective
settings. Adjacent vowels remain together for line division even in a hiatus;
initial isolated vowels and positions below the 2/2 minima are excluded.
Ordinary consonants, consonant clusters and digraphs follow §§2.1 and 2.6.
The annotations describe independent possible boundaries: displaying several
boundaries does not imply a line can end at all of them simultaneously.
Contextual layout preferences (§2.15) concern actual line placement, which is
outside an oracle for possible SHY positions.

The current §2.5 treats silent h as absent when determining syllable and vowel
boundaries. Thus adhesive and inhibition examples must not copy older rules
that invariably placed a boundary before consonant-preceded h. The x examples
cover both following vowels and following consonants (§2.4). The prefix examples
name the independent base and retain both syllabic and morphological options
where allowed. The newer rr exception preserves prefixes ending in r before
r-initial bases (§§2.6a and 2.7a); ordinary rr remains intact. False-prefix examples
come from §2.7's explicit exclusions and retain only permitted syllabic cuts.

The five loanwords are Spanish adaptations, supported individually by
[RAE fútbol](https://www.rae.es/dpd/fútbol),
[escáner](https://www.rae.es/dpd/escáner),
[champú](https://www.rae.es/dpd/champú),
[béisbol](https://www.rae.es/dpd/béisbol) and
[búnker](https://www.rae.es/dpd/búnker).
Their Spanish spellings admit Spanish analysis; no foreign-language division is
inferred merely from an admitted alphabet. The chosen accented fútbol and
béisbol forms are appropriate to Spain. This deliberately transparent vocabulary
is not a representative sample or a claim about accuracy on arbitrary text.

## Independence, review and freeze

The 60 required words were selected before the optional category examples.
Their required positions were fixed before any insertion comparison. Independent
root and Spec linguistic review preceded corpus-only commit
`aea82b3` and its hash manifest. The review removed the invalid `su|brayar`
position: the productive prefix makes the syllable boundary `sub|rayar`
(DPD §2.6b), so the general morphological alternative rule does not justify
inventing a different syllable boundary. It also corrected the spelling of the
negative example `decatlón`. All 361 admitted words, 60 mandatory positives and
32 negatives were reviewed before freezing; no unresolved linguistic findings
remain. The ordinary forms `domino` (from dominar) and `cubito` (from cubo) are
intentionally unaccented, not misspellings of dominó or cúbito.

The freeze manifest identifies both JSON files by SHA-256. Git history separates
the data-only freeze from validator implementation. Hashes prove identity, not
language correctness. Later corrections require independent linguistic evidence,
a recorded review and a new version. Engine mismatches must not be used to trim
mandatory positions or restore forbidden runtime exceptions.

## Interpretation and reproduction

Positions are zero-based UTF-16 offsets in the exact source, at grapheme
boundaries. Settings are effective insertion settings. Required positions are a
subset of allowed positions; optional omissions are counted separately from
errors. Case, NFC/NFD and text-node variants must reuse these records without
inflating the distinct-word count.

Negative cases describe the insertion stage only. Ordinary mode has no diagnostic
report; detailed mode uses canonical #31 warning codes. They cover all expected
skips, unsupported NFC/NFD characters, ligatures, mixed scripts and protection.
Whole words containing tl are skipped with `hyphenation.language-ambiguity`,
including positions far from tl. Protected text and ordinary skip conditions
win before ambiguity analysis. Existing SHY and original source spelling remain
unchanged by insertion. Other typography can independently edit punctuation.

The validator runs with `node --test tests/hyphenation-corpus.test.mjs` and through
`pnpm test:functional` / `pnpm check`. It checks literal evidence consistency,
not an insertion algorithm: distinct admitted words, mandatory counts, each
category, actual ch/ll/rr diversity, settings, sorted positions, grapheme
boundaries, minima, subset containment, sources, reviews and negative coverage.
Deliberately corrupted records exercise failure paths. English fixtures and
acceptance requirements remain intact.

Later insertion acceptance must report added positions outside the allowed set,
missing required positions and optional omissions separately, by locale and
category. Errors and missing required positions fail acceptance. Plain text,
HTML and React variants reference the same words. Runtime Unicode preservation,
node mapping, idempotence, SSR and diagnostics remain later implementation work.
