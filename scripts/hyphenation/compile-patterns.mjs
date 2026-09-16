// Controlled ESM adaptation of ytiurin/hyphen createPatternTrie.cjs at
// 86a09f1c1282dea8708b9b6f6bde7ad58e7d7c17. ISC; see NOTICE.md.
export function compilePatterns(patterns) {
  const root = [{}];
  const weightsTable = [];
  for (const pattern of patterns) {
    let node = root;
    let previousNumber = false;
    const weights = [];
    for (const character of pattern) {
      if (/[1-9]/u.test(character)) {
        weights.push(Number(character));
        previousNumber = true;
      } else {
        if (!previousNumber && character !== ".") weights.push(0);
        node[0][character] ??= [{}];
        node = node[0][character];
        previousNumber = false;
      }
    }
    while (weights.at(-1) === 0) weights.pop();
    const key = weights.join("");
    let index = weightsTable.indexOf(key);
    if (index === -1) {
      index = weightsTable.length;
      weightsTable.push(key);
    }
    node[1] = index;
  }
  function compact(parent) {
    for (const [character, [children, index]] of Object.entries(parent)) {
      const hasChildren = Object.keys(children).length > 0;
      parent[character] = hasChildren
        ? index === undefined
          ? children
          : [children, index]
        : index;
      if (hasChildren) compact(children);
    }
  }
  compact(root[0]);
  return [weightsTable.map((weights) => [...weights].map(Number)), root[0]];
}

/** Refinements can share a path with the baseline. Liang combines each weight
 * by maximum; merely overwriting the path can enable forbidden positions. */
export function mergePatterns(patterns) {
  const paths = new Map();
  for (const pattern of patterns) {
    const letters = pattern.replace(/[1-9]/gu, "");
    const weights = [0];
    for (const character of pattern) {
      if (/[1-9]/u.test(character))
        weights[weights.length - 1] = Number(character);
      else weights.push(0);
    }
    const previous = paths.get(letters);
    paths.set(
      letters,
      weights.map((weight, index) => Math.max(weight, previous?.[index] ?? 0)),
    );
  }
  return [...paths].map(
    ([letters, weights]) =>
      [...letters]
        .map((letter, index) => `${weights[index] || ""}${letter}`)
        .join("") + (weights.at(-1) || ""),
  );
}
