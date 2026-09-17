import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement as h, Fragment } from "react";
import { renderToString } from "../examples/ssr/node_modules/react-dom/server.node.js";
import { transformReact } from "../packages/with-react/dist/pure.mjs";
import { Puncta } from "../packages/with-react/dist/index.mjs";
import { createPuncta } from "../packages/core/dist/index.mjs";
import { enGb } from "../packages/with-en-gb/dist/index.mjs";
import { esEs } from "../packages/with-es-es/dist/index.mjs";
const base = createPuncta({ locales: [enGb, esEs], locale: "en-gb" });

test("explicit grouping inserts narrow no-break spaces in standalone integers", () => {
  assert.equal(base.text("12345"), "12345");
  const enabled = base.with({ rules: { digitGrouping: { enabled: true } } });
  assert.equal(enabled.text("12345"), "12\u202f345");
  assert.equal(enabled.text("2026"), "2026");
});

test("grouping validates nullable fields even when processing is disabled", () => {
  for (const [patch, path, reason] of [
    ...["5", false, {}, []].map((minDigits) => [
      { minDigits },
      "minDigits",
      "type",
    ]),
    ...[3, -1, 4.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1].map(
      (minDigits) => [{ minDigits }, "minDigits", "value"],
    ),
    [{ enabled: 1 }, "enabled", "type"],
    [{ normalizeExisting: "true" }, "normalizeExisting", "type"],
    [{ unknown: true }, "unknown", "unknown"],
  ]) {
    assert.throws(
      () =>
        base.text("12345", { enabled: false, rules: { digitGrouping: patch } }),
      (error) =>
        error.name === "PunctaConfigError" &&
        error.code === "config.invalid-option" &&
        JSON.stringify(error.optionPath) ===
          JSON.stringify(["rules", "digitGrouping", path]) &&
        error.details.reason === reason,
    );
  }
  for (const patch of [true, 5, "on", []])
    assert.throws(
      () => base.with({ rules: { digitGrouping: patch } }),
      (error) =>
        error.code === "config.invalid-option" &&
        error.details.reason === "type" &&
        JSON.stringify(error.optionPath) === '["rules","digitGrouping"]',
    );
  const enabled = base.with({
    rules: {
      digitGrouping: { enabled: true, minDigits: 4, normalizeExisting: false },
    },
  });
  assert.equal(enabled.text("2026"), "2\u202f026");
  assert.equal(
    enabled.text("2026", {
      rules: { digitGrouping: { minDigits: undefined } },
    }),
    "2\u202f026",
  );
  assert.equal(
    enabled.text("2026", { rules: { digitGrouping: { minDigits: null } } }),
    "2026",
  );
  assert.equal(
    enabled.text("12345", { rules: { digitGrouping: null } }),
    "12345",
  );
  assert.equal(
    enabled.text("12345", {
      rules: { digitGrouping: { enabled: null, normalizeExisting: null } },
    }),
    "12345",
  );
  assert.equal(
    enabled.text("12345", {
      rules: { digitGrouping: { minDigits: Number.MAX_SAFE_INTEGER } },
    }),
    "12345",
  );
  assert.equal(
    base.text("12345", {
      rules: { digitGrouping: { minDigits: 4, normalizeExisting: false } },
    }),
    "12345",
  );
});

for (const locale of ["en-gb", "es-es"]) {
  test(`${locale}: literal standalone decimal, sign and threshold oracles`, () => {
    const instance = base.with({
      locale,
      rules: { digitGrouping: { enabled: true }, minus: { enabled: false } },
    });
    for (const [input, expected] of [
      ["12345", "12\u202f345"],
      ["1234567", "1\u202f234\u202f567"],
      ["12345.6700", "12\u202f345.6700"],
      ["+12345", "+12\u202f345"],
      ["-12345", "-12\u202f345"],
      ["−12345.00", "−12\u202f345.00"],
      ["1234.567890", "1234.567890"],
      ["(12345).", "(12\u202f345)."],
      ["12345, 67890", "12\u202f345, 67\u202f890"],
      [
        "123456789012345678901234567890",
        "123\u202f456\u202f789\u202f012\u202f345\u202f678\u202f901\u202f234\u202f567\u202f890",
      ],
      ...(locale === "es-es"
        ? [
            ["12345,6700", "12\u202f345,6700"],
            ["1,234", "1,234"],
          ]
        : []),
    ])
      assert.equal(instance.text(input), expected, input);
    assert.equal(
      instance.text("1234", { rules: { digitGrouping: { minDigits: 4 } } }),
      "1\u202f234",
    );
  });
}

