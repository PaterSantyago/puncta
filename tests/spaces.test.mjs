import assert from "node:assert/strict";
import { test } from "node:test";
import { createPuncta } from "../packages/core/dist/index.mjs";
import { enGb } from "../packages/with-en-gb/dist/index.mjs";
import { esEs } from "../packages/with-es-es/dist/index.mjs";

for (const locale of [enGb, esEs]) {
  test(`${locale.id}: ordinary spaces retain indentation, lines, tabs and NBSP`, () => {
    const instance = createPuncta({ locales: [locale], locale: locale.id });
    for (const [input, expected] of [
      ["alpha  beta", "alpha beta"],
      ["  alpha  beta\n\n  gamma\tdelta", "  alpha beta\n\n  gamma\tdelta"],
      [
        " \t  alpha   beta\r\n  \t\r\n\r  gamma  delta",
        " \t  alpha beta\r\n  \t\r\n\r  gamma delta",
      ],
      ["alpha\u00a0\u00a0beta", "alpha\u00a0\u00a0beta"],
      [
        "24\u00a0kg  50\u00a0%  word – word",
        "24\u00a0kg 50\u00a0% word – word",
      ],
      ["1,234  03/04/2026  1.234,56", "1,234 03/04/2026 1.234,56"],
      ["\t  \r\n   ", "\t  \r\n   "],
    ]) {
      const report = instance.text(input, { detailed: true });
      assert.equal(report.result, expected);
      assert.deepEqual(instance.text(expected, { detailed: true }).edits, []);
    }
    assert.deepEqual(
      instance.text("😀 alpha  beta", { detailed: true }).edits,
      [
        {
          kind: "replace",
          before: "  ",
          after: " ",
          locale: locale.id,
          ruleIds: ["spaces"],
          ranges: [{ sourceId: 0, start: 8, end: 10 }],
        },
      ],
    );
  });
}

for (const locale of [enGb, esEs]) {
  test(`${locale.id}: unambiguous punctuation edits and numeric exceptions`, () => {
    const instance = createPuncta({ locales: [locale], locale: locale.id });
    for (const [input, expected] of [
      ["Hello , world !", "Hello, world!"],
      [
        "Hello,world!Ready?Yes; indeed : now.",
        "Hello, world! Ready? Yes; indeed: now.",
      ],
      ["( hello ) [ world ]", "(hello) [world]"],
      ["«Hola.»", locale.id === "en-gb" ? "‘Hola.’" : "«Hola.»"],
      ["1,234 03/04/2026 1.234,56 12:30", "1,234 03/04/2026 1.234,56 12:30"],
      ["1 , 234  1.234,56", "1 , 234 1.234,56"],
      ["  , alpha\t !\n  !", "  , alpha\t !\n  !"],
      ["Hello\u00a0, world\u00a0!", "Hello\u00a0, world\u00a0!"],
      ["Wait  ...  perhaps ; yes !", "Wait  …  perhaps; yes!"],
      ["Wait  …  perhaps", "Wait  …  perhaps"],
      ["Wait  ....  perhaps", "Wait  ....  perhaps"],
      ["Wait . . . perhaps", "Wait . . . perhaps"],
    ]) {
      const report = instance.text(input, { detailed: true });
      assert.equal(report.result, expected, input);
      assert.deepEqual(
        instance.text(expected, { detailed: true }).edits,
        [],
        input,
      );
    }
    const report = instance.text("Hello ,world!", { detailed: true });
    assert.deepEqual(report.edits, [
      {
        kind: "delete",
        before: " ",
        after: "",
        locale: locale.id,
        ruleIds: ["spaces"],
        ranges: [{ sourceId: 0, start: 5, end: 6 }],
      },
      {
        kind: "insert",
        before: "",
        after: " ",
        locale: locale.id,
        ruleIds: ["spaces"],
        ranges: [{ sourceId: 0, start: 7, end: 7 }],
      },
    ]);
    assert.deepEqual(report.appliedRules, [
      { ruleId: "spaces", locale: locale.id },
    ]);
    const ambiguous = instance.text("😀 Wait  ...  perhaps;yes", {
      detailed: true,
    });
    assert.equal(ambiguous.result, "😀 Wait  …  perhaps; yes");
    assert.deepEqual(ambiguous.warnings, [
      {
        code: "typography.ambiguous",
        source: "rule",
        message: "Ellipsis spacing is ambiguous; its intervals were preserved.",
        details: {},
        locale: locale.id,
        ruleId: "spaces",
        location: {
          kind: "text",
          ranges: [{ sourceId: 0, start: 7, end: 14 }],
        },
      },
    ]);
  });
}

