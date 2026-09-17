import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement as h, Fragment } from "react";
import { renderToString } from "../examples/ssr/node_modules/react-dom/server.node.js";
import { transformReact } from "../packages/with-react/dist/pure.mjs";
import { Puncta } from "../packages/with-react/dist/index.mjs";
import { createPuncta } from "../packages/core/dist/index.mjs";
import { enGb } from "../packages/with-en-gb/dist/index.mjs";
import { esEs } from "../packages/with-es-es/dist/index.mjs";
const base = createPuncta({
  locales: [enGb, esEs],
  locale: "en-gb",
  rules: { digitGrouping: { enabled: true } },
});

test("complete known designations admit grouping with independent exterior bonds", () => {
  for (const locale of ["en-gb", "es-es"]) {
    const instance = base.with({
      locale,
      rules: { units: { additional: ["widget/s"] } },
    });
    for (const [input, expected] of [
      ["12345kg", "12\u202f345\u00a0kg"],
      ["12345 km/h", "12\u202f345\u00a0km/h"],
      ["12345widget/s", "12\u202f345\u00a0widget/s"],
      ["12345 °", "12\u202f345°"],
      ["12345 %", locale === "en-gb" ? "12\u202f345%" : "12\u202f345\u00a0%"],
      ["EUR12345", "EUR\u00a012\u202f345"],
      ["12345 USD", "12\u202f345\u00a0USD"],
    ]) {
      assert.equal(instance.text(input), expected, `${locale}: ${input}`);
      assert.deepEqual(instance.text(expected, { detailed: true }).edits, []);
    }
  }
});

test("range eligibility is atomic while endpoint formatting remains independent", () => {
  for (const locale of ["en-gb", "es-es"]) {
    const instance = base.with({ locale });
    for (const [input, expected, options = {}] of [
      ["12345–67890", "12\u202f345–67\u202f890"],
      ["12345-67890kg", "12\u202f345–67\u202f890\u00a0kg"],
      ["12345-67890", "12345-67890"],
      [
        "12345-67890",
        "12\u202f345–67\u202f890",
        { rules: { ranges: { standalone: true } } },
      ],
      ["12345−67890", "12345−67890"],
      ["1234–67890", "1234–67\u202f890"],
      ["00123–123456", "00123–123456"],
      ["1.234.5–123456", "1.234.5–123456"],
      [
        "12345-67890-12345",
        "12345-67890-12345",
        { rules: { ranges: { standalone: true } } },
      ],
      [
        "12 345–67890",
        "12 345–67\u202f890",
        { rules: { digitGrouping: { normalizeExisting: false } } },
      ],
      ["-12\u202f345kg", "−12\u202f345\u00a0kg"],
      ["-12345kg", "−12\u202f345\u00a0kg"],
    ]) {
      assert.equal(
        instance.text(input, options),
        expected,
        `${locale}: ${input}`,
      );
      assert.deepEqual(
        instance.text(expected, { ...options, detailed: true }).edits,
        [],
        input,
      );
    }
    for (const input of ["12 34–123456", "12345–12 34"]) {
      const report = instance.text(input, { detailed: true });
      assert.equal(report.result, input);
      assert.deepEqual(
        report.warnings
          .filter((w) => w.ruleId === "digitGrouping")
          .map((w) => w.location.ranges),
        [[{ sourceId: 0, start: 0, end: input.length }]],
      );
    }
  }
  assert.equal(
    base.text("1,234–56789", {
      rules: { digitGrouping: { normalizeExisting: false } },
    }),
    "1,234–56\u202f789",
  );
});

test("formatting switches do not disable designation or range recognition", () => {
  for (const locale of ["en-gb", "es-es"]) {
    for (let flags = 0; flags < 16; flags++) {
      const units = !!(flags & 1),
        ranges = !!(flags & 2),
        percentages = !!(flags & 4),
        currencies = !!(flags & 8);
      const instance = base.with({
        locale,
        rules: {
          units: { enabled: units },
          ranges: { enabled: ranges },
          percentages: { enabled: percentages },
          currencies: { enabled: currencies },
        },
      });
      const source = "12345-67890kg; 12345%; EUR12345";
      const expected = `12\u202f345${ranges ? "–" : "-"}67\u202f890${units ? "\u00a0" : ""}kg; 12\u202f345${percentages && locale === "es-es" ? "\u00a0" : ""}%; EUR${currencies ? "\u00a0" : ""}12\u202f345`;
      assert.equal(instance.text(source), expected, `${locale} flags=${flags}`);
      assert.deepEqual(
        instance.text(expected, { detailed: true }).edits,
        [],
        expected,
      );
    }
    assert.equal(
      base.text("12345-67890", {
        locale,
        rules: { ranges: { enabled: false, standalone: true } },
      }),
      "12\u202f345-67\u202f890",
    );
    assert.equal(
      base.text("12345%", {
        locale,
        rules: { percentages: { space: "nbsp" } },
      }),
      "12\u202f345\u00a0%",
    );
    assert.equal(
      base.text("12345 %", {
        locale,
        rules: { percentages: { space: "none" } },
      }),
      "12\u202f345%",
    );
  }
});