test("unsupported complete constructions never expose a numeric prefix or suffix", () => {
  for (const locale of ["en-gb", "es-es"]) {
    const instance = base.with({
      locale,
      rules: { digitGrouping: { enabled: true } },
    });
    for (const input of [
      "0012345",
      "00.12345",
      ".12345",
      ",12345",
      "−.12345",
      "AB12345",
      "12345foo",
      "12345_67890",
      "١12345",
      "12345٢",
      "e\u030112345",
      "12\u00ad345",
      "12345e6",
      "12345E−6",
      "12345/67890",
      "12345:67890",
      "12345-67890",
      "12345–67890",
      "2026-09-12345",
      "1.23456.789",
      "12345+67890",
      "12345 + 67890",
      "12345  +  67890",
      "12345 +67890",
      "12345 − 67890",
      "12345 * 67890",
      "12345 / 67890",
      "12345 67890kg",
      "12345kg",
      "12345 kg",
      "$ 12345",
      "12345 %",
    ]) {
      const report = instance.text(input, { detailed: true });
      assert.deepEqual(
        report.edits.filter((edit) => edit.ruleIds.includes("digitGrouping")),
        [],
        `${locale}: ${input}`,
      );
      assert.deepEqual(
        report.warnings.filter((warning) => warning.ruleId === "digitGrouping"),
        [],
        input,
      );
    }
  }
});

test("reports retain original UTF-16 insertions and replay without new second-pass edits", () => {
  const instance = base.with({ rules: { digitGrouping: { enabled: true } } });
  const source = "😀 1234567.00";
  const report = instance.text(source, { detailed: true });
  assert.equal(report.result, "😀 1\u202f234\u202f567.00");
  assert.deepEqual(
    report.edits,
    [4, 7].map((position) => ({
      kind: "insert",
      before: "",
      after: "\u202f",
      locale: "en-gb",
      ruleIds: ["digitGrouping"],
      ranges: [{ sourceId: 0, start: position, end: position }],
    })),
  );
  assert.deepEqual(report.appliedRules, [
    { ruleId: "digitGrouping", locale: "en-gb" },
  ]);
  let replay = source;
  for (const edit of [...report.edits].reverse()) {
    const { start, end } = edit.ranges[0];
    replay = replay.slice(0, start) + edit.after + replay.slice(end);
  }
  assert.equal(replay, report.result);
  assert.deepEqual(instance.text(report.result, { detailed: true }).edits, []);
  assert.deepEqual(instance.text("2026", { detailed: true }).appliedRules, []);
  assert.equal(
    instance.text("12345", { protect: [{ start: 0, end: 5 }] }),
    "12345",
  );
});

