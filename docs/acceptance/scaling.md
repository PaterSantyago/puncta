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
