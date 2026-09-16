import assert from "node:assert/strict";
import { test } from "node:test";
import { createPuncta } from "../packages/core/dist/index.mjs";
import { enGb } from "../packages/with-en-gb/dist/index.mjs";

import {
  defaultTreeAdapter,
  html,
  parse,
  parseFragment,
} from "../packages/core/node_modules/parse5/dist/index.js";

const en = createPuncta({ locales: [enGb], locale: "en-gb" });
test("HTML document parsing keeps the document and reports decoded title edits", () => {
  const source =
    "<!doctype html><html><head><title>&quot;Hello&quot;...</title></head><body><p>24kg</p></body></html>";
  const report = en.html(source, { mode: "document", detailed: true });
  assert.equal(
    report.result,
    "<!DOCTYPE html><html><head><title>‘Hello’…</title></head><body><p>24&nbsp;kg</p></body></html>",
  );
  assert.equal(report.sources[0].text, '"Hello"...');
  assert.deepEqual(report.sources[0].path, [1, 0, 0, 0]);
  assert.deepEqual(report.edits[0].ranges[0].inputRange, {
    accuracy: "exact",
    start: 34,
    end: 40,
  });
});

test("fragment contexts recover tables without wrappers and mode is never guessed", () => {
  const markup = '<tr><td title="24kg">24kg</td><td>Wait...</td></tr>';
  assert.equal(
    en.html(markup, { context: "table" }),
    '<tbody><tr><td title="24kg">24&nbsp;kg</td><td>Wait…</td></tr></tbody>',
  );
  assert.equal(
    en.html("<td>Wait...</td>", { mode: "fragment", context: "tr" }),
    "<td>Wait…</td>",
  );
  assert.equal(
    en.html("<!doctype html><html><body><p>Wait...</p></body></html>"),
    "<p>Wait…</p>",
  );
  assert.equal(en.html("Wait..."), "Wait…");
});

test("title RCDATA treats markup as text and keeps decoded origins", () => {
  const report = en.html("&quot;Hello&quot; <b>...</b>", {
    context: "title",
    detailed: true,
  });
  assert.equal(report.result, "‘Hello’ &lt;b&gt;…&lt;/b&gt;");
  assert.equal(report.sources.length, 1);
  assert.equal(report.sources[0].text, '"Hello" <b>...</b>');
  assert.deepEqual(report.edits.at(-1).ranges[0].inputRange, {
    accuracy: "exact",
    start: 21,
    end: 24,
  });
  // Parsing context does not create an accessible protected ancestor.
  assert.equal(en.html("Wait...", { context: "code" }), "Wait…");
});

test("HTML removal shares document and fragment modes without running typography", () => {
  for (const [source, options, expected] of [
    [
      "<title>ex&shy;ample...</title><p>ex&shy;ample...</p>",
      { mode: "document" },
      "<html><head><title>example...</title></head><body><p>example...</p></body></html>",
    ],
    [
      "<tr><td>ex&shy;ample...</td></tr>",
      { context: "table" },
      "<tbody><tr><td>example...</td></tr></tbody>",
    ],
    ["ex&shy;ample...", { context: "title" }, "example..."],
    [
      "<code>ex&shy;ample</code> ex&shy;ample...",
      {},
      "<code>ex\u00adample</code> example...",
    ],
  ]) {
    const report = en.stripSoftHyphens(source, {
      format: "html",
      ...options,
      detailed: true,
    });
    assert.equal(report.result, expected);
    assert.deepEqual(report.appliedRules, [
      { ruleId: "hyphenation.remove", locale: "en-gb" },
    ]);
    assert.equal(
      en.stripSoftHyphens(source, { format: "html", ...options }),
      expected,
    );
  }
});

