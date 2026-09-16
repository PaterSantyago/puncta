import assert from "node:assert/strict";
import { test } from "node:test";
import * as core from "../packages/core/dist/index.mjs";
import { enGb } from "../packages/with-en-gb/dist/index.mjs";
import { esEs } from "../packages/with-es-es/dist/index.mjs";

for (const locale of [enGb, esEs]) {
  test(`${locale.id}: unambiguous ellipsis and UTF-16 diagnostics`, () => {
    const instance = core.createPuncta({
      locales: [locale],
      locale: locale.id,
    });
    const input = "😀 Wait... Wait....";
    assert.equal(instance.text(input), "😀 Wait… Wait....");
    const report = instance.text(input, { detailed: true });
    assert.deepEqual(report, {
      result: "😀 Wait… Wait....",
      hasEdits: true,
      outputChanged: true,
      sources: [{ id: 0, text: input, path: [] }],
      warnings: [],
      appliedRules: [{ ruleId: "ellipsis", locale: locale.id }],
      edits: [
        {
          kind: "replace",
          before: "...",
          after: "…",
          locale: locale.id,
          ruleIds: ["ellipsis"],
          ranges: [{ sourceId: 0, start: 7, end: 10 }],
        },
      ],
    });
    const repeated = instance.text(report.result, { detailed: true });
    assert.equal(repeated.hasEdits, false);
    assert.equal(repeated.outputChanged, false);
    assert.deepEqual(repeated.edits, []);
    assert.deepEqual(repeated.appliedRules, []);
  });
}

for (const locale of [enGb, esEs]) {
  test(`${locale.id}: div-fragment HTML shares the text rule`, () => {
    const instance = core.createPuncta({
      locales: [locale],
      locale: locale.id,
    });
    const input = '<span title="Wait...">😀 Wait...</span>';
    const report = instance.html(input, { detailed: true });
    assert.equal(report.result, '<span title="Wait...">😀 Wait…</span>');
    assert.deepEqual(report.sources, [
      { id: 0, path: [0, 0], text: "😀 Wait..." },
    ]);
    assert.deepEqual(report.edits[0].ranges, [
      {
        sourceId: 0,
        start: 7,
        end: 10,
        inputRange: { accuracy: "exact", start: 29, end: 32 },
      },
    ]);
    assert.equal(report.hasEdits, true);
    assert.equal(report.outputChanged, true);
    const serialised = instance.html("<SPAN>Wait</SPAN>", { detailed: true });
    assert.equal(serialised.result, "<span>Wait</span>");
    assert.equal(serialised.hasEdits, false);
    assert.equal(serialised.outputChanged, true);
  });
}

test("React pure and real SSR use the same literal oracle without wrappers or mutation", async () => {
  const { createElement, Fragment } = await import("react");
  const { renderToString } = await import(
    "../examples/ssr/node_modules/react-dom/server.node.js"
  );
  const { transformReact } = await import(
    "../packages/with-react/dist/pure.mjs"
  );
  const { Puncta } = await import("../packages/with-react/dist/index.mjs");
  for (const locale of [enGb, esEs]) {
    const instance = core.createPuncta({
      locales: [locale],
      locale: locale.id,
    });
    const tree = createElement(
      Fragment,
      null,
      createElement("span", { title: "Wait...", key: "kept" }, "😀 Wait..."),
    );
    const report = transformReact(tree, { instance, detailed: true });
    assert.equal(
      renderToString(report.result),
      '<span title="Wait...">😀 Wait…</span>',
    );
    assert.equal(
      renderToString(createElement(Puncta, { instance }, tree)),
      renderToString(report.result),
    );
    assert.equal(
      renderToString(tree),
      '<span title="Wait...">😀 Wait...</span>',
    );
    assert.equal(report.result.props.children.key, "kept");
    assert.deepEqual(report.sources, [
      { id: 0, text: "😀 Wait...", path: ["children", "children"] },
    ]);
    assert.deepEqual(report.edits[0].ranges, [
      { sourceId: 0, start: 7, end: 10 },
    ]);
    assert.equal("outputChanged" in report, false);
    assert.equal(
      transformReact(report.result, { instance, detailed: true }).hasEdits,
      false,
    );
  }
});

