import assert from "node:assert/strict";
import { test } from "node:test";
import { createPuncta } from "../packages/core/dist/index.mjs";
import { enGb } from "../packages/with-en-gb/dist/index.mjs";
import { esEs } from "../packages/with-es-es/dist/index.mjs";
const en = createPuncta({ locales: [enGb, esEs], locale: "en-gb" });
const es = en.with({ locale: "es-es" });
test("known complete units create original-coordinate nonbreaking bonds", () => {
  const report = en.text("😀 24kg; 27 °C; 20 km/h; 30 °; 24KG; 24 kilogram", {
    detailed: true,
  });
  assert.equal(
    report.result,
    "😀 24\u00a0kg; 27\u00a0°C; 20\u00a0km/h; 30°; 24KG; 24 kilogram",
  );
  assert.deepEqual(report.edits[0], {
    kind: "insert",
    before: "",
    after: "\u00a0",
    locale: "en-gb",
    ruleIds: ["units"],
    ranges: [{ sourceId: 0, start: 5, end: 5 }],
  });
});
test("percentages and currency orders use locale intervals without changing numbers", () => {
  for (const [instance, input, expected, warningCount] of [
    [
      en,
      "50 %; 50\u00a0%; £ 20; EUR20; 20 USD; 20  €",
      "50%; 50%; £20; EUR\u00a020; 20\u00a0USD; 20  €",
      1,
    ],
    [
      es,
      "50%; 20€; USD20; 20 GBP; €  20",
      "50\u00a0%; 20\u00a0€; USD\u00a020; 20\u00a0GBP; €  20",
      1,
    ],
  ]) {
    const report = instance.text(input, { detailed: true });
    assert.equal(report.result, expected);
    assert.equal(
      report.warnings.filter((w) => w.code === "currency.order").length,
      warningCount,
    );
    assert.deepEqual(instance.text(expected, { detailed: true }).edits, []);
  }
});

test("full case-sensitive unit catalogue and complete composite boundaries", () => {
  // Literal oracle transcribed from canonical #28, independently of recognition tables.
  const input =
    "1mm 2cm 3m 4km 5µm 6nm 7mg 8g 9kg 10t 11ml 12mL 13l 14L 15ms 16s 17min 18h 19d 20°C 21°F 22K 23m² 24m³ 25m/s 26km/h 27Hz 28kHz 29MHz 30GHz 31W 32kW 33MW 34Wh 35kWh 36V 37A 38Pa 39kPa 40MPa 41bar 42J 43kJ 44N";
  const expected =
    "1 mm 2 cm 3 m 4 km 5 µm 6 nm 7 mg 8 g 9 kg 10 t 11 ml 12 mL 13 l 14 L 15 ms 16 s 17 min 18 h 19 d 20 °C 21 °F 22 K 23 m² 24 m³ 25 m/s 26 km/h 27 Hz 28 kHz 29 MHz 30 GHz 31 W 32 kW 33 MW 34 Wh 35 kWh 36 V 37 A 38 Pa 39 kPa 40 MPa 41 bar 42 J 43 kJ 44 N";
  for (const instance of [en, es]) {
    assert.equal(instance.text(input), expected);
    for (const text of [
      "24KG",
      "24kgs",
      "24kgx",
      "24m/s²",
      "24m/speed",
      "24m/unknown",
      "24kg_name",
      "x24kg",
      "24kge\u0301",
      "24kg²",
      "24kg2",
      "30°X",
      "24\tkg",
      "24\nkg",
      "24\r\nkg",
      "1,234",
      "03/04/2026",
      "10-12",
      "5-3",
    ])
      assert.equal(instance.text(text), text, text);
  }
});

