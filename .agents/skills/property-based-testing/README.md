# Property-Based Testing Skill

Guidance for property-based testing across languages, including Echidna and Medusa for
EVM smart contracts.

## What it does

- **Spots PBT opportunities** — encode/decode pairs, validators, normalizers, pure
  functions with wide input domains, smart-contract invariants
- **Writes property tests** — strategy design, edge-case pinning, settings
- **Reviews existing ones** — tautologies, vacuous `assume()`, missing stronger
  properties
- **Triages failures** — separates a wrong property from an ambiguous spec from a
  real bug

## Structure

```
skills/property-based-testing/
├── SKILL.md                          # Property catalog, failure modes, routing
└── references/
    ├── generating.md                 # Strategy design, settings, edge cases
    ├── refactoring.md                # Rearrangements that expose a property
    ├── reviewing.md                  # Quality issues by severity
    ├── interpreting-failures.md      # Grounding and classifying a failure
    └── libraries.md                  # Library per language; Echidna/Medusa
```

### What was cut, and why

Three reference files were removed rather than rewritten, and one was kept after
initially being cut. Recorded because a deletion with no rationale is indistinguishable
from an oversight:

- **`design.md`** — a Phase 1–5 prose workflow. AGENTS.md requires step-by-step model procedures in scripts. Scripts either run or fail. Prose does not give the same execution guarantee.
- **`strategies.md`** — per-language generator syntax. `st.integers(min_value=1)` and
  `fc.string()` are not knowledge a current model lacks, and paying context for them
  crowds out the judgment it does lack. `generating.md` keeps the parts that are
  decisions rather than syntax: constraints in the strategy instead of `assume()`,
  `@example` pinning, `deadline=None`.
- **`refactoring.md`** — cut, then **restored** in trimmed form. The cut was wrong. Both SKILL.md and the strength ordering can lead to "this code is a poor PBT candidate". This file provides alternatives: extract the pure core, add the missing inverse, separate structure/rendering, return instead of mutate, or inject the dependency. The `evals/03` fixture demonstrates this. `send_welcome_email` uses impure SMTP, but message construction can be separated and tested with properties. Measured runs found that boundary without prompting. The restored version omits the fragile `rg` detection commands, two of which were incorrect. It also omits an effort/risk table and a priority list that repeated the strength ordering. The "generators for validators" pattern was already covered by `st.composite` in `generating.md`.

The eval harnesses are deliberately **not** inside the skill. They are at the plugin root alongside `evals/`. Thus, the guidance directory excludes 900 lines of bash, a `requirements.txt` that names hypothesis, and deliberately broken test fixtures:

```
evals-extra/                          # run by hand, never by `make check`
├── run.sh                            # Trigger-rate eval
├── effectiveness.sh                  # Does the suite find a real bug?
├── *.md                              # Labelled queries (query/should_trigger)
└── fixture/                          # Small repo the queries refer to
```

**Every command below runs from the plugin root** (`plugins/property-based-testing/`).

## Evals

Two things are worth measuring and they are not the same thing.

### Why `evals-extra` and not `evals`

A full sweep is 45 Claude sessions, ~52 minutes and ~$36. This cost is unsuitable for routine checks. The directory name keeps these sweeps outside automatic checks. A developer runs them when the description or guidance changes.

The `--self-test` entry points are the exception and do run in `make check`. They use stub binaries, cost nothing, and take about nine seconds. They verify that the harness still distinguishes results. An evaluation that stops measuring can incorrectly report success indefinitely. The Makefile discovers them with an `evals*` glob, so the rename does not
smuggle them out of CI.

Two infrastructure globs depend on that prefix. Both report failure if it changes. `python-tests` excludes `evals*/fixture/`, which contains a deliberately vacuous `assume()` test that pytest must fail. The plugin validator skips `evals*` when resolving reference links.

**Does the skill fire?** `evals-extra/run.sh` runs each labeled query in
`evals-extra/*.md` against a real session and compares the trigger rate against
`should_trigger`. Eight of the fifteen queries are similar but negative cases, including a libFuzzer harness, a mutation-testing campaign, and a Slither scan. A description that always triggers is as incorrect as one that never triggers.