for (const locale of ["en-gb", "es-es"]) {
  test(`${locale}: HTML, pure React and component SSR share the public option and left-leaf insertion`, () => {
    const instance = base.with({ locale });
    const options = { rules: { digitGrouping: { enabled: true } } };
    const html = instance.html("12<em>345</em>", {
      ...options,
      detailed: true,
    });
    assert.equal(html.result, "12\u202f<em>345</em>");
    assert.deepEqual(html.edits[0].ranges, [
      {
        sourceId: 0,
        start: 2,
        end: 2,
        inputRange: { accuracy: "exact", start: 2, end: 2 },
      },
    ]);
    const children = [
      "12",
      h(Fragment, { key: "fragment" }, h("em", null, "345")),
    ];
    const react = transformReact(children, {
      instance,
      ...options,
      detailed: true,
    });
    assert.equal(renderToString(react.result), "12\u202f<em>345</em>");
    assert.deepEqual(react.edits[0].ranges, [
      { sourceId: 0, start: 2, end: 2 },
    ]);
    assert.deepEqual(react.appliedRules, [{ ruleId: "digitGrouping", locale }]);
    assert.equal(children[0], "12");
    assert.equal(children[1].props.children.props.children, "345");
    assert.equal(
      renderToString(h(Puncta, { instance, options }, children)),
      "12\u202f<em>345</em>",
    );
    assert.equal(
      instance.html(
        `<span data-puncta-options='{"rules":{"digitGrouping":{"enabled":true}}}'>12345</span>`,
      ),
      `<span data-puncta-options="{&quot;rules&quot;:{&quot;digitGrouping&quot;:{&quot;enabled&quot;:true}}}">12\u202f345</span>`,
    );
    for (const source of [
      "12<br>345",
      "12<wbr>345",
      "12<code>345</code>",
      '<span data-puncta="off">12345</span>',
    ])
      assert.equal(instance.html(source, options), source);
    assert.equal(
      renderToString(
        transformReact(h("code", null, "12345"), { instance, ...options }),
      ),
      "<code>12345</code>",
    );
    function Opaque() {
      return "345";
    }
    assert.equal(
      renderToString(
        transformReact(["12", h(Opaque, { key: "opaque" })], {
          instance,
          ...options,
        }),
      ),
      "12<!-- -->345",
    );
  });
}

test("numeric separators stay distinct across repeated processing", () => {
  const instance = base.with({ rules: { digitGrouping: { enabled: true } } });
  for (const gap of ["  ", "   ", "\t", "\n"]) {
    const result = instance.text(`12345${gap}67890`);
    assert.equal(result, `12\u202f345${gap}67\u202f890`);
    assert.deepEqual(instance.text(result, { detailed: true }).edits, []);
  }
  for (const source of [
    "12345: 67890",
    "12345  +67890",
    "12345\u00a0\u00a0+67890",
  ])
    assert.deepEqual(
      instance
        .text(source, { detailed: true })
        .edits.filter((edit) => edit.ruleIds.includes("digitGrouping")),
      [],
      source,
    );
});

test("disabled grouping retains the full previous report and cleanup", () => {
  const source = '12345  67890; 12345.60; 20  £; "hello..."; 10-12 kg';
  const previous = base.text(source, { detailed: true });
  assert.deepEqual(
    base.text(source, {
      detailed: true,
      rules: { digitGrouping: { enabled: false } },
    }),
    previous,
  );
  assert.deepEqual(
    base.text(source, {
      detailed: true,
      rules: { digitGrouping: { minDigits: 4, normalizeExisting: false } },
    }),
    previous,
  );
});

test("surrounding punctuation stays outside a standalone number", () => {
  for (const locale of ["en-gb", "es-es"]) {
    const instance = base.with({
      locale,
      rules: { digitGrouping: { enabled: true } },
    });
    for (const [source, expected] of [
      ["¿12345?", "¿12\u202f345?"],
      ["¡12345!", "¡12\u202f345!"],
      ["12345:", "12\u202f345:"],
      ["12345…", "12\u202f345…"],
      ["12345...", "12\u202f345…"],
    ])
      assert.equal(instance.text(source), expected, `${locale}: ${source}`);
  }
});

test("parentheses do not expose an operand of unsupported arithmetic", () => {
  for (const locale of ["en-gb", "es-es"]) {
    const instance = base.with({
      locale,
      rules: { digitGrouping: { enabled: true } },
    });
    for (const source of [
      "12345 + (67890)",
      "(12345) + 67890",
      "(12345) + (67890)",
      "12345 + ((67890))",
      "12345 * [67890]",
      "12345+(67890)",
      "12345\t+\t67890",
      "12345\t/\t67890",
    ])
      assert.deepEqual(
        instance
          .text(source, { detailed: true })
          .edits.filter((edit) => edit.ruleIds.includes("digitGrouping")),
        [],
        `${locale}: ${source}`,
      );
  }
});

