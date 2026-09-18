import assert from "node:assert/strict";
import {
  validateMetadata,
  validatePositions,
} from "./validate-corpus-entry.mjs";

const requiredCategories = [
  "adjacent-vowels",
  "diacritics",
  "h",
  "ch-ll-rr",
  "x",
  "prefixes",
  "false-prefixes",
  "loanwords",
];
const skipReasons = [
  "short-word",
  "all-caps",
  "mixed-case",
  "digits",
  "apostrophe",
  "hyphen",
  "existing-shy",
  "protected",
  "unsupported-characters",
  "mixed-scripts",
  "language-ambiguity",
];
const warningReasons = [
  "unsupported-characters",
  "mixed-scripts",
  "language-ambiguity",
];

function validateNegativeEntries(entries) {
  const ids = new Set();
  const reasons = new Set();
  for (const entry of entries) {
    validateMetadata(entry, "es-es", 2);
    assert.ok(typeof entry.id === "string" && entry.id.length > 0);
    assert.ok(!ids.has(entry.id), `duplicate negative id: ${entry.id}`);
    ids.add(entry.id);
    reasons.add(entry.reason);
    assert.ok(skipReasons.includes(entry.reason), `${entry.id}: skip reason`);
    assert.equal(entry.expectedSkip, true, `${entry.id}: expected skip`);
    assert.deepEqual(
      entry.expectedAddedPositions,
      [],
      `${entry.id}: additions`,
    );
    assert.equal(entry.expectedSourceAfterHyphenation, entry.source);
    assert.equal(entry.protected, entry.reason === "protected");
    assert.deepEqual(entry.expectedDiagnostics.ordinary, []);
    const warning = warningReasons.includes(entry.reason)
      ? [`hyphenation.${entry.reason}`]
      : [];
    assert.deepEqual(entry.expectedDiagnostics.detailed, warning, entry.id);
    if (entry.reason === "language-ambiguity") {
      assert.ok(entry.source.includes("tl"), `${entry.id}: whole-word tl`);
      assert.ok(entry.source.length >= entry.settings.minWordLength);
    }
  }
  for (const reason of skipReasons) {
    assert.ok(reasons.has(reason), `missing negative class: ${reason}`);
  }
  for (const [reason, characters] of [
    ["apostrophe", ["'", "’", "ʼ"]],
    ["hyphen", ["-", "‐", "‑"]],
    ["existing-shy", ["\u00ad"]],
    ["unsupported-characters", ["ç", "\u0327", "ﬃ"]],
    ["mixed-scripts", ["а"]],
  ]) {
    for (const character of characters) {
      assert.ok(
        entries.some(
          (entry) =>
            entry.reason === reason && entry.source.includes(character),
        ),
        `missing literal ${reason} variant: U+${character.codePointAt(0).toString(16)}`,
      );
    }
  }
  for (const source of ["camino", "façade", "cаmino", "atletismo"]) {
    assert.ok(
      entries.some((entry) => entry.protected && entry.source === source),
      `missing protection-priority example: ${source}`,
    );
  }
  for (const reason of skipReasons.filter(
    (reason) => !warningReasons.includes(reason),
  )) {
    assert.ok(
      entries.some(
        (entry) =>
          entry.reason === reason && entry.source.toLowerCase().includes("tl"),
      ),
      `missing tl skip priority: ${reason}`,
    );
  }
}

/** Checks literal evidence, without computing linguistic positions. */
export function validateEsEsCorpus(positive, negative) {
  assert.equal(positive.positionUnit, "UTF-16 offset in source");
  const words = new Set();
  const categories = {};
  const lengths = {};
  let requiredWords = 0;
  for (const entry of positive.entries) {
    validateMetadata(entry, "es-es", 2);
    const length = validatePositions(entry);
    const identity = entry.source.normalize("NFC").toLowerCase();
    assert.match(
      entry.source.normalize("NFC"),
      /^[a-záéíóúüñ]+$/,
      `${entry.source}: admitted spelling`,
    );
    assert.ok(
      !identity.includes("tl"),
      `${entry.source}: tl belongs in negatives`,
    );
    assert.ok(!words.has(identity), `duplicate word: ${entry.source}`);
    words.add(identity);
    assert.ok(entry.categories.length > 0, `${entry.source}: categories`);
    assert.equal(new Set(entry.categories).size, entry.categories.length);
    for (const category of entry.categories) {
      assert.ok(typeof category === "string" && category.length > 0);
      categories[category] = (categories[category] ?? 0) + 1;
    }
    lengths[length] = (lengths[length] ?? 0) + 1;
    if (entry.requiredPositions.length > 0) requiredWords += 1;
  }
  assert.ok(words.size >= 200, "at least 200 distinct admitted words");
  assert.ok(requiredWords >= 50, "at least 50 words with required positions");
  for (const category of requiredCategories) {
    assert.ok(categories[category] >= 5, `at least five words: ${category}`);
  }
  for (const digraph of ["ch", "ll", "rr"]) {
    assert.ok(
      positive.entries.some(
        (entry) =>
          entry.categories.includes("ch-ll-rr") &&
          entry.source.includes(digraph),
      ),
      `missing actual digraph: ${digraph}`,
    );
  }
  validateNegativeEntries(negative.entries);
  return {
    words: words.size,
    requiredWords,
    categories,
    lengths,
    negativeCases: negative.entries.length,
  };
}