test("complete notation and unknown tails never expose convenient numeric fragments", () => {
  for (const locale of ["en-gb", "es-es"]) {
    const instance = base.with({
      locale,
      rules: { ranges: { standalone: true } },
    });
    for (const source of [
      "12345KG",
      "12345kgs",
      "12345kg²",
      "12345kg_name",
      "12345m/s²",
      "12345m/speed",
      "12345widget",
      "12345e6kg",
      "0012345kg",
      ".12345kg",
      "١12345kg",
      "12345٢kg",
      "12 345foo",
      "AB12345kg",
      "12345+67890kg",
      "12345 / 67890kg",
      "12345–0012345kg",
      "12345–.67890kg",
      "12345–١67890kg",
      "12345–67890foo",
    ]) {
      const report = instance.text(source, { detailed: true });
      assert.deepEqual(
        report.edits.filter((e) => e.ruleIds.includes("digitGrouping")),
        [],
        `${locale}: ${source}`,
      );
      assert.deepEqual(
        report.warnings.filter((w) => w.ruleId === "digitGrouping"),
        [],
        source,
      );
      assert.deepEqual(
        instance.text(report.result, { detailed: true }).edits,
        [],
        source,
      );
    }
    for (const source of [
      "12 34–123456kg",
      "12345–12 34kg",
      "12345 67890kg",
      "1.234,50–123456kg",
    ]) {
      const report = instance.text(source, {
        detailed: true,
        rules: {
          digitGrouping: {
            minDigits: Number.MAX_SAFE_INTEGER,
            normalizeExisting: false,
          },
        },
      });
      const warnings = report.warnings.filter(
        (w) => w.ruleId === "digitGrouping",
      );
      assert.equal(warnings.length, 1, source);
      assert.equal(warnings[0].location.ranges[0].end, source.length - 2);
      assert.deepEqual(
        report.edits.filter((e) => e.ruleIds.includes("digitGrouping")),
        [],
        source,
      );
    }
  }
});

test("existing groups keep whole-number minus, currency and exterior intervals", () => {
  for (const locale of ["en-gb", "es-es"]) {
    for (const separator of [
      " ",
      "\u00a0",
      "\u2009",
      "\u202f",
      ...(locale === "en-gb" ? [","] : []),
    ]) {
      const instance = base.with({ locale });
      for (const normalizeExisting of [true, false]) {
        const integer = normalizeExisting
          ? "12\u202f345\u202f678"
          : `12${separator}345${separator}678`;
        const source = `-12${separator}345${separator}678.90kg; EUR12${separator}345${separator}678`;
        const expected = `−${integer}.90\u00a0kg; EUR\u00a0${integer}`;
        const options = { rules: { digitGrouping: { normalizeExisting } } };
        assert.equal(
          instance.text(source, options),
          expected,
          `${locale}: ${source}`,
        );
        assert.deepEqual(
          instance.text(expected, { ...options, detailed: true }).edits,
          [],
          source,
        );
      }
    }
    const source = locale === "en-gb" ? "12345  £" : "€  12345";
    const expected = locale === "en-gb" ? "12\u202f345  £" : "€  12\u202f345";
    const report = base.text(source, { locale, detailed: true });
    assert.equal(report.result, expected);
    assert.deepEqual(
      report.warnings.map((w) => [w.code, w.ruleId]),
      [["currency.order", "currencies"]],
    );
    assert.deepEqual(base.text(expected, { locale, detailed: true }).edits, []);
  }
});

const visible = (html) =>
  html.replace(/<[^>]*>/gu, "").replaceAll("&nbsp;", "\u00a0");
function replay(report, leaves) {
  const output = [...leaves];
  for (const edit of [...report.edits].reverse()) {
    assert.equal(edit.ranges.length, 1);
    const { sourceId, start, end } = edit.ranges[0];
    assert.equal(leaves[sourceId].slice(start, end), edit.before);
    output[sourceId] =
      output[sourceId].slice(0, start) +
      edit.after +
      output[sourceId].slice(end);
  }
  return output.join("");
}

