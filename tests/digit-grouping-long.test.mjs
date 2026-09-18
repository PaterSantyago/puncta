import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement as h, Fragment } from "react";
import { renderToString } from "../examples/ssr/node_modules/react-dom/server.node.js";
import { parseFragment } from "../packages/core/node_modules/parse5/dist/index.js";
import { createPuncta } from "../packages/core/dist/index.mjs";
import { enGb } from "../packages/with-en-gb/dist/index.mjs";
import { esEs } from "../packages/with-es-es/dist/index.mjs";
import { transformReact } from "../packages/with-react/dist/pure.mjs";

const base = createPuncta({ locales: [enGb, esEs], locale: "en-gb" });
const narrow = "\u202f";
function textOf(html) {
  const visit = (node) =>
    node.nodeName === "#text"
      ? node.value
      : (node.childNodes ?? []).map(visit).join("");
  return visit(parseFragment(html));
}

// Construct valid triples before their source spelling: no recognizer or numeric
// coercion is shared with production. Invalidity is a single short middle group.
function example(model) {
  const groups = [
    "12",
    ...Array.from(
      { length: model.count },
      (_, i) => ["345", "000", "678", "901"][i % 4],
    ),
  ];
  if (model.kind === "invalid") groups[Math.ceil(groups.length / 2)] = "34";
  const separator = model.kind === "digits" ? "" : model.separator;
  const candidate =
    model.sign +
    (model.kind === "leading-zero" ? "0" : "") +
    groups.join(separator) +
    model.decimal;
  const change =
    model.enabled &&
    model.kind !== "invalid" &&
    model.kind !== "leading-zero" &&
    groups.join("").length >= model.minDigits &&
    (model.kind === "digits" || model.normalizeExisting);
  return {
    source: `😀 ${candidate}!`,
    expected: `😀 ${change ? model.sign + groups.join(narrow) + model.decimal : candidate}!`,
    warning: model.enabled && model.kind === "invalid",
    candidate,
  };
}

function assertReport(
  report,
  expected,
  warning,
  locale,
  candidate,
  htmlSource,
) {
  const sources = report.sources.map(({ text }) => text);
  const replayed = [...sources];
  for (const edit of [...report.edits].reverse()) {
    assert.deepEqual(edit.ruleIds, ["digitGrouping"]);
    assert.equal(edit.locale, locale);
    assert.equal(edit.after, narrow);
    assert.ok(/^[, \u00a0\u2009]?$/u.test(edit.before));
    assert.equal(edit.ranges.length, 1, "unchanged digits never enter an edit");
    const { sourceId, start, end, inputRange } = edit.ranges[0];
    assert.ok(start >= 0 && end >= start && end <= sources[sourceId].length);
    assert.equal(sources[sourceId].slice(start, end), edit.before);
    if (htmlSource) {
      assert.equal(inputRange.accuracy, "exact");
      assert.equal(
        htmlSource.slice(inputRange.start, inputRange.end),
        edit.before,
      );
    }
    replayed[sourceId] =
      replayed[sourceId].slice(0, start) +
      edit.after +
      replayed[sourceId].slice(end);
  }
  assert.equal(replayed.join(""), expected);
  assert.equal(report.hasEdits, sources.join("") !== expected);
  assert.deepEqual(
    report.appliedRules,
    report.hasEdits ? [{ ruleId: "digitGrouping", locale }] : [],
  );
  assert.equal(report.warnings.length, Number(warning));
  if (warning) {
    const diagnostic = report.warnings[0];
    assert.equal(diagnostic.code, "typography.ambiguous");
    assert.equal(diagnostic.source, "rule");
    assert.equal(diagnostic.ruleId, "digitGrouping");
    assert.equal(diagnostic.locale, locale);
    assert.equal(
      diagnostic.location.ranges
        .map(({ sourceId, start, end }) => {
          assert.ok(start >= 0 && end <= sources[sourceId].length);
          return sources[sourceId].slice(start, end);
        })
        .join(""),
      candidate,
    );
  }
}

