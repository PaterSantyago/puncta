import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { validateEnGbCorpus } from "./helpers/validate-en-gb-corpus.mjs";

const directory = new URL("./fixtures/hyphenation/", import.meta.url);
const read = (name) => readFileSync(new URL(name, directory), "utf8");
const positive = JSON.parse(read("en-gb.json"));
const negative = JSON.parse(read("en-gb-negative.json"));
const freeze = JSON.parse(read("en-gb-freeze.json"));

function validateFreeze(manifest) {
  assert.deepEqual(
    Object.keys(manifest.files).sort(),
    ["en-gb-negative.json", "en-gb.json"],
    "freeze must identify both corpus files",
  );
  for (const [name, expected] of Object.entries(manifest.files)) {
    assert.equal(
      createHash("sha256").update(read(name)).digest("hex"),
      expected,
    );
  }
  assert.equal(manifest.corpusVersion, positive.version);
  assert.equal(manifest.corpusVersion, negative.version);
}

test("en-gb corpus retains the independently frozen data", () => {
  validateFreeze(freeze);
});

test("freeze cannot silently stop checking either corpus file", () => {
  for (const name of ["en-gb.json", "en-gb-negative.json"]) {
    const manifest = structuredClone(freeze);
    delete manifest.files[name];
    assert.throws(() => validateFreeze(manifest), /both corpus files/);
  }
  assert.throws(
    () => validateFreeze({ ...freeze, files: {} }),
    /both corpus files/,
  );
});

test("en-gb corpus meets the independent acceptance data contract", () => {
  const summary = validateEnGbCorpus(positive, negative);
  assert.equal(summary.words, 313);
  assert.equal(summary.requiredWords, 60);
  assert.equal(summary.negativeCases, 19);
  console.log("en-gb corpus consistency:", JSON.stringify(summary));
});

const corruptions = [
  [
    "insufficient vocabulary",
    (data) => data.entries.splice(190),
    /200 distinct/,
  ],
  [
    "duplicate words",
    (data) => data.entries.push(structuredClone(data.entries[0])),
    /duplicate word/,
  ],
  [
    "missing required positives",
    (data) => {
      for (const entry of data.entries) entry.requiredPositions = [];
    },
    /50 words with required/,
  ],
  [
    "missing British category",
    (data) => {
      for (const entry of data.entries) {
        entry.categories = entry.categories.filter(
          (category) => category !== "british-spelling",
        );
      }
    },
    /five words: british-spelling/,
  ],
  [
    "superficial length diversity",
    (data) => {
      for (const entry of data.entries) {
        if (entry.source.length !== 6) {
          entry.categories = entry.categories.filter(
            (category) => category !== "different-lengths",
          );
        }
      }
    },
    /genuinely different lengths/,
  ],
  [
    "missing special word",
    (data) => {
      data.entries = data.entries.filter(
        (entry) => entry.source !== "university",
      );
    },
    /missing required special word: university/,
  ],
  [
    "grapheme split",
    (data) => {
      data.entries[0].source = "ba\u0301ckbone";
      data.entries[0].allowedPositions = [2];
    },
    /grapheme boundary/,
  ],
  [
    "edge minimum violation",
    (data) => {
      data.entries[0].allowedPositions = [1];
    },
    /edge minima/,
  ],
  [
    "required position outside allowed set",
    (data) => {
      data.entries[0].requiredPositions = [3];
    },
    /required subset/,
  ],
  [
    "unsorted positions",
    (data) => {
      data.entries[0].allowedPositions = [4, 3];
    },
    /sorted unique positions/,
  ],
  [
    "invalid settings",
    (data) => {
      data.entries[0].settings.minLeft = 1;
    },
    /minLeft/,
  ],
  [
    "missing source evidence",
    (data) => {
      data.entries[0].evidence.sources = [];
    },
    /sources/,
  ],
  [
    "unreviewed word",
    (data) => {
      data.entries[0].agentReview.status = "pending";
    },
    /review/,
  ],
];

for (const [name, corrupt, expected] of corruptions) {
  test(`corpus validator rejects ${name}`, () => {
    const data = structuredClone(positive);
    corrupt(data);
    assert.throws(() => validateEnGbCorpus(data, negative), expected);
  });
}

test("corpus validator rejects warnings on protected text", () => {
  const data = structuredClone(negative);
  data.entries.find(
    (entry) => entry.id === "protected-unsupported",
  ).expectedDiagnostics.detailed = ["hyphenation.unsupported-characters"];
  assert.throws(
    () => validateEnGbCorpus(positive, data),
    /protected-unsupported/,
  );
});

test("corpus validator rejects a missing real apostrophe variant", () => {
  const data = structuredClone(negative);
  data.entries = data.entries.filter(
    (entry) => entry.id !== "apostrophe-modifier",
  );
  assert.throws(() => validateEnGbCorpus(positive, data), /U\+2bc/);
});
