import assert from "node:assert/strict";
import { test } from "node:test";
import { createPuncta } from "../packages/core/dist/index.mjs";
import { enGb } from "../packages/with-en-gb/dist/index.mjs";
import { esEs } from "../packages/with-es-es/dist/index.mjs";
import { createElement as h, Fragment, Suspense } from "react";
import { renderToString } from "../examples/ssr/node_modules/react-dom/server.node.js";
import { transformReact } from "../packages/with-react/dist/pure.mjs";
import { Puncta, PunctaProvider } from "../packages/with-react/dist/index.mjs";
import { parseFragment } from "../packages/core/node_modules/parse5/dist/index.js";
const visible = (html) => {
  const read = (node) =>
    node.nodeName === "#text"
      ? node.value
      : (node.childNodes ?? []).map(read).join("");
  return read(parseFragment(html));
};
const en = createPuncta({ locales: [enGb, esEs], locale: "en-gb" });
const es = en.with({ locale: "es-es" });
test("locale quote pairs use original UTF-16 coordinates", () => {
  const report = en.text('😀 "Hello"', { detailed: true });
  assert.equal(report.result, "😀 ‘Hello’");
  assert.deepEqual(
    report.edits.map(({ before, after, ruleIds, ranges }) => ({
      before,
      after,
      ruleIds,
      ranges,
    })),
    [
      {
        before: '"',
        after: "‘",
        ruleIds: ["quotes"],
        ranges: [{ sourceId: 0, start: 3, end: 4 }],
      },
      {
        before: '"',
        after: "’",
        ruleIds: ["quotes"],
        ranges: [{ sourceId: 0, start: 9, end: 10 }],
      },
    ],
  );
  assert.equal(es.text('"Hola"'), "«Hola»");
});

test("canonical quote and apostrophe literals, including preserved neighbours", () => {
  for (const [instance, input, expected, options = {}] of [
    [en, "“Hello”", "‘Hello’"],
    [es, "“Hola”", "«Hola»"],
    [en, `"The word 'ready' appears here"`, "‘The word “ready” appears here’"],
    [
      es,
      `"Ana dijo: 'la palabra “sí” aparece aquí'"`,
      "«Ana dijo: “la palabra ‘sí’ aparece aquí”»",
    ],
    [
      en,
      "“Hello”",
      "“Hello”",
      { rules: { quotes: { normalizeExisting: false } } },
    ],
    [
      en,
      '"Hello"',
      "‘Hello’",
      { rules: { quotes: { normalizeExisting: false } } },
    ],
    [
      en,
      `“outer 'inner' text”`,
      "“outer ‘inner’ text”",
      { rules: { quotes: { normalizeExisting: false } } },
    ],
    [
      en,
      `"outer ‘inner’ text"`,
      "“outer ‘inner’ text”",
      { rules: { quotes: { normalizeExisting: false } } },
    ],
    [
      es,
      `“texto 'cita' texto”`,
      "“texto ‘cita’ texto”",
      { rules: { quotes: { normalizeExisting: false } } },
    ],
    [en, '"Hello"', '"Hello"', { rules: { quotes: { enabled: false } } }],
    [en, "don't", "don’t"],
    [en, "O'Neill", "O’Neill"],
    [en, "The authors' notes", "The authors’ notes"],
    [en, `"Don't"`, `‘Don't’`, { rules: { apostrophes: { enabled: false } } }],
    [en, "ʼ", "ʼ"],
    [es, "ʼ", "ʼ"],
    [en, `6' 2"`, `6' 2"`],
    [es, `6' 2"`, `6' 2"`],
    [es, "«Hola.»", "«Hola.»"],
    [es, '" Hola "', "«Hola»"],
  ]) {
    assert.equal(instance.text(input, options), expected, input);
    const again = instance.text(expected, { ...options, detailed: true });
    assert.equal(again.result, expected, input);
    assert.deepEqual(again.edits, [], input);
    for (let split = 0; split <= input.length; split++) {
      const tree = [
        input.slice(0, split),
        h("em", { key: "e" }, input.slice(split)),
      ];
      const report = transformReact(tree, {
        instance,
        ...options,
        detailed: true,
      });
      assert.equal(
        visible(renderToString(h(Fragment, null, report.result))),
        expected,
        input,
      );
      assert.equal(
        visible(renderToString(h(Puncta, { instance, options }, tree))),
        expected,
        input,
      );
      const html = `${input.slice(0, split)}<em>${input.slice(split)}</em>`;
      const output = instance.html(html, { ...options, detailed: true });
      assert.equal(visible(output.result), expected, input);
      assert.deepEqual(
        transformReact(report.result, { instance, ...options, detailed: true })
          .edits,
        [],
        input,
      );
      assert.deepEqual(
        instance.html(output.result, { ...options, detailed: true }).edits,
        [],
        input,
      );
      for (const edit of report.edits)
        assert.equal(
          edit.before,
          edit.ranges
            .map((range) =>
              report.sources[range.sourceId].text.slice(range.start, range.end),
            )
            .join(""),
        );
    }
  }
});

