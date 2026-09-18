# Justif and Optical Margin for Puncta

Verification date: September 17, 2026. This study examined published npm artifacts,
source code, and a small Chromium test. It assesses integration. It does not
implement a new Puncta API.

## Conclusion

**Justif is the better basis for a separate, optional Puncta browser layout layer.**
It has an independent computational core and detailed punctuation options. It supports SHY and no-break spaces, and restores original DOM nodes. But its renderer
recomposes paragraph lines and temporarily replaces inline nodes with clones.
Direct integration into synchronous text/HTML or React-tree transformations would
change the existing contracts.

**Optical Margin 1.0.18 is not recommended as a ready-to-use Puncta dependency.**
Its smaller size and React component are useful. But the published implementation
loses some spaces, permits breaks in NBSP bonds, and interferes with SHY
hyphenation. The examples below reproduce these problems. The findings do not
come only from code inspection.

Neither package is a verified ready-to-use solution for punctuation extension
that preserves browser line breaks. Justif supplies useful models, tables, and
test cases. Its full engine is appropriate when the product offers paragraph
layout control.

## Verification scope

|                      | Justif                                                                                         | Optical Margin                                                                                            |
| -------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| npm latest           | `justif@0.9.1`, August 20, 2026                                                                | `@liiift-studio/opticalmargin@1.0.18`, July 6, 2026                                                       |
| Source               | Release `v0.9.1`, commit `adbe130b9f760f569944ec9eea5120791269bab6`                            | main `d8139aff6d88c7f79a6beb123f29e99bcdc247f1`, August 4; behavior also checked against the npm artifact |
| Current main         | `35f6f4dcea472105fde9ecf2e0eb3d593c5e0283`, September 10; not treated as the published release | package.json also specifies `1.0.18`; no release tags found                                               |
| License              | MIT for code; hyphenation data retains its own notices                                         | package.json specifies MIT; no separate LICENSE in the inspected tree or tarball                          |
| Published interfaces | ESM: main DOM API, `justif/core`, `justif/auto`, separate language modules; TypeScript         | ESM/CJS, one root export: DOM functions, React hook/component, TypeScript                                 |

