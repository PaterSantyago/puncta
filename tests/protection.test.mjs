import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createPuncta,
  PunctaConfigError,
} from "../packages/core/dist/index.mjs";
import { enGb } from "../packages/with-en-gb/dist/index.mjs";
import { esEs } from "../packages/with-es-es/dist/index.mjs";

const instance = createPuncta({ locales: [enGb, esEs], locale: "en-gb" });

test("plain protection uses original UTF-16 ranges, merges without mutation and ignores empty ranges", () => {
  const protect = Object.freeze([
    Object.freeze({ start: 10, end: 12 }),
    Object.freeze({ start: 8, end: 11 }),
    Object.freeze({ start: 7, end: 8 }),
  ]);
  const report = instance.text("😀... x... y...", { protect, detailed: true });
  assert.equal(report.result, "😀… x... y…");
  assert.deepEqual(
    report.edits.map((edit) => edit.ranges),
    [
      [{ sourceId: 0, start: 2, end: 5 }],
      [{ sourceId: 0, start: 12, end: 15 }],
    ],
  );
  assert.deepEqual(report.warnings, []);
  assert.equal(instance.text("...", { protect: [{ start: 1, end: 1 }] }), "…");
  assert.equal(
    instance.text("..X.", { protect: [{ start: 2, end: 3 }] }),
    "..X.",
  );
  assert.equal(
    instance.text(".....", { protect: [{ start: 3, end: 5 }] }),
    "…..",
  );
});

test("invalid protection fails even when processing is disabled", () => {
  for (const [source, range] of [
    ["...", { start: -1, end: 1 }],
    ["...", { start: 2, end: 1 }],
    ["...", { start: 0, end: 4 }],
    ["...", { start: 0.5, end: 1 }],
    ["...", { start: 0, end: Infinity }],
    ["...", { start: "0", end: 1 }],
    ["...", { start: 0 }],
    ["...", null],
    ["😀...", { start: 1, end: 1 }],
    ["é...", { start: 0, end: 1 }],
    ["👩‍👩‍👧‍👦...", { start: 2, end: 11 }],
    ["🇬🇧...", { start: 0, end: 2 }],
    ["\r\n...", { start: 1, end: 2 }],
  ]) {
    for (const enabled of [true, false]) {
      assert.throws(
        () => instance.text(source, { protect: [range], enabled }),
        (error) => {
          assert.ok(error instanceof PunctaConfigError);
          assert.equal(error.code, "protect.invalid-range");
          assert.deepEqual(error.optionPath, ["protect", 0]);
          return true;
        },
      );
    }
  }
  for (const protect of [null, {}, "all", 4])
    assert.throws(() => instance.text("...", { protect }), {
      code: "config.invalid-option",
      optionPath: ["protect"],
    });
});

test("recognised technical spans are opaque across transparent inline joins, Markdown is ordinary text", async () => {
  const { createElement: h } = await import("react");
  const { transformReact } = await import(
    "../packages/with-react/dist/pure.mjs"
  );
  const { renderToStaticMarkup } = await import(
    "../examples/ssr/node_modules/react-dom/server.node.js"
  );
  for (const token of [
    "https://example.org/a...b",
    "www.example.org/a...b",
    "ftp://example.org/a...b",
    "mailto:one@example.org",
    "urn:example:a...b",
    "one+tag@example.org",
    "192.168.1.2",
    "2001:db8::1",
    "v1.2.3",
  ]) {
    assert.equal(instance.text(`${token} ...`), `${token} …`);
    for (let split = 1; split < token.length; split++) {
      const left = token.slice(0, split);
      const right = token.slice(split);
      const report = instance.html(`${left}<em>${right}</em> ...`, {
        detailed: true,
      });
      assert.equal(report.result, `${left}<em>${right}</em> …`);
      assert.equal(report.edits.length, 1);
      assert.deepEqual(report.warnings, []);
      assert.equal(
        renderToStaticMarkup(
          transformReact([left, h("em", { key: "part" }, right), " ..."], {
            instance,
          }),
        ),
        report.result,
      );
    }
  }
  assert.equal(
    instance.text("`a...b` file...txt [x...](path)"),
    "`a…b` file…txt [x…](path)",
  );
  assert.equal(
    instance.text("https://x...y ...", { protect: [{ start: 8, end: 9 }] }),
    "https://x…y …",
  );
});