test("es-es cleans existing inverted signs without supplying absent punctuation", () => {
  const instance = createPuncta({ locales: [esEs], locale: "es-es" });
  for (const [input, expected] of [
    ["¿ Hola ?", "¿Hola?"],
    ["¡ Hola !", "¡Hola!"],
    ["¿  Qué tal  ?¡  Bien  !", "¿Qué tal? ¡Bien!"],
    ["Hola?", "Hola?"],
    ["Hola !", "Hola!"],
    ["¿ Hola", "¿Hola"],
    ["¿\tHola\n?", "¿\tHola\n?"],
    ["¿\u00a0Hola\u00a0?", "¿\u00a0Hola\u00a0?"],
  ]) {
    assert.equal(instance.text(input), expected);
    assert.deepEqual(instance.text(expected, { detailed: true }).edits, []);
  }
});

test("HTML and React place insertion on the left and preserve per-leaf diagnostic ranges", async () => {
  const { createElement: h } = await import("react");
  const { transformReact } = await import(
    "../packages/with-react/dist/pure.mjs"
  );
  const instance = createPuncta({ locales: [enGb], locale: "en-gb" });
  const report = instance.html("<b>Hello,</b><i>world !</i>", {
    detailed: true,
  });
  assert.equal(report.result, "<b>Hello, </b><i>world!</i>");
  assert.deepEqual(
    report.edits.map((edit) => edit.ranges),
    [
      [
        {
          sourceId: 0,
          start: 6,
          end: 6,
          inputRange: { accuracy: "exact", start: 9, end: 9 },
        },
      ],
      [
        {
          sourceId: 1,
          start: 5,
          end: 6,
          inputRange: { accuracy: "exact", start: 21, end: 22 },
        },
      ],
    ],
  );
  const tree = [
    h("b", { key: "b" }, "Hello,"),
    h("i", { key: "i" }, "world !"),
  ];
  const react = transformReact(tree, { instance, detailed: true });
  assert.equal(react.result[0].props.children, "Hello, ");
  assert.equal(react.result[1].props.children, "world!");
  const warning = instance.html("<b>Wait  &#46;</b><i>..  maybe</i>", {
    detailed: true,
  });
  assert.equal(warning.result, "<b>Wait  …</b><i>  maybe</i>");
  assert.deepEqual(warning.warnings[0].location, {
    kind: "text",
    ranges: [
      {
        sourceId: 0,
        start: 4,
        end: 7,
        inputRange: { accuracy: "exact", start: 7, end: 14 },
      },
      {
        sourceId: 1,
        start: 0,
        end: 4,
        inputRange: { accuracy: "exact", start: 21, end: 25 },
      },
    ],
  });
  const reactWarning = transformReact(
    [h("b", { key: "b" }, "Wait  ."), h("i", { key: "i" }, "..  maybe")],
    { instance, detailed: true },
  );
  assert.deepEqual(reactWarning.warnings[0].location, {
    kind: "text",
    ranges: [
      { sourceId: 0, start: 4, end: 7 },
      { sourceId: 1, start: 0, end: 4 },
    ],
  });
});