```sh
./evals-extra/run.sh                        # 3 runs per query, 4 at a time
RUNS=1 ./evals-extra/run.sh                 # smoke
PLUGIN_DIR=/tmp/old ./evals-extra/run.sh    # score a different copy of the skill
./evals-extra/run.sh --self-test            # free: proves the harness still discriminates
```

One session per query per run, so a sweep is `queries x RUNS` — 45 at present. The
script prints the count on startup; trust that over any number written down here.

Timing and cost, from the 45-session sweep below: **51.9 min at `JOBS=4`, $36.50**
($0.81/session, read from each session's own `total_cost_usd`). Both figures track API
latency, which moves a lot — median session duration was 78s on one sweep and 175s on
another. The wave dispatcher is a barrier, so the slowest session in each wave of
`JOBS` sets that wave's pace.

Two parameters are set from measurement rather than taste, and both were wrong before:

- **`TIMEOUT_S=600`.** The slowest legitimate session in a clean sweep took **449s**.
  At the old 300s it was killed, and four such kills invalidated a whole sweep.
- **`TURNS=200`.** The slowest took **32 turns**. The old cap of 14 truncated five of eight sessions in one sample. An interim value of 30 would still stop this session. The value 200 is 10x the observed natural completion and cannot trigger before the timeout. The note in `run.sh` explains why this limit remains.

Invocation is stochastic, so one run per query measures nothing: the Echidna query
scored 0/1 on one sweep and fired on the next identical run. Read a single-run sweep
as a smoke test only.

**A failed session is not a non-trigger.** A crash, timeout, or rate limit produces no Skill call. That result is indistinguishable from a model's decision not to use the skill. Previously, it counted as a miss within the permitted failure margin. Ten queries with three runs and a floor of 27 permit three misses. A query could crash in all three runs while the total of 27 still passed. Now the sweep reports failures in the `NOTE` column and distinguishes `timeout` from `crash:*`. It marks the query `INVALID` because its denominator is unknown. It exits 3 regardless of score. Every other query still runs and is still reported.

**But an invocation outranks a failure.** A Skill call is final positive evidence. Later session events cannot undo it. The detector therefore runs *before* exit-status classification. A `yes` remains valid regardless of process completion. Only the absence of a call depends
on the session having reached a decision. Getting this backwards is what corrupted the
figures below.

**Every session's raw stdout and stderr is kept**. The directory is printed at the start and end of the run. The cleanup trap excludes it. This is not optional
instrumentation: two sweeps produced ten failures that were undiagnosable afterwards
because the captures were deleted the moment they had been classified. Failures are reported in the final `result` record on **stdout**. In a clean 45-session sweep, all 90 stderr files were empty. Reading only stderr gives no information. Artifacts accumulate (~4MB/sweep) and are never cleaned up.

| exit | meaning |
|---|---|
| 0 | every query met its expectation and every session returned a verdict |
| 1 | regression — fewer queries passed than `EXPECT_PASS` |
| 2 | harness failure — no queries discovered, or a malformed eval file |
| 3 | invalid — a session crashed, timed out, or returned nothing |

Measured on `opus`: 3 runs per query, 45/45 sessions returned a verdict, and `run.sh` exited 0. This was the first valid measurement from the suite. Per-query rates:

| query | expect | rate |
|---|---|---|
| 01-roundtrip-codec | true | **0/3 FAIL** |
| 02-normalizer-idempotence | true | 2/3 |
| 03-hypothesis-existing | true | 3/3 |
| 04-echidna-invariant | true | 3/3 |
| 05-review-weak-tests | true | 3/3 |
| 07-fuzz-serializer-noname | true | 3/3 |
| 08-sort-comparator | true | 3/3 |
| all 8 negatives | false | 0/3 each |

Totals: **14/15 queries passed, recall 6/7, precision 8/8, raw trigger hits 17/21.**

### The previously recorded figures were wrong, and why

An earlier version of this file recorded 13/15, recall 5/7, 14/21, with 04 and 07 at
1/3 each. Do not trust those. The classifier checked session exit status *before* skill invocation. It discarded sessions as crashes if they invoked the skill and then reached the 14-turn cap.
In one recovered sample, **9 of 12 sessions were discarded, although all 12 had invoked the skill**. This included all three runs of 04, which was recorded at 1/3 and later measured at 3/3.

The bias was not random. Longer exploratory queries are most likely to reach a turn cap. Their positive evidence is also particularly relevant. Reversed classification order reduced recall for those queries. Any conclusion drawn from the
old table — in particular that the Echidna/Solidity path triggered poorly — does not
survive.

The gate's floor stays at **13** rather than rising to the measured 14. Three different positives (01, 04, 07) were the only failure in different runs. A floor of 14 would not allow the documented random variation. One
valid sweep is not enough to tighten a gate.

- **01 (wire-format roundtrip)** currently misses at 0/3. This reverses the recovered sample, where all three runs invoked the skill. Worth a
  second valid sweep before treating it as a description problem.

### Known gap: triage requests do not trigger

The suite does not cover the third task: counterexample classification. A reduced counterexample can indicate a code defect, an incorrect property, or unspecified boundary behavior. A query for it
existed and was removed. It scored 0/3. Given a falsifying input and code, the model answered directly without guidance. Description changes did not change that result.

It was removed rather than kept as a documented failure because neither label was true.
`should_trigger: true` asserts a trigger the description cannot produce;
`should_trigger: false` asserts the skill should stay out of a job it advertises. The
field is binary and the honest answer is "unmeasured" — nobody has checked whether
loading `references/interpreting-failures.md` improves the classification over the
unaided answer. It also failed as a regression test. Its score was identical with the reference file present or deleted because it never triggered. It could not distinguish those states.

To readmit it, run the query against the fixture with and without the plugin and
compare the answers. If the guidance improves the classification, `should_trigger: true`
becomes defensible and 0/3 becomes a real bug worth chasing. If it does not, that is a
finding about `interpreting-failures.md` rather than about the description.

One caveat on that 0/3: it was measured by the same classifier that mis-scored 04, so it
is not trustworthy either. It is *less* affected than 04. Reversed order only discarded sessions that invoked the skill. A session invoking it would have scored `yes` under either order. But the figure was never measured again. The binary-label problem, not the number, is the basis for removal.

Both scripts pin `--model` (`MODEL`, default `opus`) and print it above the table.
Trigger rate is a property of a description *and* a model, so a number recorded
without one cannot be compared to the next one. To assess a description change, score old and new copies on the same model. Use `PLUGIN_DIR` with a plugin directory. No worktree changes are needed.

**Does it help once it fires?** `evals-extra/effectiveness.sh` requests property tests for the defective `fixture/src/codec.py`. The safe set used by `canonicalize_url` for percent encoding omits `%`. A second pass encodes its own escapes again. Thus, `canonicalize_url("a b")` is not a fixed point. The script runs the generated
suite against the defective function and again against a patched one, and counts
tests that fail before and pass after. The verdict never comes from the model's own
account of how it did, and never from matching test names.

```sh
EFFORTS=low ./evals-extra/effectiveness.sh  # score the skill as shipped
NOPLUGIN=1 ./evals-extra/effectiveness.sh   # baseline without the skill loaded
```

A bare `./evals-extra/effectiveness.sh` asks for low/medium/high and is **refused**
while `SKILL.md` pins an effort — see below.

Run the baseline before adding to this skill. Opus already writes competent Hypothesis
suites unaided, so content that does not move a number against `NOPLUGIN=1` is
costing context without buying anything.

## Why `effort: low`

Swept, not guessed. `low`, `medium`, and `high` all detect the fixture defect. `low` detected it in all 4 runs. At `low`, the review path independently classified both planted defects in `fixture/tests/test_parser.py` as CRITICAL. Nothing measured
justifies paying for more, which is what `sweep downward on your own evals` in the
repo's AGENTS.md asks for.

Before changing it, note that `effort` overrides the session level in both directions. It reduces even an intentional `xhigh` session while the skill is active. This is a cost of setting the value. If the generation path regresses, this supports an increase rather than a further reduction.

**The fixed value also invalidates the sweep that justified it**. After the skill loads, `--effort` is ignored. All three groups would run at `low` with different labels. Three identical rows can also occur in a valid sweep. So
`effectiveness.sh` refuses a multi-level sweep while the pin is there (exit 2) and
tells you to strip it from a copy and use `PLUGIN_DIR`. Re-sweep that way before
changing the pinned value.

## Example prompts

```
"Write property-based tests for this JSON serializer"
"Review this Hypothesis test for quality issues"
"Write Echidna invariants for this staking contract"
"Hypothesis shrank to '\x00' — is this a real bug?"
```