test("HTML parser options are validated even for empty or disabled input", () => {
  for (const options of [
    { mode: "auto" },
    { mode: null },
    { mode: 1 },
    { mode: "document", context: "div" },
    ...[
      "svg",
      "math",
      "foreignObject",
      "annotation-xml",
      "unknown",
      "my-tag",
      "",
      " div",
      "DIV",
      null,
      1,
      {},
      [],
    ].map((context) => ({ context })),
  ]) {
    for (const detailed of [false, true]) {
      const call = { ...options, enabled: false, detailed };
      for (const invoke of [
        () => en.html("", call),
        () => en.stripSoftHyphens("", { ...call, format: "html" }),
      ]) {
        assert.throws(
          invoke,
          (error) =>
            error.code === "config.invalid-option" &&
            ["context", "mode"].includes(error.optionPath[0]),
        );
      }
    }
  }
});

test("recovery and serialization are separate from edits, including disabled calls", () => {
  for (const options of [{ mode: "document" }, { context: "table" }, {}]) {
    const source = "<P title='&quot;'>Text</P>";
    for (const enabled of [false, true]) {
      for (const invoke of [
        en.html,
        (s, o) => en.stripSoftHyphens(s, { ...o, format: "html" }),
      ]) {
        const report = invoke(source, { ...options, enabled, detailed: true });
        assert.equal(report.outputChanged, true);
        assert.equal(report.hasEdits, false);
        assert.deepEqual(report.edits, []);
        assert.deepEqual(report.appliedRules, []);
        assert.ok(report.result.includes('title="&quot;"'));
      }
    }
  }
});

test("parser warnings survive protection and use original UTF-16 input positions", () => {
  const source =
    '<!doctype html><html><head></head><body><code title="😀" title="duplicate">...</code></body></html>';
  const report = en.html(source, {
    mode: "document",
    enabled: false,
    detailed: true,
  });
  const warning = report.warnings.find(
    (w) => w.details.parserCode === "duplicate-attribute",
  );
  assert.ok(warning);
  assert.equal(warning.code, "html.parse");
  assert.equal(warning.source, "parser");
  assert.equal(warning.locale, null);
  assert.equal(warning.ruleId, null);
  assert.deepEqual(warning.location, { kind: "input", start: 62, end: 62 });
  assert.equal(report.hasEdits, false);
  const missingDoctype = en.html("<p>Text", {
    mode: "document",
    detailed: true,
  });
  assert.ok(
    missingDoctype.warnings.some(
      (w) => w.details.parserCode === "missing-doctype",
    ),
  );
  // The parser repairs this nesting without promising a diagnostic for the repair.
  const silent = en.html("<p>Text<div>More</div>", { detailed: true });
  assert.equal(silent.result, "<p>Text</p><div>More</div>");
  assert.deepEqual(silent.warnings, []);
});

test("recovered text leaves have honest positions through entities and CRLF", () => {
  const source = "<table>😀&amp;\r\nWait...<tr><td>Next...</td></tr></table>";
  const report = en.html(source, { mode: "document", detailed: true });
  assert.equal(report.sources[0].text, "😀&\nWait...");
  assert.deepEqual(report.sources[0].path, [0, 1, 0]);
  assert.deepEqual(report.edits[0].ranges[0], {
    sourceId: 0,
    start: 8,
    end: 11,
    inputRange: { accuracy: "exact", start: 20, end: 23 },
  });
  const noncontiguous = en.html("<table>a<tr><td>x</td></tr>...</table>", {
    detailed: true,
  });
  const range = noncontiguous.edits[0].ranges[0];
  assert.equal(range.inputRange.accuracy, "unavailable");
  assert.ok(range.inputRange.reason);
  assert.equal(noncontiguous.sources[range.sourceId].text, "a...");
});

// The parser is the contract's structural oracle; typography has literal tests above.
function parsed(source, options) {
  return options.mode === "document"
    ? parse(source)
    : parseFragment(
        defaultTreeAdapter.createElement(
          options.context ?? "div",
          html.NS.HTML,
          [],
        ),
        source,
      );
}
function structure(node) {
  return {
    name: node.nodeName,
    namespace: node.namespaceURI,
    attrs: node.attrs,
    ...(node.nodeName === "#comment" ? { data: node.data } : {}),
    ...(node.childNodes ? { children: node.childNodes.map(structure) } : {}),
    ...(node.content ? { content: structure(node.content) } : {}),
  };
}

