import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement as h, Fragment } from "react";
import { renderToString } from "../examples/ssr/node_modules/react-dom/server.node.js";
import { parseFragment } from "../packages/core/node_modules/parse5/dist/index.js";
import {
  createPuncta,
  PunctaConfigError,
} from "../packages/core/dist/index.mjs";
import { enGb } from "../packages/with-en-gb/dist/index.mjs";
import { esEs } from "../packages/with-es-es/dist/index.mjs";
import { Puncta, PunctaProvider } from "../packages/with-react/dist/index.mjs";
import {
  transformReact,
  stripSoftHyphensReact,
} from "../packages/with-react/dist/pure.mjs";

const base = createPuncta({ locales: [enGb, esEs], locale: "en-gb" });
const grouped = base.with({ rules: { digitGrouping: { enabled: true } } });
const options = (digitGrouping) => ({ rules: { digitGrouping } });
const attrs = (patch) => ({ "data-puncta-options": JSON.stringify(patch) });
const markup = (patch, children) =>
  `<span data-puncta-options='${JSON.stringify(patch)}'>${children}</span>`;
function textOf(html) {
  const visit = (node) =>
    node.nodeName === "#text"
      ? node.value
      : (node.childNodes ?? []).map(visit).join("");
  return visit(parseFragment(html));
}
function replay(report) {
  const values = report.sources.map((source) => source.text);
  for (const edit of [...report.edits].reverse()) {
    assert.equal(
      edit.before,
      edit.ranges
        .map(({ sourceId, start, end }) =>
          report.sources[sourceId].text.slice(start, end),
        )
        .join(""),
    );
    for (let i = edit.ranges.length - 1; i >= 0; i--) {
      const { sourceId, start, end } = edit.ranges[i];
      assert.ok(
        start >= 0 &&
          end >= start &&
          end <= report.sources[sourceId].text.length,
      );
      values[sourceId] =
        values[sourceId].slice(0, start) +
        (i === 0 ? edit.after : "") +
        values[sourceId].slice(end);
    }
  }
  return values;
}

for (const locale of ["en-gb", "es-es"]) {
  test(`${locale}: every configuration surface preserves explicit values and resets to locale defaults`, () => {
    const instance = createPuncta({
      locales: [enGb, esEs],
      locale,
      ...options({ enabled: true, minDigits: 4, normalizeExisting: false }),
    });
    for (const [patch, expected] of [
      [{}, "1\u202f234; 12 345; 12\u202f345"],
      [
        options({ minDigits: undefined, normalizeExisting: undefined }),
        "1\u202f234; 12 345; 12\u202f345",
      ],
      [
        options({ minDigits: null, normalizeExisting: null }),
        "1234; 12\u202f345; 12\u202f345",
      ],
      [options(null), "1234; 12 345; 12345"],
      [options({ enabled: null }), "1234; 12 345; 12345"],
    ]) {
      const input = "1234; 12 345; 12345";
      assert.equal(instance.with(patch).text(input), expected);
      assert.equal(instance.text(input, patch), expected);
      assert.equal(textOf(instance.html(input, patch)), expected);
      assert.equal(textOf(instance.html(markup(patch, input))), expected);
      const child = h("span", attrs(patch), input);
      assert.equal(
        textOf(renderToString(transformReact(child, { instance }))),
        expected,
      );
      assert.equal(
        textOf(renderToString(transformReact(input, { instance, ...patch }))),
        expected,
      );
      assert.equal(
        textOf(
          renderToString(
            h(
              PunctaProvider,
              { instance },
              h(Puncta, { options: patch }, input),
            ),
          ),
        ),
        expected,
      );
      assert.equal(
        textOf(renderToString(h(Puncta, { instance, options: patch }, input))),
        expected,
      );
    }
    const paused = instance.with(options({ enabled: false }));
    assert.equal(
      paused
        .with({ locale: locale === "en-gb" ? "es-es" : "en-gb" })
        .text("1234; 12 345", options({ enabled: true })),
      "1\u202f234; 12 345",
    );
    assert.throws(
      () => instance.with({ rules: null }),
      (error) =>
        error.code === "config.invalid-option" &&
        error.optionPath.join(".") === "rules",
    );
  });

  test(`${locale}: nested host and component scopes re-enable saved fields and reset the whole group`, () => {
    const instance = base.with({
      locale,
      ...options({ enabled: true, minDigits: 4, normalizeExisting: false }),
    });
    const pause = options({ enabled: false });
    const resume = options({ enabled: true });
    const reset = options(null);
    const literal = "1234; 12 345";
    const html = markup(
      pause,
      `${literal}|${markup(resume, literal)}|${markup(reset, literal)}`,
    );
    const host = h(
      "span",
      attrs(pause),
      literal,
      "|",
      h("em", attrs(resume), literal),
      "|",
      h("i", attrs(reset), literal),
    );
    const component = h(
      PunctaProvider,
      { instance },
      h(
        Puncta,
        { options: pause },
        literal,
        "|",
        h(Puncta, { options: resume }, literal),
        "|",
        h(Puncta, { options: reset }, literal),
      ),
    );
    const expected = "1234; 12 345|1\u202f234; 12 345|1234; 12 345";
    assert.equal(textOf(instance.html(html)), expected);
    assert.equal(
      textOf(renderToString(transformReact(host, { instance }))),
      expected,
    );
    assert.equal(textOf(renderToString(component)), expected);
    const switched = h(
      Puncta,
      { instance },
      h(
        Puncta,
        { locale: "es-es" },
        "1234; 1,234; 12 345",
        h(
          Puncta,
          { options: options({ minDigits: null, normalizeExisting: null }) },
          "; 1234; 12 345",
        ),
      ),
    );
    assert.equal(
      textOf(renderToString(switched)),
      "1\u202f234; 1,234; 12 345; 1234; 12\u202f345",
    );
  });
}

