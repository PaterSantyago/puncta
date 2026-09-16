import assert from "node:assert/strict";
import { test } from "node:test";
import { Fragment, createElement as h, Suspense } from "react";
import { renderToString } from "../examples/ssr/node_modules/react-dom/server.node.js";
import { createPuncta } from "../packages/core/dist/index.mjs";
import { enGb } from "../packages/with-en-gb/dist/index.mjs";
import { esEs } from "../packages/with-es-es/dist/index.mjs";
import { transformReact } from "../packages/with-react/dist/pure.mjs";

for (const locale of [enGb, esEs]) {
  const instance = createPuncta({ locales: [locale], locale: locale.id });
  test(`${locale.id}: HTML recognises one ellipsis through inline leaves and comments`, () => {
    const report = instance.html("<b>.</b><!-- keep --><em>.</em>.", {
      detailed: true,
    });
    assert.equal(report.result, "<b>…</b><!-- keep --><em></em>");
    assert.deepEqual(report.sources, [
      { id: 0, text: ".", path: [0, 0] },
      { id: 1, text: ".", path: [2, 0] },
      { id: 2, text: ".", path: [3] },
    ]);
    assert.equal(report.edits.length, 1);
    assert.deepEqual(report.edits[0].ranges, [
      {
        sourceId: 0,
        start: 0,
        end: 1,
        inputRange: { accuracy: "exact", start: 3, end: 4 },
      },
      {
        sourceId: 1,
        start: 0,
        end: 1,
        inputRange: { accuracy: "exact", start: 25, end: 26 },
      },
      {
        sourceId: 2,
        start: 0,
        end: 1,
        inputRange: { accuracy: "exact", start: 31, end: 32 },
      },
    ]);
    assert.deepEqual(report.edits[0].ruleIds, ["ellipsis"]);
    assert.equal(report.edits[0].before, "...");
    assert.equal(report.edits[0].after, "…");
    assert.equal(instance.html("..<i>..</i>"), "..<i>..</i>");
  });
}

test("React arrays and Fragment share text while preserving empty elements and props", () => {
  const instance = createPuncta({ locales: [enGb], locale: "en-gb" });
  const ref = { current: null };
  const tree = [
    h("b", { key: "b", ref, title: "...", "data-id": 7 }, "."),
    null,
    false,
    "",
    h(Fragment, { key: "fragment" }, [".", h("em", { key: "em" }, ".")]),
  ];
  const report = transformReact(tree, { instance, detailed: true });
  assert.equal(
    renderToString(report.result),
    '<b title="..." data-id="7">…</b><em></em>',
  );
  assert.equal(report.result[0].key, "b");
  assert.equal(report.result[0].type, "b");
  assert.equal(report.result[0].props.ref, ref);
  assert.equal(report.result[4].props.children[1].props.children, "");
  assert.deepEqual(report.edits[0].ranges, [
    { sourceId: 0, start: 0, end: 1 },
    { sourceId: 2, start: 0, end: 1 },
    { sourceId: 3, start: 0, end: 1 },
  ]);
  assert.deepEqual(
    report.sources.map((source) => source.path),
    [[0, "children"], [3], [4, "children", 0], [4, "children", 1, "children"]],
  );
  assert.equal(tree[0].props.children, ".");
  assert.deepEqual(
    transformReact([24, 42n, ".", null, undefined, true, ".."], { instance }),
    [24, 42n, "…", null, undefined, true, ""],
  );
});