test("all currencies retain number notation and atypical order diagnostics", () => {
  for (const instance of [en, es]) {
    assert.equal(
      instance.text("GBP20 EUR20 USD20; 20GBP 20EUR 20USD"),
      "GBP 20 EUR 20 USD 20; 20 GBP 20 EUR 20 USD",
    );
    assert.equal(
      instance.text("GBP 1,234.50; 1.234,50 EUR; -5 kg; 10-12 kg"),
      "GBP 1,234.50; 1.234,50 EUR; -5 kg; 10-12 kg",
    );
    const input =
      instance === en ? "20  £; 20  €; 20  $" : "£  20; €  20; $  20";
    const report = instance.text(input, { detailed: true });
    assert.equal(report.result, input);
    assert.deepEqual(report.edits, []);
    assert.deepEqual(report.appliedRules, []);
    assert.equal(report.warnings.length, 3);
    for (const warning of report.warnings) {
      assert.equal(warning.code, "currency.order");
      assert.equal(warning.ruleId, "currencies");
      assert.equal(warning.source, "rule");
      assert.equal(warning.location.kind, "text");
    }
    assert.equal(
      instance.text(input, { rules: { currencies: { enabled: false } } }),
      input,
    );
    assert.deepEqual(
      instance.text(input, {
        detailed: true,
        rules: { currencies: { enabled: false } },
      }).warnings,
      [],
    );
  }
  assert.equal(en.text("£ 20; € 20; $ 20"), "£20; €20; $20");
  assert.equal(es.text("20£; 20€; 20$"), "20 £; 20 €; 20 $");
});

test("additional units are literal, deduplicated, replaced, validated and reset", () => {
  const instance = en.with({
    rules: { units: { additional: ["rpm", "a+b", "a+b", "x.y", "fluid oz"] } },
  });
  assert.equal(
    instance.text("1rpm 2a+b 3x.y 4fluid oz 5kg"),
    "1 rpm 2 a+b 3 x.y 4 fluid oz 5 kg",
  );
  assert.equal(
    instance.text("1rpm 2a+b", { rules: { units: { additional: ["RPM"] } } }),
    "1rpm 2a+b",
  );
  assert.equal(
    instance.text("1RPM 2rpm", { rules: { units: { additional: ["RPM"] } } }),
    "1 RPM 2rpm",
  );
  for (const reset of [[], null])
    assert.equal(
      instance.text("1rpm 2kg", { rules: { units: { additional: reset } } }),
      "1rpm 2 kg",
    );
  assert.equal(
    instance.text("1rpm 2kg", { rules: { units: null } }),
    "1rpm 2 kg",
  );
  for (const unit of ["", " kg", "kg ", "a\nb", "a\u0000b", 42]) {
    assert.throws(
      () =>
        en.with({ rules: { units: { enabled: false, additional: [unit] } } }),
      { code: "config.invalid-option" },
    );
  }
  const report = instance.text("1a+b", { detailed: true });
  assert.equal(report.edits.length, 1);
});