test("disabled scopes remain inherited protection and never inspect declarative options", () => {
  const bad = options({ enabled: false, minDigits: 3 });
  for (const attributes of [
    { "data-puncta": "off" },
    { hidden: true },
    { contentEditable: true },
  ]) {
    const child = h(
      "span",
      { ...attributes, ...attrs(bad) },
      h("i", attrs(options({ enabled: true })), "12345; 12 34"),
    );
    const report = transformReact(child, { instance: grouped, detailed: true });
    assert.equal(report.result.props.children, child.props.children);
    assert.deepEqual(report.sources, []);
    assert.deepEqual(report.warnings, []);
  }
  for (const input of [
    markup(bad, "12345; 12 34"),
    `<code data-puncta-options='${JSON.stringify(bad)}'>12345; 12 34</code>`,
    `<span data-puncta='off' data-puncta-options='${JSON.stringify(bad)}'>12345; 12 34</span>`,
  ]) {
    const report = grouped.html(input, { enabled: false, detailed: true });
    assert.equal(textOf(report.result), "12345; 12 34");
    assert.deepEqual(report.sources, []);
    assert.deepEqual(report.warnings, []);
  }
  for (const wrapper of [Puncta, PunctaProvider]) {
    assert.equal(
      textOf(
        renderToString(
          h(
            wrapper,
            { instance: grouped, enabled: false },
            h(
              Puncta,
              { enabled: true, options: options({ enabled: true }) },
              "12345; 12 34",
            ),
          ),
        ),
      ),
      "12345; 12 34",
    );
  }
});