test("all transparent splits preserve bond/range text, source ownership and diagnostics", () => {
  for (const locale of ["en-gb", "es-es"]) {
    const instance = base.with({ locale });
    for (const [source, expected, ambiguousEnd] of [
      ["12345kg", "12\u202f345\u00a0kg"],
      ["-12 345kg", "−12\u202f345\u00a0kg"],
      ["12345-67890kg", "12\u202f345–67\u202f890\u00a0kg"],
      ["EUR12345", "EUR\u00a012\u202f345"],
      ["12 34–123456kg", "12 34–123456\u00a0kg", 12],
      ["00123–123456kg", "00123–123456\u00a0kg"],
      ["12345%", locale === "en-gb" ? "12\u202f345%" : "12\u202f345\u00a0%"],
    ]) {
      const plain = instance.text(source, { detailed: true });
      assert.equal(plain.result, expected, source);
      assert.equal(replay(plain, [source]), expected);
      for (let split = 1; split < source.length; split++) {
        const left = source.slice(0, split),
          right = source.slice(split);
        const children = [
          left,
          h(Fragment, { key: "fragment" }, h("em", null, right)),
        ];
        const html = instance.html(`${left}<!--boundary--><em>${right}</em>`, {
          detailed: true,
        });
        const react = transformReact(children, { instance, detailed: true });
        assert.equal(
          visible(html.result),
          expected,
          `${locale} ${source}@${split}`,
        );
        assert.equal(visible(renderToString(react.result)), expected);
        assert.equal(
          visible(renderToString(h(Puncta, { instance }, children))),
          expected,
        );
        for (const report of [html, react]) {
          assert.equal(replay(report, [left, right]), expected);
          assert.deepEqual(report.appliedRules, plain.appliedRules);
          const warnings = report.warnings.filter(
            (w) => w.ruleId === "digitGrouping",
          );
          assert.equal(warnings.length, ambiguousEnd ? 1 : 0);
          if (ambiguousEnd) {
            assert.equal(warnings[0].source, "rule");
            assert.equal(warnings[0].code, "typography.ambiguous");
            assert.equal(warnings[0].locale, locale);
            assert.deepEqual(warnings[0].details, {});
            assert.equal(
              warnings[0].location.ranges
                .map((r) => [left, right][r.sourceId].slice(r.start, r.end))
                .join(""),
              source.slice(0, ambiguousEnd),
            );
          }
        }
        assert.deepEqual(
          instance.html(html.result, { detailed: true }).edits,
          [],
        );
        assert.deepEqual(
          transformReact(react.result, { instance, detailed: true }).edits,
          [],
        );
      }
    }
  }
});

test("UTF-16 reports separate internal grouping, range, minus and external bond edits", () => {
  const source = "😀 -12345-67890kg";
  const report = base.text(source, { detailed: true });
  assert.equal(report.result, "😀 −12\u202f345–67\u202f890\u00a0kg");
  assert.deepEqual(
    report.edits.map(({ before, after, ruleIds, ranges }) => ({
      before,
      after,
      ruleIds,
      ranges,
    })),
    [
      {
        before: "-",
        after: "−",
        ruleIds: ["minus"],
        ranges: [{ sourceId: 0, start: 3, end: 4 }],
      },
      {
        before: "",
        after: "\u202f",
        ruleIds: ["digitGrouping"],
        ranges: [{ sourceId: 0, start: 6, end: 6 }],
      },
      {
        before: "-",
        after: "–",
        ruleIds: ["ranges"],
        ranges: [{ sourceId: 0, start: 9, end: 10 }],
      },
      {
        before: "",
        after: "\u202f",
        ruleIds: ["digitGrouping"],
        ranges: [{ sourceId: 0, start: 12, end: 12 }],
      },
      {
        before: "",
        after: "\u00a0",
        ruleIds: ["units"],
        ranges: [{ sourceId: 0, start: 15, end: 15 }],
      },
    ],
  );
  assert.equal(replay(report, [source]), report.result);
  assert.equal(
    base.html("12<em>&#32;</em>345kg"),
    "12<em>\u202f</em>345&nbsp;kg",
  );
});

