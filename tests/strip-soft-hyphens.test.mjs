import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement as h } from "react";
import { createPuncta } from "../packages/core/dist/index.mjs";
import { enGb } from "../packages/with-en-gb/dist/index.mjs";
import { esEs } from "../packages/with-es-es/dist/index.mjs";
import * as pure from "../packages/with-react/dist/pure.mjs";
const en = createPuncta({ locales: [enGb, esEs], locale: "en-gb" });
const shy = "\u00ad";
test("separate removal deletes author SHY without typography and keeps UTF-16 origins", () => {
  const source = `😀ex${shy}am${shy}ple  "word"... -5 kg`;
  const report = en.stripSoftHyphens(source, { detailed: true });
  assert.equal(report.result, '😀example  "word"... -5 kg');
  assert.deepEqual(
    report.edits.map((edit) => edit.ranges),
    [[{ sourceId: 0, start: 4, end: 5 }], [{ sourceId: 0, start: 7, end: 8 }]],
  );
  assert.deepEqual(report.appliedRules, [
    { ruleId: "hyphenation.remove", locale: "en-gb" },
  ]);
  assert.deepEqual(report.warnings, []);
  assert.equal(
    en.stripSoftHyphens(report.result, { detailed: true }).hasEdits,
    false,
  );
});
test("removal uses HTML and pure React scopes, protection and original sources", () => {
  const markup = `ex<em>&shy;am</em>ple<code>${shy}</code><span title="${shy}" lang="es">a${shy}b</span>`;
  const html = en.stripSoftHyphens(markup, { format: "html", detailed: true });
  assert.equal(
    html.result,
    `ex<em>am</em>ple<code>${shy}</code><span title="${shy}" lang="es">ab</span>`,
  );
  assert.deepEqual(html.edits[0].ranges[0].inputRange, {
    accuracy: "exact",
    start: 6,
    end: 11,
  });
  const tree = [
    "ex",
    h("em", null, `${shy}am`),
    "ple",
    h("code", null, shy),
    h("span", { title: shy, lang: "es" }, `a${shy}b`),
  ];
  const react = pure.stripSoftHyphensReact(tree, {
    instance: en,
    detailed: true,
  });
  assert.equal(react.result[1].props.children, "am");
  assert.deepEqual(react.result[3], tree[3]);
  assert.equal(react.result[4].props.title, shy);
  assert.equal(react.result[4].props.children, "ab");
  assert.deepEqual(react.appliedRules, [
    { ruleId: "hyphenation.remove", locale: "en-gb" },
    { ruleId: "hyphenation.remove", locale: "es-es" },
  ]);
  assert.deepEqual(react.edits[0].ranges, [{ sourceId: 1, start: 0, end: 1 }]);
  assert.deepEqual(
    pure.stripSoftHyphensReact(react.result, { instance: en, detailed: true })
      .edits,
    [],
  );
});
test("removal validates options without requiring insertion resources in scopes", () => {
  const resourceError = (error) =>
    error.code === "hyphenation.resource-unavailable";
  assert.throws(
    () =>
      createPuncta({
        locales: [enGb],
        locale: "en-gb",
        hyphenation: { enabled: true },
      }),
    resourceError,
  );
  assert.throws(
    () => en.with({ hyphenation: { enabled: true } }),
    resourceError,
  );
  assert.throws(
    () => en.text("", { hyphenation: { enabled: true } }),
    resourceError,
  );
  assert.equal(
    en.stripSoftHyphens(`a${shy}b`, { hyphenation: { enabled: true } }),
    "ab",
  );
  assert.equal(
    en.stripSoftHyphens(
      `<i data-puncta-options='{"hyphenation":{"enabled":true}}'>a${shy}b</i>`,
      { format: "html" },
    ),
    `<i data-puncta-options="{&quot;hyphenation&quot;:{&quot;enabled&quot;:true}}">ab</i>`,
  );
  assert.equal(
    pure.stripSoftHyphensReact(`a${shy}b`, {
      instance: en,
      hyphenation: { enabled: true },
    }),
    "ab",
  );
  for (const options of [
    { format: "text", mode: "fragment" },
    { format: "text", context: "div" },
    { format: "html", protect: [] },
    { format: "markdown" },
    { detailed: null },
    { hyphenation: { minRight: 2 } },
    { rules: { quotes: { enabled: 1 } } },
  ]) {
    assert.throws(
      () => en.stripSoftHyphens(shy, options),
      (error) => error.code === "config.invalid-option",
    );
  }
  for (const field of ["format", "mode", "context", "protect"]) {
    assert.throws(
      () =>
        pure.stripSoftHyphensReact(shy, { instance: en, [field]: undefined }),
      (error) => error.code === "config.invalid-option",
    );
  }
  assert.throws(
    () =>
      en.stripSoftHyphens(
        `<span data-puncta-options='{"hyphenation":{"minRight":2}}'>${shy}</span>`,
        { format: "html" },
      ),
    (error) =>
      error.code === "config.invalid-option" &&
      error.location.kind === "attribute",
  );
});
test("removal respects full disable, unavailable language and unread protected declarations", () => {
  const source = `a${shy}b`;
  assert.equal(en.with({ enabled: false }).stripSoftHyphens(source), source);
  assert.equal(
    en.with({ enabled: false }).stripSoftHyphens(source, { enabled: true }),
    "ab",
  );
  assert.equal(
    en.stripSoftHyphens(source, { hyphenation: { enabled: false } }),
    "ab",
  );
  const tree = h(
    "div",
    { lang: "zz" },
    source,
    h("span", { lang: "es" }, source),
    h("code", { "data-puncta-options": "bad" }, source),
  );
  const result = pure.stripSoftHyphensReact(tree, {
    instance: en,
    detailed: true,
  });
  assert.equal(result.result.props.children[0], source);
  assert.equal(result.result.props.children[1].props.children, "ab");
  assert.deepEqual(result.result.props.children[2], tree.props.children[2]);
  assert.deepEqual(
    result.warnings.map((warning) => warning.code),
    ["markup.language-unavailable"],
  );
  const off = h(
    "div",
    { "data-puncta": "off" },
    h("span", { "data-puncta": "", "data-puncta-options": "bad" }, source),
  );
  assert.deepEqual(pure.stripSoftHyphensReact(off, { instance: en }), off);
  const Opaque = () => {
    throw new Error("must not execute");
  };
  const opaque = h(Opaque, null, source);
  assert.equal(pure.stripSoftHyphensReact(opaque, { instance: en }), opaque);
  const hidden = h("span", { hidden: true }, source);
  const guarded = {
    ...hidden,
    props: new Proxy(hidden.props, {
      get(target, key) {
        if (key === "data-puncta-options") throw new Error("must not read");
        return Reflect.get(target, key);
      },
    }),
  };
  assert.equal(
    pure.stripSoftHyphensReact(guarded, { instance: en }).props.children,
    source,
  );
});
test("technical protection is recognised across transparent inline leaves", () => {
  const source = `https://example.com/a${shy}b`;
  assert.equal(en.stripSoftHyphens(source), source);
  for (let split = 1; split < source.length; split++) {
    const tree = [source.slice(0, split), h("b", null, source.slice(split))];
    assert.deepEqual(
      pure.stripSoftHyphensReact(tree, { instance: en, detailed: true }).edits,
      [],
    );
    const html = `<b>${source.slice(0, split)}</b>${source.slice(split)}`;
    assert.deepEqual(
      en.stripSoftHyphens(html, { format: "html", detailed: true }).edits,
      [],
    );
  }
});
test("generated SHY insertion around Unicode retains every original character and protection", () => {
  // Independent original-text oracle: inject SHY at scalar boundaries, then recover
  // the known original instead of implementing deletion a second time in the test.
  const atoms = [
    "a",
    "ñ",
    "é",
    "e\u0301",
    "😀",
    "👩‍💻",
    "\r\n",
    "\t",
    " ",
    "-",
    "\u00a0",
    "…",
    "1",
  ];
  for (let seed = 0; seed < 200; seed++) {
    const original = Array.from(
      { length: 1 + (seed % 12) },
      (_, index) => atoms[(seed * 7 + index * 3) % atoms.length],
    ).join("");
    const input = shy + [...original].join(shy) + shy;
    const report = en.stripSoftHyphens(input, { detailed: true });
    assert.equal(report.result, original);
    assert.equal(
      en.stripSoftHyphens(input, {
        protect: [{ start: 0, end: input.length }],
      }),
      input,
    );
    assert.deepEqual(
      en.stripSoftHyphens(original, { detailed: true }).edits,
      [],
    );
    let replay = input;
    for (const edit of [...report.edits].reverse()) {
      const range = edit.ranges[0];
      assert.equal(input.slice(range.start, range.end), shy);
      replay =
        replay.slice(0, range.start) + edit.after + replay.slice(range.end);
    }
    assert.equal(replay, original);
  }
});
