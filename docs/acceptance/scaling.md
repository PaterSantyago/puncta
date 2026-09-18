# Typography scaling regression

The baseline at `3a93a08` rescanned complete accessible text for each whitespace
interval and each candidate ellipsis, quote pair or dash group. Even `"a ".repeat(n)` caused quadratic recognition work without edits or warnings. Input lengths 1000, 2000, and 4000 sent 501500, 2003000, and 8006000 characters to the technical recognizer, respectively. A separate ellipsis-spacing regexp retried from every
position in a long space run.

The implementation now indexes the SHY-free view and whitespace boundaries once
per technical context. Hypothetical changes inspect the affected window with its
boundary delimiters retained. Quoted email can cross whitespace, so contexts
containing both an ASCII double quote and `@` retain the complete check. The
multiset comparison, warning conditions and original UTF-16 coordinates remain
unchanged. No-op spacing checks still run because they can produce warnings.

The ellipsis-spacing search starts only at the beginning of a space run. Other measured repeated work was also removed. The implementation scans immediately preceding spaces, tracks indentation in one forward pass, and indexes range overlaps and numeric bonds. It evaluates apostrophe lookahead only when necessary.
Range overlap uses the original strict inequalities, including zero-length
insertions and touching boundaries. Its append-only index uses O(n) memory and
O(log n) insertion/query time for n UTF-16 code units.

## Run separately from functional tests

```sh
pnpm build
pnpm test:scaling
# One scenario:
pnpm test:scaling mixed
```

Use the pinned Node 24.21.0, a quiet machine and no concurrent builds or tests.
Imports, instance creation and input construction are outside the timing region.
Each size has three warmups and seven samples; the script compares medians and
fails if 4× input takes 8× time or more. This is a coarse regression signal for
the diagnosed cases, not a portable millisecond budget or a deterministic CI
unit test. It is intentionally separate from `pnpm check`.

Measurements on the development machine, 2026-09-17, milliseconds per warm call:

| Scenario         | UTF-16 lengths | Baseline medians | Revised medians | Revised growth |
| ---------------- | -------------- | ---------------- | --------------- | -------------- |
| U+0020 only      | 4000 → 16000   | 8.27 → 105.43    | 1.69 → 6.05     | 3.57×          |
| Repeated `a `    | 1000 → 4000    | 7.31 → 104.18    | 0.95 → 3.31     | 3.48×          |
| Mixed en-gb seed | 4300 → 17200   | 108.40 → 1532.56 | 3.68 → 16.27    | 4.42×          |

The mixed seed is `"backbone" -- 24kg, 50 % and university... `, including its
trailing space. These measurements establish improvement on the reproduced
scenarios, not a global linear-time guarantee. Long unbroken recognition
contexts, quoted-email fallback, other regexps and repeated output assembly can
still require superlinear work on other inputs. This change does not claim to
bound all adversarial inputs.

## Behavior checks

`tests/technical-context.test.mjs` freezes public reports from the baseline for
unchanged ambiguous spacing, UTF-16/SHY mapping, quoted email spanning spaces,
long indentation, and independent dash/ellipsis decisions. Existing literal
locale corpora, protection tests and every-two-leaf partition tests remain the
independent linguistic and adapter oracles.

During implementation, an isolated baseline bundle was compared against 9300 complete public reports from fixed-seed generated inputs (`0x12345678`). Cases covered both locales, six setting profiles, text, explicit protection, HTML, and pure React with transparent inline splits. The comparison covered the full result,
edits, warnings, sources and applied rules; all matched. That differential
experiment is development evidence, not a substitute for the checked-in tests.

Independent review additionally compared 7500 local technical-context queries
against full-context recognition and exhaustively checked integer range-query
endpoints for source lengths 0–19 after repeated appends. Both the Standards and
Spec reviews found no issues. These probes exercised implementation invariants;
the permanent tests continue to exercise the public API.

## Number-bond grouping slice (#89)

