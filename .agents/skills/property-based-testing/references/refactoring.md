# Refactoring to Expose a Property

"This code has no algebraic shape" is often a fact about how the code is *arranged*
rather than about what it does. A function that mixes a pure calculation with a database
write has a property; it just does not have a seam to assert it through. These are the
rearrangements that expose one, strongest first.

Suggest the refactor, name the property it unlocks, and let the author decide. The author decides whether to change production code to permit a test. The same rule applies to a new PBT dependency.

## 1. Extract the pure core

The highest-value one by a wide margin, and the reason most "untestable" code is
testable. I/O at the edges, calculation in the middle, assert against the middle.

```python
# Before: the arithmetic is real but unreachable without a database
def process_order(order_id: str) -> None:
    order = db.fetch(order_id)
    total = apply_discount(order, calculate_discount(order))
    db.save(order_id, total)

# After: the pure core takes arguments and returns a value
def order_total(order: Order, rules: DiscountRules) -> Decimal:
    return apply_discount(order, calculate_discount(order, rules))

def process_order(order_id: str) -> None:
    order = db.fetch(order_id)
    db.save(order_id, order_total(order, get_discount_rules()))
```

`order_total` now supports invariants (never negative, never above the undiscounted
total), monotonicity in the discount rate, and an oracle against a reference
calculation. `process_order` keeps example tests with a mocked `db`, which is the right
tool for a two-line wrapper.

The same move applies to anything whose observable is a side effect: build the message,
the request, the query object — then send it. Construction is testable; delivery is
mocked.

## 2. Add the missing inverse

A one-way operation has no roundtrip by definition. Sometimes the inverse is worth
having in production anyway, and sometimes it is worth having *only* for the test — say
which.

```python
def encode_message(msg: dict) -> bytes: ...
def decode_message(data: bytes) -> dict: ...   # unlocks decode(encode(x)) == x
```

Unlocks roundtrip, the strongest property in the catalog. Worth asking for even when the
production code never decodes: a serializer nobody can read back is usually a latent
bug, not a design.

## 3. Structured representation plus a renderer

String building by concatenation has nothing to assert beyond "contains a substring".
Split the value from its rendering and the inverse becomes available.

```python
# Before
def build_query(table: str, filters: dict) -> str:
    q = f"SELECT * FROM {table}"
    ...

# After
@dataclass
class Query:
    table: str
    filters: dict

def render(q: Query) -> str: ...
def parse(sql: str) -> Query: ...   # now render/parse is a roundtrip
```

This is a variant of pattern 2. A roundtrip over generated filter values can find quoting errors missed by handwritten examples.

## 4. Return a value instead of mutating

An in-place mutation gives you nothing to compare against, because the input is gone by
the time you want to assert on it.

```python
def sort_tasks(tasks: list[Task]) -> None: ...      # before/after comparison impossible
def sorted_tasks(tasks: list[Task]) -> list[Task]:  # unlocks is_sorted, permutation,
    ...                                             # idempotence, length preservation
```

If the mutating signature has to stay, a wrapper that copies and returns is enough for
the test to have something to hold.

## 5. Inject the dependency

A function that reads a global, module constant, or `os.environ` can only be tested with their current values. Its input-domain boundaries are unreachable.

```python
def validate(data: str) -> bool:          return len(data) <= CONFIG.max_length
def validate(data: str, max_len: int):    return len(data) <= max_len
```

Parameterize the bound so a generator can set `max_len` to 0, 1, and the maximum representable value. These boundaries can expose validator defects.

## When not to suggest this

- **The property you would unlock is "no crash".** Restructuring production code to
  enable the weakest property in the catalog is a bad trade. Say the code is a poor PBT
  candidate and stop.
- **The module needs wholesale restructuring.** Say that once, plainly. Twenty
  individually-reasonable suggestions on one file is noise, and it reads as a rewrite
  request rather than a testing recommendation.
- **The refactor breaks a public API.** Flag it as breaking and offer the
  backwards-compatible version, even when the clean version is obviously nicer.
- **Existing tests cover the code.** Run them after any refactor and say you did.
  A new property test does not justify breaking two existing example tests.