test("HTML provenance maps entities, CRLF and astral characters before and inside edits", () => {
  const instance = createPuncta({ locales: [enGb], locale: "en-gb" });
  const report = instance.html("<b>😀&amp;\r\n&#46;</b>&period;.", {
    detailed: true,
  });
  assert.equal(report.result, "<b>😀&amp;\n…</b>");
  assert.deepEqual(report.sources, [
    { id: 0, text: "😀&\n.", path: [0, 0] },
    { id: 1, text: "..", path: [1] },
  ]);
  assert.deepEqual(report.edits[0].ranges, [
    {
      sourceId: 0,
      start: 4,
      end: 5,
      inputRange: { accuracy: "exact", start: 12, end: 17 },
    },
    {
      sourceId: 1,
      start: 0,
      end: 2,
      inputRange: { accuracy: "exact", start: 21, end: 30 },
    },
  ]);
  // A multi-character entity before an edit changes decoded offsets, not ownership.
  const multiple = instance.html("<i>&fjlig;...</i>", { detailed: true });
  assert.equal(multiple.result, "<i>fj…</i>");
  assert.deepEqual(multiple.edits[0].ranges, [
    {
      sourceId: 0,
      start: 2,
      end: 5,
      inputRange: { accuracy: "exact", start: 10, end: 13 },
    },
  ]);
});

test("structural and textual boundaries stop ellipsis without adding output characters", () => {
  const instance = createPuncta({ locales: [enGb], locale: "en-gb" });
  for (const tag of ["div", "p", "li", "h1", "title"]) {
    assert.equal(instance.html(`.<${tag}>..</${tag}>`), `.<${tag}>..</${tag}>`);
    const tree = [".", h(tag, { key: tag }, "..")];
    assert.deepEqual(transformReact(tree, { instance }), tree);
  }
  assert.equal(
    instance.html("<table><tr><td>.</td><td>..</td></tr></table>"),
    "<table><tbody><tr><td>.</td><td>..</td></tr></tbody></table>",
  );
  for (const tag of ["br", "wbr", "hr", "img"]) {
    assert.equal(instance.html(`.<${tag}>..`), `.<${tag}>..`);
    const tree = [".", h(tag, { key: tag }), ".."];
    assert.deepEqual(transformReact(tree, { instance }), tree);
  }
  for (const newline of ["\n", "\r", "\r\n", "\n\n", "\r\n \t\r\n"]) {
    assert.equal(instance.text(`.${newline}..`), `.${newline}..`);
    assert.deepEqual(transformReact([".", newline, ".."], { instance }), [
      ".",
      newline,
      "..",
    ]);
  }
  for (const tag of [
    "code",
    "pre",
    "textarea",
    "svg",
    "math",
    "custom-widget",
  ]) {
    const input = `.<${tag}>...</${tag}>..`;
    assert.equal(instance.html(input), input);
    const tree = [".", h(tag, { key: tag }, "..."), ".."];
    assert.deepEqual(transformReact(tree, { instance }), tree);
  }
});

test("opaque React nodes are retained without invoking, awaiting or iterating them", async () => {
  const instance = createPuncta({ locales: [enGb], locale: "en-gb" });
  const { createPortal } = await import(
    "../examples/ssr/node_modules/react-dom/index.js"
  );
  const Component = () => {
    throw new Error("must not invoke");
  };
  const iterable = {
    [Symbol.iterator]() {
      throw new Error("must not iterate");
    },
  };
  const promise = new Promise(() => {});
  const portal = createPortal("...", { nodeType: 1 });
  for (const node of [
    h(Component, { key: "component" }),
    iterable,
    promise,
    portal,
  ]) {
    const result = transformReact([".", node, ".."], {
      instance,
      detailed: true,
    });
    assert.equal(result.result[1], node);
    assert.equal(result.hasEdits, false);
    assert.deepEqual(result.warnings, []);
    assert.deepEqual(
      result.sources.map((source) => source.path),
      [[0], [2]],
    );
  }
});