test("quotes span line and opaque boundaries, with independent nested scopes", () => {
  for (const separator of ["\n", "\r\n", "\r"])
    assert.equal(
      en.text(`"Hello${separator}world"`),
      `‘Hello${separator}world’`,
    );
  for (const separator of [
    "<br>",
    "<wbr>",
    '<code>"x</code>',
    '<img alt="ignored">',
  ]) {
    assert.equal(
      en.html(`"Hello ${separator} world"`),
      `‘Hello ${separator} world’`,
    );
  }
  assert.equal(
    en.html(`"Outer <span lang="es">"Hola"</span> end"`),
    `‘Outer <span lang="es">«Hola»</span> end’`,
  );
  for (const separator of ["\n\n", "\r\n \t\r\n"]) {
    const report = en.text(`"Hello${separator}world"`, { detailed: true });
    assert.equal(report.result, `"Hello${separator}world"`);
    assert.equal(
      report.warnings.filter((warning) => warning.code === "quotes.unpaired")
        .length,
      2,
    );
  }
  assert.equal(
    en.text('"Use SECRET here"', { protect: [{ start: 5, end: 11 }] }),
    "‘Use SECRET here’",
  );
  assert.equal(en.html('"Hello<p>world</p>again"'), '"Hello<p>world</p>again"');
});

test("unpaired, ambiguous and conflicting preserved pairs are diagnosed without guessing", () => {
  for (const [input, code] of [
    ['"Hello', "quotes.unpaired"],
    ['Hello"', "quotes.unpaired"],
    ['ab"cd', "typography.ambiguous"],
    [`6' 2"`, "typography.ambiguous"],
  ]) {
    const report = en.text(input, { detailed: true });
    assert.equal(report.result, input);
    assert.ok(
      report.warnings.some(
        (warning) => warning.code === code && warning.ruleId === "quotes",
      ),
      input,
    );
    assert.deepEqual(
      en.text(input, { detailed: true, rules: { quotes: { enabled: false } } })
        .warnings,
      [],
    );
  }
  const input = `"outer ‘one’ and “two” text"`;
  const report = en.text(input, {
    detailed: true,
    rules: { quotes: { normalizeExisting: false } },
  });
  assert.equal(report.result, input);
  assert.ok(
    report.warnings.some((warning) => warning.code === "typography.ambiguous"),
  );
});

test("deep nesting alternates and independent rules retain original edit provenance", () => {
  assert.equal(en.text(`"a 'b “c ‘d’ c” b' a"`), "‘a “b ‘c “d” c’ b” a’");
  assert.equal(es.text(`"a 'b “c ‘d’ c” b' a"`), "«a “b ‘c “d” c’ b” a»");
  const input = '😀 "  Hola  ...  "';
  const report = es.text(input, { detailed: true });
  assert.equal(report.result, "😀 «Hola  …»");
  let end = 0;
  for (const edit of report.edits) {
    assert.equal(
      input.slice(edit.ranges[0].start, edit.ranges[0].end),
      edit.before,
    );
    assert.ok(edit.ranges[0].start >= end);
    end = edit.ranges[0].end;
  }
  assert.deepEqual(es.text(report.result, { detailed: true }).edits, []);
  assert.equal(
    es.text('"  Hola  "', { rules: { spaces: { enabled: false } } }),
    "«  Hola  »",
  );
});