test("invalid explicit calls and running component props validate inside disabled processing", () => {
  for (const [patch, tail, reason] of [
    [{ minDigits: 3 }, ["minDigits"], "value"],
    [{ minDigits: "5" }, ["minDigits"], "type"],
    [{ normalizeExisting: 1 }, ["normalizeExisting"], "type"],
    [{ enabled: "true" }, ["enabled"], "type"],
    [{ surprise: true }, ["surprise"], "unknown"],
    [true, [], "type"],
  ]) {
    const settings = options(patch);
    for (const invoke of [
      () =>
        createPuncta({
          locales: [enGb],
          locale: "en-gb",
          enabled: false,
          ...settings,
        }),
      () => base.with({ enabled: false, ...settings }),
      () => base.text("", { enabled: false, ...settings }),
      () => base.html("", { enabled: false, ...settings }),
      () =>
        transformReact(null, { instance: base, enabled: false, ...settings }),
      () => base.stripSoftHyphens("", { enabled: false, ...settings }),
      () =>
        base.stripSoftHyphens("", {
          format: "html",
          enabled: false,
          ...settings,
        }),
      () =>
        stripSoftHyphensReact(null, {
          instance: base,
          enabled: false,
          ...settings,
        }),
      ...[Puncta, PunctaProvider].map(
        (component) => () =>
          renderToString(
            h(
              PunctaProvider,
              { instance: base, enabled: false },
              h(component, { options: settings }, "12345"),
            ),
          ),
      ),
    ])
      assert.throws(invoke, (error) => {
        assert.ok(error instanceof PunctaConfigError);
        assert.equal(error.code, "config.invalid-option");
        assert.deepEqual(error.optionPath, ["rules", "digitGrouping", ...tail]);
        assert.deepEqual(error.details, { reason });
        assert.deepEqual(error.location, {
          kind: "unavailable",
          reason: "Configuration argument",
        });
        return true;
      });
    const attribute = `data-puncta-options='${JSON.stringify(settings)}'`;
    const source = `<p>😀<span ${attribute}>12345</span></p>`;
    for (const [invoke, location] of [
      [
        () => base.html(source),
        {
          kind: "attribute",
          path: [0, 1],
          name: "data-puncta-options",
          inputRange: {
            accuracy: "exact",
            start: 11,
            end: 11 + attribute.length,
          },
        },
      ],
      [
        () =>
          transformReact(
            h("p", null, "😀", h("span", attrs(settings), "12345")),
            { instance: base },
          ),
        {
          kind: "attribute",
          path: ["children", 1],
          name: "data-puncta-options",
        },
      ],
    ])
      assert.throws(invoke, (error) => {
        assert.deepEqual(error.optionPath, ["rules", "digitGrouping", ...tail]);
        assert.equal(error.details.reason, reason);
        assert.deepEqual(error.location, location);
        return true;
      });
  }
});

test("SHY removal validates shared grouping settings without running grouping or its warnings", () => {
  const source = "ex\u00adample; 12345; 12 34";
  const expected = "example; 12345; 12 34";
  for (const report of [
    grouped.stripSoftHyphens(source, { detailed: true }),
    grouped.stripSoftHyphens(`<span>${source}</span>`, {
      format: "html",
      detailed: true,
    }),
    stripSoftHyphensReact(h("span", null, source), {
      instance: grouped,
      detailed: true,
    }),
  ]) {
    assert.equal(
      textOf(
        typeof report.result === "string"
          ? report.result
          : renderToString(report.result),
      ),
      expected,
    );
    assert.deepEqual(report.appliedRules, [
      { ruleId: "hyphenation.remove", locale: "en-gb" },
    ]);
    assert.deepEqual(report.warnings, []);
    assert.equal(replay(report).join(""), expected);
  }
});

for (const locale of ["en-gb", "es-es"]) {
  test(`${locale}: structural boundaries stop both numeric continuation and warnings`, () => {
    const instance = grouped.with({ locale });
    for (const [html, children, expected] of [
      ["12<br>345", ["12", h("br", { key: "b" }), "345"], "12345"],
      ["12<wbr>345", ["12", h("wbr", { key: "b" }), "345"], "12345"],
      ["12<div>345</div>", ["12", h("div", { key: "b" }, "345")], "12345"],
      ["12\n345", ["12", "\n", "345"], "12\n345"],
      ["12\r\n345", ["12\r", "\n345"], "12\n345"],
      [
        "12<code>34</code>345",
        ["12", h("code", { key: "b" }, "34"), "345"],
        "1234345",
      ],
      [
        '12<span data-puncta="">345</span>',
        ["12", h("span", { key: "b", "data-puncta": "" }, "345")],
        "12345",
      ],
      [
        '12<span lang="es">345</span>',
        ["12", h("span", { key: "b", lang: "es" }, "345")],
        locale === "es-es" ? "12\u202f345" : "12345",
      ],
      [
        '12345<span data-puncta="off"> 12 34 </span>67890',
        [
          "12345",
          h("span", { key: "b", "data-puncta": "off" }, " 12 34 "),
          "67890",
        ],
        "12\u202f345 12 34 67\u202f890",
      ],
    ]) {
      const htmlReport = instance.html(html, { detailed: true });
      const react = transformReact(children, { instance, detailed: true });
      for (const report of [htmlReport, react]) {
        const rendered =
          typeof report.result === "string"
            ? report.result
            : renderToString(report.result);
        assert.equal(
          textOf(
            typeof report.result === "string"
              ? rendered
              : rendered.replaceAll("<!-- -->", ""),
          ),
          expected,
          html,
        );
        assert.deepEqual(report.warnings, [], html);
      }
    }
    function Opaque() {
      return " 12 34 ";
    }
    const children = ["12345", h(Opaque, { key: "opaque" }), "67890"];
    const report = transformReact(children, { instance, detailed: true });
    assert.equal(report.result[1], children[1]);
    assert.deepEqual(
      report.sources.map(({ path }) => path),
      [[0], [2]],
    );
    assert.deepEqual(report.warnings, []);
    assert.equal(
      textOf(renderToString(report.result)),
      "12\u202f345 12 34 67\u202f890",
    );
    const protectedText = instance.text("12345 12 34 67890", {
      protect: [{ start: 5, end: 12 }],
      detailed: true,
    });
    assert.equal(protectedText.result, "12\u202f345 12 34 67\u202f890");
    assert.deepEqual(protectedText.warnings, []);
  });
}