test("existing standalone groups normalize only above the threshold and when requested", () => {
  for (const locale of ["en-gb", "es-es"]) {
    const instance = base.with({
      locale,
      rules: { digitGrouping: { enabled: true } },
    });
    for (const separator of [
      " ",
      "\u00a0",
      "\u2009",
      "\u202f",
      ...(locale === "en-gb" ? [","] : []),
    ]) {
      const source = `12${separator}345${separator}678.900`;
      assert.equal(
        instance.text(source),
        "12\u202f345\u202f678.900",
        `${locale}: ${source}`,
      );
      assert.equal(
        instance.text(source, {
          rules: { digitGrouping: { normalizeExisting: false } },
        }),
        source,
      );
      assert.equal(instance.text(`1${separator}234`), `1${separator}234`);
      assert.equal(
        instance.text(`1${separator}234`, {
          rules: { digitGrouping: { minDigits: 4 } },
        }),
        "1\u202f234",
      );
    }
    assert.equal(
      instance.text("1 234\u00a0567\u2009890\u202f123"),
      "1\u202f234\u202f567\u202f890\u202f123",
    );
    assert.deepEqual(
      instance.text("12\u202f345", { detailed: true }).edits,
      [],
    );
  }
});

test("ambiguous complete candidates retain their spelling and structured source diagnostic", () => {
  for (const locale of ["en-gb", "es-es"]) {
    for (const input of [
      "12 34",
      "1234 567",
      "12345 67890",
      "1.234 567",
      "1 ,234",
      "1 , 234",
      "1.234,50",
      "1,234 567",
      ...(locale === "en-gb" ? ["1,23"] : []),
    ]) {
      for (const options of [
        {},
        { minDigits: Number.MAX_SAFE_INTEGER },
        { normalizeExisting: false },
      ]) {
        const instance = base.with({
          locale,
          rules: { digitGrouping: { enabled: true, ...options } },
        });
        const report = instance.text(`😀 ${input}!`, { detailed: true });
        assert.equal(report.result, `😀 ${input}!`, `${locale}: ${input}`);
        const warnings = report.warnings.filter(
          (warning) => warning.ruleId === "digitGrouping",
        );
        assert.equal(warnings.length, 1, `${locale}: ${input}`);
        assert.deepEqual(
          { ...warnings[0], message: "explanation" },
          {
            code: "typography.ambiguous",
            source: "rule",
            ruleId: "digitGrouping",
            locale,
            details: {},
            message: "explanation",
            location: {
              kind: "text",
              ranges: [{ sourceId: 0, start: 3, end: 3 + input.length }],
            },
          },
        );
        assert.deepEqual(report.appliedRules, []);
        assert.deepEqual(
          instance.text(report.result, { detailed: true }).edits,
          [],
        );
      }
    }
  }
});

test("all standalone boundaries survive cleanup and repeated processing", () => {
  for (const locale of ["en-gb", "es-es"]) {
    const instance = base.with({
      locale,
      rules: { digitGrouping: { enabled: true } },
    });
    for (const gap of ["  ", " \u00a0", "\u2009 ", "\u202f  ", "\t", "\n"]) {
      const expected = `12\u202f345${gap}67\u202f890`;
      assert.equal(instance.text(`12345${gap}67890`), expected);
      assert.deepEqual(instance.text(expected, { detailed: true }).edits, []);
    }
    for (const [input, expected] of [
      ["12 345, 67 890", "12\u202f345, 67\u202f890"],
      ["12 345. 67 890", "12\u202f345. 67\u202f890"],
    ])
      assert.equal(instance.text(input), expected);
  }
});