test("role recognition remains stable when apostrophes and intervals are formatted", () => {
  for (const [input, rules] of [
    ["‘s'", {}],
    ["‘¡ ‘’", {}],
    ["a :..  ", {}],
    ["word :word", {}],
    ["'¡ «'", {}],
    ['"¡ «"', { quotes: { normalizeExisting: false } }],
    ["‘¿ «’", { apostrophes: { enabled: false } }],
  ]) {
    const first = es.text(input, { rules, detailed: true });
    const second = es.text(first.result, { rules, detailed: true });
    assert.equal(second.result, first.result, input);
    assert.deepEqual(second.edits, [], input);
  }
});

test("quotes and apostrophes inherit, override and reset independently", () => {
  const off = en.with({
    rules: { quotes: { enabled: false }, apostrophes: { enabled: false } },
  });
  assert.equal(off.text(`"Don't"`), `"Don't"`);
  assert.equal(
    off
      .with({ locale: "es-es", rules: { quotes: { enabled: null } } })
      .text(`"Don't"`),
    `«Don't»`,
  );
  assert.equal(
    off.text(`"Don't"`, { rules: { quotes: null, apostrophes: null } }),
    "‘Don’t’",
  );
  assert.equal(
    en
      .with({ rules: { quotes: { normalizeExisting: false } } })
      .text("“Hello”", { rules: { quotes: { normalizeExisting: null } } }),
    "‘Hello’",
  );
  const reset = { rules: { quotes: null, apostrophes: null } };
  const attrs = { lang: "es", "data-puncta-options": JSON.stringify(reset) };
  const tree = h("span", attrs, `"Don't"`);
  assert.equal(
    transformReact(tree, { instance: off }).props.children,
    "«Don’t»",
  );
  assert.equal(
    visible(
      off.html(
        `<span lang="es" data-puncta-options='${JSON.stringify(reset)}'>"Don't"</span>`,
      ),
    ),
    "«Don’t»",
  );
  assert.equal(
    visible(
      renderToString(
        h(
          PunctaProvider,
          { instance: off },
          h(Puncta, { locale: "es-es", options: reset }, `"Don't"`),
        ),
      ),
    ),
    "«Don’t»",
  );
});

test("React opaque props stay unread and Suspense separates three quote contexts", () => {
  let opened = false;
  const Opaque = () => {
    opened = true;
    return "ignored";
  };
  const opaque = h(Opaque, { title: `"hidden` });
  const result = transformReact(['"before ', opaque, ' after"'], {
    instance: en,
    detailed: true,
  });
  assert.equal(opened, false);
  assert.equal(result.result[0], "‘before ");
  assert.equal(result.result[1], opaque);
  assert.equal(result.result[2], " after’");
  const suspense = transformReact(
    [
      '"before ',
      h(Suspense, { key: "s", fallback: '"fallback"' }, '"content"'),
      ' after"',
    ],
    { instance: en, detailed: true },
  );
  assert.equal(suspense.result[0], '"before ');
  assert.equal(suspense.result[1].props.children, "‘content’");
  assert.equal(suspense.result[1].props.fallback, "‘fallback’");
  assert.equal(suspense.result[2], ' after"');
  assert.equal(
    suspense.warnings.filter((warning) => warning.code === "quotes.unpaired")
      .length,
    2,
  );
});