// Literal oracles from #28 §3/§9 plus boundary cases derived from its preservation
// rules. Enumeration varies leaf layout and protects a span; it never derives the
// expected typography from the implementation or another typography engine.
const commonCorpus = [
  ["alpha  beta", "alpha beta"],
  ["  alpha  beta\n\n  gamma\tdelta", "  alpha beta\n\n  gamma\tdelta"],
  ["alpha\u00a0beta", "alpha\u00a0beta"],
  ["Hello , world !", "Hello, world!"],
  ["Hello,world;yes!", "Hello, world; yes!"],
  ["Wait...", "Wait…"],
  ["Wait....", "Wait...."],
  ["Wait.....", "Wait....."],
  ["..", ".."],
  ["", ""],
  ["...", "…"],
  ["…", "…"],
  ["a  ...  b", "a  …  b"],
  ["a  …  b", "a  …  b"],
  ["a  ....  b", "a  ....  b"],
  ["a . . . b", "a . . . b"],
  ["😀 e\u0301  word ...!", "😀 e\u0301 word …!"],
  ["1,234", "1,234"],
  ["03/04/2026", "03/04/2026"],
  ["12:30", "12:30"],
  ["1 , 234", "1 , 234"],
  [
    "24\u00a0kg  50\u00a0%  £20  20€  word – word",
    "24\u00a0kg 50\u00a0% £20 20€ word – word",
  ],
  ["https://example.org/a...b", "https://example.org/a...b"],
  ["www.example.org/a...b", "www.example.org/a...b"],
  ["o'neill@example.org", "o'neill@example.org"],
  ["192.0.2.1", "192.0.2.1"],
  ["v1.2.3", "v1.2.3"],
  ["  alpha\t  beta\n\t  gamma  delta", "  alpha\t beta\n\t  gamma delta"],
  ["Hello,\u0301world", "Hello,\u0301world"],
  ["a  \u0301b", "a  \u0301b"],
  ["é? ?alpha  1", "é?? alpha 1"],
  ["  (2  .  ...", "  (2  .  …"],
];
const spanishCorpus = [
  ["¿ Hola ?", "¿Hola?"],
  ["¡ Hola !", "¡Hola!"],
  ["¿  Hola  ?¡  Sí  !", "¿Hola? ¡Sí!"],
  ["Hola?", "Hola?"],
  ["«Hola.»", "«Hola.»"],
];

for (const locale of [enGb, esEs]) {
  test(`${locale.id}: literal corpus and every two-leaf partition agree in text/HTML/pure/components`, async () => {
    const { createElement: h } = await import("react");
    const { renderToString } = await import(
      "../examples/ssr/node_modules/react-dom/server.node.js"
    );
    const { Puncta } = await import("../packages/with-react/dist/index.mjs");
    const { transformReact } = await import(
      "../packages/with-react/dist/pure.mjs"
    );
    const instance = createPuncta({ locales: [locale], locale: locale.id });
    const corpus =
      locale.id === "es-es"
        ? [...commonCorpus, ...spanishCorpus]
        : commonCorpus;
    for (const [input, expected] of corpus) {
      assert.equal(instance.text(input), expected, input);
      for (let split = 0; split <= input.length; split++) {
        const tree = [
          h("b", { key: "left" }, input.slice(0, split)),
          h("i", { key: "right" }, input.slice(split)),
        ];
        const report = transformReact(tree, { instance, detailed: true });
        assert.equal(
          report.result[0].props.children + report.result[1].props.children,
          expected,
          `${input} at ${split}`,
        );
        const markup = `<b>${input.slice(0, split)}</b><i>${input.slice(split)}</i>`;
        const output = instance.html(markup, { detailed: true });
        // parse5 serializes NBSP as an entity; React's server output keeps the scalar.
        const expectedHtml = `<b>${report.result[0].props.children}</b><i>${report.result[1].props.children}</i>`;
        assert.equal(
          output.result,
          expectedHtml.replaceAll("\u00a0", "&nbsp;"),
        );
        assert.equal(
          renderToString(h(Puncta, { instance }, tree)),
          expectedHtml.replaceAll("'", "&#x27;"),
        );
        assert.deepEqual(
          transformReact(report.result, { instance, detailed: true }).edits,
          [],
        );
        assert.deepEqual(
          instance.html(output.result, { detailed: true }).edits,
          [],
        );
        for (const edit of report.edits) {
          assert.equal(
            edit.before,
            edit.ranges
              .map((range) =>
                report.sources[range.sourceId].text.slice(
                  range.start,
                  range.end,
                ),
              )
              .join(""),
          );
          assert.ok(edit.ranges.length > 0);
        }
      }
    }
  });
}