test("recovered document and fragment trees keep attributes and namespace protection", () => {
  for (const options of [
    { mode: "document" },
    {},
    { context: "table" },
    { context: "tbody" },
  ]) {
    for (const source of [
      '<b title="&quot;">One<i>...</b>Two...</i>',
      '<table>Before...<tr><td title="24kg">Wait...</table>After...',
      '<title>&quot;Hello&quot; &lt;b&gt;...</title><p onclick="danger()">Wait...</p>',
      '<svg><title>Wait...</title><foreignObject><div data-puncta="on">Wait...</div></foreignObject></svg><p>Wait...</p>',
      '<math><mtext><span>Wait...</span></mtext><annotation-xml encoding="text/html"><p>Wait...</p></annotation-xml></math><p>Wait...</p>',
      '<template><p>Wait...</p></template><code title="&quot;">Wait...</code>',
    ]) {
      const report = en.html(source, { ...options, detailed: true });
      assert.deepEqual(
        structure(parsed(report.result, options)),
        structure(parsed(source, options)),
      );
      const again = en.html(report.result, { ...options, detailed: true });
      assert.equal(again.result, report.result);
      assert.equal(again.hasEdits, false);
    }
  }
  const protectedSource =
    '<svg><foreignObject><p data-puncta="on" title="&shy;">ex&shy;ample...</p></foreignObject></svg><math><annotation-xml encoding="text/html"><p>ex&shy;ample...</p></annotation-xml></math>';
  for (const mode of ["fragment", "document"]) {
    for (const invoke of [
      en.html,
      (s, o) => en.stripSoftHyphens(s, { ...o, format: "html" }),
    ]) {
      const report = invoke(protectedSource, { mode, detailed: true });
      assert.equal(report.hasEdits, false);
      assert.ok(report.result.includes("ex\u00adample..."));
      assert.ok(report.result.includes('title="\u00ad"'));
    }
  }
});

test("raw-text contexts preserve literal entities through serialization and source mapping", () => {
  for (const context of [
    "script",
    "style",
    "xmp",
    "plaintext",
    "iframe",
    "noscript",
  ]) {
    const source = "Wait... &amp;\r\nNext...";
    const report = en.html(source, { context, detailed: true });
    assert.equal(report.result, "Wait… &amp;\nNext…");
    assert.deepEqual(report.edits[0].ranges[0].inputRange, {
      accuracy: "exact",
      start: 4,
      end: 7,
    });
    assert.deepEqual(report.edits[1].ranges[0].inputRange, {
      accuracy: "exact",
      start: 19,
      end: 22,
    });
    assert.equal(en.html(report.result, { context }), report.result);
    const removal = en.stripSoftHyphens("ex\u00adample &shy;", {
      format: "html",
      context,
      detailed: true,
    });
    assert.equal(removal.result, "example &shy;");
    assert.deepEqual(removal.edits[0].ranges[0].inputRange, {
      accuracy: "exact",
      start: 2,
      end: 3,
    });
  }
});

test("accessible raw-text elements retain literal entities and exact document origins", () => {
  for (const tag of ["xmp", "plaintext"]) {
    const source = `<${tag}>Wait... &amp;`;
    const report = en.html(source, { mode: "document", detailed: true });
    assert.equal(report.sources[0].text, "Wait... &amp;");
    assert.equal(report.edits[0].ranges[0].inputRange.accuracy, "exact");
    const { start, end } = report.edits[0].ranges[0].inputRange;
    assert.equal(source.slice(start, end), "...");
    assert.ok(report.result.includes("Wait… &amp;"));
  }
});