Sources: [npm Justif](https://registry.npmjs.org/justif),
[npm Optical Margin](https://registry.npmjs.org/@liiift-studio%2fopticalmargin),
[Justif release package.json](https://github.com/lyallcooper/justif/blob/adbe130b9f760f569944ec9eea5120791269bab6/package.json),
[Optical Margin package.json](https://github.com/Liiift-Studio/OpticalMargin/blob/d8139aff6d88c7f79a6beb123f29e99bcdc247f1/package.json).
Preserve applicable notices when you reuse code. For Optical Margin, first ask
the authors to clarify the full copyright and license text.

## Model differences

**Justif** lays out the full paragraph. It selects breaks with Knuth–Plass and
accounts for hyphenation, spacing, tracking, and a variable font's width axis.
Punctuation extension is part of line-width calculation. Partial optical
extension (`protrusion`) and full extension of selected punctuation
(`hangingPunctuation`) are independent. Full extension can apply to line ends,
the first start and all ends, or all edges. Character sets are separate settings.
This adds paragraph composition, beyond a CSS property replacement.
[Release options](https://github.com/lyallcooper/justif/blob/adbe130b9f760f569944ec9eea5120791269bab6/README.md#options),
[extension model](https://github.com/lyallcooper/justif/blob/adbe130b9f760f569944ec9eea5120791269bab6/src/core/protrusion.ts).

**Optical Margin** first wraps words in `inline-block` elements with
`white-space: nowrap`. It identifies lines by their `top` coordinates.
Then it creates unbreakable line wrappers with actual `<br>` elements and
negative margins. It measures a structure that already contains unbreakable
words. Thus, preservation of original browser breaks requires verification.
[Algorithm](https://github.com/Liiift-Studio/OpticalMargin/blob/d8139aff6d88c7f79a6beb123f29e99bcdc247f1/src/core/adjust.ts).

Its formula is narrower than “full punctuation extension”:
`max(0, advanceWidth − actualBoundingBoxLeft − actualBoundingBoxRight) × maxHangRatio × hangFraction`.
It moves a fraction of the combined glyph side bearings, not a specified fraction
of the full character width. `maxHangRatio` scales that margin. The type documentation describes a limit relative to advance width.
Metrics use the root element's font. Different inline fonts are not modeled
separately.
[Measurement implementation](https://github.com/Liiift-Studio/OpticalMargin/blob/d8139aff6d88c7f79a6beb123f29e99bcdc247f1/src/core/adjust.ts),
[parameter types](https://github.com/Liiift-Studio/OpticalMargin/blob/d8139aff6d88c7f79a6beb123f29e99bcdc247f1/src/core/types.ts).

## Compatibility with Puncta text and locales

Justif deliberately keeps U+00A0 and U+202F inside an unbreakable block.
Source SHY works without an additional hyphenator. `hyphens: none` also disables
source SHY. For Puncta, the natural sequence is typography normalization and
locale-specific hyphenation positions, then layout with the resulting SHY.
Do not enable additional automatic language hyphenation in Justif by default.
It could add positions beyond Puncta's conservative selection.
Separate `en-gb`/`es` hyphenator modules exist. Their patterns do not establish
compliance with Puncta's language references.
[Tokenization](https://github.com/lyallcooper/justif/blob/adbe130b9f760f569944ec9eea5120791269bab6/src/core/items.ts),
[hyphenation API](https://github.com/lyallcooper/justif/blob/adbe130b9f760f569944ec9eea5120791269bab6/README.md#hyphenation),
[Puncta terms](../../CONTEXT.md).

Both projects recognize curly quotation marks and `«»`. Optical Margin has a
fixed set of permitted initial characters. It excludes Spanish `¿¡`.
`hangFractions` changes amounts but cannot add candidates. Justif includes these
characters in its partial-extension table. Its full-extension set can be extended
explicitly. The formatting profile must determine the extension amount.
A character's presence in the language is not sufficient.
[Optical Margin sets](https://github.com/Liiift-Studio/OpticalMargin/blob/d8139aff6d88c7f79a6beb123f29e99bcdc247f1/src/core/adjust.ts),
[Justif tables](https://github.com/lyallcooper/justif/blob/adbe130b9f760f569944ec9eea5120791269bab6/src/core/protrusion.ts).

Neither DOM renderer implements Puncta typography scopes or opaque and protected
fragments. A visual effect does not automatically permit space or wrapper changes
inside these fragments. An initial adapter should exclude paragraphs that
contain them. Alternatively, explicitly design atomic-fragment support and test
it separately.
[Puncta context](../../CONTEXT.md),
[Justif DOM reader](https://github.com/lyallcooper/justif/blob/adbe130b9f760f569944ec9eea5120791269bab6/src/dom/read.ts),
[Optical Margin traversal of all text nodes](https://github.com/Liiift-Studio/OpticalMargin/blob/d8139aff6d88c7f79a6beb123f29e99bcdc247f1/src/core/adjust.ts).

## DOM, React, SSR, and lifecycle

Justif usually leaves naturally single-line elements in native layout. It
recomposes them when the available width decreases. This does not mean that it
has no effect. The release separately corrects initial punctuation extension
with `text-indent`, without DOM replacement. Headings, short quotations, and a
single line's right edge need separate behavior decisions. Do not promise the
same result as for multiline paragraphs.
[Single-line mode](https://github.com/lyallcooper/justif/blob/adbe130b9f760f569944ec9eea5120791269bab6/README.md#options),
[nativeHangIndent](https://github.com/lyallcooper/justif/blob/adbe130b9f760f569944ec9eea5120791269bab6/src/dom/paragraph-state.ts).

Justif clones inline content while it controls the paragraph. Listeners and
JavaScript references to original nodes do not transfer to the clones.
`destroy()` restores the actual original nodes. Content changes require
`destroy()` and a new `justify()`. `refresh()`/`rescan()` handle geometry and
styles. The implementation handles font loading, resize, resource release, and
removal of inserted control characters during copying. Import is safe in SSR.
Actual layout requires a browser.
[Controller and limits](https://github.com/lyallcooper/justif/blob/adbe130b9f760f569944ec9eea5120791269bab6/README.md#use-the-javascript-api),
[clipboard](https://github.com/lyallcooper/justif/blob/adbe130b9f760f569944ec9eea5120791269bab6/src/dom/clipboard.ts).

Optical Margin resets `innerHTML`, then serializes the ancestor chain separately
for each word. Formatting often looks similar, but node identity is lost.
`id` attributes can be duplicated. `removeOpticalMargin()` restores an HTML
string, not the original nodes. The hook stores original HTML once.
It responds to options, width, and `document.fonts.ready`. It has no contract for
synchronization when children change, and cleanup does not restore the DOM.
The measurement cache uses the character and font string as its key.
It is not reset after a web font loads. Thus, fallback-font metrics might be
reused. This is a code-based inference; no separate font-loading test was run.
[Hook](https://github.com/Liiift-Studio/OpticalMargin/blob/d8139aff6d88c7f79a6beb123f29e99bcdc247f1/src/react/useOpticalMargin.ts),
[DOM transform](https://github.com/Liiift-Studio/OpticalMargin/blob/d8139aff6d88c7f79a6beb123f29e99bcdc247f1/src/core/adjust.ts).

`OpticalMarginText` does not make imperative DOM replacement compatible with
Puncta's React-tree preservation contract. Both options need a separate DOM
ownership boundary. A `useEffect` call over arbitrary React children is
insufficient. Optical Margin does no measurements on SSR import.
But its published root ESM statically imports `react` and `react/jsx-runtime`,
despite optional peer dependencies. There is no public vanilla/core entry.
Thus, “zero dependencies” does not mean that native ESM import is independent of
React. In a separate Node 20.18 check, `justif` and `justif/core` imported without
browser globals. Optical Margin import from an isolated directory failed with
`Cannot find package 'react'`. The browser checks below supplied React to the
bundler from the existing environment.
[npm artifact 1.0.18](https://registry.npmjs.org/@liiift-studio/opticalmargin/-/opticalmargin-1.0.18.tgz),
[exports](https://github.com/Liiift-Studio/OpticalMargin/blob/d8139aff6d88c7f79a6beb123f29e99bcdc247f1/package.json).

## Local checks of published packages

Both npm tarballs were downloaded to `/tmp/puncta-hanging-research`.
No dependencies were installed in the project. Existing esbuild bundled their
ESM. Existing Playwright ran the bundles in headless Chromium **145.0.7632.6**.
Shared style: `font: 20px Arial; line-height: 1.5`.
Optical Margin used defaults. Justif used `protrusion: true`,
`hangingPunctuation: 'all-line-edges'`, `tracking: false`, and `expansion: false`,
without a hyphenator. The check waited for `controller.ready` after the call.

| Input and check                                                | Optical Margin 1.0.18                                                                           | Justif 0.9.1                                                                                      |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `Hello <em>world</em> <strong>again</strong>!`, width 160px    | `textContent` became `Hello worldagain!`. The separate space between tags was lost.             | Space preserved                                                                                   |
| Link with `id="link"`, five words, and a direct click listener | Five links with the same id. Listener failed. Effect removal did not restore the original node. | Node also replaced and listener failed during the effect. `destroy()` restored the original node. |
| `aaaa 10\u00a0kg bbbb cccc dddd`, width 85px                   | `10` and `kg` on different lines, y=12 and y=42                                                 | Bond preserved, both at y=42                                                                      |
| `back\u00adbone`, width 65px                                   | One line instead of two; `scrollWidth` increased to 87px                                        | Two lines, width 65px. Layout used SHY; destroy restored the original SHY.                        |
| `one<br><br>two`, width 160px                                  | Empty line lost: height 90→60px                                                                 | Both explicit breaks preserved, height 90px                                                       |

To reproduce, render each input in a `<p>` with the specified style.
Keep a reference to `<a>`. Then call `applyOpticalMargin(p, p.innerHTML)` or
`justify(p, options)`. Check `textContent`, link count, node identity after
remove/destroy, height, and `Range.getBoundingClientRect()` for `10`/`kg`.
The executed script and full values remain in
`/tmp/puncta-hanging-research/probe.mjs` and `probe-results.json`.
These are temporary local materials, not permanent repository files.

The checks do not assess visual quality, all browsers, screen readers, actual
clipboard operation, React hydration/updates, or long-document performance.
They confirm specific Optical Margin text/break preservation failures and the
difference in node restoration. Justif DOM `textContent` during layout also need
not equal the source string. For example, SHY becomes a visible hyphenation break.
This is another reason to keep source text and Puncta reports separate from the
rendered result.

## Size and testability

Measurements include published JavaScript files and their static relative
imports. gzip was applied to their concatenation. This is **not the final size
after tree shaking** or an application's network budget.

| Entry                          | Source JS |     gzip |
| ------------------------------ | --------: | -------: |
| `justif`                       | 260 956 B | 62 264 B |
| `justif/core`                  |  73 692 B | 16 540 B |
| `@liiift-studio/opticalmargin` |   7 484 B |  2 904 B |

Justif language modules are excluded from the main size. Optical Margin excludes
external React. Neither package.json has runtime `dependencies`.
Optical Margin has React peers and the static imports described above.
The unpacked npm package size is not a user download measurement.
It includes alternative entries, types, and language data.
Sources: [Justif tarball](https://registry.npmjs.org/justif/-/justif-0.9.1.tgz),
[Optical Margin tarball](https://registry.npmjs.org/@liiift-studio/opticalmargin/-/opticalmargin-1.0.18.tgz).

Justif has unit tests for the algorithm, hyphenation, and Unicode spaces.
Its Chromium/Firefox/WebKit Playwright checks include NBSP, clipboard, and
performance. This shows available tests. It does not claim that this study ran
and passed the complete upstream suite. Optical Margin has two happy-dom test
files with simulated Canvas and geometry. They do not replace real browser
layout checks.
[Justif tests](https://github.com/lyallcooper/justif/tree/adbe130b9f760f569944ec9eea5120791269bab6/test),
[browser config](https://github.com/lyallcooper/justif/blob/adbe130b9f760f569944ec9eea5120791269bab6/playwright.config.ts),
[Optical Margin tests](https://github.com/Liiift-Studio/OpticalMargin/tree/d8139aff6d88c7f79a6beb123f29e99bcdc247f1/src/__tests__).
Neither test count nor version `1.0` alone establishes maturity.

## Reuse approach

1. **For paragraph layout:** Prototype a separate optional browser adapter over
   public `justify()`. Pin its version. Start with static, noninteractive
   paragraphs in a separate DOM region. Run Puncta first, then Justif after
   hydration. Correctly release controlled DOM before React updates.
   Define lifecycle and fallback behavior. Agree on protected/opaque fragment
   handling. Check fonts, resize, copying, and screen readers.
   Geometry changes must not enter the source-text typography edit report.
2. **For a custom renderer:** `justif/core` exposes `buildItems`, `breakParagraph`,
   `layoutLines`, extension tables, and types. This is an actual extension point.
   The adapter must supply width/glyph measurement, a styled-fragment model,
   and rendering. The core is DOM-free. It cannot produce plausible server layout
   without metrics for the specific font and width.
   [Exports](https://github.com/lyallcooper/justif/blob/adbe130b9f760f569944ec9eea5120791269bab6/src/core.ts),
   [Measure](https://github.com/lyallcooper/justif/blob/adbe130b9f760f569944ec9eea5120791269bab6/src/core/types.ts).
3. **For hanging punctuation only:** Use Justif models and test ideas as the basis
   for a small dedicated layer. Do not assume a separate public DOM measurer
   exists. Dynamic optical measurement is internal to `src/dom/*`.
   Direct imports from internal paths are unreliable. First agree on an upstream
   export or assess whether a small custom solution is necessary.
   [Internal optical module](https://github.com/lyallcooper/justif/blob/adbe130b9f760f569944ec9eea5120791269bab6/src/dom/optical.ts).

Reusing all of Optical Margin for its smaller size would require accepting or
correcting the text and structure failures that Puncta must prevent.
For this project, saving a few tens of kilobytes does not outweigh that
maintenance cost.
