import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { compilePatterns, mergePatterns } from "./compile-patterns.mjs";

const root = new URL("../../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root));
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const raw = read("resources/en-gb/hyph-en-gb.tex");
assert.equal(
  hash(raw),
  "e95bb4ab350f620c41c231c4785d7bdb4f91949d3e631b30e08b3ead3c340a52",
);
const blocks = [
  ...raw
    .toString()
    .replace(/%[^\n]*/gu, "")
    .matchAll(/\\patterns\{([^}]*)\}/gu),
];
assert.equal(blocks.length, 1);
const patterns = blocks[0][1].trim().split(/\s+/u);
assert.equal(patterns.length, 8527);
assert(patterns.every((pattern) => /^\.?[a-z1-9]+\.?$/u.test(pattern)));
const anchored = patterns.filter(
  (pattern) => pattern.startsWith(".") && pattern.endsWith("."),
);
assert.deepEqual(anchored, [".an4on.", ".di4al.", ".du4al.", ".ed4it."]);
const baseline = patterns.filter((pattern) => !anchored.includes(pattern));
assert.equal(
  new Set(baseline.map((pattern) => pattern.replace(/[1-9]/gu, ""))).size,
  baseline.length,
);

// Puncta English refinement 1: static spelling-class omissions, with separate
// productive component boundaries. See resources/en-gb/README.md for scope and evidence.
const refinement = [];
for (const left of "aeiou") {
  for (const consonant of "bcdfghjklmnpqrstvwxyz") {
    for (const right of "aeiou") {
      refinement.push(
        `${left}${consonant === "h" ? "" : "8"}${consonant}8${right}`,
      );
    }
  }
}
refinement.push("book9", "9child", "9field");
for (const consonant of "bcdfghjklmnpqrstvwxz")
  refinement.push(`bath9${consonant}`);
const prepared = mergePatterns([...baseline, ...refinement]);
const table = JSON.stringify(compilePatterns(prepared));
const canonical = (values) => `${values.join("\n")}\n`;
const manifest = {
  format: 1,
  locale: "en-gb",
  refinementVersion: 1,
  upstream: {
    repository: "https://github.com/hyphenation/tex-hyphen",
    commit: "5684c0f51c0b81133db2efbe60a408b4155a3ff5",
    file: "hyph-utf8/tex/generic/hyph-utf8/patterns/tex/hyph-en-gb.tex",
    sha256: hash(raw),
  },
  engine: {
    repository: "https://github.com/ytiurin/hyphen",
    commit: "86a09f1c1282dea8708b9b6f6bde7ad58e7d7c17",
  },
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
  "resources/en-gb/manifest.json": `${JSON.stringify(manifest, null, 2)}\n`,
  "packages/with-en-gb/src/hyphenation.json": `${table}\n`,
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