for (const locale of ["en-gb", "es-es"]) {
  test(`${locale}: every two-leaf split preserves literal oracles, original paths and separator-only replay`, () => {
    const instance = grouped.with({ locale });
    // Positions are worked from the original literals, never from the formatter.
    for (const [input, expected, separators, ambiguous] of [
      [
        "😀 1234567.00",
        "😀 1\u202f234\u202f567.00",
        [
          [4, 4],
          [7, 7],
        ],
        false,
      ],
      [
        "12 345\u2009678",
        "12\u202f345\u202f678",
        [
          [2, 3],
          [6, 7],
        ],
        false,
      ],
      ["😀 12 34", "😀 12 34", [], true],
      ["0012345", "0012345", [], false],
      ["1234", "1234", [], false],
      ["12\u202f345", "12\u202f345", [], false],
    ]) {
      for (let split = 1; split < input.length; split++) {
        const left = input.slice(0, split);
        const right = input.slice(split);
        const html = instance.html(
          `${left}<!-- transparent --><em>${right}</em>`,
          { detailed: true },
        );
        const children = [
          left,
          h(Fragment, { key: "fragment" }, [h("em", { key: "em" }, right)]),
        ];
        const react = transformReact(children, { instance, detailed: true });
        const label = `${locale}: ${JSON.stringify(input)} @ ${split}`;
        assert.deepEqual(
          html.sources.map(({ text, path }) => ({ text, path })),
          [
            { text: left, path: [0] },
            { text: right, path: [2, 0] },
          ],
          label,
        );
        assert.deepEqual(
          react.sources.map(({ text, path }) => ({ text, path })),
          [
            { text: left, path: [0] },
            { text: right, path: [1, "children", 0, "children"] },
          ],
          label,
        );
        for (const report of [html, react]) {
          const rendered =
            report === html ? report.result : renderToString(report.result);
          assert.equal(textOf(rendered), expected, label);
          assert.equal(replay(report).join(""), expected, label);
          assert.deepEqual(
            report.edits.map(({ ranges }) =>
              ranges.map(({ sourceId, start, end }) => ({
                sourceId,
                start,
                end,
              })),
            ),
            separators.map(([start, end]) => {
              const sourceId =
                start < split || (start === split && start === end) ? 0 : 1;
              return [
                {
                  sourceId,
                  start: start - (sourceId ? split : 0),
                  end: end - (sourceId ? split : 0),
                },
              ];
            }),
            label,
          );
          for (const edit of report.edits) {
            assert.equal(edit.after, "\u202f");
            assert.ok(["", " ", "\u2009"].includes(edit.before));
            assert.deepEqual(edit.ruleIds, ["digitGrouping"]);
          }
          assert.deepEqual(
            report.appliedRules,
            separators.length ? [{ ruleId: "digitGrouping", locale }] : [],
          );
          const groupingWarnings = report.warnings.filter(
            ({ ruleId }) => ruleId === "digitGrouping",
          );
          assert.equal(groupingWarnings.length, ambiguous ? 1 : 0, label);
          if (ambiguous) {
            const warning = groupingWarnings[0];
            assert.equal(warning.code, "typography.ambiguous");
            assert.equal(warning.source, "rule");
            assert.equal(warning.ruleId, "digitGrouping");
            assert.equal(warning.locale, locale);
            assert.deepEqual(warning.details, {});
            assert.equal(
              warning.location.ranges
                .map(({ sourceId, start, end }) =>
                  report.sources[sourceId].text.slice(start, end),
                )
                .join(""),
              "12 34",
            );
          }
          assert.equal(report.hasEdits, separators.length > 0);
        }
        assert.equal("outputChanged" in react, false);
        assert.equal(
          textOf(renderToString(h(Puncta, { instance }, children))),
          expected,
          label,
        );
        assert.deepEqual(
          instance.html(html.result, { detailed: true }).edits,
          [],
          label,
        );
        assert.deepEqual(
          transformReact(react.result, { instance, detailed: true }).edits,
          [],
          label,
        );
        assert.equal(children[0], left);
        assert.equal(children[1].props.children[0].props.children, right);
      }
    }
  });
}

