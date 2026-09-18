# English hyphenation resource

The installed locale statically includes a Liang table. `node
scripts/hyphenation/prepare-en-gb.mjs --check` reproduces its bytes without network
access. Omit `--check` to regenerate from the checked-in fixed input. Generation
never reads the acceptance corpus. Public APIs do not load files or initialize
resources at runtime.

## Sources and preparation

The upstream input is
[hyph-en-gb.tex at 5684c0f](https://github.com/hyphenation/tex-hyphen/blob/5684c0f51c0b81133db2efbe60a408b4155a3ff5/hyph-utf8/tex/generic/hyph-utf8/patterns/tex/hyph-en-gb.tex).
Its checked SHA-256 is recorded in [manifest.json](manifest.json). The recipe
removes comments, accepts exactly one `patterns` block and validates its alphabet
and count. It excludes the separate `hyphenation` block entirely. No exception
compiler, ready-made exception table, Hyphenopoly data, word list, or acceptance
fixture participates. The raw upstream file is an audit input, not a runtime or
npm resource.

The four doubly anchored patterns `.an4on.`, `.di4al.`, `.du4al.`, `.ed4it.` are
removed with an exact-list assertion. This yields the separately identified
8,523-pattern baseline, matching both hashes published by the original research:

- Canonical newline-separated patterns:
  `7861f3896d2ec2de347b9b8ba8ebde36f9875a42bcb3ce6558ee82d9c72c104b`.
- Compact compiled baseline table:
  `2a8a5208a7bf6076125d32033a97e71551a804e557f9753a6ecdfd6b5f7859f9`.

The kernel and compiler are controlled ESM derivatives of
[hyphen at 86a09f1](https://github.com/ytiurin/hyphen/tree/86a09f1c1282dea8708b9b6f6bde7ad58e7d7c17).
The positional kernel retains trie matching, maximum weights and odd parity;
Puncta owns segmentation, admission, minima, original coordinates and insertion.
The compiler preserves the upstream boundary-dot convention and table ordering.
Before compilation, matching character paths merge coordinatewise by maximum;
appending overlapping refinements to an overwriting compiler would be incorrect.

## Puncta refinement version 1

The baseline alone fails the independently frozen corpus: three incorrect
positions and four mandatory omissions. The shipped derivative therefore has a
separate, versioned Puncta-owned language layer. It is **not** described as the
unchanged research table. Baseline, refinement, combined patterns and compiled
output have separate hashes in the manifest.

The conservative layer omits both candidate positions around a single consonant between vowel letters: `VCV`. Vowels are `aeiou`. Consonants are the remaining ASCII letters. Before an isolated `h`, baseline positions remain
eligible; after it, omission still applies. These 525 generated patterns have
weight 8. This is a coverage policy, not a statement that all such divisions are
wrong. It does not identify ambiguous whole words, infer pronunciation or emit
English language-ambiguity warnings.

English syllable assignment depends on stress, vowel quantity and morphology.
The spelling class deliberately avoids choosing between competing assignments.
The [Cambridge English Pronouncing Dictionary introduction, §2.6](https://assets.cambridge.org/052186/2302/frontmatter/0521862302_frontmatter.pdf)
discusses assignment of intervocalic consonants; [Rubach's RP-based study](https://doi.org/10.1017/S0952675700002104)
examines ambisyllabicity and quantity. These sources motivate caution, not this
literal spelling filter. [Harley's chapter, p.66 and §3.4](https://dingo.sbs.arizona.edu/~hharley/PDFs/WordsBook/Chapter3.pdf)
explains the exclusion of /h/ from English syllable codas. This motivates retaining
baseline positions before isolated `h`; spelling is not a phonetic transcription,
and not every `VhV` word is thereby certified.

Separately, 23 productive component patterns have weight 9, allowing independently
supported morphological boundaries to override that omission:

- `book9` supports the book component and its suffix derivatives.
- `9child` and `9field` support those components in compounds. They do not introduce
  an initial position in `children` or `fielding`.
- `bath9C` for every consonant except `y` supports bath compounds with a
  consonant-initial continuation. It deliberately does not match the vowel/y
  continuations in `bathetic`, `bathymetry`, `batholith`, `bathing` or `bathysphere`.
  Non-insertion is not a claim that every omitted boundary is forbidden.

The [Council of Europe guide, §§11.2–11.4](https://rm.coe.int/style-guide-english-1-/1680ac8731#page=21)
supports division at constituent and suffix boundaries subject to pronunciation.
Independent pointwise family tests were selected before testing this refinement:
`bathhouse`, `bathwater`, `bathmat`, `bookish`, `bookkeeper`, `bookshelf`,
`schoolchild`, `stepchild`, `godchild`, `cornfield`, `snowfield`, `infield`,
`outfield`. Forbidden boundary checks cover `bathymetry` and `bathetic`.
[The fixture](../../tests/fixtures/hyphenation/en-gb-refinement.json) records the
scope and primary sources. These are boundary checks, not exhaustive word oracles.

The family patterns neither enumerate completed compounds nor match full words.
They do not restore the eight deleted exceptions. Their limited coverage does
not promise general morphological recognition or correctness on arbitrary words.
The complete unchanged corpus, every mandatory position, and all eight removed
exception words are checked separately. Optional omissions are reported by word
and category in [the acceptance result](../../docs/acceptance/en-gb-hyphenation-result.md).

## Distribution and licenses

The English data is MIT, attributed to Dominik Wujastyk and Graham Toal. The OUP
training list is not redistributed. The kernel and compiler are ISC, attributed
to Yevhen Tiurin. The English locale archive and core archive contain their own
`NOTICE.md`; the compiler's notice remains beside the build tooling. Archive
checks read these notices from real packed artifacts. The locale also ships
`hyphenation-manifest.json`, reproduced with its data and checked against the
installed table hash. Puncta's own code and
refinement are covered by its MIT license.
