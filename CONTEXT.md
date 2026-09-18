# Puncta

Puncta prepares text for publication with the typography rules of the selected locale.

## Language

**Typography normalization**:
Changes to spaces, quotation marks, punctuation, and other typographic characters to follow text formatting rules.

**Typography edit**:
A change from the source text that results from typography rules. HTML structure recovery and changes to serialized HTML notation are not typography edits.

**Locale**:
A language and region with defined typography rules. The first Puncta locales are British English (`en-gb`) and Spanish from Spain (`es-es`).

**Typography profile**:
A set of typography normalization settings for a locale. Each locale has one default profile. Individual settings can override the defaults.

**Digit grouping**:
Separation of integer digits into groups of three, from right to left, with a narrow no-break space.

**Narrow no-break space (NNBSP)**:
The U+202F space character. It separates digit groups and prevents line breaks between them.
_Avoid_: Short space

**Non-breaking bond**:
A connection between text elements that prevents a line break between them. A number and its unit of measurement are one example.
_Avoid_: Hyphenation

**Hyphenation**:
Division of a word across lines at a position permitted by its language. This differs from a non-breaking bond and an explicit line break.

**Hyphenation position**:
A position inside a word where hyphenation is permitted. This position does not require a line break.

**Language reference for hyphenation**:
A word in the selected locale with permitted hyphenation positions. Language sources or justified rules verify these positions independently of the algorithm under test.

**Required hyphenation position**:
A permitted position in a language reference that Puncta must mark with the specified settings. Acceptance criteria can permit other valid positions to be missing. These omissions are recorded.

**Soft hyphen (SHY)**:
A character that marks a possible hyphenation position. It is invisible when the word has no line break. It is not an ordinary hyphen or an explicit line break.

**Typography scope**:
A text fragment with shared typography settings and a locale. A nested scope inherits explicit settings from its enclosing scope and can override them. Its own locale supplies the defaults.

**Recognition context**:
The surrounding text used to recognize words, quotations, and non-breaking bonds. Its boundaries depend on the construct. For example, a line break interrupts a word but can preserve quotation context.

**Opaque fragment**:
A fragment whose content the enclosing typography scope cannot analyze. It occupies a position in the text and prevents words on its two sides from joining. It can contain its own typography scope.

**Protected fragment**:
Text excluded from typography analysis and transformation, together with all its nested content. It can occur inside a processed quotation. It does not participate in word or bond recognition with surrounding text.