test("seed 8901: range and designation properties cover changes, skips, warnings and all representations", () => {
  let state = 8901,
    changed = 0,
    skipped = 0,
    warned = 0;
  const choose = (items) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return items[Math.floor((state / 2 ** 32) * items.length)];
  };
  for (let sample = 0; sample < 120; sample++) {
    const locale = choose(["en-gb", "es-es"]),
      normalizeExisting = choose([true, false]);
    const left = choose([
      ["12345", "12\u202f345", "valid"],
      ["12 345", normalizeExisting ? "12\u202f345" : "12 345", "valid"],
      ["00123", "00123", "excluded"],
      ["12 34", "12 34", "ambiguous"],
    ]);
    const right = choose([
      ["67890.00", "67\u202f890.00"],
      ["1234", "1234"],
      ["1234567", "1\u202f234\u202f567"],
    ]);
    const separator = choose(["–", "-"]),
      ranges = choose([true, false]),
      units = choose([true, false]);
    const unit = choose(["kg", "km/h", "widget"]);
    const source = left[0] + separator + right[0] + unit;
    const expected =
      (left[2] === "valid" ? left[1] : left[0]) +
      (separator === "-" && ranges ? "–" : separator) +
      (left[2] === "valid" ? right[1] : right[0]) +
      (units ? "\u00a0" : "") +
      unit;
    const instance = base.with({
      locale,
      rules: {
        digitGrouping: { normalizeExisting },
        ranges: { enabled: ranges },
        units: { enabled: units, additional: ["widget"] },
      },
    });
    const context = `seed=8901 sample=${sample} state=${state} source=${JSON.stringify(source)}`;
    const report = instance.text(source, { detailed: true });
    assert.equal(report.result, expected, context);
    assert.equal(
      report.result.replace(/[^0-9.]/gu, ""),
      source.replace(/[^0-9.]/gu, ""),
      context,
    );
    assert.equal(replay(report, [source]), expected, context);
    assert.equal(
      report.warnings.filter((w) => w.ruleId === "digitGrouping").length,
      Number(left[2] === "ambiguous"),
      context,
    );
    assert.deepEqual(
      instance.text(expected, { detailed: true }).edits,
      [],
      context,
    );
    if (report.edits.some((e) => e.ruleIds.includes("digitGrouping")))
      changed++;
    else skipped++;
    if (left[2] === "ambiguous") warned++;
    const leaves = [...source];
    const children = leaves.map((leaf, key) => h("em", { key }, leaf));
    assert.equal(
      visible(instance.html(leaves.map((leaf) => `<em>${leaf}</em>`).join(""))),
      expected,
      context,
    );
    assert.equal(
      visible(renderToString(transformReact(children, { instance }))),
      expected,
      context,
    );
    assert.equal(
      visible(renderToString(h(Puncta, { instance }, children))),
      expected,
      context,
    );
  }
  assert.ok(changed > 20 && skipped > 20 && warned > 10, {
    changed,
    skipped,
    warned,
  });
});

test("disabled grouping retains existing text, reports and warnings across representations", () => {
  for (const locale of ["en-gb", "es-es"]) {
    const legacy = createPuncta({ locales: [enGb, esEs], locale });
    const disabled = base.with({
      locale,
      rules: { digitGrouping: { enabled: false } },
    });
    for (const source of [
      "-12\u202f345-67890kg",
      "12345-67890kg; EUR12345; 12345%",
      "12 34–123456kg",
      "12345£",
      "12345 67890kg",
    ]) {
      assert.deepEqual(
        disabled.text(source, { detailed: true }),
        legacy.text(source, { detailed: true }),
      );
      const html = `<em>${source}</em>`;
      assert.deepEqual(
        disabled.html(html, { detailed: true }),
        legacy.html(html, { detailed: true }),
      );
      const children = h("em", null, source);
      const left = transformReact(children, {
        instance: disabled,
        detailed: true,
      });
      const right = transformReact(children, {
        instance: legacy,
        detailed: true,
      });
      assert.deepEqual(
        { ...left, result: renderToString(left.result) },
        { ...right, result: renderToString(right.result) },
      );
      assert.equal(
        renderToString(h(Puncta, { instance: disabled }, children)),
        renderToString(h(Puncta, { instance: legacy }, children)),
      );
    }
  }
});

test("recognized designations do not sever compound arithmetic into groupable operands", () => {
  for (const locale of ["en-gb", "es-es"]) {
    for (const source of [
      "12345+£67890",
      "£12345+67890",
      "£12345 + £67890",
      "£00123–£67890",
      "12345 kg + 67890 kg",
      "12345kg+67890kg",
      "12345 + EUR67890",
      "12345kg * 67890kg",
      "12345 % 67890",
    ]) {
      const report = base.text(source, { locale, detailed: true });
      assert.deepEqual(
        report.edits.filter((e) => e.ruleIds.includes("digitGrouping")),
        [],
        source,
      );
      assert.deepEqual(
        report.warnings.filter((w) => w.ruleId === "digitGrouping"),
        [],
        source,
      );
    }
    assert.equal(
      base.text("12345kg 67890kg", { locale }),
      "12\u202f345\u00a0kg 67\u202f890\u00a0kg",
    );
  }
});