The unchanged default-profile scaling gate was rerun separately on
`72a5bbc5579b91c5accc31cfcff71d344e854dc3`, after all other local tests/builds
finished. All three 4× ratios remained below 8×; exact medians, environment and
commands are recorded in [digit grouping #89](digit-grouping.md#execution-and-independent-review).
Grouping-specific scaling inputs remain #92; these default-disabled measurements
are regression evidence only.

## Long numeric records and transparent trees (#92)

Acceptance code revision: `886e6105bd332c47bec9f12ac1d750aaf872ab9b`.
Measured on 2026-09-17, macOS 27.0 (26A428), arm64 Apple M3,
Node 24.21.0, pnpm 12.4.1, React/React DOM 19.3.0; frozen lockfile install.

The existing three disabled-profile scenarios remain. Twelve new enabled-profile
scenarios time detailed public text/HTML/pure React calls: continuous ASCII digits,
a long decimal ending in `.00`, valid space groups, and a malformed middle group.
A preflight outside the timer requires actual edits for the first three and one
`digitGrouping` warning with no edits for the malformed case. Functional tests
independently check exact output and complete report replay; preflight is not their
replacement.

Sizes are 1,000 and 4,000 numeric blocks. Source UTF-16 length is exactly 4×;
HTML markup grows from 12,000 to 48,000 or 13,000 to 52,000 code units, and both
HTML and React grow from 1,000 to 4,000 transparent `em` leaves. React lengths below
refer to available source text, not a serialized tree. Instance creation, imports,
all strings/trees and preflight assertions precede the timed region. Each size
uses three warmups and seven samples, and the median ratio must be below 8.
No builds or tests ran concurrently with these measurements.

```sh
pnpm test:scaling
pnpm test:scaling grouping-digits-text
```

| Scenario               | UTF-16 text lengths | Median ms, small → large | Growth |
| ---------------------- | ------------------- | ------------------------ | ------ |
| spaces                 | 4,000 → 16,000      | 1.784 → 6.708            | 3.760× |
| words                  | 1,000 → 4,000       | 0.970 → 3.424            | 3.529× |
| mixed                  | 4,300 → 17,200      | 3.671 → 14.673           | 3.997× |
| grouping-digits-text   | 3,000 → 12,000      | 1.084 → 4.053            | 3.740× |
| grouping-digits-html   | 3,000 → 12,000      | 4.014 → 16.844           | 4.197× |
| grouping-digits-react  | 3,000 → 12,000      | 3.050 → 11.520           | 3.777× |
| grouping-decimal-text  | 3,000 → 12,000      | 1.053 → 3.772            | 3.583× |
| grouping-decimal-html  | 3,000 → 12,000      | 2.844 → 15.658           | 5.506× |
| grouping-decimal-react | 3,000 → 12,000      | 2.683 → 10.998           | 4.099× |
| grouping-groups-text   | 4,000 → 16,000      | 1.705 → 7.338            | 4.304× |
| grouping-groups-html   | 4,000 → 16,000      | 4.034 → 19.157           | 4.749× |
| grouping-groups-react  | 4,000 → 16,000      | 3.450 → 13.708           | 3.973× |
| grouping-invalid-text  | 4,000 → 16,000      | 1.474 → 6.040            | 4.099× |
| grouping-invalid-html  | 4,000 → 16,000      | 3.626 → 16.851           | 4.647× |
| grouping-invalid-react | 4,000 → 16,000      | 2.869 → 11.860           | 4.134× |

### Reproduced regression and correction

At base `531ae7960b6fb8658bfc95fa45f57749f0a7f2af`, the new continuous-digit text
scenario failed: 3,000 → 12,000 UTF-16 units took 22.183 → 325.914 ms,
**14.692×**. A Node CPU profile attributed most samples to the numeric-punctuation
and feet/inches regexps retrying from every digit after an unsuccessful search.
Both now start only at the start of a digit run, preserving the matched grammar.

The first correction exposed 8.512× growth for the transparent HTML case. Further
profiling found unnecessary edit projection for inactive hyphenation and repeated
scans of every source leaf for each separator edit. Inactive insertion passes now
omit their optional private callback. A context-local prefix index locates the
first touched leaf by binary search and traverses only intersecting spans. Empty
and virtual spans retain their original semantics, and insertion at a transparent
seam still belongs to the left nonempty leaf. Text output is assembled once in
source order instead of copying the growing output once per edit.

The final gate passed all 15 scenarios (3.529–5.506×). These are measured regression
bounds for these inputs, not a portable latency budget or a global linearity
promise. Active hyphenation and unrelated adversarial contexts are not added to
this numeric scaling claim.

A development differential compared 3,000 complete public reports against the
base bundle with grouping disabled (seed 9202): both locales, text, inline HTML,
and pure React; ASCII and Unicode digits, measurement quotes, numeric punctuation,
spaces, units, currency and non-BMP prefixes. Every report matched. Existing
independent locale, combined-processing, scopes and runtime fixtures remain the
permanent compatibility checks. See [slice #92](digit-grouping.md#long-input-and-scaling-slice-92)
for functional mapping and final check evidence.

## Final grouping integration (#93)

The isolated gate was rerun after all other final builds/tests on
`a1dbffa72af52003b97976d7f8e783f512c5079b`: all 15 scenarios passed, with
3.363–5.408× median growth for 4× input/tree size. Long ungrouped text measured
1.066 / 3.948 ms (3.704×). The complete per-scenario lengths, leaf counts,
medians, environment and commands are in the
[final measurement table](digit-grouping.md#final-scaling-measurements).
These fresh results supersede earlier measurements for final #93 acceptance;
the earlier tables remain historical evidence of the diagnosed regressions.
