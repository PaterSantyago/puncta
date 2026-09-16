/** Controlled ESM derivative of hyphen's hyphenateWord/levelsToMarkers,
 * commit 86a09f1c1282dea8708b9b6f6bde7ad58e7d7c17 (ISC; see NOTICE.md).
 * Only the positional kernel is retained: no exceptions, caches or I/O. */
export interface PatternTrie {
  readonly [letter: string]:
    | number
    | PatternTrie
    | readonly [PatternTrie, number];
}
export interface HyphenationResource {
  readonly format: 1;
  readonly locale: string;
  readonly localeVersion: string;
  readonly revision: string;
  readonly table: readonly [readonly (readonly number[])[], PatternTrie];
}

export function liangPositions(
  word: string,
  resource: HyphenationResource,
): number[] {
  const [weights, trie] = resource.table;
  const letters = `.${word}.`;
  const levels = Array<number>(word.length + 1).fill(0);
  for (let start = 0; start < letters.length - 2; start++) {
    let cursor: PatternTrie = trie;
    // Upstream omits the boundary-dot slot from each pattern's weight vector.
    const offset = Math.max(0, start - 1);
    for (let end = start; end < letters.length; end++) {
      const node = cursor[letters[end]];
      if (node === undefined) break;
      let index: number | undefined;
      if (typeof node === "number") {
        index = node;
        cursor = {};
      } else if (Array.isArray(node)) {
        [cursor, index] = node;
      } else cursor = node as PatternTrie;
      if (index === undefined) continue;
      for (const [position, weight] of weights[index].entries()) {
        if (offset + position < levels.length)
          levels[offset + position] = Math.max(
            levels[offset + position],
            weight,
          );
      }
    }
  }
  return levels.flatMap((weight, index) =>
    index >= 2 && index <= word.length - 2 && weight % 2 === 1 ? [index] : [],
  );
}