test("entity separators use decoded edits and exact original input ranges after astral text", () => {
  const source = "😀 &#49;2<em>&#32;</em>345<!-- seam -->&#xA0;678.00";
  const report = grouped.html(source, { detailed: true });
  assert.equal(
    report.result,
    "😀 12<em>\u202f</em>345<!-- seam -->\u202f678.00",
  );
  assert.deepEqual(
    report.edits.map(({ kind, before, after, ranges }) => ({
      kind,
      before,
      after,
      ranges,
    })),
    [
      {
        kind: "replace",
        before: " ",
        after: "\u202f",
        ranges: [
          {
            sourceId: 1,
            start: 0,
            end: 1,
            inputRange: { accuracy: "exact", start: 13, end: 18 },
          },
        ],
      },
      {
        kind: "replace",
        before: "\u00a0",
        after: "\u202f",
        ranges: [
          {
            sourceId: 3,
            start: 0,
            end: 1,
            inputRange: { accuracy: "exact", start: 39, end: 45 },
          },
        ],
      },
    ],
  );
  assert.equal(replay(report).join(""), "😀 12\u202f345\u202f678.00");
  const insertion = grouped.html("&#49;&#50;<em>345</em>", { detailed: true });
  assert.deepEqual(insertion.edits[0].ranges, [
    {
      sourceId: 0,
      start: 2,
      end: 2,
      inputRange: { accuracy: "exact", start: 10, end: 10 },
    },
  ]);
  assert.equal(insertion.result, "12\u202f<em>345</em>");
  // A two-codepoint entity has no invented internal input positions. Neither
  // component is an allowed grouping separator, so there is no internal edit.
  const multiple = grouped.html("&ThickSpace;12345", { detailed: true });
  assert.equal(multiple.sources[0].text, "\u205f\u200a12345");
  assert.deepEqual(multiple.edits[0].ranges, [
    {
      sourceId: 0,
      start: 4,
      end: 4,
      inputRange: { accuracy: "exact", start: 14, end: 14 },
    },
  ]);
});

