# Interpreting Property-Based Test Failures

A property test that fails has told you one of three things, and they need different
responses:

- **The property is wrong** — you asserted something the code never promised.
- **The spec is ambiguous** — behavior at this edge was never decided.
- **The code is wrong** — a documented guarantee is violated.

Most of the work is telling them apart. Skipping that step is how PBT gets a
reputation for noise.

## Ground the property before you trust the failure

Shrunk input in hand, check what the code actually promises. In descending order of
authority:

| Source | What it settles |
|---|---|
| External spec (RFC, format definition) | The real contract, when one exists |
| Type annotations | Return type, nullability, domain |
| Docstrings | Explicit guarantees and preconditions |
| Existing tests | The contract maintainers believe they have |
| Function name | Weak, but `sort` really does imply ordering |

The name is the weakest signal and the most likely to mislead. Many functions called `normalize` have a narrower purpose than that name suggests.

Worked example. Hypothesis reports `test_normalize(s='\x00')` failing idempotence:

```python
def normalize(s: str) -> str:
    """Normalize a string to NFC form.

    Args:
        s: Input string (any unicode)
    Returns:
        NFC-normalized string
    """
```

"Any unicode" includes null bytes, so the input is in-domain and the property is
grounded. This one is a real bug.

Change the docstring to "ASCII printable only" and the same failure becomes a
strategy bug — the fix is `st.text(alphabet=...)`, not a bug report.

## Classification

| Symptom | Cause | Action |
|---|---|---|
| Violates a documented guarantee | Code bug | Report with the shrunk input and a quote from the doc |
| Input violates a documented precondition | Over-broad strategy | Constrain the strategy |
| Property contradicts the docstring or type | Wrong property | Fix the property |
| Edge case the spec never addresses | Ambiguous spec | Ask the maintainer; a discussion, not a bug report |
| Disappears under realistic constraints | Test artifact | Fix the strategy |
| Behavior differs from a sibling function | Possible inconsistency | Worth raising, flag the uncertainty |

Precondition violations and explicitly-undefined behavior are not bugs. Passing `-1`
to a function documented as taking positive integers tells you nothing.

Report each finding with its classification, including uncertain cases. For these cases, say "ambiguous spec, needs a maintainer decision". Do not omit the finding. A suppressed finding cannot be triaged by anyone else.

## Failure patterns that recur

**Lone surrogates break text roundtrips.** `decode(encode(s)) == s` fails on
`'\uD800'`. Whether that is a bug turns entirely on whether the format claims to
accept arbitrary `str` or only valid UTF-8.

**Denormals break numeric invariants.** A probability function that returns a negative value for `x=1e-320` violates a documented `[0, 1]` range. Such inputs are unlikely in manual examples.

**Hash/equality divergence violates a language contract**, not just a docstring —
`a == b` must imply `hash(a) == hash(b)` in Python. No grounding required; report it.

**Off-by-one in custom iterators** shows up as `list(it(xs)) == xs` dropping the last
element. Almost always real.