test("expected exclusions take precedence over malformed fragments", () => {
  for (const locale of ["en-gb", "es-es"]) {
    const instance = base.with({
      locale,
      rules: { digitGrouping: { enabled: true } },
    });
    for (const input of [
      "0012345",
      "0 123",
      "00.12345",
      ".12345",
      ",12345",
      "−,12345",
      "١12345",
      "12345٢",
      "12345\u0301",
      "AB12345",
      "12345suffix",
      "12345e6",
      "12345E−6",
      "12345/67890",
      "12345:67890",
      "2026-09-12345",
      "1.2345.6",
      "1.234.567",
      "12 34 + 56789",
      "12345 + 67 89",
      "12 34 + (56789)",
      "(12345) + 67 89",
    ]) {
      const report = instance.text(input, { detailed: true });
      assert.deepEqual(
        report.edits.filter((edit) => edit.ruleIds.includes("digitGrouping")),
        [],
        input,
      );
      assert.deepEqual(
        report.warnings.filter((warning) => warning.ruleId === "digitGrouping"),
        [],
        input,
      );
    }
  }
});

test("normalization reports separate source separators, including HTML entities", () => {
  const instance = base.with({ rules: { digitGrouping: { enabled: true } } });
  const report = instance.text("😀 12,345,678.900", { detailed: true });
  assert.equal(report.result, "😀 12\u202f345\u202f678.900");
  assert.deepEqual(
    report.edits,
    [5, 9].map((start) => ({
      kind: "replace",
      before: ",",
      after: "\u202f",
      locale: "en-gb",
      ruleIds: ["digitGrouping"],
      ranges: [{ sourceId: 0, start, end: start + 1 }],
    })),
  );
  const html = instance.html("12<em>&#32;</em>345&#160;678", {
    detailed: true,
  });
  assert.equal(html.result, "12<em>\u202f</em>345\u202f678");
  assert.deepEqual(
    html.edits.map(({ before, after, ranges }) => ({ before, after, ranges })),
    [
      {
        before: " ",
        after: "\u202f",
        ranges: [
          {
            sourceId: 1,
            start: 0,
            end: 1,
            inputRange: { accuracy: "exact", start: 6, end: 11 },
          },
        ],
      },
      {
        before: "\u00a0",
        after: "\u202f",
        ranges: [
          {
            sourceId: 2,
            start: 3,
            end: 4,
            inputRange: { accuracy: "exact", start: 19, end: 25 },
          },
        ],
      },
    ],
  );
});

test("every transparent split retains replacement ownership and whole-candidate warnings", () => {
  for (const locale of ["en-gb", "es-es"]) {
    const instance = base.with({
      locale,
      rules: { digitGrouping: { enabled: true } },
    });
    for (const [source, expected, warningCount] of [
      ["12 345\u2009678", "12\u202f345\u202f678", 0],
      ["12 34", "12 34", 1],
      ["1.234,50", "1.234,50", 1],
    ]) {
      for (let split = 1; split < source.length; split++) {
        const left = source.slice(0, split);
        const right = source.slice(split);
        const html = instance.html(
          `${left}<!-- boundary --><em>${right}</em>`,
          { detailed: true },
        );
        const children = [
          left,
          h(Fragment, { key: "fragment" }, h("em", null, right)),
        ];
        const react = transformReact(children, { instance, detailed: true });
        assert.equal(
          html.result.replace(/<[^>]*>/gu, ""),
          expected,
          `${source}@${split}`,
        );
        assert.equal(
          renderToString(react.result).replace(/<[^>]*>/gu, ""),
          expected,
        );
        assert.equal(
          renderToString(h(Puncta, { instance }, children)).replace(
            /<[^>]*>/gu,
            "",
          ),
          expected,
        );
        for (const report of [html, react]) {
          const warnings = report.warnings.filter(
            (warning) => warning.ruleId === "digitGrouping",
          );
          assert.equal(warnings.length, warningCount);
          if (warningCount)
            assert.deepEqual(
              warnings[0].location.ranges.map(({ sourceId, start, end }) => ({
                sourceId,
                start,
                end,
              })),
              [
                { sourceId: 0, start: 0, end: split },
                { sourceId: 1, start: 0, end: source.length - split },
              ],
            );
          for (const edit of report.edits) {
            assert.equal(edit.kind, "replace");
            assert.equal(edit.ranges.length, 1);
            const range = edit.ranges[0];
            assert.equal(range.end - range.start, 1);
            assert.equal(
              [left, right][range.sourceId].slice(range.start, range.end),
              edit.before,
            );
          }
        }
      }
    }
  }
});