test("hidden and editable hosts protect before declarative configuration; aria-hidden alone does not", async () => {
  const { createElement: h } = await import("react");
  const { transformReact } = await import(
    "../packages/with-react/dist/pure.mjs"
  );
  for (const [htmlAttribute, props] of [
    ["hidden", { hidden: true }],
    ['hidden="until-found"', { hidden: "until-found" }],
    ['hidden="false"', { hidden: "false" }],
    ['contenteditable=""', { contentEditable: "" }],
    ['contenteditable="true"', { contentEditable: true }],
    ['contenteditable="TRUE"', { contentEditable: "TRUE" }],
    ['contenteditable="plaintext-only"', { contentEditable: "plaintext-only" }],
  ]) {
    const html = `<span ${htmlAttribute} data-puncta-options="broken"><b data-puncta="" contenteditable="false">...</b></span><i>...</i>`;
    const report = instance.html(html, { detailed: true });
    assert.ok(report.result.endsWith(">...</b></span><i>…</i>"));
    assert.deepEqual(
      report.sources.map((source) => source.text),
      ["..."],
    );
    assert.deepEqual(report.warnings, []);
    const child = h(
      "b",
      { "data-puncta-options": "broken", contentEditable: false },
      "...",
    );
    const tree = h(
      "span",
      { ...props, "data-puncta-options": "broken" },
      child,
    );
    const reactReport = transformReact([tree, "..."], {
      instance,
      detailed: true,
    });
    assert.equal(reactReport.result[0].props.children, child);
    assert.equal(reactReport.result[1], "…");
    assert.deepEqual(reactReport.warnings, []);
  }
  for (const [htmlAttribute, props] of [
    ['aria-hidden="true"', { "aria-hidden": true }],
    ['contenteditable="false"', { contentEditable: false }],
    ["", { hidden: false }],
  ]) {
    assert.equal(
      instance.html(`<span ${htmlAttribute}>...</span>`).includes("…"),
      true,
    );
    assert.equal(
      transformReact(h("span", props, "..."), { instance }).props.children,
      "…",
    );
  }
});

test("the complete protected catalog, namespaces, fields and attributes remain untouched", async () => {
  const { createElement: h } = await import("react");
  const { transformReact } = await import(
    "../packages/with-react/dist/pure.mjs"
  );
  const protectedTags =
    "code pre script style kbd samp textarea select input option optgroup datalist template noscript svg math ruby iframe object embed canvas audio video".split(
      " ",
    );
  for (const tag of protectedTags) {
    const props = {
      title: "...",
      "data-puncta-options": "broken",
      value: "...",
    };
    const child = h("span", { "data-puncta-locale": "invalid" }, "...");
    const tree = h(tag, props, child);
    const report = transformReact(
      ["..", tree, ". ", h("button", { key: "button", title: "..." }, "...")],
      { instance, detailed: true },
    );
    assert.equal(report.result[0], "..");
    assert.equal(report.result[1].props.children, child);
    assert.equal(report.result[1].props.value, "...");
    assert.equal(report.result[1].props.title, "...");
    assert.equal(report.result[2], ". ");
    assert.equal(report.result[3].props.children, "…");
    assert.deepEqual(report.warnings, []);
    const input = ["input", "embed"].includes(tag)
      ? `<${tag} value="..." title="..." data-puncta-options="broken">`
      : `<${tag} title="..." data-puncta-options="broken">...</${tag}>`;
    const htmlReport = instance.html(`${input}<label title="...">...</label>`, {
      detailed: true,
    });
    assert.ok(htmlReport.result.endsWith('<label title="...">…</label>'), tag);
    assert.equal(htmlReport.edits.length, 1, tag);
    assert.deepEqual(htmlReport.warnings, [], tag);
  }
  assert.equal(
    instance.html(
      '<svg><title>...</title><foreignObject><div data-puncta="">...</div></foreignObject></svg><title>...</title>',
    ),
    '<svg><title>...</title><foreignObject><div data-puncta="">...</div></foreignObject></svg><title>…</title>',
  );
  assert.equal(
    instance.html(
      '<math><annotation-xml encoding="text/html"><div>...</div></annotation-xml></math><button>...</button>',
    ),
    '<math><annotation-xml encoding="text/html"><div>...</div></annotation-xml></math><button>…</button>',
  );
});