test("multi-leaf warnings include decoded entities and recovered HTML has honest unavailable provenance", () => {
  const warning = grouped.html("😀 12<em>&#32;</em>3<!-- seam -->4!", {
    detailed: true,
  });
  assert.deepEqual(warning.warnings[0].location, {
    kind: "text",
    ranges: [
      {
        sourceId: 0,
        start: 3,
        end: 5,
        inputRange: { accuracy: "exact", start: 3, end: 5 },
      },
      {
        sourceId: 1,
        start: 0,
        end: 1,
        inputRange: { accuracy: "exact", start: 9, end: 14 },
      },
      {
        sourceId: 2,
        start: 0,
        end: 1,
        inputRange: { accuracy: "exact", start: 19, end: 20 },
      },
      {
        sourceId: 3,
        start: 0,
        end: 1,
        inputRange: { accuracy: "exact", start: 33, end: 34 },
      },
    ],
  });
  assert.equal(warning.hasEdits, false);
  assert.equal(warning.outputChanged, true);
  assert.deepEqual(warning.appliedRules, []);
  for (const [source, expected, edits, warnings] of [
    [
      "<table>12<tr><td>x</td></tr>345</table>",
      "12\u202f345<table><tbody><tr><td>x</td></tr></tbody></table>",
      1,
      0,
    ],
    [
      "<table>12 <tr><td>x</td></tr>34</table>",
      "12 34<table><tbody><tr><td>x</td></tr></tbody></table>",
      0,
      1,
    ],
  ]) {
    const report = grouped.html(source, { detailed: true });
    assert.equal(report.result, expected);
    assert.equal(report.edits.length, edits);
    assert.equal(report.warnings.length, warnings);
    const ranges = edits
      ? report.edits[0].ranges
      : report.warnings[0].location.ranges;
    assert.equal(ranges[0].inputRange.accuracy, "unavailable");
    assert.ok(ranges[0].inputRange.reason);
    assert.equal(report.outputChanged, true);
    assert.equal(report.hasEdits, !!edits);
  }
  const serialized = grouped.html("<P title='12345'>&#49;234</P>", {
    detailed: true,
  });
  assert.equal(serialized.result, '<p title="12345">1234</p>');
  assert.equal(serialized.outputChanged, true);
  assert.equal(serialized.hasEdits, false);
  assert.deepEqual(serialized.appliedRules, []);
});

test("pure grouping uses only its explicit instance inside an unrelated render Context", () => {
  const tree = ["12", h("em", { key: "number" }, "345")];
  const enabled = transformReact(tree, { instance: grouped, detailed: true });
  assert.equal(
    textOf(
      renderToString(h(PunctaProvider, { instance: base }, enabled.result)),
    ),
    "12\u202f345",
  );
  const disabled = transformReact(tree, { instance: base, detailed: true });
  assert.equal(
    textOf(
      renderToString(h(PunctaProvider, { instance: grouped }, disabled.result)),
    ),
    "12345",
  );
  assert.equal(tree[0], "12");
  assert.equal(tree[1].props.children, "345");
});

test("seed 9001: generated multi-leaf scoped trees preserve oracles, protection, locale warnings and replay", () => {
  let state = 9001;
  const next = (length) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state % length;
  };
  const cases = [
    {
      source: "1234567.00",
      expected: "1\u202f234\u202f567.00",
      rule: {},
      warning: false,
    },
    {
      source: "12 345",
      expected: "12\u202f345",
      rule: { normalizeExisting: null },
      warning: false,
    },
    {
      source: "12 345",
      expected: "12 345",
      rule: { normalizeExisting: false },
      warning: false,
    },
    {
      source: "12 34",
      expected: "12 34",
      rule: { minDigits: Number.MAX_SAFE_INTEGER, normalizeExisting: false },
      warning: true,
    },
    {
      source: "1234",
      expected: "1\u202f234",
      rule: { minDigits: 4 },
      warning: false,
    },
    { source: "12345", expected: "12345", rule: null, warning: false },
    {
      source: "12345",
      expected: "12345",
      protected: true,
      rule: { enabled: true },
      warning: false,
    },
    { source: "0012345", expected: "0012345", rule: {}, warning: false },
  ];
  const hits = new Set();
  for (let sample = 0; sample < 64; sample++) {
    const index = next(cases.length);
    hits.add(index);
    const entry = cases[index];
    const locale = sample % 2 ? "es-es" : "en-gb";
    const settings = options(entry.rule);
    const htmlPieces = [];
    const reactPieces = [];
    for (let start = 0; start < entry.source.length; ) {
      const end = Math.min(entry.source.length, start + 1 + next(3));
      const piece = entry.source.slice(start, end);
      htmlPieces.push(`<i>${piece}</i><!-- transparent -->`);
      reactPieces.push([
        h(Fragment, { key: start }, h("i", null, piece)),
        null,
        false,
      ]);
      start = end;
    }
    const attributes = {
      ...attrs(settings),
      "data-puncta-locale": locale,
      ...(entry.protected ? { "data-puncta": "off" } : {}),
    };
    const htmlAttributes = Object.entries(attributes)
      .map(([key, value]) => `${key}='${value}'`)
      .join(" ");
    const htmlSource = `12<span ${htmlAttributes}>${htmlPieces.join("")}</span>345`;
    const tree = [
      "12",
      h("span", { key: "scope", ...attributes }, reactPieces),
      "345",
    ];
    const html = grouped.html(htmlSource, { detailed: true });
    const react = transformReact(tree, { instance: grouped, detailed: true });
    const label = JSON.stringify({
      seed: 9001,
      sample,
      state,
      locale,
      ...entry,
    });
    const expected = `12${entry.expected}345`;
    assert.equal(textOf(html.result), expected, label);
    assert.equal(textOf(renderToString(react.result)), expected, label);
    assert.equal(
      textOf(renderToString(h(Puncta, { instance: grouped }, tree))),
      expected,
      label,
    );
    for (const report of [html, react]) {
      assert.equal(
        replay(report).join(""),
        entry.protected ? "12345" : expected,
        label,
      );
      assert.equal(report.warnings.length, entry.warning ? 1 : 0, label);
      if (entry.warning) {
        assert.equal(report.warnings[0].locale, locale, label);
        assert.equal(
          report.warnings[0].location.ranges
            .map(({ sourceId, start, end }) =>
              report.sources[sourceId].text.slice(start, end),
            )
            .join(""),
          entry.source,
          label,
        );
      }
      assert.equal(report.hasEdits, entry.source !== entry.expected, label);
      assert.equal(
        entry.expected.replace(/\D/gu, ""),
        entry.source.replace(/\D/gu, ""),
        label,
      );
    }
    assert.deepEqual(
      grouped.html(html.result, { detailed: true }).edits,
      [],
      label,
    );
    assert.deepEqual(
      transformReact(react.result, { instance: grouped, detailed: true }).edits,
      [],
      label,
    );
  }
  assert.equal(hits.size, cases.length, "generator must reach every scenario");
});

