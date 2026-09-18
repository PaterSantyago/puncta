import assert from "node:assert/strict";
import { createPuncta } from "../packages/core/dist/index.mjs";
import { createElement as h } from "react";
import { transformReact } from "../packages/with-react/dist/pure.mjs";
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
// Each numeric source has exactly 4x UTF-16 length at the larger size.
// The structured scenarios also grow their leaf count by 4x.
const grouping = instance.with({ rules: { digitGrouping: { enabled: true } } });
const numeric = {
  digits: (n) => "123".repeat(n),
  decimal: (n) => `${"123".repeat(n - 1)}.00`,
  groups: (n) => `${Array(n).fill("123").join(" ")};`,
  invalid: (n) => {
    const groups = Array(n).fill("345");
    groups[Math.floor(n / 2)] = "12";
    return `${groups.join(" ")}!!`;
  },
};
for (const [name, build] of Object.entries(numeric)) {
  for (const representation of ["text", "html", "react"]) {
    cases[`grouping-${name}-${representation}`] = {
      sizes: [1000, 4000],
      prepare(size) {
        const source = build(size);
        // One chunk per triple or group, so the tree itself grows with the input.
        const width = source.length / size;
        const leaves = Array.from({ length: size }, (_, i) =>
          source.slice(i * width, (i + 1) * width),
        );
        const input =
          representation === "html"
            ? leaves.map((leaf) => `<em>${leaf}</em>`).join("")
            : representation === "react"
              ? leaves.map((leaf, key) => h("em", { key }, leaf))
              : source;
        return {
          length: source.length,
          leaves: representation === "text" ? 1 : leaves.length,
          inputLength: representation === "html" ? input.length : source.length,
          warningCount: name === "invalid" ? 1 : 0,
          run:
            representation === "react"
              ? () =>
                  transformReact(input, { instance: grouping, detailed: true })
              : () => grouping[representation](input, { detailed: true }),
        };
      },
    };
  }
}
const selected = process.argv[2];
if (selected) assert.ok(Object.hasOwn(cases, selected), "Unknown scenario");
for (const [name, scenario] of Object.entries(cases)) {
  if (selected && selected !== name) continue;
  const inputs = scenario.sizes.map((size) => {
    if (scenario.prepare) return scenario.prepare(size);
    const source = scenario.seed.repeat(size);
    return {
      length: source.length,
      inputLength: source.length,
      leaves: 1,
      run: () => instance.text(source),
    };
  });
  assert.equal(inputs[1].length, inputs[0].length * 4);
  for (const input of inputs) {
    if (input.warningCount === undefined) continue;
    const report = input.run();
    assert.equal(report.hasEdits, input.warningCount === 0);
    assert.equal(report.warnings.length, input.warningCount);
    if (input.warningCount)
      assert.equal(report.warnings[0].ruleId, "digitGrouping");
  }
  const medians = inputs.map(({ run }) => {
    for (let warmup = 0; warmup < 3; warmup++) run();
    const samples = [];
    for (let sample = 0; sample < 7; sample++) {
      const start = performance.now();
      run();
      samples.push(performance.now() - start);
    }
    return samples.sort((a, b) => a - b)[3];
  });
  const ratio = medians[1] / medians[0];
  console.log(
    JSON.stringify({
      name,
      lengths: inputs.map((input) => input.length),
      inputLengths: inputs.map((input) => input.inputLength),
      leaves: inputs.map((input) => input.leaves),
      medians,
      ratio,
    }),
  );
  assert.ok(
    ratio < 8,
    `${name}: 4x input took ${ratio.toFixed(2)}x time (limit 8x)`,
  );
}