test("Suspense content and fallback have separate source addresses and recognition contexts", () => {
  const instance = createPuncta({ locales: [enGb], locale: "en-gb" });
  const tree = [
    ".",
    h(
      Suspense,
      { key: "s", fallback: h("i", null, "...") },
      h("b", null, "..."),
    ),
    "..",
  ];
  const report = transformReact(tree, { instance, detailed: true });
  assert.equal(report.result[0], ".");
  assert.equal(report.result[2], "..");
  assert.equal(report.result[1].props.children.props.children, "…");
  assert.equal(report.result[1].props.fallback.props.children, "…");
  assert.deepEqual(
    report.sources.map((source) => source.path),
    [[0], [1, "children", "children"], [1, "fallback", "children"], [2]],
  );
  assert.equal(renderToString(report.result), ".<!--$--><b>…</b><!--/$-->..");
});

test("parser-repaired noncontiguous text reports unavailable input provenance honestly", () => {
  const instance = createPuncta({ locales: [enGb], locale: "en-gb" });
  const report = instance.html("<table>.<tr><td>x</td></tr>..</table>", {
    detailed: true,
  });
  assert.equal(
    report.result,
    "…<table><tbody><tr><td>x</td></tr></tbody></table>",
  );
  assert.deepEqual(report.sources, [
    { id: 0, text: "...", path: [0] },
    { id: 1, text: "x", path: [1, 0, 0, 0, 0] },
  ]);
  assert.equal(report.edits[0].ranges[0].inputRange.accuracy, "unavailable");
  assert.ok(report.edits[0].ranges[0].inputRange.reason);
});

test("all two-way splits preserve Unicode, dot-run length and three-representation equivalence", () => {
  const instance = createPuncta({ locales: [enGb], locale: "en-gb" });
  // Fixed independent literals; splits include surrogate pairs and combining sequences.
  for (const [input, expected] of [
    ["...", "…"],
    ["....", "...."],
    [".....", "....."],
    ["e\u0301...", "e\u0301…"],
    ["😀...", "😀…"],
    ["... ...", "… …"],
  ]) {
    assert.equal(instance.text(input), expected);
    for (let at = 0; at <= input.length; at++) {
      const left = input.slice(0, at);
      const right = input.slice(at);
      const tree = [
        h("b", { key: "left" }, left),
        h("em", { key: "right" }, right),
      ];
      const report = transformReact(tree, { instance, detailed: true });
      const actualLeft = report.result[0].props.children;
      const actualRight = report.result[1].props.children;
      assert.equal(actualLeft + actualRight, expected);
      assert.equal(
        instance.html(`<b>${left}</b><em>${right}</em>`),
        `<b>${actualLeft}</b><em>${actualRight}</em>`,
      );
      assert.deepEqual(
        transformReact(report.result, { instance, detailed: true }).edits,
        [],
      );
      assert.deepEqual(
        instance.html(`<b>${actualLeft}</b><em>${actualRight}</em>`, {
          detailed: true,
        }).edits,
        [],
      );
    }
  }
});

test("static React siblings do not gain key warnings after transformation", () => {
  const instance = createPuncta({ locales: [enGb], locale: "en-gb" });
  const tree = [
    h(
      Fragment,
      { key: "f" },
      null,
      false,
      h("span", null, "..."),
      undefined,
      true,
    ),
  ];
  const errors = [];
  const original = console.error;
  console.error = (...args) => errors.push(args);
  try {
    assert.equal(renderToString(tree), "<span>...</span>");
    assert.equal(
      renderToString(transformReact(tree, { instance })),
      "<span>…</span>",
    );
  } finally {
    console.error = original;
  }
  assert.deepEqual(errors, []);
});

test("standard slot fallback is available inline text in HTML and React", () => {
  const instance = createPuncta({ locales: [enGb], locale: "en-gb" });
  assert.equal(instance.html(".<slot>.</slot>."), "…<slot></slot>");
  const report = transformReact([".", h("slot", { key: "slot" }, "."), "."], {
    instance,
    detailed: true,
  });
  assert.equal(report.result[0], "…");
  assert.equal(report.result[1].props.children, "");
  assert.equal(report.result[2], "");
});