test("active HTML traversal skips protected host configuration before any grouping diagnostics", () => {
  const invalid = JSON.stringify(options({ minDigits: 3 }));
  for (const source of [
    `<code data-puncta-options='${invalid}'>12345; 12 34</code>`,
    `<span data-puncta='off' data-puncta-options='${invalid}'>12345; 12 34</span>`,
    `<span hidden data-puncta-options='${invalid}'>12345; 12 34</span>`,
    `<span contenteditable data-puncta-options='${invalid}'>12345; 12 34</span>`,
    `<span data-puncta='off'><i data-puncta-options='${invalid}'>12345; 12 34</i></span>`,
  ]) {
    const report = grouped.html(source, { detailed: true });
    assert.equal(textOf(report.result), "12345; 12 34");
    assert.deepEqual(report.sources, []);
    assert.deepEqual(report.edits, []);
    assert.deepEqual(report.warnings, []);
  }
});

test("host locale switches inherit explicit grouping fields and reset against the new locale", () => {
  const instance = grouped.with(
    options({ minDigits: 4, normalizeExisting: false }),
  );
  const reset = options({ minDigits: null, normalizeExisting: null });
  const content = "1234; 1,234; 12 345";
  for (const localeAttribute of [
    { lang: "es" },
    { "data-puncta-locale": "es-es" },
  ]) {
    const attributes = Object.entries(localeAttribute)
      .map(([key, value]) => `${key}='${value}'`)
      .join(" ");
    const html = `<span ${attributes}>${content}<i data-puncta-options='${JSON.stringify(reset)}'>; 1234; 12 345</i></span>`;
    const tree = h(
      "span",
      localeAttribute,
      content,
      h("i", attrs(reset), "; 1234; 12 345"),
    );
    const expected = "1\u202f234; 1,234; 12 345; 1234; 12\u202f345";
    const reports = [
      instance.html(html, { detailed: true }),
      transformReact(tree, { instance, detailed: true }),
    ];
    for (const report of reports) {
      assert.equal(replay(report).join(""), expected);
      assert.deepEqual(report.appliedRules, [
        { ruleId: "digitGrouping", locale: "es-es" },
      ]);
      assert.equal(
        textOf(
          typeof report.result === "string"
            ? report.result
            : renderToString(report.result),
        ),
        expected,
      );
    }
  }
});