test("unknown elements warn once at each original element and never inspect descendants", async () => {
  const { createElement: h } = await import("react");
  const { transformReact } = await import(
    "../packages/with-react/dist/pure.mjs"
  );
  const report = instance.html(
    '<x-card><strange lang="xx">...</strange></x-card><x-card>...</x-card><i>...</i>',
    { detailed: true },
  );
  assert.equal(
    report.result,
    '<x-card><strange lang="xx">...</strange></x-card><x-card>...</x-card><i>…</i>',
  );
  assert.equal(report.warnings.length, 2);
  assert.deepEqual(
    report.warnings.map(({ code, details, location }) => ({
      code,
      details,
      location,
    })),
    [
      {
        code: "markup.element-unsupported",
        details: {
          tagName: "x-card",
          namespace: "http://www.w3.org/1999/xhtml",
        },
        location: {
          kind: "element",
          path: [0],
          inputRange: { accuracy: "exact", start: 0, end: 49 },
        },
      },
      {
        code: "markup.element-unsupported",
        details: {
          tagName: "x-card",
          namespace: "http://www.w3.org/1999/xhtml",
        },
        location: {
          kind: "element",
          path: [1],
          inputRange: { accuracy: "exact", start: 49, end: 69 },
        },
      },
    ],
  );
  const child = h("strange", { lang: "xx" }, "...");
  const tree = [
    h("x-card", { key: "a" }, child),
    h("x-card", { key: "b" }, "..."),
  ];
  const reactReport = transformReact(tree, { instance, detailed: true });
  assert.equal(reactReport.result[0].props.children, child);
  assert.deepEqual(reactReport.sources, []);
  assert.deepEqual(
    reactReport.warnings.map((warning) => warning.location),
    [
      { kind: "element", path: [0] },
      { kind: "element", path: [1] },
    ],
  );
  assert.deepEqual(
    instance.html("<code><x-card>...</x-card></code>", { detailed: true })
      .warnings,
    [],
  );
  assert.equal(
    instance
      .html("<x-card/>", { detailed: true })
      .warnings.filter(
        (warning) => warning.code === "markup.element-unsupported",
      ).length,
    1,
  );
});