test("spaces and ellipsis remain independently configurable through nested scopes", async () => {
  const { createElement: h } = await import("react");
  const { renderToString } = await import(
    "../examples/ssr/node_modules/react-dom/server.node.js"
  );
  const { Puncta, PunctaProvider } = await import(
    "../packages/with-react/dist/index.mjs"
  );
  const { transformReact } = await import(
    "../packages/with-react/dist/pure.mjs"
  );
  const instance = createPuncta({ locales: [enGb, esEs], locale: "en-gb" });
  const off = { rules: { spaces: { enabled: false } } };
  const reset = { rules: { spaces: null } };
  const input = "Hello ,  world...";
  assert.equal(instance.text(input, off), "Hello ,  world…");
  assert.equal(
    instance.text(input, { rules: { ellipsis: { enabled: false } } }),
    "Hello, world...",
  );
  assert.equal(
    instance.text("a  ...  b", { rules: { ellipsis: { enabled: false } } }),
    "a  ...  b",
  );
  assert.equal(instance.with(off).text(input, reset), "Hello, world…");
  const attrs = { "data-puncta-options": JSON.stringify(reset), lang: "es" };
  const html = `<b data-puncta-options='${JSON.stringify(off)}'>${input}<i data-puncta-options='${JSON.stringify(reset)}' lang="es">¿ Hola ?</i></b>`;
  const report = instance.html(html, { detailed: true });
  assert.ok(report.result.endsWith(' lang="es">¿Hola?</i></b>'));
  assert.deepEqual(report.appliedRules, [
    { ruleId: "ellipsis", locale: "en-gb" },
    { ruleId: "spaces", locale: "es-es" },
  ]);
  const tree = h(
    "b",
    { "data-puncta-options": JSON.stringify(off) },
    input,
    h("i", attrs, "¿ Hola ?"),
  );
  assert.equal(
    transformReact(tree, { instance }).props.children[1].props.children,
    "¿Hola?",
  );
  assert.equal(
    renderToString(
      h(
        PunctaProvider,
        { instance, options: off },
        h(Puncta, null, input),
        h(Puncta, { locale: "es-es", options: reset }, "¿ Hola ?"),
      ),
    ),
    "Hello ,  world…<!-- -->¿Hola?",
  );
});

test("protection and structural boundaries stop each rule and suppress rule warnings", async () => {
  const { createElement: h } = await import("react");
  const { transformReact } = await import(
    "../packages/with-react/dist/pure.mjs"
  );
  const instance = createPuncta({ locales: [esEs], locale: "es-es" });
  const protectedText = "¿ Hola ?  Wait  ...  maybe;yes";
  const input = `${protectedText}\nHello ,  world...`;
  const report = instance.text(input, {
    protect: [{ start: 0, end: protectedText.length }],
    detailed: true,
  });
  assert.equal(report.result, `${protectedText}\nHello, world…`);
  assert.deepEqual(report.warnings, []);
  for (const edit of report.edits)
    assert.ok(edit.ranges[0].start > protectedText.length);
  for (const tag of ["code", "pre", "textarea", "svg"]) {
    const markup = `<${tag}>${protectedText}</${tag}><b>Hello ,  world...</b>`;
    assert.equal(
      instance.html(markup, { detailed: true }).result,
      `<${tag}>${protectedText}</${tag}><b>Hello, world…</b>`,
    );
    assert.deepEqual(instance.html(markup, { detailed: true }).warnings, []);
    const tree = [
      h(tag, { key: "p" }, protectedText),
      h("b", { key: "b" }, "Hello ,  world..."),
    ];
    const result = transformReact(tree, { instance, detailed: true });
    assert.equal(result.result[0].props.children, protectedText);
    assert.equal(result.result[1].props.children, "Hello, world…");
    assert.deepEqual(result.warnings, []);
  }
  for (const tag of ["br", "wbr", "hr", "img"]) {
    assert.equal(instance.html(`Hello <${tag}>,world`), `Hello <${tag}>,world`);
    assert.equal(instance.html(`¿<${tag}> Hola`), `¿<${tag}> Hola`);
    assert.equal(instance.html(`.<${tag}>..`), `.<${tag}>..`);
  }
  assert.equal(
    instance.html("<b>Hello </b><div>,world</div>"),
    "<b>Hello </b><div>,world</div>",
  );
});

