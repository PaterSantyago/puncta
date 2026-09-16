import assert from "node:assert/strict";
import { test } from "node:test";
import { createPuncta } from "../packages/core/dist/index.mjs";
import { enGb } from "../packages/with-en-gb/dist/index.mjs";
import { esEs } from "../packages/with-es-es/dist/index.mjs";
const en = createPuncta({ locales: [enGb, esEs], locale: "en-gb" });
const es = en.with({ locale: "es-es" });
test("explicit textual markers follow the locale profile", () => {
  assert.equal(en.text("word -- word"), "word – word");
  assert.equal(es.text("Llegó --sin avisar-- ayer"), "Llegó —sin avisar— ayer");
  assert.equal(
    en.text("The plan — if approved — starts today"),
    "The plan – if approved – starts today",
  );
});
test("known units disambiguate ranges and negative values independently of formatting", () => {
  for (const instance of [en, es]) {
    assert.equal(
      instance.text("10-12 kg; -5 kg; 10-12; 5-3; well-known; - Hola"),
      "10–12 kg; −5 kg; 10-12; 5-3; well-known; - Hola",
    );
    assert.equal(
      instance.text("10-12 kg; -5 kg", {
        rules: { units: { enabled: false } },
      }),
      "10–12 kg; −5 kg",
    );
  }
});
test("dash options distinguish normalization, disabled groups and standalone ranges", () => {
  const options = {
    rules: {
      dashes: { normalizeExisting: false },
      ranges: { standalone: true },
      units: { additional: ["rpm"], enabled: false },
    },
  };
  const instance = en.with(options);
  options.rules.ranges.standalone = false;
  options.rules.units.additional.push("XYZ");
  assert.equal(
    instance.text("word -- word; plan — today; 10-12; -5 rpm; -5 XYZ"),
    "word – word; plan — today; 10–12; −5 rpm; -5 XYZ",
  );
  assert.equal(
    instance.text("word -- word", { rules: { dashes: { enabled: false } } }),
    "word -- word",
  );
  assert.equal(
    instance.text("10-12", { rules: { ranges: { standalone: null } } }),
    "10-12",
  );
  assert.equal(
    en.text("-5 kg; 10-12 kg", {
      rules: { ranges: { enabled: false }, minus: { enabled: false } },
    }),
    "-5 kg; 10-12 kg",
  );
});

