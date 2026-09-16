# English hyphenation acceptance result

This report covers issue #50, resource refinement 1 and the independently frozen
313-word English corpus from #48. The corpus and its mandatory positions are
unchanged. These results describe tested examples, not arbitrary-text accuracy.

## Corpus result

The public text, HTML and pure React APIs add no positions outside the allowed
sets and omit no mandatory positions. All 60 mandatory words are covered.
Nineteen negative cases retain the specified skip/warning priorities in all three
inputs. Optional omissions total **42 positions in 33 words**. Runtime code and
resource generation do not import the corpus.

The original 8,523-pattern baseline had three incorrect additions:
`reciprocity` at 2 and 7, `universities` at 9; and four missing mandatory positions:
`bathtub` at 4, `bookend` at 4, `brainchild` at 5, `coalfield` at 4. The independently
reviewed productive-family layer and conservative VCV omission policy resolve
these without whole-word exceptions. The original eight exception words remain
in the gate; all their permitted positions are omitted by this conservative
resource. Their positions are not reconstructed from the upstream exceptions.

## Optional omissions by word

| Word         | Omitted positions | Categories                                                      |
| ------------ | ----------------- | --------------------------------------------------------------- |
| careless     | 4                 | derivatives-suffixes, different-lengths                         |
| chequebook   | 6                 | closed-compound, british-spelling, different-lengths            |
| gatepost     | 4                 | closed-compound, different-lengths                              |
| graveyard    | 5                 | closed-compound, different-lengths                              |
| guidebook    | 5                 | closed-compound, different-lengths                              |
| homeless     | 4                 | derivatives-suffixes, different-lengths                         |
| hopeless     | 4                 | derivatives-suffixes, different-lengths                         |
| horseman     | 5                 | closed-compound, different-lengths                              |
| houseboat    | 5                 | closed-compound, different-lengths                              |
| however      | 3                 | removed-exception-word, different-lengths                       |
| inkblot      | 3                 | closed-compound, different-lengths                              |
| lifeboat     | 4                 | closed-compound, different-lengths                              |
| manuscript   | 3, 4              | removed-exception-word, different-lengths                       |
| manuscripts  | 3, 4              | removed-exception-word, different-lengths, derivatives-suffixes |
| nightclub    | 5                 | closed-compound, different-lengths                              |
| notebook     | 4                 | closed-compound, different-lengths                              |
| playing      | 4                 | derivatives-suffixes, different-lengths                         |
| raining      | 4                 | derivatives-suffixes, different-lengths                         |
| reading      | 4                 | derivatives-suffixes, different-lengths                         |
| reciprocity  | 3, 4, 8           | removed-exception-word, different-lengths                       |
| rooftop      | 4                 | closed-compound, different-lengths                              |
| rosebud      | 4                 | closed-compound, different-lengths                              |
| saucepan     | 5                 | closed-compound, different-lengths                              |
| shoelace     | 4                 | closed-compound, different-lengths                              |
| shouting     | 5                 | derivatives-suffixes, different-lengths                         |
| singing      | 4                 | derivatives-suffixes, different-lengths                         |
| something    | 4                 | removed-exception-word, different-lengths                       |
| soundtrack   | 5                 | closed-compound, different-lengths                              |
| throughout   | 7                 | removed-exception-word, different-lengths                       |
| universities | 3, 6, 7, 8        | removed-exception-word, different-lengths, derivatives-suffixes |
| university   | 3, 6, 7           | removed-exception-word, different-lengths                       |
| weekend      | 4                 | closed-compound, different-lengths                              |
| whiteboard   | 5                 | closed-compound, different-lengths                              |

Category totals overlap because a word can belong to several categories:

| Category               | Omitted positions |
| ---------------------- | ----------------- |
| british-spelling       | 1                 |
| closed-compound        | 17                |
| derivatives-suffixes   | 14                |
| different-lengths      | 42                |
| removed-exception-word | 17                |

## Reproducibility and distribution

The exact upstream commit, input SHA-256, baseline hashes, refinement hash and
prepared-table hash are recorded in
[the resource manifest](../../resources/en-gb/manifest.json). The
[preparation and language rationale](../../resources/en-gb/README.md) distinguish
the original research baseline from Puncta's separately versioned refinement.
The compiler and kernel are controlled ISC derivatives of hyphen. The language
patterns are MIT. Core and English locale archives carry their notices, verified
by the real archive gate. Installed npm/pnpm consumers exercise synchronous
English insertion without runtime loading.

Run `node scripts/hyphenation/prepare-en-gb.mjs --check` to compare regenerated
artifacts byte for byte. The recipe reads only the fixed upstream TeX input and
the declared refinement recipe. It ignores the entire exception block, removes exactly the four
audited doubly anchored patterns, generates the declared character-class/component
layer, merges matching paths by coordinatewise maximum, and compiles the table.
The frozen corpus is read only by tests.

## Technical coverage

The focused tests cover shared word admission across transparent leaves, left-leaf
seam ownership, opaque/protected/scope edges, existing SHY across leaves, exact
original UTF-16 insertions and HTML entities, raised minima, disable flags,
resource availability/compatibility, stable registry snapshots and isolated calls.
Typography precedes insertion, with a temporary provenance map back to original
text. SHY remains part of word-boundary checks in numeric and unit recognition,
preventing later typography from treating a hyphenated word prefix as a unit.
Apostrophe roles come from the wider quotation context, including quotations
across lines and opaque nodes; trailing possessives remain whole-word skips even
when apostrophe formatting is disabled. Word joiners at protected edges do not
expose otherwise incomplete fragments. Mixed-script diagnostics compare Unicode
Script properties using the fixed Unicode 17.0 alias inventory (source and hash
in `unicode-scripts.ts`, Unicode License V3 in the core notice); Common and
Inherited characters do not contribute a distinct script. Punctuation spacing
preserves an ambiguous interval when inserting a space would create a new
technical token at that boundary, keeping quotation recognition stable on a
subsequent call. The committed generator uses the full 32-bit random value and
asserts more than 1,900 distinct inputs among its 2,000 combinations.

An independent direct Liang computation checks maximum weights, duplicate paths,
odd parity and boundary anchors; it is a computational comparison, not a language
oracle. Fifteen independently chosen productive-family boundaries include positive
examples and two forbidden positions outside the original frozen corpus.

Additional coordinator probes checked 313 words in two case forms, 5,438 splits
through HTML/pure React/SSR, 30,000 generated idempotence/edit-replay inputs and
4,500 input-equivalence cases. A separate direct Liang implementation checked
10,000 synthetic pattern cases. All passed after the unit-boundary fix. These
probes supplement the committed tests; no full browser/runtime matrix is claimed
for this slice. Browser/runtime verification remains in #54–#56, and the
comprehensive archive/installed-consumer matrix remains in #57.
