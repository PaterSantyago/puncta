# Independent en-gb word-division corpus

Issue #48 supplies test data for the later insertion implementation. The JSON in
`tests/fixtures/hyphenation/en-gb.json` is a linguistic oracle, not a runtime
lexicon. Neither package code nor language resources may import it.
`en-gb-negative.json` holds separate policy cases and does not contribute to the
word or positive-example counts. No insertion implementation is exercised here.

## Authority and method

The primary rule source is the Council of Europe's
[English style guide, 2021, sections 11.2–11.4, printed page 20](https://rm.coe.int/style-guide-english-1-/1680ac8731#page=21).
It uses pronunciation and word construction together: compound and affix
boundaries must agree with pronunciation; monosyllables are not divided. We
apply those rules to individual words and record the reasoning with every entry.
The guide's actual title page says 2021; some search indexes label it 2019.

The corpus deliberately concentrates on transparent constructions. Closed
compounds have two monosyllabic constituents; the simple derivatives have a
monosyllabic base and suffix. Monosyllables contribute genuine admitted words
with an independently established empty allowed set. They are not policy skips.
This distribution is not a claim of representative vocabulary coverage or an
accuracy estimate for arbitrary English. British spellings and lengths are
explicit categories; plural and derived forms are distinct words, but case,
Unicode and node variants cannot inflate the counts.

For the eight words required by #33, British pronunciation from Oxford,
Cambridge or Collins is combined with the guide's rules. Dictionary IPA is
pronunciation evidence, not a ready-made line-break table. Each entry explains
its mapping to written boundaries and the effect of the 2/3 minima. The
`universities` entry uses Oxford's explicit plural form and applies the same
analysis to its non-syllabic plural ending.

Each `allowedPositions` is intended to be the complete permitted set under this
stated rule analysis and the entry's settings, not just a preferred subset.
For simple constructions, exhaustiveness follows from the absence of syllables
inside either component. For the eight special words, the reasoning considers
other syllables, morphology and minimum filtering. Both `man|uscript` and
`manu|script` are retained: choosing only the preferred morphological boundary
would falsely classify the other analysis as an error. Historical morphology
is not an unconditional licence to cut against current British pronunciation.
The independent review added optional `univers|ity` and `univers|ities` at 7:
the guide's `human|ism` example shows that IPA dots alone cannot exclude a valid
morphological cut. The entries separately justify excluding `re|ciprocity` and
`recipro|city` by their short stressed vowels and construction.

Sources were read on 16 September 2026. Root and implementation agents reviewed
the entries independently; a separate Spec review examined the special words
before the freeze. The negative expectations come from the canonical
[#29 contract](https://github.com/PaterSantyago/puncta/issues/29#issuecomment-5683906630)
and [#33 acceptance decision](https://github.com/PaterSantyago/puncta/issues/33#issuecomment-5695491875).
The guide and publisher pages are publicly available; some Cambridge pages are
accessible through indexed content when a direct fetch fails. Links with `/us/`
still contain explicitly labelled British pronunciations; only those British
fields are used.

## Independence and freeze

Words and all allowed/required positions were selected before any engine
comparison. No Puncta insertion result, other hyphenation library, resource
pattern, upstream exception-position table or Liang research output was used
to choose or adjust them. General web searches surfaced unrelated automatic
hyphenation pages; those were not used as evidence. The 60 required words were
chosen from transparent compounds before sorting the literal data alphabetically.

`en-gb-freeze.json` records the SHA-256 of both data files. Git history records
the corpus-only freeze commit before the validator and its tests. A checksum
proves data identity, not linguistic correctness. Subsequent corrections need
new independent source reasoning, an explicit review and a new corpus version;
engine mismatches are evidence to investigate, never a reason to erase required
positions or restore prohibited runtime exceptions.

## Data interpretation

- Positions are zero-based UTF-16 offsets in the exact source, between graphemes.
  `settings` contains effective insertion settings, including `enabled: true`.
- Required positions are a subset of allowed positions. An empty required set
  permits omissions; it does not permit additions outside the allowed set.
- A negative entry describes the insertion stage only. Other typography may
  independently change apostrophes or punctuation. Its detailed diagnostics use
  the `hyphenation.unsupported-characters` and `hyphenation.mixed-scripts` codes
  already fixed by canonical #31. Ordinary mode has no diagnostic report.
- Negative inputs cover genuine ASCII/curly/modifier apostrophes and ordinary,
  Unicode and nonbreaking hyphens, existing SHY, short words, case, digits,
  protection, unsupported NFC/NFD diacritics, a ligature and Cyrillic mixing.
  Protected unsupported/mixed-script inputs explicitly have no warning.

## Reproduction and later acceptance

Run `node --test tests/hyphenation-corpus.test.mjs` on the pinned Node version.
The same check runs through `pnpm test:functional` and the full `pnpm check`.
The validator reads only the literal fixtures; it imports no product, language
resource or hyphenation engine. It validates identity, counts, admitted spelling,
settings, distinct words, required categories, real length diversity, sorted
positions, grapheme boundaries, minima, required containment, source/review
metadata and negative-case coverage. Deliberately damaged fixtures demonstrate
that invalid evidence is rejected. This is data consistency, not a simulated
insertion algorithm or a proof that an engine meets the acceptance contract.

Later engine acceptance must report every added position outside `allowedPositions`,
every missing required position, and other omissions separately by locale and
category. All errors and missing required positions fail acceptance. The eight
special words have no mandatory positions in this version; omissions remain
visible in that later report. Plain text, HTML and React/node variants should
reference the same records without adding to the vocabulary count. Their
runtime, idempotence, Unicode preservation and diagnostic behaviour remain work
for the insertion slice, not a claim made by this data-only change.
