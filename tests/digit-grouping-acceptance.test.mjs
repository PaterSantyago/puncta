import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement as h, Fragment } from "react";
import { renderToString } from "../examples/ssr/node_modules/react-dom/server.node.js";
import { parseFragment } from "../packages/core/node_modules/parse5/dist/index.js";
import { createPuncta } from "../packages/core/dist/index.mjs";
import { enGb } from "../packages/with-en-gb/dist/index.mjs";
import { esEs } from "../packages/with-es-es/dist/index.mjs";
import { Puncta } from "../packages/with-react/dist/index.mjs";
import { transformReact } from "../packages/with-react/dist/pure.mjs";
import {
  canonicalGrouping,
  mixedGrouping,
} from "./fixtures/digit-grouping.mjs";

const make = (locale, options = {}) =>
  createPuncta({
    locales: [enGb, esEs],
    locale,
    rules: { digitGrouping: { enabled: true } },
    ...options,
  });
const escapeHtml = (source) =>
  source
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll('"', "&quot;");
const textOf = (node) =>
  node.nodeName === "#text"
    ? node.value
    : (node.childNodes ?? []).map(textOf).join("");
const visible = (markup) => textOf(parseFragment(markup));
const render = (tree) => renderToString(h(Fragment, null, tree));
function verifyReport(report, expected, warningSource, locale) {
  const values = report.sources.map((source) => source.text);
  const applied = [];
  for (const edit of report.edits) {
    assert.equal(
      edit.before,
      edit.ranges.map((r) => values[r.sourceId].slice(r.start, r.end)).join(""),
    );
    if (edit.ruleIds.includes("digitGrouping")) {
      assert.doesNotMatch(edit.before, /[0-9]/u);
      assert.equal(edit.after, "\u202f");
    }
    for (const ruleId of edit.ruleIds) {
      const pair = { ruleId, locale: edit.locale };
      if (
        !applied.some(
          (item) => item.ruleId === ruleId && item.locale === edit.locale,
        )
      )
        applied.push(pair);
    }
  }
  assert.deepEqual(report.appliedRules, applied);
  for (const edit of [...report.edits].reverse()) {
    for (let index = edit.ranges.length - 1; index >= 0; index--) {
      const { sourceId, start, end } = edit.ranges[index];
      assert.ok(
        start >= 0 &&
          end >= start &&
          end <= report.sources[sourceId].text.length,
      );
      values[sourceId] =
        values[sourceId].slice(0, start) +
        (index === 0 ? edit.after : "") +
        values[sourceId].slice(end);
    }
  }
  assert.equal(values.join(""), expected);
  const warnings = report.warnings.filter((w) => w.ruleId === "digitGrouping");
  assert.equal(warnings.length, warningSource ? 1 : 0);
  if (warningSource) {
    const { message, location, ...fields } = warnings[0];
    assert.ok(message.length > 0);
    assert.deepEqual(fields, {
      code: "typography.ambiguous",
      source: "rule",
      ruleId: "digitGrouping",
      locale,
      details: {},
    });
    assert.equal(
      location.ranges
        .map((r) => report.sources[r.sourceId].text.slice(r.start, r.end))
        .join(""),
      warningSource,
    );
  }
}

for (const locale of ["en-gb", "es-es"]) {
  test(`${locale}: every canonical literal uses its own threshold and normalization through all public representations`, () => {
    for (const [
      languages,
      source,
      expected,
      patch = {},
      warning = false,
    ] of canonicalGrouping) {
      if (languages !== "both" && languages !== locale) continue;
      const instance = make(locale, {
        rules: { digitGrouping: { enabled: true, minDigits: 4, ...patch } },
      });
      const plain = instance.text(source, { detailed: true });
      assert.equal(plain.result, expected, `${locale}: ${source}`);
      verifyReport(plain, expected, warning ? source : undefined, locale);
      const children = h("em", null, source);
      const html = instance.html(`<em>${escapeHtml(source)}</em>`, {
        detailed: true,
      });
      const react = transformReact(children, { instance, detailed: true });
      for (const report of [html, react])
        verifyReport(report, expected, warning ? source : undefined, locale);
      assert.equal(visible(html.result), expected);
      assert.equal(visible(render(react.result)), expected);
      assert.equal(
        visible(render(h(Puncta, { instance }, children))),
        expected,
      );
      for (const report of [
        instance.text(expected, { detailed: true }),
        instance.html(html.result, { detailed: true }),
        transformReact(react.result, { instance, detailed: true }),
      ])
        assert.deepEqual(report.edits, []);
    }
  });
}

for (const { locale, source, expected } of mixedGrouping) {
  test(`${locale}: mixed typography, normalization, ranges, bonds and warnings survive every transparent seam`, () => {
    const instance = make(locale, { hyphenation: { enabled: true } });
    const plain = instance.text(source, { detailed: true });
    assert.equal(plain.result, expected);
    verifyReport(plain, expected, "12 34–123456", locale);
    assert.equal(
      expected.replace(/[^0-9]/gu, ""),
      source.replace(/[^0-9]/gu, ""),
    );
    for (let split = 1; split < source.length; split++) {
      const left = source.slice(0, split),
        right = source.slice(split);
      const children = [
        left,
        h(Fragment, { key: "kept" }, h("em", null, right)),
      ];
      const html = instance.html(
        `${escapeHtml(left)}<!--seam--><em>${escapeHtml(right)}</em>`,
        { detailed: true },
      );
      const react = transformReact(children, { instance, detailed: true });
      assert.equal(visible(html.result), expected, `HTML split=${split}`);
      assert.equal(
        visible(render(react.result)),
        expected,
        `React split=${split}`,
      );
      assert.equal(
        visible(render(h(Puncta, { instance }, children))),
        expected,
      );
      for (const report of [html, react])
        verifyReport(report, expected, "12 34–123456", locale);
      for (const report of [
        instance.text(expected, { detailed: true }),
        instance.html(html.result, { detailed: true }),
        transformReact(react.result, { instance, detailed: true }),
      ])
        assert.deepEqual(report.edits, []);
    }
  });
}

