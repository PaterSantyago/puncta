import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { validateEsEsCorpus } from "./helpers/validate-es-es-corpus.mjs";
import { validateEnGbCorpus } from "./helpers/validate-en-gb-corpus.mjs";

const directory = new URL("./fixtures/hyphenation/", import.meta.url);
const read = (name) => readFileSync(new URL(name, directory), "utf8");
const positive = JSON.parse(read("en-gb.json"));
const negative = JSON.parse(read("en-gb-negative.json"));
const freeze = JSON.parse(read("en-gb-freeze.json"));

function validateFreeze(
  manifest,
  locale = "en-gb",
  corpus = positive,
  negativeCorpus = negative,
) {
  assert.deepEqual(
    Object.keys(manifest.files).sort(),
    [`${locale}-negative.json`, `${locale}.json`],
    "freeze must identify both corpus files",
  );
  for (const [name, expected] of Object.entries(manifest.files)) {
    assert.equal(
      createHash("sha256").update(read(name)).digest("hex"),
      expected,
    );
  }
  assert.equal(manifest.corpusVersion, corpus.version);
  assert.equal(manifest.corpusVersion, negativeCorpus.version);
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

const spanish = JSON.parse(read("es-es.json"));
const spanishNegative = JSON.parse(read("es-es-negative.json"));
const spanishFreeze = JSON.parse(read("es-es-freeze.json"));

test("es-es corpus retains the independently frozen data", () => {
  validateFreeze(spanishFreeze, "es-es", spanish, spanishNegative);
  for (const name of ["es-es.json", "es-es-negative.json"]) {
    const manifest = structuredClone(spanishFreeze);
    delete manifest.files[name];
    assert.throws(
      () => validateFreeze(manifest, "es-es", spanish, spanishNegative),
      /both corpus files/,
    );
  }
  assert.throws(
    () =>
      validateFreeze(
        { ...spanishFreeze, files: {} },
        "es-es",
        spanish,
        spanishNegative,
      ),
    /both corpus files/,
  );
});

test("es-es corpus meets the independent acceptance data contract", () => {
  const summary = validateEsEsCorpus(spanish, spanishNegative);
  assert.equal(summary.words, 361);
  assert.equal(summary.requiredWords, 60);
  assert.equal(summary.negativeCases, 32);
  console.log("es-es corpus consistency:", JSON.stringify(summary));
});

const spanishCorruptions = [
  [
    "insufficient vocabulary",
    (data) => data.entries.splice(190),
    /200 distinct/,
  ],
  [
    "NFC-equivalent duplicate",
    (data) => {
      const entry = structuredClone(
        data.entries.find((item) => item.source === "música"),
      );
      entry.source = entry.source.normalize("NFD");
      entry.allowedPositions = [3, 5];
      data.entries.push(entry);
    },
    /duplicate word/,
  ],
  [
    "missing mandatory positives",
    (data) => {
      for (const entry of data.entries) entry.requiredPositions = [];
    },
    /50 words with required/,
  ],
  [
    "split accent grapheme",
    (data) => {
      const entry = data.entries.find((item) => item.source === "música");
      entry.source = entry.source.normalize("NFD");
      entry.allowedPositions = [2];
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
    "required position outside allowed",
    (data) => {
      data.entries[0].allowedPositions = [];
      data.entries[0].requiredPositions = [3];
    },
    /required subset/,
  ],
  [
    "unsorted positions",
    (data) => {
      data.entries[0].allowedPositions = [4, 3];
    },
    /sorted unique/,
  ],
  [
    "unsupported alphabet",
    (data) => {
      data.entries[0].source = "façade";
      data.entries[0].allowedPositions = [];
      data.entries[0].requiredPositions = [];
    },
    /admitted spelling/,
  ],
  [
    "admitted tl word",
    (data) => {
      data.entries[0].source = "atleta";
      data.entries[0].allowedPositions = [];
      data.entries[0].requiredPositions = [];
    },
    /tl belongs in negatives/,
  ],
  [
    "invalid Spanish minima",
    (data) => {
      data.entries[0].settings.minRight = 1;
    },
    /minRight/,
  ],
  [
    "missing evidence",
    (data) => {
      data.entries[0].evidence.rationale = "";
    },
    /rationale/,
  ],
  [
    "pending review",
    (data) => {
      data.entries[0].agentReview.status = "pending";
    },
    /review/,
  ],
];
for (const category of [
  "adjacent-vowels",
  "diacritics",
  "h",
  "ch-ll-rr",
  "x",
  "prefixes",
  "false-prefixes",
  "loanwords",
]) {
  spanishCorruptions.push([
    `missing ${category} coverage`,
    (data) => {
      for (const entry of data.entries) {
        entry.categories = entry.categories.map((value) =>
          value === category ? "other" : value,
        );
      }
    },
    new RegExp(`five words: ${category}`),
  ]);
}
for (const digraph of ["ch", "ll", "rr"]) {
  spanishCorruptions.push([
    `superficial ${digraph} coverage`,
    (data) => {
      for (const entry of data.entries) {
        if (entry.source.includes(digraph))
          entry.categories = entry.categories.map((category) =>
            category === "ch-ll-rr" ? "other" : category,
          );
      }
    },
    new RegExp(`actual digraph: ${digraph}`),
  ]);
}
for (const [name, corrupt, expected] of spanishCorruptions) {
  test(`es-es validator rejects ${name}`, () => {
    const data = structuredClone(spanish);
    corrupt(data);
    assert.throws(() => validateEsEsCorpus(data, spanishNegative), expected);
  });
}

test("es-es validator rejects missing warning and skip classes", () => {
  for (const reason of new Set(
    spanishNegative.entries.map((entry) => entry.reason),
  )) {
    const data = structuredClone(spanishNegative);
    data.entries = data.entries.filter((entry) => entry.reason !== reason);
    assert.throws(
      () => validateEsEsCorpus(spanish, data),
      /missing negative class/,
    );
  }
});

test("es-es validator rejects ambiguity warnings on expected skips", () => {
  for (const id of [
    "protected-tl",
    "caps-tl",
    "short-tl",
    "digits-tl",
    "shy-tl",
    "mixed-case-tl",
    "hyphen-tl",
    "apostrophe-tl",
  ]) {
    const data = structuredClone(spanishNegative);
    data.entries.find((entry) => entry.id === id).expectedDiagnostics.detailed =
      ["hyphenation.language-ambiguity"];
    assert.throws(() => validateEsEsCorpus(spanish, data), new RegExp(id));
  }
});

test("es-es validator rejects missing priority and literal Unicode variants", () => {
  for (const id of [
    "protected-unsupported",
    "caps-tl",
    "apostrophe-modifier",
    "hyphen-nonbreaking",
    "unsupported-nfd",
  ]) {
    const data = structuredClone(spanishNegative);
    data.entries = data.entries.filter((entry) => entry.id !== id);
    assert.throws(() => validateEsEsCorpus(spanish, data), /missing/);
  }
});