test("protection never reads descendant props, including a disabled React root", async () => {
  const { createElement: h, Suspense } = await import("react");
  const { transformReact } = await import(
    "../packages/with-react/dist/pure.mjs"
  );
  const { Puncta, PunctaProvider } = await import(
    "../packages/with-react/dist/index.mjs"
  );
  const { renderToString } = await import(
    "../examples/ssr/node_modules/react-dom/server.node.js"
  );
  const opaque = { ...h("span", null, "...") };
  Object.defineProperty(opaque, "props", {
    get() {
      throw new Error("Protected props read");
    },
  });
  for (const tag of ["code", "span"]) {
    const report = transformReact(h(tag, { "data-puncta": "off" }, opaque), {
      instance,
      detailed: true,
    });
    assert.equal(report.result.props.children, opaque);
    assert.deepEqual(report.sources, []);
    assert.deepEqual(report.warnings, []);
  }
  for (const child of [opaque, h(Suspense, { fallback: opaque }, opaque)]) {
    const report = transformReact(child, {
      instance,
      enabled: false,
      detailed: true,
    });
    assert.equal(report.result, child);
    assert.deepEqual(report.sources, []);
  }
  function Card() {
    return h(Puncta, { enabled: true }, "Inside...");
  }
  for (const Component of [Puncta, PunctaProvider]) {
    for (const props of [
      { hidden: true },
      { contentEditable: true },
      { "data-puncta": "off" },
    ]) {
      const output = renderToString(
        h(
          Component,
          { instance },
          h(
            "div",
            { ...props, suppressContentEditableWarning: true },
            h("span", null, h(Card)),
          ),
          h(Puncta, null, "Outside..."),
        ),
      );
      assert.ok(output.includes("Inside..."));
      assert.ok(output.endsWith("Outside…"));
    }
    assert.equal(
      renderToString(h(Component, { instance, enabled: false }, h(Card))),
      "Inside...",
    );
    assert.throws(
      () =>
        renderToString(
          h(
            Component,
            { instance, enabled: false },
            h(Puncta, { locale: "xx" }, "..."),
          ),
        ),
      { code: "locale.unavailable" },
    );
  }
  // An external host does not participate in Puncta's input or Context.
  assert.equal(
    renderToString(
      h("code", { lang: "xx" }, h(Puncta, { instance }, "Outside...")),
    ),
    '<code lang="xx">Outside…</code>',
  );
});

test("protection spans preserve arbitrary grapheme payloads and do not create cross-gap edits", () => {
  for (const payload of [
    "...",
    "😀...",
    "é...",
    "👩‍👩‍👧‍👦...",
    "🇬🇧...",
    "\r\n...",
    "\u00ad...",
  ]) {
    for (let prefixLength = 0; prefixLength <= 12; prefixLength++) {
      const prefix = "x".repeat(prefixLength);
      const source = `${prefix}... ${payload} ...`;
      const start = prefix.length + 4;
      const report = instance.text(source, {
        protect: [{ start, end: start + payload.length }],
        detailed: true,
      });
      assert.equal(report.result, `${prefix}… ${payload} …`);
      assert.equal(report.edits.length, 2);
      assert.ok(
        report.edits.every((edit) =>
          edit.ranges.every(
            (range) =>
              range.end <= start || range.start >= start + payload.length,
          ),
        ),
      );
      assert.deepEqual(report.warnings, []);
    }
  }
});

test("quoted email local parts protect actual ellipses across inline nodes", async () => {
  const { createElement: h } = await import("react");
  const { transformReact } = await import(
    "../packages/with-react/dist/pure.mjs"
  );
  assert.equal(
    instance.text('"a...b"@example.org ...'),
    '"a...b"@example.org …',
  );
  assert.equal(
    instance.html('"a.<em>..b"@example.org</em> ...'),
    '"a.<em>..b"@example.org</em> …',
  );
  const report = transformReact(
    ['"a.', h("em", { key: "mail" }, '..b"@example.org'), " ..."],
    { instance, detailed: true },
  );
  assert.equal(report.result[0], '"a.');
  assert.equal(report.result[1].props.children, '..b"@example.org');
  assert.equal(report.result[2], " …");
  assert.equal(report.edits.length, 1);
});

test("protection arguments remain exclusive to plain text at runtime", async () => {
  const { transformReact } = await import(
    "../packages/with-react/dist/pure.mjs"
  );
  for (const protect of [undefined, [], [{ start: 0, end: 3 }], null]) {
    for (const invoke of [
      () => instance.with({ protect }),
      () => instance.html("...", { protect }),
      () => transformReact("...", { instance, protect }),
    ])
      assert.throws(invoke, {
        code: "config.invalid-option",
        optionPath: ["protect"],
        details: { reason: "unknown" },
      });
  }
});