function verify(model) {
  const { source, expected, warning, candidate } = example(model);
  const instance = base.with({
    locale: model.locale,
    rules: {
      digitGrouping: {
        enabled: model.enabled,
        minDigits: model.minDigits,
        normalizeExisting: model.normalizeExisting,
      },
      minus: { enabled: false },
    },
  });
  const leaves = [];
  // Keep the non-BMP prefix intact; split digits, decimals and separators alike.
  for (let offset = 3; offset < source.length; offset += model.width)
    leaves.push(source.slice(offset, offset + model.width));
  leaves.unshift(source.slice(0, 3));
  const htmlSource = leaves
    .map((leaf) => `<em>${leaf}</em>`)
    .join("<!--split-->");
  const children = leaves.map((leaf, key) =>
    h(Fragment, { key }, h("em", null, leaf)),
  );
  const reports = [
    instance.text(source, { detailed: true }),
    instance.html(htmlSource, { detailed: true }),
    transformReact(children, { instance, detailed: true }),
  ];
  assert.equal(reports[0].result, expected);
  assert.equal(textOf(reports[1].result), expected);
  assert.equal(textOf(renderToString(reports[2].result)), expected);
  reports.forEach((report, index) => {
    assertReport(
      report,
      expected,
      warning,
      model.locale,
      candidate,
      index === 1 ? htmlSource : undefined,
    );
  });
  const second = [
    instance.text(expected, { detailed: true }),
    instance.html(reports[1].result, { detailed: true }),
    transformReact(reports[2].result, { instance, detailed: true }),
  ];
  assert.equal(second[0].result, expected);
  assert.equal(textOf(second[1].result), expected);
  assert.equal(textOf(renderToString(second[2].result)), expected);
  for (const report of second) {
    assert.deepEqual(report.edits, []);
    assert.deepEqual(report.appliedRules, []);
    assert.equal(report.warnings.length, Number(warning));
  }
  return warning
    ? "warning"
    : source === expected
      ? "preserved"
      : "transformed";
}

const defaults = {
  locale: "en-gb",
  count: 4000,
  kind: "digits",
  separator: " ",
  sign: "+",
  decimal: ".670000",
  enabled: true,
  minDigits: 5,
  normalizeExisting: true,
  width: 17,
};
for (const locale of ["en-gb", "es-es"]) {
  test(`${locale}: long integers, decimals, groups and malformed candidates retain exact reports across transparent leaves`, () => {
    for (const kind of ["digits", "groups", "invalid", "leading-zero"])
      for (const decimal of [
        "",
        `.${"6700".repeat(300)}`,
        ".670000",
        ...(locale === "es-es" ? [",670000"] : []),
      ])
        verify({ ...defaults, locale, kind, decimal });
    for (const separator of [
      "\u00a0",
      "\u2009",
      narrow,
      ...(locale === "en-gb" ? [","] : []),
    ])
      verify({ ...defaults, locale, kind: "groups", separator });
    for (const kind of ["digits", "groups", "invalid"])
      for (const patch of [
        { minDigits: Number.MAX_SAFE_INTEGER },
        { normalizeExisting: false },
        { enabled: false },
      ])
        verify({ ...defaults, locale, kind, ...patch });
  });
}

// On failure greedily delete triples to a deletion-minimal reproducer, then
// simplify the leaf width. Print the seed and full model/source in test output.
function minimize(model) {
  let result = { ...model };
  const fails = (value) => {
    try {
      verify(value);
      return false;
    } catch {
      return true;
    }
  };
  for (
    let step = 2 ** Math.floor(Math.log2(result.count));
    step >= 1;
    step /= 2
  )
    while (
      result.count - step >= 1 &&
      fails({ ...result, count: result.count - step })
    )
      result = { ...result, count: result.count - step };
  for (let width = 1; width < result.width; width++)
    if (fails({ ...result, width })) {
      result = { ...result, width };
      break;
    }
  return result;
}

test("seed 9201: generated long-input models exercise transformations, skips and diagnostics in both locales", () => {
  let state = 9201;
  const choose = (items) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return items[Math.floor((state / 2 ** 32) * items.length)];
  };
  const reached = new Set();
  for (let sample = 0; sample < 120; sample++) {
    const locale = sample % 2 ? "es-es" : "en-gb";
    const kind = ["digits", "groups", "invalid", "leading-zero"][
      Math.floor(sample / 2) % 4
    ];
    const model = {
      ...defaults,
      locale,
      kind,
      count: choose([1, 2, 7, 31, 127]),
      separator: choose([
        " ",
        "\u00a0",
        "\u2009",
        narrow,
        ...(locale === "en-gb" ? [","] : []),
      ]),
      decimal: choose(
        locale === "es-es" ? ["", ".0000", ",67000"] : ["", ".0000", ".67000"],
      ),
      sign: choose(["", "+", "−"]),
      width: choose([1, 2, 7, 19]),
      minDigits: choose([4, 5, 24, Number.MAX_SAFE_INTEGER]),
      normalizeExisting: sample % 3 !== 0,
      enabled: sample % 11 !== 0,
    };
    try {
      reached.add(`${locale}:${verify(model)}`);
    } catch (error) {
      const minimal = minimize(model);
      assert.fail(
        `seed=9201 sample=${sample} state=${state}\nminimalModel=${JSON.stringify(minimal)}\nminimalInput=${JSON.stringify(example(minimal).source)}\n${error.stack}`,
      );
    }
  }
  assert.deepEqual(
    [...reached].sort(),
    ["en-gb", "es-es"]
      .flatMap((locale) =>
        ["preserved", "transformed", "warning"].map(
          (outcome) => `${locale}:${outcome}`,
        ),
      )
      .sort(),
  );
});
