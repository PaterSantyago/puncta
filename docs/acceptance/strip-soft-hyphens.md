# Separate SHY removal acceptance

Issue #47 adds `stripSoftHyphens` (default/explicit text and HTML) and
`stripSoftHyphensReact` in the pure entry. The public tests are in
`tests/strip-soft-hyphens.test.mjs`; installed consumer declarations are checked
by `scripts/install.mjs`.

- Literal independent oracle: `ex<SHY>ample` becomes `example`, preserving quotes,
  spaces, punctuation, dashes, units and every non-SHY scalar. No language pattern
  positions are computed, so insertion language oracles belong to later slices.
- Original UTF-16 deletion ranges, HTML entity spelling and React source ownership;
  locale-specific applied-rule pairs; repeated removal has no edits.
- Default/explicit formats, rejected foreign-format options, all result overloads.
- Insertion disabled versus full disable; explicit independent re-enable; plain
  protected ranges, protected hosts and unread declarations, unavailable language
  with a supported child, opaque components and attributes.
- Technical URL protection over every transparent leaf split.
- Deterministic bounded Unicode generation injects SHY into a known original;
  removal must recover that original, preserve a wholly protected input and replay
  edits against the original coordinates. This complements the literal examples.
- Missing insertion resources reject creation, `with` and ordinary processing;
  removal call/host options still validate structure and locale minima without
  requiring insertion resources.

HTML remains the existing fragment/div mode. Insertion resources and language
corpora, wider HTML contexts and the full browser matrix are later work. Existing
React arbitrary-depth protection-toggle limitations remain unchanged.
