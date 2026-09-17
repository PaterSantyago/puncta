import assert from "node:assert/strict";
import { createPuncta } from "../packages/core/dist/index.mjs";
import { enGb } from "../packages/with-en-gb/dist/index.mjs";

// Run separately from functional tests, without concurrent builds/tests. This
// detects the diagnosed quadratic growth, not a portable latency guarantee.
const instance = createPuncta({ locales: [enGb], locale: enGb.id });
const cases = {
  spaces: { seed: " ", sizes: [4000, 16000] },
  words: { seed: "a ", sizes: [500, 2000] },
  mixed: {
    seed: '"backbone" -- 24kg, 50 % and university... ',
    sizes: [100, 400],
  },
};
const selected = process.argv[2];
if (selected) assert.ok(Object.hasOwn(cases, selected), "Unknown scenario");
for (const [name, { seed, sizes }] of Object.entries(cases)) {
  if (selected && selected !== name) continue;
  const medians = sizes.map((size) => {
    const source = seed.repeat(size);
    for (let warmup = 0; warmup < 3; warmup++) instance.text(source);
    const samples = [];
    for (let sample = 0; sample < 7; sample++) {
      const start = performance.now();
      instance.text(source);
      samples.push(performance.now() - start);
    }
    return samples.sort((a, b) => a - b)[3];
  });
  const ratio = medians[1] / medians[0];
  console.log(
    JSON.stringify({
      name,
      lengths: sizes.map((n) => n * seed.length),
      medians,
      ratio,
    }),
  );
  assert.ok(
    ratio < 8,
    `${name}: 4x input took ${ratio.toFixed(2)}x time (limit 8x)`,
  );
}
