import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createPuncta } from "../packages/core/dist/index.mjs";
import { enGb } from "../packages/with-en-gb/dist/index.mjs";
import {
  compilePatterns,
  mergePatterns,
} from "../scripts/hyphenation/compile-patterns.mjs";

test("fixed inputs reproduce the independently hashed baseline and shipped resource", () => {
  execFileSync(process.execPath, [
    "scripts/hyphenation/prepare-en-gb.mjs",
    "--check",
  ]);
  const manifest = JSON.parse(
    readFileSync(new URL("../resources/en-gb/manifest.json", import.meta.url)),
  );
  assert.equal(manifest.baseline.patterns, 8523);
  assert.equal(
    manifest.baseline.sha256,
    "7861f3896d2ec2de347b9b8ba8ebde36f9875a42bcb3ce6558ee82d9c72c104b",
  );
  assert.equal(
    manifest.baseline.tableSha256,
    "2a8a5208a7bf6076125d32033a97e71551a804e557f9753a6ecdfd6b5f7859f9",
  );
});

// A separate simple Liang computation over pattern strings is a computational
// oracle only. The independently frozen linguistic corpus remains the language gate.
function reference(word, patterns, minRight = 3) {
  const text = `.${word}.`;
  const levels = Array(text.length + 1).fill(0);
  for (const pattern of patterns) {
    const letters = pattern.replace(/[1-9]/gu, "");
    const weights = [0];
    for (const character of pattern) {
      if (/[1-9]/u.test(character))
        weights[weights.length - 1] = Number(character);
      else weights.push(0);
    }
    for (let start = 0; start <= text.length - letters.length; start++) {
      if (!text.startsWith(letters, start)) continue;
      for (const [index, weight] of weights.entries())
        levels[start + index] = Math.max(levels[start + index], weight);
    }
  }
  return [...word]
    .map(
      (letter, index) =>
        `${index >= 2 && word.length - index >= minRight && levels[index + 1] % 2 ? "\u00ad" : ""}${letter}`,
    )
    .join("");
}

test("controlled kernel preserves maximum weights, odd parity and boundary anchors", () => {
  const patterns = [
    "abc1d",
    "ab4cd",
    "ab3cd",
    ".abcd3e",
    "c1de",
    "ef3g",
    "ghi3j.",
    "d2ef",
  ];
  const key = Symbol.for("@use-puncta/hyphenation");
  const locale = {
    ...enGb,
    [key]: { ...enGb[key], table: compilePatterns(mergePatterns(patterns)) },
  };
  const instance = createPuncta({
    locales: [locale],
    locale: "en-gb",
    hyphenation: { enabled: true },
  });
  for (const word of [
    "abcdefghij",
    "abcdefghijk",
    "xabcdefghij",
    "abcdefabcdef",
    "zzabcdefghijzz",
  ])
    assert.equal(instance.text(word), reference(word, patterns), word);
  // Registry snapshot protects calls from subsequent mutation of the supplied fixture.
  locale[key].table[0][0].fill(9);
  assert.equal(instance.text("abcdefghij"), reference("abcdefghij", patterns));
});

test("productive refinement boundaries pass the independently chosen family holdouts", () => {
  const holdouts = JSON.parse(
    readFileSync(
      new URL("./fixtures/hyphenation/en-gb-refinement.json", import.meta.url),
    ),
  );
  const instance = createPuncta({
    locales: [enGb],
    locale: "en-gb",
    hyphenation: { enabled: true },
  });
  for (const [kind, entries] of [
    ["positive", holdouts.positive],
    ["forbidden", holdouts.forbidden],
  ]) {
    for (const { word, position } of entries) {
      const report = instance.text(word, { detailed: true });
      assert.equal(
        report.edits.some((edit) => edit.ranges[0].start === position),
        kind === "positive",
        word,
      );
    }
  }
});

test("Spanish fixed inputs and max-merged refinement reproduce the installed resource", async () => {
  execFileSync(process.execPath, [
    "scripts/hyphenation/prepare-es-es.mjs",
    "--check",
  ]);
  const { esEs } = await import("../packages/with-es-es/dist/index.mjs");
  const { createHash } = await import("node:crypto");
  const manifest = JSON.parse(
    readFileSync(new URL("../resources/es-es/manifest.json", import.meta.url)),
  );
  const key = Symbol.for("@use-puncta/hyphenation");
  assert.equal(
    createHash("sha256").update(JSON.stringify(esEs[key].table)).digest("hex"),
    manifest.prepared.tableSha256,
  );
  const fixture = JSON.parse(
    readFileSync(
      new URL("./fixtures/hyphenation/es-es-refinement.json", import.meta.url),
    ),
  );
  const instance = createPuncta({
    locales: [esEs],
    locale: "es-es",
    hyphenation: { enabled: true },
  });
  for (const [kind, entries] of [
    ["positive", fixture.positive],
    ["forbidden", fixture.forbidden],
  ]) {
    for (const { word, position } of entries) {
      const actual = instance
        .text(word, { detailed: true })
        .edits.map((edit) => edit.ranges[0].start);
      assert.equal(actual.includes(position), kind === "positive", word);
    }
  }
  const baseline = readFileSync(
    new URL("../resources/es-es/hyph-es.tex", import.meta.url),
    "utf8",
  )
    .replace(/%[^\n]*/gu, "")
    .match(/\\patterns\{([^}]*)\}/u)[1]
    .trim()
    .split(/\s+/u);
  const prepared = mergePatterns([
    ...baseline,
    ...[..."aeiouáéíóúü"].map((vowel) => `${vowel}3no.`),
  ]);
  assert.deepEqual(compilePatterns(prepared), esEs[key].table);
  // Independent full-pattern computation, including anchors and maximum weights.
  for (const word of [
    "camino",
    "vergüenza",
    "mañana",
    "argentino",
    "óptimo",
    "pingüino",
    "teléfono",
    "reino",
    "xábcde",
    "xüñabc",
  ]) {
    assert.equal(
      instance.text(word),
      word.length >= 6 ? reference(word, prepared, 2) : word,
      word,
    );
  }
  const synthetic = ["ab2cd", "ab3cd", "abc4d", "abcd3e", ".á1b", "ü1ñ"];
  assert.deepEqual(mergePatterns(synthetic), [
    "ab3c4d",
    "abcd3e",
    ".á1b",
    "ü1ñ",
  ]);
});
