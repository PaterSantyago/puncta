import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { arch, cpus, platform, release, tmpdir, totalmem } from "node:os";
import { join, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { createElement } from "react";
import { createPuncta } from "../packages/core/dist/index.mjs";
import { enGb } from "../packages/with-en-gb/dist/index.mjs";
import { esEs } from "../packages/with-es-es/dist/index.mjs";
import { transformReact } from "../packages/with-react/dist/pure.mjs";

// Run after check/pack, with no concurrent builds. This measures existing artifacts.
const output = resolve(
  process.argv[2] ?? "artifacts/acceptance/measurements.json",
);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
const report = {
  measuredAt: new Date().toISOString(),
  commit: git("rev-parse", "HEAD"),
  tree: git("rev-parse", "HEAD^{tree}"),
  trackedChanges: git("status", "--porcelain", "--untracked-files=no"),
  environment: {
    node: process.version,
    versions: process.versions,
    pnpm: execFileSync("pnpm", ["--version"], { encoding: "utf8" }).trim(),
    os: platform(),
    release: release(),
    arch: arch(),
    cpu: cpus()[0].model,
    logicalCpus: cpus().length,
    memoryBytes: totalmem(),
  },
  lockfileSha256: sha256(await readFile("pnpm-lock.yaml")),
  packages: [],
  language: {},
  timings: [],
};

async function filesBelow(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await filesBelow(path)));
    else if (entry.isFile()) files.push(path);
  }
  return files.sort();
}