test("required arguments and unavailable locales fail with typed structured errors", async () => {
  const { transformReact } = await import(
    "../packages/with-react/dist/pure.mjs"
  );
  const { Puncta } = await import("../packages/with-react/dist/index.mjs");
  const instance = core.createPuncta({ locales: [enGb], locale: "en-gb" });
  for (const [invoke, code, optionPath, details] of [
    [
      () => core.createPuncta(),
      "config.invalid-option",
      [],
      { reason: "required" },
    ],
    [
      () => core.createPuncta({ locale: "en-gb" }),
      "config.invalid-option",
      ["locales"],
      { reason: "required" },
    ],
    [
      () => core.createPuncta({ locales: [enGb] }),
      "config.invalid-option",
      ["locale"],
      { reason: "required" },
    ],
    [
      () => core.createPuncta({ locales: [enGb], locale: "es-es" }),
      "locale.unavailable",
      ["locale"],
      { locale: "es-es" },
    ],
    [
      () => core.createPuncta({ locales: [enGb, enGb], locale: "en-gb" }),
      "locale.duplicate",
      ["locales", 1],
      { locale: "en-gb" },
    ],
    [
      () => instance.text(),
      "config.invalid-option",
      ["source"],
      { reason: "required" },
    ],
    [
      () => instance.html(),
      "config.invalid-option",
      ["source"],
      { reason: "required" },
    ],
    [
      () => instance.text("", { locale: "es-es", detailed: true }),
      "locale.unavailable",
      ["locale"],
      { locale: "es-es" },
    ],
    [
      () => instance.html("", { locale: "es-es" }),
      "locale.unavailable",
      ["locale"],
      { locale: "es-es" },
    ],
    [() => transformReact("..."), "instance.missing", ["instance"], {}],
    [
      () => transformReact(null, { instance, locale: "es-es" }),
      "locale.unavailable",
      ["locale"],
      { locale: "es-es" },
    ],
    [() => Puncta({ children: "..." }), "instance.missing", ["instance"], {}],
    [
      () => instance.text("...", { detailed: null }),
      "config.invalid-option",
      ["detailed"],
      { reason: "type" },
    ],
    [
      () => instance.text("...", { unknown: true }),
      "config.invalid-option",
      ["unknown"],
      { reason: "unknown" },
    ],
  ]) {
    assert.throws(invoke, (error) => {
      assert.ok(error instanceof core.PunctaConfigError);
      assert.equal(error.name, "PunctaConfigError");
      assert.equal(error.code, code);
      assert.deepEqual(error.optionPath, optionPath);
      assert.deepEqual(error.details, details);
      assert.equal(error.location.kind, "unavailable");
      return true;
    });
  }
});

test("instances snapshot the registry and locale selection without changing caller objects", () => {
  const locales = [enGb, esEs];
  const config = { locales, locale: "en-gb" };
  const instance = core.createPuncta(config);
  assert.deepEqual(config, { locales: [enGb, esEs], locale: "en-gb" });
  config.locale = "es-es";
  locales.length = 0;
  assert.equal(
    instance.text("...", { detailed: true }).edits[0].locale,
    "en-gb",
  );
  const call = Object.freeze({ locale: "es-es", detailed: true });
  assert.equal(instance.text("...", call).edits[0].locale, "es-es");
  assert.equal(Object.isFrozen(instance), true);
  assert.equal(Object.isFrozen(enGb), true);
});

test("dot-run boundaries and unchanged text remain stable on repetition", () => {
  const instance = core.createPuncta({ locales: [enGb], locale: "en-gb" });
  // Independent literals from #28 plus bounded run lengths, not an alternate regex.
  for (const [input, expected] of [
    ["Wait...", "Wait…"],
    ["...", "…"],
    ["a ... b", "a … b"],
    ["😀...\n...", "😀…\n…"],
    ["e\u0301...", "e\u0301…"],
  ]) {
    assert.equal(instance.text(input), expected);
    assert.deepEqual(instance.text(expected, { detailed: true }).edits, []);
  }
  for (const length of [0, 1, 2, 4, 5, 6, 7, 8, 32]) {
    const input = `Wait${".".repeat(length)}`;
    const report = instance.text(input, { detailed: true });
    assert.equal(report.result, input);
    assert.deepEqual(report.edits, []);
    assert.deepEqual(report.appliedRules, []);
  }
});