test("recognized prose dashes bound grouping independently of dash formatting", () => {
  for (const locale of ["en-gb", "es-es"]) {
    for (const marker of ["--", "–", "—"]) {
      for (const enabled of [true, false]) {
        const instance = make(locale, {
          rules: { digitGrouping: { enabled: true }, dashes: { enabled } },
        });
        const source = `word ${marker} -12345-67890kg ${marker} word`;
        const result = instance.text(source, { detailed: true });
        assert.ok(
          result.result.includes("−12\u202f345–67\u202f890\u00a0kg"),
          source,
        );
        assert.deepEqual(
          instance.text(result.result, { detailed: true }).edits,
          [],
        );
        assert.deepEqual(
          result.warnings.filter((w) => w.ruleId === "digitGrouping"),
          [],
        );
        if (!enabled)
          assert.equal(
            result.edits.some((e) => e.ruleIds.includes("dashes")),
            false,
          );
      }
    }
  }
});

test("mixed nested locales, normalization overrides, entities and protection retain independent contexts", () => {
  const instance = make("en-gb", { hyphenation: { enabled: true } });
  const reset = {
    "data-puncta-options":
      '{"rules":{"digitGrouping":{"normalizeExisting":false}}}',
  };
  const children = [
    h(
      "p",
      { key: "outer", title: "12345kg..." },
      '"back',
      h("em", null, "bone 12"),
      ' 345-67890kg..."',
    ),
    h(
      "p",
      { key: "spanish", lang: "es" },
      '"camino 12345%..."; ',
      h("span", reset, "12 345,00–67890kg"),
      "; 1.234,50",
    ),
    h(
      "p",
      { key: "boundaries" },
      "12",
      h("code", null, " 34–123456"),
      "345; ",
      h(
        "span",
        { "data-puncta": "off", "data-puncta-options": "invalid" },
        '"12345kg..." 12 34',
      ),
      "; 12",
      h("br"),
      "345; 12",
      h("wbr"),
      "345; 12",
      h("span", { "data-puncta": "" }, "345"),
    ),
  ];
  const expected =
    '‘back\u00adbone 12\u202f345–67\u202f890\u00a0kg…’«ca\u00admi\u00adno 12\u202f345\u00a0%…»; 12 345,00–67\u202f890\u00a0kg; 1.234,5012 34–123456345; "12345kg..." 12 34; 12345; 12345; 12345';
  const markup = render(children).replace(" 345-", "&#32;345-");
  const html = instance.html(markup, { detailed: true });
  const react = transformReact(children, { instance, detailed: true });
  assert.equal(visible(html.result), expected);
  assert.equal(visible(render(react.result)), expected);
  assert.equal(visible(render(h(Puncta, { instance }, children))), expected);
  assert.ok(html.result.includes('title="12345kg..."'));
  assert.ok(html.result.includes("<code> 34–123456</code>"));
  for (const report of [html, react]) {
    const warnings = report.warnings.filter(
      (w) => w.ruleId === "digitGrouping",
    );
    assert.equal(warnings.length, 1);
    assert.equal(warnings[0].locale, "es-es");
    assert.equal(warnings[0].code, "typography.ambiguous");
    assert.equal(
      warnings[0].location.ranges
        .map((r) => report.sources[r.sourceId].text.slice(r.start, r.end))
        .join(""),
      "1.234,50",
    );
    assert.deepEqual(
      report.appliedRules.filter((r) => r.ruleId === "digitGrouping"),
      [
        { ruleId: "digitGrouping", locale: "en-gb" },
        { ruleId: "digitGrouping", locale: "es-es" },
      ],
    );
  }
  const entityEdit = html.edits.find(
    (edit) => edit.ruleIds.includes("digitGrouping") && edit.before === " ",
  );
  assert.ok(entityEdit);
  const range = entityEdit.ranges[0].inputRange;
  assert.deepEqual(range, {
    accuracy: "exact",
    start: markup.indexOf("&#32;"),
    end: markup.indexOf("&#32;") + 5,
  });
  assert.deepEqual(instance.html(html.result, { detailed: true }).edits, []);
  assert.deepEqual(
    transformReact(react.result, { instance, detailed: true }).edits,
    [],
  );
  // Plain text has call-level protection rather than nested locale declarations.
  const source = '"12345kg..."; 12 34; 12345kg';
  const protectedEnd = source.lastIndexOf("; ");
  const options = {
    protect: [{ start: 0, end: protectedEnd }],
    detailed: true,
  };
  const text = instance.text(source, options);
  assert.equal(text.result, '"12345kg..."; 12 34; 12\u202f345\u00a0kg');
  assert.deepEqual(
    text.warnings.filter((w) => w.ruleId === "digitGrouping"),
    [],
  );
  assert.ok(
    text.edits.every((e) => e.ranges.every((r) => r.start >= protectedEnd)),
  );
});