for (const name of ["core", "with-en-gb", "with-es-es", "with-react"]) {
  const manifest = JSON.parse(await readFile(`packages/${name}/package.json`));
  const archive = `artifacts/use-puncta-${name}-${manifest.version}.tgz`;
  const bytes = await readFile(archive);
  const directory = await mkdtemp(join(tmpdir(), "puncta-measure-"));
  try {
    execFileSync("tar", ["-xzf", resolve(archive), "-C", directory]);
    const files = await filesBelow(join(directory, "package"));
    let unpackedBytes = 0;
    let javascriptBytes = 0;
    for (const file of files) {
      const size = (await stat(file)).size;
      unpackedBytes += size;
      if (file.endsWith(".mjs")) javascriptBytes += size;
      if (file.includes("/dist/")) {
        const relative = file.slice(join(directory, "package").length + 1);
        assert.deepEqual(
          await readFile(file),
          await readFile(`packages/${name}/${relative}`),
          `Measured workspace module differs from packed ${name}/${relative}`,
        );
      }
    }
    report.packages.push({
      name: manifest.name,
      version: manifest.version,
      archive,
      sha256: sha256(bytes),
      compressedBytes: bytes.length,
      unpackedBytes,
      javascriptBytes,
      files: files.length,
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function positionCounts() {
  return {
    words: 0,
    allowed: 0,
    actual: 0,
    required: 0,
    requiredWords: 0,
    incorrect: 0,
    missingRequired: 0,
    optionalOmissions: 0,
  };
}
for (const locale of [enGb, esEs]) {
  const instance = createPuncta({ locales: [locale], locale: locale.id });
  const corpus = JSON.parse(
    await readFile(`tests/fixtures/hyphenation/${locale.id}.json`),
  );
  const freeze = JSON.parse(
    await readFile(`tests/fixtures/hyphenation/${locale.id}-freeze.json`),
  );
  for (const [file, hash] of Object.entries(freeze.files))
    assert.equal(
      sha256(await readFile(`tests/fixtures/hyphenation/${file}`)),
      hash,
    );
  const totals = positionCounts();
  const categories = {};
  const omissions = [];
  for (const entry of corpus.entries) {
    const result = instance.text(entry.source, { hyphenation: entry.settings });
    assert.equal(result.replaceAll("\u00ad", ""), entry.source);
    const actual = [];
    let offset = 0;
    for (const character of result) {
      if (character === "\u00ad") actual.push(offset);
      else offset += character.length;
    }
    const incorrect = actual.filter(
      (position) => !entry.allowedPositions.includes(position),
    );
    const missingRequired = entry.requiredPositions.filter(
      (position) => !actual.includes(position),
    );
    const optional = entry.allowedPositions.filter(
      (position) =>
        !actual.includes(position) &&
        !entry.requiredPositions.includes(position),
    );
    assert.deepEqual(incorrect, [], `${entry.source}: incorrect positions`);
    assert.deepEqual(
      missingRequired,
      [],
      `${entry.source}: missing mandatory positions`,
    );
    const counts = {
      words: 1,
      allowed: entry.allowedPositions.length,
      actual: actual.length,
      required: entry.requiredPositions.length,
      requiredWords: Number(entry.requiredPositions.length > 0),
      incorrect: incorrect.length,
      missingRequired: missingRequired.length,
      optionalOmissions: optional.length,
    };
    for (const target of [
      totals,
      ...entry.categories.map(
        (category) => (categories[category] ??= positionCounts()),
      ),
    ])
      for (const [key, value] of Object.entries(counts)) target[key] += value;
    if (optional.length)
      omissions.push({
        word: entry.source,
        positions: optional,
        categories: entry.categories,
      });
  }
  report.language[locale.id] = {
    corpusVersion: corpus.version,
    freeze,
    resource: JSON.parse(
      await readFile(`resources/${locale.id}/manifest.json`),
    ),
    totals,
    categories,
    omissions,
  };
}

// Import, input/tree construction and instance creation are outside warm calls.
// No forced GC. Keep all samples, including allocation/GC outliers; no thresholds.
const warmups = 3;
const samples = 9;
function measure(operation, iterations) {
  for (let index = 0; index < warmups; index++) operation();
  const milliseconds = [];
  for (let sample = 0; sample < samples; sample++) {
    const start = performance.now();
    for (let iteration = 0; iteration < iterations; iteration++) operation();
    milliseconds.push((performance.now() - start) / iterations);
  }
  const sorted = [...milliseconds].sort((left, right) => left - right);
  return {
    warmups,
    samples,
    iterationsPerSample: iterations,
    milliseconds,
    medianMs: sorted[Math.floor(sorted.length / 2)],
    minMs: sorted[0],
    maxMs: sorted.at(-1),
  };
}
const seeds = {
  "en-gb": '"backbone" -- 24kg, 50 % and university... ',
  "es-es": '"camino" -- 24kg, 50% y música... ',
};
report.method = {
  seeds,
  repetitions: [1, 10, 100],
  warmups,
  samples,
  timing:
    "performance.now; milliseconds per invocation; no forced GC or outlier removal",
  creation:
    "warm module imports; new immutable single-locale instance; no text processing; 10 per sample",
  text: "seed.repeat(repetitions)",
  html: "<p> + repeated seed + </p>; fragment/div; parsing and serialization included",
  react:
    "precreated React p with one string child; pure transform only, no React render/SSR",
  exclusions:
    "module import/cold process startup, input construction, network, browser layout and dependency installation",
};
for (const locale of [enGb, esEs]) {
  report.timings.push({
    locale: locale.id,
    operation: "create-instance",
    hyphenation: true,
    ...measure(
      () =>
        createPuncta({
          locales: [locale],
          locale: locale.id,
          hyphenation: { enabled: true },
        }),
      10,
    ),
  });
  for (const hyphenation of [false, true]) {
    const instance = createPuncta({
      locales: [locale],
      locale: locale.id,
      hyphenation: { enabled: hyphenation },
    });
    for (const repetitions of report.method.repetitions) {
      const source = seeds[locale.id].repeat(repetitions);
      const html = `<p>${source}</p>`;
      const tree = createElement("p", null, source);
      for (const detailed of [false, true]) {
        for (const [operation, invoke, serializedInput] of [
          ["text", () => instance.text(source, { detailed }), source],
          ["html", () => instance.html(html, { detailed }), html],
          [
            "react-pure",
            () => transformReact(tree, { instance, detailed }),
            source,
          ],
        ]) {
          report.timings.push({
            locale: locale.id,
            operation,
            hyphenation,
            detailed,
            repetitions,
            textUtf16Length: source.length,
            inputUtf16Length: serializedInput.length,
            inputUtf8Bytes: Buffer.byteLength(serializedInput),
            inputSha256: sha256(serializedInput),
            ...measure(invoke, 1),
          });
        }
      }
    }
  }
}
await mkdir(resolve(output, ".."), { recursive: true });
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(
  `Measured four verified archives and ${report.timings.length} timing scenarios: ${output}`,
);
