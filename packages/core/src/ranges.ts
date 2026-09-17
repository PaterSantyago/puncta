import type { ProtectedRange } from "./types.js";

/** Append-only index of original UTF-16 ranges. A range overlaps a query iff
 * its start is strictly before the query end and its end is after the query
 * start. A prefix-maximum Fenwick tree answers that predicate in O(log n),
 * including zero-length insertions, without merging away touching boundaries. */
export function rangeIndex(
  length: number,
  ranges: readonly ProtectedRange[] = [],
) {
  const ends = new Uint32Array(length + 2);
  function add(range: ProtectedRange) {
    for (
      let index = range.start + 1;
      index < ends.length;
      index += index & -index
    )
      ends[index] = Math.max(ends[index], range.end);
  }
  for (const range of ranges) add(range);
  return {
    add,
    overlaps(start: number, end: number): boolean {
      for (let index = end; index > 0; index -= index & -index)
        if (ends[index] > start) return true;
      return false;
    },
  };
}