test("quote entities and split inner-space deletions keep source placement", () => {
  const report = en.html("😀 &quot;Hi&quot;", { detailed: true });
  assert.deepEqual(
    report.edits.map((edit) => edit.ranges[0].inputRange),
    [
      { accuracy: "exact", start: 3, end: 9 },
      { accuracy: "exact", start: 11, end: 17 },
    ],
  );
  const html = es.html('" <i> </i>Hola <b> </b>"', { detailed: true });
  assert.equal(html.result, "«<i></i>Hola<b></b>»");
  assert.equal(html.edits.filter((edit) => edit.kind === "delete").length, 2);
  assert.ok(
    html.edits
      .filter((edit) => edit.kind === "delete")
      .every((edit) => edit.ranges.length === 2),
  );
  for (const edit of html.edits)
    assert.equal(
      edit.before,
      edit.ranges
        .map((range) =>
          html.sources[range.sourceId].text.slice(range.start, range.end),
        )
        .join(""),
    );
});

test("generated quote roles are idempotent, protected text is identity, and edits retain provenance", () => {
  let seed = 4401;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  const tokens = [
    "word",
    "authors",
    "Hola",
    "ñ",
    "e\u0301",
    "1",
    "6",
    "'",
    '"',
    "‘",
    "’",
    "“",
    "”",
    "«",
    "»",
    "ʼ",
    ",",
    ":",
    "!",
    "?",
    ".",
    "...",
    "¿",
    "¡",
    "(",
    ")",
    " ",
    "  ",
    "\n",
    "\r\n",
    "\t",
    "\u00a0",
  ];
  for (const instance of [en, es])
    for (const rules of [
      {},
      { quotes: { normalizeExisting: false } },
      { apostrophes: { enabled: false } },
    ]) {
      for (let sample = 0; sample < 10000; sample++) {
        let input = "";
        for (
          let index = 0, length = Math.floor(random() * 17);
          index < length;
          index++
        )
          input += tokens[Math.floor(random() * tokens.length)];
        const first = instance.text(input, { rules, detailed: true });
        const second = instance.text(first.result, { rules, detailed: true });
        assert.equal(second.result, first.result, input);
        assert.deepEqual(second.edits, [], input);
        assert.deepEqual(second.appliedRules, [], input);
        for (const edit of first.edits)
          assert.equal(
            edit.before,
            edit.ranges
              .map((range) => input.slice(range.start, range.end))
              .join(""),
            input,
          );
        if (sample % 10 === 0) {
          const protectedResult = instance.text(input, {
            rules,
            detailed: true,
            protect: [{ start: 0, end: input.length }],
          });
          assert.equal(protectedResult.result, input);
          assert.deepEqual(protectedResult.edits, []);
          assert.deepEqual(protectedResult.warnings, []);
        }
      }
    }
});

test("preserved descendants constrain every new neighbouring pair", () => {
  const options = { rules: { quotes: { normalizeExisting: false } } };
  const input = `"outer 'middle “fixed” middle' outer"`;
  const expected = "“outer ‘middle “fixed” middle’ outer”";
  assert.equal(en.text(input, options), expected);
  assert.deepEqual(en.text(expected, { ...options, detailed: true }).edits, []);
});

test("quote closures after s, measurements and line indentation retain their distinct roles", () => {
  for (const [instance, input, expected] of [
    [en, "'authors' and 'editors'", "‘authors’ and ‘editors’"],
    [en, "'authors' \n 'readers'", "‘authors’ \n ‘readers’"],
    [en, "The authors'\nnotes", "The authors’\nnotes"],
    [en, `"The authors' notes"`, "‘The authors’ notes’"],
    [en, `He said "6' 2" tall"`, `He said ‘6' 2" tall’`],
    [es, '"Hola\n  "', "«Hola\n  »"],
    [es, '"Hola\r\n \t "', "«Hola\r\n \t »"],
  ]) {
    assert.equal(instance.text(input), expected, input);
    assert.equal(
      visible(instance.html(input)),
      expected.replaceAll("\r\n", "\n"),
      input,
    );
    assert.equal(
      visible(renderToString(transformReact(input, { instance }))),
      expected.replaceAll("\r\n", "\n"),
      input,
    );
    assert.deepEqual(
      instance.text(expected, { detailed: true }).edits,
      [],
      input,
    );
  }
  assert.equal(es.html('"Hola<br>  "'), "«Hola<br>  »");
});
