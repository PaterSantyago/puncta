# Installation and first-result documentation

[Documentation index](../README.md)

Scope: [issue 107](https://github.com/PaterSantyago/puncta/issues/107).
Source baseline: `83b8c7acd5d6cfbe33c47f87c4c26f050628415f`.
The library source is unchanged in this slice.

## Checks

The implementation check passed on 2026-09-18 with Node 24.21.0, npm 11.19.0,
and pnpm 12.4.1. The installed example checker used TypeScript 7.0.2.
All four local archives have manifest version `0.1.0-alpha.0`. Their functional
source comes from the baseline above; they are not the public scaffold archives.

| Command or check              | Result                                                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                  | Passed: lint, formatting, documentation, types, build, archive checks, tests, installation, and release validation. |
| Functional tests              | 286 passed; no failures or skipped tests.                                                                           |
| Release tests                 | 3 passed; no failures or skipped tests.                                                                             |
| Publication tests             | 6 passed in disposable local registries; no real publication.                                                       |
| Displayed examples            | Six sources compiled and ran with npm, then with pnpm. All displayed outputs matched.                               |
| Minimal consumers             | Each manager installed core plus en-gb, then core plus es-es; TypeScript was the only extra direct dependency.      |
| Existing consumer matrix      | All eight adapter/locale combinations passed runtime, declaration, and dependency checks.                           |
| `pnpm docs:check`             | 11 pages, 63 local links and anchors, six examples, nine pending coverage groups.                                   |
| Negative documentation checks | A missing anchor and a changed source marker each caused a failure. The original files were restored.               |

After prose edits, `pnpm format:check`, `pnpm docs:check`, and `pnpm pack:check`
passed again. The example source and expected output did not change.

The [coverage inventory](documentation-coverage.json) maps each displayed example
to its Markdown source. `pnpm docs:check` checks the marked source/output blocks,
registered pages, relative links, local targets of documentation-branch URLs,
and coverage entries. It does not claim that remote branch URLs are available.

`pnpm test:install` extracts those exact blocks, compiles them against installed
public declarations, runs them, and compares stdout with the displayed output.
The existing isolated registry supplies matching archives. Separate npm and pnpm
consumers install only core, one locale, and the TypeScript checker. The existing
adapter consumer matrix also runs.

## Extend the checks

Register new pages and examples in the coverage inventory. Put an
`<!-- puncta:example example-id -->` marker before each complete TypeScript or
TSX block. Put a matching `<!-- puncta:output example-id -->` marker before its
`text` output block. Each example lists its required public packages. The
installation check selects examples whose packages are present in a consumer.

Public API changes must update the related documentation and examples in the
same change, or state why no user-facing change is necessary. Later slices must
extend the inventory with exact exports, types, options, defaults, rules, and
codes, and compare those entries with source. Pending groups are not a completed
coverage audit.

## Limits

Public functional installation, release versions, and release-tag links are
pending. Package README links point to the working documentation branch. All
three unique URLs returned HTTP 200 on 2026-09-18 after the branch push:

- [Documentation index](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/docs/README.md).
- [Installation](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/docs/getting-started/installation.md).
- [Text and HTML quick start](https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/docs/getting-started/text-and-html.md).

These links must use release-matched targets at release. Existing detailed
package material remains here for later migration. Its complete language review
is pending.
Browser, SSR, and RSC documentation verification is outside this slice.

The author used the
[official ASD-STE100 Issue 9 rules and dictionary](https://www.asd-ste100.org/assets/files/ASD-STE100_ISSUE9.pdf)
for a first prose pass.

## Separate review

A separate agent reviewed revision `7d4deb6849de99544fbd12fcb3956926db1721b5`
for facts, navigation, coverage, and ASD-STE100 Issue 9. The specification review
passed. The language review found two groups of P2 issues:

- Ordinary words that the dictionary does not approve: “following” and “retained”
  in package introductions and this report.
- Perfect and complex passive constructions in compatibility text and this report.

The separate reviewer checked the corrections at revision
`af6ede583da338e28909cc4205cc68e46d4ce00d`. The factual and language reviews
passed for issue 107. No unresolved findings remain in this slice.

`pnpm format:check` passed after the corrections. `pnpm docs:check` passed with
11 pages, 66 local links, and six examples. No example source, output, or library
behavior changed.
