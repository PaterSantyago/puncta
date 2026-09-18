import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement as h, Fragment } from "react";
import { renderToString } from "../examples/ssr/node_modules/react-dom/server.node.js";
import { createPuncta } from "../packages/core/dist/index.mjs";
import { enGb } from "../packages/with-en-gb/dist/index.mjs";
import { esEs } from "../packages/with-es-es/dist/index.mjs";
import { Puncta, PunctaProvider } from "../packages/with-react/dist/index.mjs";
import { transformReact } from "../packages/with-react/dist/pure.mjs";

const base = createPuncta({ locales: [enGb, esEs], locale: "en-gb" });
const grouped = base.with({ rules: { digitGrouping: { enabled: true } } });

for (const locale of ["en-gb", "es-es"]) {
  test(`${locale}: numeric leaves use String(value) without losing bigint precision`, () => {
    const instance = grouped.with({ locale });
    for (const [source, expected] of [
      [12345, "12\u202f345"],
      [
        123456789012345678901234567890n,
        "123\u202f456\u202f789\u202f012\u202f345\u202f678\u202f901\u202f234\u202f567\u202f890",
      ],
      [12345.67, "12\u202f345.67"],
      [1e21, 1e21],
      [1e-7, 1e-7],
      [1234, 1234],
      [1234n, 1234n],
      [-0, -0],
    ]) {
      const report = transformReact(source, { instance, detailed: true });
      assert.equal(report.result, expected);
      assert.equal(typeof report.result, typeof expected);
      assert.deepEqual(report.sources, [
        { id: 0, text: String(source), path: [] },
      ]);
      assert.equal(report.hasEdits, typeof expected === "string");
      assert.deepEqual(report.warnings, []);
      assert.equal(
        renderToString(h(Puncta, { instance }, source)),
        String(expected),
      );
      assert.equal(transformReact(source, { instance: base }), source);
    }
  });
}

test("numeric transparent seams preserve original types, keys and refs when their text stays unchanged", () => {
  const ref = { current: null };
  const leaf = h("em", { key: "digits", ref, title: "12345" }, 345n);
  const input = [12, leaf];
  const result = transformReact(input, { instance: grouped });
  assert.equal(result[0], "12\u202f");
  assert.equal(result[1].props.children, 345n);
  assert.equal(result[1].key, leaf.key);
  assert.equal(result[1].props.ref, ref);
  assert.equal(result[1].props.title, "12345");
  assert.equal(input[0], 12);
  assert.equal(leaf.props.children, 345n);
  const fragments = h(Fragment, null, 12n, h("em", null, 345));
  assert.equal(
    renderToString(transformReact(fragments, { instance: grouped })),
    "12\u202f<em>345</em>",
  );
  assert.equal(
    renderToString(h(Puncta, { instance: grouped }, fragments)),
    "12\u202f<em>345</em>",
  );
});

test("pure numeric processing is independent of Context and stops at opaque and protected content", () => {
  function Opaque() {
    return h("i", null, 345);
  }
  const opaque = h(Opaque);
  const result = transformReact([12, opaque, 678], { instance: grouped });
  assert.equal(result[0], 12);
  assert.equal(result[1], opaque);
  assert.equal(result[2], 678);
  assert.equal(
    renderToString(
      h(
        PunctaProvider,
        { instance: grouped },
        transformReact(h("b", null, 12345), { instance: base }),
      ),
    ),
    "<b>12345</b>",
  );
  assert.equal(
    renderToString(
      h(
        PunctaProvider,
        { instance: base },
        transformReact(h("b", null, 12345), { instance: grouped }),
      ),
    ),
    "<b>12\u202f345</b>",
  );
  assert.equal(
    renderToString(
      h(
        Puncta,
        { instance: grouped },
        h("code", null, 12345n),
        h(
          "span",
          { "data-puncta": "off" },
          h(Puncta, { enabled: true }, 12345),
        ),
      ),
    ),
    '<code>12345</code><span data-puncta="off">12345</span>',
  );
});