test("seed 8801: generated groups preserve exact digits, replay, fixed points and representation equivalence", () => {
  let seed = 8801;
  const choose = (items) => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return items[Math.floor((seed / 2 ** 32) * items.length)];
  };
  for (let sample = 0; sample < 120; sample++) {
    const locale = choose(["en-gb", "es-es"]);
    const groups = [
      choose(["1", "12", "123"]),
      ...Array.from({ length: choose([1, 2, 3, 8]) }, () =>
        choose(["000", "123", "456", "789"]),
      ),
    ];
    const commaGroups = locale === "en-gb" && choose([true, false]);
    const decimal = locale === "es-es" ? choose([".00900", ",6700"]) : ".00900";
    const sign = choose(["", "+", "−"]);
    const malformed = choose([true, false]);
    if (malformed) groups[1] = "12";
    const number = groups
      .map(
        (group, index) =>
          `${index ? (commaGroups ? "," : choose([" ", "\u00a0", "\u2009", "\u202f"])) : ""}${group}`,
      )
      .join("");
    const source = sign + number + decimal;
    const normalizeExisting = choose([true, false]);
    const minDigits = choose([4, 5, 12]);
    const expected =
      !malformed && normalizeExisting && groups.join("").length >= minDigits
        ? sign + groups.join("\u202f") + decimal
        : source;
    const instance = base.with({
      locale,
      rules: {
        digitGrouping: { enabled: true, minDigits, normalizeExisting },
        minus: { enabled: false },
      },
    });
    const context = `seed=8801 sample=${sample} state=${seed} input=${JSON.stringify(source)}`;
    const report = instance.text(source, { detailed: true });
    assert.equal(report.result, expected, context);
    assert.equal(
      report.result.replace(/[, \u00a0\u2009\u202f]/gu, ""),
      source.replace(/[, \u00a0\u2009\u202f]/gu, ""),
      context,
    );
    assert.equal(
      report.warnings.filter((warning) => warning.ruleId === "digitGrouping")
        .length,
      Number(malformed),
      context,
    );
    let replay = source;
    for (const edit of [...report.edits].reverse()) {
      const { start, end } = edit.ranges[0];
      assert.equal(end - start, 1, context);
      assert.equal(source.slice(start, end), edit.before, context);
      replay = replay.slice(0, start) + edit.after + replay.slice(end);
    }
    assert.equal(replay, expected, context);
    assert.deepEqual(
      instance.text(expected, { detailed: true }).edits,
      [],
      context,
    );
    const leaves = [...source];
    assert.equal(
      instance
        .html(leaves.map((leaf) => `<em>${leaf}</em>`).join(""))
        .replace(/<[^>]*>/gu, "")
        .replaceAll("&nbsp;", "\u00a0"),
      expected,
      context,
    );
    assert.equal(
      renderToString(transformReact(leaves, { instance }))
        .replace(/<[^>]*>/gu, "")
        .replaceAll("&nbsp;", "\u00a0"),
      expected,
      context,
    );
    assert.equal(
      instance.text(source, { protect: [{ start: 0, end: source.length }] }),
      source,
      context,
    );
    assert.equal(
      instance.html(`<code>${source}</code>`).replaceAll("&nbsp;", "\u00a0"),
      `<code>${source}</code>`,
      context,
    );
    const protectedReact = transformReact(h("code", null, source), {
      instance,
      detailed: true,
    });
    assert.deepEqual(protectedReact.edits, [], context);
    assert.deepEqual(protectedReact.warnings, [], context);
  }
});