import { createElement as h, Fragment } from "react";
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
const literals = [
  ["word -- word", "word – word", "word -- word"],
  [
    "Llegó --sin avisar-- ayer",
    "Llegó – sin avisar – ayer",
    "Llegó —sin avisar— ayer",
  ],
  [
    "The plan — if approved — starts today",
    "The plan – if approved – starts today",
    "The plan —if approved— starts today",
  ],
  [
    "Llegó —sin avisar—, ayer",
    "Llegó – sin avisar –, ayer",
    "Llegó —sin avisar—, ayer",
  ],
  [
    "well-known; - Hola; 10-12; 5-3",
    "well-known; - Hola; 10-12; 5-3",
    "well-known; - Hola; 10-12; 5-3",
  ],
  ["10-12 kg; -5 kg", "10–12 kg; −5 kg", "10–12 kg; −5 kg"],
  [
    "-1,234.5 kg; 1,2-3,4 m/s",
    "−1,234.5 kg; 1,2–3,4 m/s",
    "−1,234.5 kg; 1,2–3,4 m/s",
  ],
  [
    '"plan -- 10-12 kg -- today..."',
    "‘plan – 10–12 kg – today…’",
    "«plan —10–12 kg— today…»",
  ],
];
test("literal corpus agrees across text, HTML, pure React and SSR at every transparent seam", () => {
  for (const [input, english, spanish] of literals)
    for (const [instance, expected] of [
      [en, english],
      [es, spanish],
    ]) {
      assert.equal(instance.text(input), expected, input);
      assert.deepEqual(
        instance.text(expected, { detailed: true }).edits,
        [],
        input,
      );
      for (let split = 0; split <= input.length; split++) {
        const tree = [
          input.slice(0, split),
          h("em", { key: "e" }, input.slice(split)),
        ];
        const report = transformReact(tree, { instance, detailed: true });
        const html = instance.html(
          `${input.slice(0, split)}<em>${input.slice(split)}</em>`,
          { detailed: true },
        );
        assert.equal(visible(html.result), expected, input);
        assert.equal(
          visible(renderToString(h(Fragment, null, report.result))),
          expected,
          input,
        );
        assert.equal(
          visible(renderToString(h(Puncta, { instance }, tree))),
          expected,
          input,
        );
        assert.deepEqual(
          instance.html(html.result, { detailed: true }).edits,
          [],
        );
        assert.deepEqual(
          transformReact(report.result, { instance, detailed: true }).edits,
          [],
        );
        for (const detailed of [report, html])
          for (const item of [...detailed.edits, ...detailed.warnings]) {
            const ranges = item.ranges ?? item.location?.ranges;
            if (!ranges) continue;
            const original = ranges
              .map((r) =>
                detailed.sources[r.sourceId].text.slice(r.start, r.end),
              )
              .join("");
            if (item.before !== undefined) assert.equal(item.before, original);
            else assert.ok(original.length > 0);
          }
      }
    }
});
test("ambiguous numeric chains keep signs and produce original warnings", () => {
  for (const instance of [en, es])
    for (const input of ["2026-03-04", "5-3-2", "5 - 3", "5+3-2", "5/3-2"]) {
      const report = instance.text(input, {
        detailed: true,
        rules: { ranges: { standalone: true } },
      });
      assert.equal(report.result, input);
      assert.equal(report.warnings[0]?.code, "typography.ambiguous");
      assert.equal(report.warnings[0]?.ruleId, "ranges");
      assert.deepEqual(report.warnings[0].location.ranges, [
        { sourceId: 0, start: 0, end: input.length },
      ]);
    }
});
test("protection, opaque boundaries and lines do not participate in recognition", () => {
  const standalone = { rules: { ranges: { standalone: true } } };
  for (const instance of [en, es]) {
    for (const input of [
      "https://example.com/10-12",
      "v1.2.3-10-12",
      "x10-12",
      "10-12x",
      "well-known",
      "- Hola",
    ])
      assert.equal(instance.text(input, standalone), input);
    const input = "--x-- 10-12 kg -5 kg";
    assert.equal(
      instance.text(input, { protect: [{ start: 0, end: input.length }] }),
      input,
    );
    for (const boundary of [
      "<br>",
      "<wbr>",
      "<code>x</code>",
      '<span data-puncta="off">x</span>',
      '<span lang="xx">x</span>',
      "<custom-tag>x</custom-tag>",
      '<span lang="es">x</span>',
    ]) {
      assert.ok(
        visible(instance.html(`10-${boundary}12 kg`)).startsWith(
          `10-${visible(boundary)}12`,
        ),
      );
    }
    for (const input of ["word\n-- word", "word --\nword", "--word\nword--"])
      assert.equal(visible(instance.html(input)), instance.text(input));
  }
});
test("dash scopes inherit overrides and reset to their own locale defaults", () => {
  const instance = en.with({
    rules: { dashes: { enabled: false }, ranges: { standalone: true } },
  });
  const options = {
    rules: { dashes: { enabled: null }, ranges: { standalone: null } },
  };
  const input = "Llegó --sin avisar-- ayer 10-12";
  const expected = "Llegó —sin avisar— ayer 10-12";
  const attrs = { lang: "es", "data-puncta-options": JSON.stringify(options) };
  assert.equal(
    visible(
      instance.html(
        `<span lang="es" data-puncta-options='${JSON.stringify(options)}'>${input}</span>`,
      ),
    ),
    expected,
  );
  assert.equal(
    transformReact(h("span", attrs, input), { instance }).props.children,
    expected,
  );
  assert.equal(
    visible(
      renderToString(
        h(
          PunctaProvider,
          { instance },
          h(Puncta, { locale: "es-es", options }, input),
        ),
      ),
    ),
    expected,
  );
});
test("dash roles anticipate currency, quote, ellipsis and sign formatting on original text", () => {
  for (const [input, expected] of [
    ["USD-5kg", "USD −5 kg"],
    ["word...10-12kg", "word…10–12 kg"],
    ['--word--"quote"', "– word – ‘quote’"],
    ["--word--...", "– word – …"],
    ["---5kg", "---5 kg"],
    ["kg\n--kg–kg-5", "kg\n– kg – kg-5"],
    ["1–.5 kg", "1–.5 kg"],
    ["kg,10-12kg", "kg, 10–12 kg"],
  ]) {
    assert.equal(en.text(input), expected);
    assert.deepEqual(en.text(expected, { detailed: true }).edits, []);
  }
  assert.equal(es.text("–-5kg–"), "—−5 kg—");
});
test("generated dash contexts preserve idempotence, protection and original edit replay", () => {
  let seed = 4601;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  const tokens = [
    "word",
    "Hola",
    "10-12",
    "-5",
    ".5",
    "1,5",
    "kg",
    "USD",
    "--",
    "—",
    "–",
    "---",
    "...",
    '"',
    "'",
    " ",
    " ",
    "\n",
    "\t",
    ",",
  ];
  for (const instance of [en, es])
    for (const rules of [
      {},
      {
        ranges: { standalone: true },
        units: { enabled: false, additional: ["rpm"] },
      },
      { dashes: { normalizeExisting: false } },
    ]) {
      for (let count = 0; count < 500; count++) {
        const input = Array.from(
          { length: 8 },
          () => tokens[Math.floor(random() * tokens.length)],
        ).join("");
        const report = instance.text(input, { rules, detailed: true });
        assert.equal(
          instance.text(report.result, { rules }),
          report.result,
          input,
        );
        assert.equal(
          instance.text(input, {
            rules,
            protect: [{ start: 0, end: input.length }],
          }),
          input,
        );
        let replay = input;
        for (const edit of [...report.edits].reverse()) {
          const range = edit.ranges[0];
          assert.equal(input.slice(range.start, range.end), edit.before);
          replay =
            replay.slice(0, range.start) + edit.after + replay.slice(range.end);
        }
        assert.equal(replay, report.result);
      }
    }
});
