import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { compilePatterns, mergePatterns } from "./compile-patterns.mjs";

const root = new URL("../../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root));
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const raw = read("resources/es-es/hyph-es.tex");
assert.equal(
  hash(raw),
  "6a2e5f39a991a23d1cd8a23dbd0f6fe96a9f07561a6695f4f3320f47030e236c",
);
const text = raw.toString().replace(/%[^\n]*/gu, "");
assert(!text.includes("\\hyphenation"));
const blocks = [...text.matchAll(/\\patterns\{([^}]*)\}/gu)];
assert.equal(blocks.length, 1);
const baseline = blocks[0][1].trim().split(/\s+/u);
assert.equal(baseline.length, 4694);
assert(baseline.every((pattern) => /^\.?[a-záéíóúñ1-9]+\.?$/u.test(pattern)));
assert(
  !baseline.some((pattern) => pattern.startsWith(".") && pattern.endsWith(".")),
);
assert.equal(
  new Set(baseline.map((pattern) => pattern.replace(/[1-9]/gu, ""))).size,
  baseline.length,
);
const canonical = (values) => `${values.join("\n")}\n`;
assert.equal(
  hash(canonical(baseline)),
  "7ae8fa8d6a61ea4111c4a0412d019b62e7c07a62673121d0b711c5bc08d8e00c",
);
assert.equal(
  hash(JSON.stringify(compilePatterns(baseline))),
  "c5ea234b536f78465e33b233b1beb75799eb5cf9143c561c74c137376243cd5b",
);
// A single intervocalic n starts the final syllable; supersede upstream 2no.
// This spelling class is independent of completed words and acceptance fixtures.
const refinement = [..."aeiouáéíóúü"].map((vowel) => `${vowel}3no.`);
const prepared = mergePatterns([...baseline, ...refinement]);
const table = JSON.stringify(compilePatterns(prepared));
const manifest = {
  format: 1,
  locale: "es-es",
  refinementVersion: 1,
  upstream: {
    repository: "https://github.com/hyphenation/tex-hyphen",
    commit: "5684c0f51c0b81133db2efbe60a408b4155a3ff5",
    file: "hyph-utf8/tex/generic/hyph-utf8/patterns/tex/hyph-es.tex",
    version: "5.0 2019-09-24",
    sha256: hash(raw),
  },
  engine: {
    repository: "https://github.com/ytiurin/hyphen",
    commit: "86a09f1c1282dea8708b9b6f6bde7ad58e7d7c17",
  },
  excludedInputs: [
    "eshyphexh.tex",
    "hyphenation blocks",
    "word lists",
    "compiled whole-word exceptions",
  ],
  alphabet: "abcdefghijklmnopqrstuvwxyzáéíóúüñ",
  minima: { minWordLength: 6, minLeft: 2, minRight: 2 },
  baseline: {
    patterns: baseline.length,
    sha256: hash(canonical(baseline)),
    tableSha256: hash(JSON.stringify(compilePatterns(baseline))),
  },
  refinement: {
    patterns: refinement.length,
    sha256: hash(canonical(refinement)),
  },
  prepared: {
    patterns: prepared.length,
    sha256: hash(canonical(prepared)),
    tableSha256: hash(table),
  },
};
const outputs = {
  "resources/es-es/manifest.json": `${JSON.stringify(manifest, null, 2)}\n`,
  "packages/with-es-es/hyphenation-manifest.json": `${JSON.stringify(manifest, null, 2)}\n`,
  "packages/with-es-es/src/hyphenation.json": `${table}\n`,
};
for (const [path, bytes] of Object.entries(outputs)) {
  if (process.argv.includes("--check"))
    assert.equal(
      read(path).toString(),
      bytes,
      `${path} must reproduce byte for byte`,
    );
  else writeFileSync(new URL(path, root), bytes);
}
console.log(JSON.stringify(manifest));