test("bounded generated inputs are idempotent and whole-input protection is identity", () => {
  // Fixed seed makes failures reproducible. Literal corpus above supplies the
  // stronger language oracle; this probes interactions between those constructs.
  let seed = 4301;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  const parts = [
    "alpha",
    "ñ",
    "é",
    "1",
    "2",
    ",",
    ":",
    "!",
    "?",
    ".",
    "...",
    "....",
    "¿",
    "¡",
    "(",
    ")",
    "[",
    "]",
    " ",
    "  ",
    "\n",
    "\r\n",
    "\t",
    "\u00a0",
  ];
  for (const locale of [enGb, esEs]) {
    const instance = createPuncta({ locales: [locale], locale: locale.id });
    for (let sample = 0; sample < 10000; sample++) {
      let input = "";
      for (
        let token = 0, length = Math.floor(random() * 15);
        token < length;
        token++
      )
        input += parts[Math.floor(random() * parts.length)];
      const once = instance.text(input, { detailed: true });
      const twice = instance.text(once.result, { detailed: true });
      assert.equal(
        twice.result,
        once.result,
        `${locale.id}: ${JSON.stringify(input)}`,
      );
      assert.deepEqual(twice.edits, [], JSON.stringify(input));
      assert.deepEqual(twice.appliedRules, []);
      const protectedResult = instance.text(input, {
        protect: [{ start: 0, end: input.length }],
        detailed: true,
      });
      assert.equal(protectedResult.result, input);
      assert.deepEqual(protectedResult.edits, []);
      assert.deepEqual(protectedResult.warnings, []);
    }
  }
});

test("interior spaces after protection collapse without treating opaque content as indentation", async () => {
  const { createElement: h } = await import("react");
  const { transformReact } = await import(
    "../packages/with-react/dist/pure.mjs"
  );
  const instance = createPuncta({ locales: [enGb], locale: "en-gb" });
  assert.equal(
    instance.text("Visit https://example.org  today"),
    "Visit https://example.org today",
  );
  assert.equal(
    instance.text("word  next", { protect: [{ start: 0, end: 4 }] }),
    "word next",
  );
  assert.equal(
    instance.text("word\n  next", { protect: [{ start: 0, end: 4 }] }),
    "word\n  next",
  );
  for (const props of [
    {},
    { "data-puncta": "off" },
    { "data-puncta-options": '{"rules":{"spaces":{"enabled":false}}}' },
  ]) {
    const tag = Object.keys(props).length ? "span" : "code";
    const attributes = Object.entries(props)
      .map(([key, value]) => ` ${key}='${value}'`)
      .join("");
    const input = `<${tag}${attributes}>word</${tag}>  next`;
    assert.ok(instance.html(input).endsWith(`</${tag}> next`), input);
    const tree = [h(tag, { key: "p", ...props }, "word"), "  next"];
    assert.equal(transformReact(tree, { instance })[1], " next");
  }
  assert.equal(
    instance.html('<span data-puncta="">  alpha  beta</span>'),
    '<span data-puncta="">  alpha beta</span>',
  );
  assert.equal(
    instance.html("<code>word</code>\n  next"),
    "<code>word</code>\n  next",
  );
  assert.equal(
    instance.html("<code>word</code><p>  next  word</p>"),
    "<code>word</code><p>  next word</p>",
  );
});
