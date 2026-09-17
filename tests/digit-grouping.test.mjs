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
      "1.234,56789",
      "12345+67890",
      "12345 + 67890",
      "12345  +  67890",
      "12345 +67890",
      "12345 − 67890",
      "12345 * 67890",
      "12345 / 67890",
      "12345 67890",
      "12345\u00a067890",
      "12345\u200967890",
      "12345\u202f67890",
      "12345 67890kg",
      "1 ,23456",
      "12345 , 67890",
      "12,345",
      "12 345",
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
