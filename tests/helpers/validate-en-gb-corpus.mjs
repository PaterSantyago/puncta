import assert from "node:assert/strict";

import {
  validateMetadata,
  validatePositions,
} from "./validate-corpus-entry.mjs";
const requiredCategories = [
  "british-spelling",
  "derivatives-suffixes",
  "different-lengths",
];
const specialWords = [
  "university",
  "universities",
  "however",
  "manuscript",
  "manuscripts",
  "reciprocity",
  "throughout",
  "something",
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
];

function validateNegativeEntries(entries) {
  const ids = new Set();
  const reasons = new Set();
  for (const entry of entries) {
    validateMetadata(entry, "en-gb", 3);
    assert.ok(!ids.has(entry.id), `duplicate negative id: ${entry.id}`);
    assert.ok(typeof entry.id === "string" && entry.id.length > 0);
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
    const warning = ["unsupported-characters", "mixed-scripts"].includes(
      entry.reason,
    )
      ? [`hyphenation.${entry.reason}`]
      : [];
    assert.deepEqual(entry.expectedDiagnostics.detailed, warning, entry.id);
  }
  for (const reason of skipReasons) {
    assert.ok(reasons.has(reason), `missing negative class: ${reason}`);
  }
  for (const [reason, characters] of [
    ["apostrophe", ["'", "’", "ʼ"]],
    ["hyphen", ["-", "‐", "‑"]],
    ["existing-shy", ["\u00ad"]],
    ["unsupported-characters", ["é", "\u0301", "ﬃ"]],
    ["mixed-scripts", ["с"]],
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
  for (const source of ["backbone", "résumé", "manusсript"]) {
    assert.ok(
      entries.some((entry) => entry.protected && entry.source === source),
      `missing protection-priority example: ${source}`,
    );
  }
}

/** Checks frozen evidence only; never computes linguistic positions. */
export function validateEnGbCorpus(positive, negative) {
  assert.equal(positive.positionUnit, "UTF-16 offset in source");
  const words = new Set();
  const categories = {};
  const lengths = {};
  const diverseLengths = new Set();
  let requiredWords = 0;
  for (const entry of positive.entries) {
    validateMetadata(entry, "en-gb", 3);
    const length = validatePositions(entry);
    assert.match(
      entry.source,
      /^[a-z]+$/,
      `${entry.source}: admitted spelling`,
    );
    const identity = entry.source.normalize("NFC").toLowerCase();
    assert.ok(!words.has(identity), `duplicate word: ${entry.source}`);
    words.add(identity);
    assert.ok(entry.categories.length > 0, `${entry.source}: categories`);
    assert.equal(new Set(entry.categories).size, entry.categories.length);
    for (const category of entry.categories) {
      assert.ok(typeof category === "string" && category.length > 0);
      categories[category] = (categories[category] ?? 0) + 1;
    }
    lengths[length] = (lengths[length] ?? 0) + 1;
    if (entry.categories.includes("different-lengths"))
      diverseLengths.add(length);
    if (entry.requiredPositions.length > 0) requiredWords += 1;
  }
  assert.ok(words.size >= 200, "at least 200 distinct admitted words");
  assert.ok(requiredWords >= 50, "at least 50 words with required positions");
  for (const category of requiredCategories) {
    assert.ok(categories[category] >= 5, `at least five words: ${category}`);
  }
  assert.ok(
    diverseLengths.size >= 5,
    "at least five genuinely different lengths",
  );
  for (const word of specialWords) {
    assert.ok(words.has(word), `missing required special word: ${word}`);
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