test("independent switches inherit and null resets return current locale defaults", () => {
  const off = en.with({
    rules: {
      units: { enabled: false },
      percentages: { enabled: false },
      currencies: { enabled: false },
    },
  });
  assert.equal(off.text("24  kg 50  % £  20"), "24  kg 50  % £  20");
  assert.equal(
    off.text("24kg 50 % £ 20", { rules: { units: null } }),
    "24 kg 50 % £ 20",
  );
  assert.equal(
    off.text("24kg 50 % £ 20", { rules: { percentages: null } }),
    "24kg 50% £ 20",
  );
  assert.equal(
    off.text("24kg 50 % £ 20", { rules: { currencies: null } }),
    "24kg 50 % £20",
  );
  const spaced = en.with({ rules: { percentages: { space: "nbsp" } } });
  assert.equal(spaced.text("50%"), "50 %");
  assert.equal(
    spaced.text("50 %", { rules: { percentages: { space: null } } }),
    "50%",
  );
  assert.equal(en.with({ locale: "es-es" }).text("50%"), "50 %");
  assert.equal(
    es.with({ rules: { percentages: { space: "none" } } }).text("50 %"),
    "50%",
  );
  assert.equal(
    off
      .with({ locale: "es-es", rules: { percentages: { enabled: null } } })
      .text("50%"),
    "50 %",
  );
  assert.equal(
    en.text("24 kg; 50 %; £ 20", { rules: { spaces: { enabled: false } } }),
    "24 kg; 50%; £20",
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
const corpus = [
  [en, "24kg", "24 kg"],
  [en, "24 kg", "24 kg"],
  [en, "24KG", "24KG"],
  [es, "20 km/h", "20 km/h"],
  [es, "27 °C", "27 °C"],
  [en, "30°", "30°"],
  [en, "50 %", "50%"],
  [en, "50 %", "50%"],
  [es, "50%", "50 %"],
  [en, "50%", "50 %", { rules: { percentages: { space: "nbsp" } } }],
  [en, "£ 20", "£20"],
  [es, "20€", "20 €"],
  [en, "20€", "20€"],
  [es, "€20", "€20"],
  [en, "GBP 20", "GBP 20"],
  [es, "20 EUR", "20 EUR"],
  [en, '"24 kg..."', "‘24 kg…’"],
  [es, '"50%  ..."', "«50 %  …»"],
];
test("canonical literals agree at every transparent split in text, HTML, pure React and component SSR", () => {
  for (const [instance, input, expected, options = {}] of corpus) {
    assert.equal(instance.text(input, options), expected);
    assert.deepEqual(
      instance.text(expected, { ...options, detailed: true }).edits,
      [],
    );
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
      const html = instance.html(
        `${input.slice(0, split)}<em>${input.slice(split)}</em>`,
        { ...options, detailed: true },
      );
      assert.equal(visible(html.result), expected, input);
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
      assert.deepEqual(
        instance.html(html.result, { ...options, detailed: true }).edits,
        [],
      );
      assert.deepEqual(
        transformReact(report.result, { instance, ...options, detailed: true })
          .edits,
        [],
      );
      for (const detailed of [report, html])
        for (const edit of detailed.edits) {
          assert.equal(
            edit.before,
            edit.ranges
              .map((r) =>
                detailed.sources[r.sourceId].text.slice(r.start, r.end),
              )
              .join(""),
          );
        }
    }
  }
});

test("inserted bonds belong to the left leaf and replacement keeps original space ownership", () => {
  const inserted = en.html("24<em>kg</em>", { detailed: true });
  assert.equal(inserted.result, "24&nbsp;<em>kg</em>");
  assert.deepEqual(inserted.edits[0].ranges, [
    {
      sourceId: 0,
      start: 2,
      end: 2,
      inputRange: { accuracy: "exact", start: 2, end: 2 },
    },
  ]);
  const replaced = en.html("24<em> kg</em>", { detailed: true });
  assert.equal(replaced.result, "24<em>&nbsp;kg</em>");
  assert.deepEqual(replaced.edits[0].ranges, [
    {
      sourceId: 1,
      start: 0,
      end: 1,
      inputRange: { accuracy: "exact", start: 6, end: 7 },
    },
  ]);
  const entity = en.html("50&#160;%", { detailed: true });
  assert.equal(entity.result, "50%");
  assert.deepEqual(entity.edits[0].ranges[0].inputRange, {
    accuracy: "exact",
    start: 2,
    end: 8,
  });
  const split = en.html("24 <b> </b>kg", { detailed: true });
  assert.equal(split.result, "24&nbsp;<b></b>kg");
  assert.equal(split.edits[0].ranges.length, 2);
});

test("line, opaque, protected and nested scope boundaries prevent bonds", () => {
  for (const boundary of [
    "<br>",
    "<wbr>",
    "<code>x</code>",
    '<span data-puncta="off">x</span>',
    '<span lang="xx">x</span>',
    "<custom-tag>x</custom-tag>",
    "<p>x</p>",
    '<span lang="en">x</span>',
  ]) {
    assert.equal(
      visible(en.html(`24${boundary}kg`)),
      `24${visible(boundary)}kg`,
    );
  }
  for (const boundary of [
    h("br", { key: "br" }),
    h("wbr", { key: "wbr" }),
    h("code", { key: "code" }, "x"),
    h("span", { key: "span", lang: "es" }, "x"),
    h(() => "x", { key: "component" }),
  ]) {
    const report = transformReact(["24", boundary, "kg"], {
      instance: en,
      detailed: true,
    });
    assert.deepEqual(report.edits, []);
    assert.equal(report.result[0], "24");
    assert.equal(report.result[2], "kg");
  }
  assert.equal(en.text("24Xkg", { protect: [{ start: 2, end: 3 }] }), "24Xkg");
  for (const input of [
    "https://example.com/24kg",
    "www.example.com/50%",
    "24kg@example.com",
    "v1.2.3",
    "192.0.2.1",
  ])
    assert.deepEqual(en.text(input, { detailed: true }).edits, []);
  const input = "24kg 50% €20";
  const protectedReport = es.text(input, {
    detailed: true,
    protect: [{ start: 0, end: input.length }],
  });
  assert.equal(protectedReport.result, input);
  assert.deepEqual(protectedReport.warnings, []);
});

test("declarative and Provider scopes inherit overrides, reset defaults and stay independent", () => {
  const instance = en.with({
    rules: { units: { additional: ["rpm"] }, percentages: { space: "none" } },
  });
  const options = {
    rules: { units: { additional: [] }, percentages: { space: null } },
  };
  const attrs = { lang: "es", "data-puncta-options": JSON.stringify(options) };
  const tree = h("span", attrs, "24kg 50% 10rpm");
  assert.equal(
    visible(
      instance.html(
        `<span lang="es" data-puncta-options='${JSON.stringify(options)}'>24kg 50% 10rpm</span>`,
      ),
    ),
    "24 kg 50 % 10rpm",
  );
  assert.equal(
    transformReact(tree, { instance }).props.children,
    "24 kg 50 % 10rpm",
  );
  assert.equal(
    visible(
      renderToString(
        h(
          PunctaProvider,
          { instance },
          h(Puncta, { locale: "es-es", options }, "24kg 50% 10rpm"),
        ),
      ),
    ),
    "24 kg 50 % 10rpm",
  );
  assert.equal(
    visible(
      renderToString(h(Puncta, { instance }, "24", h(Puncta, null, "kg"))),
    ),
    "24kg",
  );
});

test("generated number contexts preserve original provenance, protection and idempotence", () => {
  let seed = 4501;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  const tokens = [
    "0",
    "24",
    "1,234.50",
    "1.234,50",
    "-5",
    "10-12",
    "kg",
    "KG",
    "km/h",
    "°",
    "°C",
    "rpm",
    "a+b",
    "%",
    "£",
    "€",
    "$",
    "GBP",
    "EUR",
    "USD",
    "x",
    "e\u0301",
    " ",
    "  ",
    "\u00a0",
    "\n",
    "\t",
    ",",
    ";",
    ".",
    "...",
    '"',
    "'",
    "(",
    ")",
  ];
  for (const instance of [en, es])
    for (const rules of [
      {},
      { units: { additional: ["rpm", "a+b"] } },
      { units: { enabled: false }, percentages: { space: "nbsp" } },
    ]) {
      for (let sample = 0; sample < 2000; sample++) {
        let input = "";
        for (
          let index = 0, length = Math.floor(random() * 14);
          index < length;
          index++
        )
          input += tokens[Math.floor(random() * tokens.length)];
        const first = instance.text(input, { rules, detailed: true });
        const second = instance.text(first.result, { rules, detailed: true });
        assert.equal(second.result, first.result, input);
        assert.deepEqual(second.edits, [], input);
        let end = 0;
        for (const edit of first.edits) {
          assert.equal(
            edit.before,
            input.slice(edit.ranges[0].start, edit.ranges[0].end),
          );
          assert.ok(edit.ranges[0].start >= end, input);
          end = edit.ranges[0].end;
        }
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

test("special percentage, currency and angle roles survive redundant unit additions", () => {
  const options = {
    detailed: true,
    rules: { units: { additional: ["USD", "%", "°", "$"] } },
  };
  const report = en.text("20USD; 50%; 30°; 20$", options);
  assert.equal(report.result, "20 USD; 50%; 30°; 20$");
  assert.equal(report.edits.length, 1);
  assert.deepEqual(report.edits[0].ruleIds, ["currencies"]);
});

test("adjacent number roles are recognised together before punctuation and spacing change", () => {
  for (const [input, expected] of [
    ["...1kg", "…1 kg"],
    ["word,10kg", "word, 10 kg"],
    ["GBP1kg", "GBP 1 kg"],
    ["1GBP 2", "1 GBP 2"],
    ["1 GBP2", "1 GBP 2"],
    ["GBP1USD", "GBP 1 USD"],
    ["20 GBP 30", "20 GBP 30"],
  ]) {
    assert.equal(en.text(input), expected, input);
    assert.deepEqual(en.text(expected, { detailed: true }).edits, [], input);
  }
  const ambiguous = en.text("20  GBP  30", { detailed: true });
  assert.equal(ambiguous.result, "20  GBP  30");
  assert.equal(ambiguous.warnings[0].code, "typography.ambiguous");
  assert.equal(ambiguous.warnings[0].ruleId, "currencies");
});
