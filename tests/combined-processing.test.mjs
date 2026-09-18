import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement as h, Fragment } from "react";
import { renderToString } from "../examples/ssr/node_modules/react-dom/server.node.js";
import {
  parseFragment,
  parse,
} from "../packages/core/node_modules/parse5/dist/index.js";
import {
  createPuncta,
  PunctaConfigError,
} from "../packages/core/dist/index.mjs";
import { enGb } from "../packages/with-en-gb/dist/index.mjs";
import { esEs } from "../packages/with-es-es/dist/index.mjs";
import {
  transformReact,
  stripSoftHyphensReact,
} from "../packages/with-react/dist/pure.mjs";
import { Puncta, PunctaProvider } from "../packages/with-react/dist/index.mjs";

const make = (locale = "en-gb", options = {}) =>
  createPuncta({
    locales: [enGb, esEs],
    locale,
    hyphenation: { enabled: true },
    ...options,
  });
const escapeHtml = (text) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll('"', "&quot;");
const textOf = (node) =>
  node.nodeName === "#text"
    ? node.value
    : (node.childNodes ?? []).map(textOf).join("");
const visible = (html) => textOf(parseFragment(html));
const render = (tree) => renderToString(h(Fragment, null, tree));

function verifyReport(report, input) {
  assert.equal(report.hasEdits, report.edits.length > 0);
  if (typeof report.result === "string" && input !== undefined)
    assert.equal(report.outputChanged, report.result !== input);
  assert.deepEqual(
    report.sources.map((source) => source.id),
    report.sources.map((_, index) => index),
  );
  const applied = [];
  for (const edit of report.edits) {
    assert.equal(
      edit.before,
      edit.ranges
        .map((range) =>
          report.sources[range.sourceId].text.slice(range.start, range.end),
        )
        .join(""),
    );
    assert.equal(
      edit.kind,
      edit.before === "" ? "insert" : edit.after === "" ? "delete" : "replace",
    );
    for (const ruleId of edit.ruleIds) {
      const pair = { ruleId, locale: edit.locale };
      if (
        !applied.some(
          (item) => item.ruleId === ruleId && item.locale === edit.locale,
        )
      )
        applied.push(pair);
    }
    for (const range of edit.ranges) {
      assert(
        range.start >= 0 &&
          range.end >= range.start &&
          range.end <= report.sources[range.sourceId].text.length,
      );
    }
  }
  assert.deepEqual(report.appliedRules, applied);
  const warningKeys = report.warnings.map(({ message: _message, ...warning }) =>
    JSON.stringify(warning),
  );
  assert.equal(new Set(warningKeys).size, warningKeys.length);
}
function unchanged(report) {
  assert.equal(report.hasEdits, false);
  assert.deepEqual(report.edits, []);
  assert.deepEqual(report.appliedRules, []);
}

// Independent #28 literals combined with the frozen backbone/camino exemplars.
const cases = [
  [
    "en-gb",
    `😀 "backbone -- 10-12  kg -- don't..."; -5 kg; 50 %; GBP 20`,
    `😀 ‘back\u00adbone – 10–12\u00a0kg – don’t…’; −5\u00a0kg; 50%; GBP\u00a020`,
  ],
  [
    "es-es",
    `😀 "camino -- 10-12  kg -- don't..."; -5 kg; 50 %; EUR 20`,
    `😀 «ca\u00admi\u00adno —10–12\u00a0kg— don’t…»; −5\u00a0kg; 50\u00a0%; EUR\u00a020`,
  ],
];

test("combined literal oracle survives every transparent seam, reports original sources and has no second edits", () => {
  for (const [locale, source, expected] of cases) {
    const instance = make(locale);
    const plain = instance.text(source, { detailed: true });
    assert.equal(plain.result, expected);
    verifyReport(plain, source);
    unchanged(instance.text(expected, { detailed: true }));
    for (let split = 0; split <= source.length; split++) {
      const tree = [
        source.slice(0, split),
        h("em", { key: "kept", title: "don't..." }, source.slice(split)),
      ];
      const htmlInput = `${escapeHtml(source.slice(0, split))}<em title="don't...">${escapeHtml(source.slice(split))}</em>`;
      const html = instance.html(htmlInput, { detailed: true });
      const react = transformReact(tree, { instance, detailed: true });
      assert.equal(visible(html.result), expected);
      assert.equal(visible(render(react.result)), expected);
      assert.equal(visible(render(h(Puncta, { instance }, tree))), expected);
      assert.equal(react.result[1].key, "kept");
      assert.equal(react.result[1].props.title, "don't...");
      assert.equal("outputChanged" in react, false);
      verifyReport(html, htmlInput);
      verifyReport(react);
      unchanged(instance.html(html.result, { detailed: true }));
      unchanged(transformReact(react.result, { instance, detailed: true }));
      assert.deepEqual(
        transformReact(tree, { instance, detailed: true }),
        react,
      );
    }
  }
});

test("each disabled group retains recognition for other groups across the public inputs", () => {
  const source = `"Don't"; alpha  beta; Wait...; a --b-- c; 10-12 kg; -5 kg; 50 %; GBP 20`;
  for (const locale of ["en-gb", "es-es"]) {
    const english = locale === "en-gb";
    const parts = [
      english ? "‘Don’t’" : "«Don’t»",
      "alpha beta",
      "Wait…",
      english ? "a – b – c" : "a —b— c",
      "10–12\u00a0kg",
      "−5\u00a0kg",
      english ? "50%" : "50\u00a0%",
      "GBP\u00a020",
    ];
    const variants = [
      ["quotes", { 0: '"Don’t"' }],
      ["apostrophes", { 0: english ? "‘Don't’" : "«Don't»" }],
      ["spaces", { 1: "alpha  beta" }],
      ["ellipsis", { 2: "Wait..." }],
      ["dashes", { 3: "a --b-- c" }],
      ["ranges", { 4: "10-12\u00a0kg" }],
      ["minus", { 5: "-5\u00a0kg" }],
      ["units", { 4: "10–12 kg", 5: "−5 kg" }],
      ["percentages", { 6: "50 %" }],
      ["currencies", { 7: "GBP 20" }],
    ];
    for (const [group, replacements] of variants) {
      const expected = Object.assign([...parts], replacements).join("; ");
      const instance = make(locale, { rules: { [group]: { enabled: false } } });
      assert.equal(instance.text(source), expected, `${locale}: ${group}`);
      assert.equal(visible(instance.html(escapeHtml(source))), expected, group);
      assert.equal(
        visible(render(transformReact(source, { instance }))),
        expected,
        group,
      );
      assert.equal(
        visible(render(h(Puncta, { instance }, source))),
        expected,
        group,
      );
      unchanged(instance.text(expected, { detailed: true }));
    }
  }
});

test("final reports keep neighbouring edits, quote endpoints and individual SHY positions separate", () => {
  const instance = make("es-es");
  const source = '😀 "  camino  "...24kg';
  const report = instance.text(source, { detailed: true });
  assert.equal(report.result, "😀 «ca\u00admi\u00adno»…24\u00a0kg");
  assert.deepEqual(
    report.edits.map(({ before, after, ruleIds, ranges }) => [
      before,
      after,
      ruleIds,
      ranges[0].start,
      ranges[0].end,
    ]),
    [
      ['"', "«", ["quotes"], 3, 4],
      ["  ", "", ["spaces"], 4, 6],
      ["", "\u00ad", ["hyphenation.insert"], 8, 8],
      ["", "\u00ad", ["hyphenation.insert"], 10, 10],
      ["  ", "", ["spaces"], 12, 14],
      ['"', "»", ["quotes"], 14, 15],
      ["...", "…", ["ellipsis"], 15, 18],
      ["", "\u00a0", ["units"], 20, 20],
    ],
  );
  verifyReport(report, source);
  const html = instance.html(
    "😀 &quot;  ca<em>mino  &quot;</em>...24<strong>kg</strong>",
    { detailed: true },
  );
  assert.equal(visible(html.result), report.result);
  assert.deepEqual(html.edits[0].ranges[0].inputRange, {
    accuracy: "exact",
    start: 3,
    end: 9,
  });
  assert.deepEqual(
    html.edits.find((edit) => edit.ruleIds.includes("units")).ranges,
    [
      {
        sourceId: 2,
        start: 5,
        end: 5,
        inputRange: { accuracy: "exact", start: 39, end: 39 },
      },
    ],
  );
  verifyReport(html);
});

test("SHY removal after full processing preserves typography, attributes and protection in every HTML mode and React", () => {
  for (const [locale, source, expected] of cases) {
    const instance = make(locale);
    const clean = expected.replaceAll("\u00ad", "");
    const plain = instance.stripSoftHyphens(expected, { detailed: true });
    assert.equal(plain.result, clean);
    assert(
      plain.edits.every((edit) => edit.ruleIds.join() === "hyphenation.remove"),
    );
    verifyReport(plain, expected);
    const protectedText = "ma\u00adnual";
    const tree = h(
      "span",
      { title: protectedText },
      source,
      h("code", null, protectedText),
    );
    const processed = transformReact(tree, { instance });
    const removed = stripSoftHyphensReact(processed, {
      instance,
      detailed: true,
    });
    assert.equal(visible(render(removed.result)), clean + protectedText);
    assert.equal(removed.result.props.title, protectedText);
    unchanged(
      stripSoftHyphensReact(removed.result, { instance, detailed: true }),
    );
    for (const [options, input] of [
      [
        {},
        `<span title="${protectedText}">${escapeHtml(source)}<code>${protectedText}</code></span>`,
      ],
      [
        { mode: "document" },
        `<!doctype html><html><head><title>${escapeHtml(source)}</title></head><body><p>${escapeHtml(source)}<code>${protectedText}</code></p></body></html>`,
      ],
      [
        { mode: "fragment", context: "table" },
        `<tr><td>${escapeHtml(source)}<code>${protectedText}</code></td></tr>`,
      ],
      [{ mode: "fragment", context: "title" }, escapeHtml(source)],
    ]) {
      const processedHtml = instance.html(input, options);
      const removedHtml = instance.stripSoftHyphens(processedHtml, {
        ...options,
        format: "html",
        detailed: true,
      });
      const parseOutput =
        options.mode === "document"
          ? parse
          : options.context === "title"
            ? (value) => parseFragment(`<title>${value}</title>`)
            : options.context === "table"
              ? (value) => parseFragment(`<table>${value}</table>`)
              : parseFragment;
      assert.equal(
        textOf(parseOutput(removedHtml.result)),
        options.mode === "document"
          ? clean + clean + protectedText
          : clean + (options.context === "title" ? "" : protectedText),
      );
      verifyReport(removedHtml, processedHtml);
      unchanged(
        instance.stripSoftHyphens(removedHtml.result, {
          ...options,
          format: "html",
          detailed: true,
        }),
      );
    }
  }
});

test("removal cannot expose a URI suffix through discretionary word boundaries", () => {
  for (const locale of ["en-gb", "es-es"]) {
    const instance = make(locale);
    for (const input of [
      "oxí\u00adge\u00adnohttps://exam\u00adple.org",
      "cami\u00adnopadrinohttps://example.org-cami\u00adno",
      "ñ\u00adhttps://a\u00adb",
      "a\u00adwww.x\u00ady",
      "é\u00adhttps://ex\u00adample.org",
      "e\u0301\u00adhttps://ex\u00adample.org",
      "e\u0301\u00adwww.ex\u00adample.org",
    ]) {
      const expected = input.replaceAll("\u00ad", "");
      assert.equal(instance.stripSoftHyphens(input), expected);
      for (let split = 0; split <= input.length; split++) {
        const tree = [
          input.slice(0, split),
          h("em", { key: "e" }, input.slice(split)),
        ];
        const html = `${escapeHtml(input.slice(0, split))}<em>${escapeHtml(input.slice(split))}</em>`;
        assert.equal(
          visible(instance.stripSoftHyphens(html, { format: "html" })),
          expected,
        );
        assert.equal(
          visible(render(stripSoftHyphensReact(tree, { instance }))),
          expected,
        );
      }
    }
    // A leading SHY is removable, while the actual URL remains protected.
    assert.equal(
      instance.stripSoftHyphens("\u00adhttps://exam\u00adple.org"),
      "https://exam\u00adple.org",
    );
    assert.equal(
      instance.stripSoftHyphens(" https://exam\u00adple.org"),
      " https://exam\u00adple.org",
    );
    const original = "oxígenohttps://example.org";
    assert.equal(instance.stripSoftHyphens(instance.text(original)), original);
  }
});

test("every warning code has stable machine fields, distinct locations and call-local identity", () => {
  const fixtures = [
    ["en-gb", "5 - 3", "typography.ambiguous", "ranges"],
    ["en-gb", '"oops', "quotes.unpaired", "quotes"],
    ["en-gb", "20€", "currency.order", "currencies"],
    [
      "en-gb",
      "αβγαβγ",
      "hyphenation.unsupported-characters",
      "hyphenation.insert",
    ],
    ["en-gb", "αβγабв", "hyphenation.mixed-scripts", "hyphenation.insert"],
    [
      "es-es",
      "atlético",
      "hyphenation.language-ambiguity",
      "hyphenation.insert",
    ],
  ];
  const observed = new Set();
  const machineFields = ({ message: _message, ...warning }) => warning;
  for (const [locale, input, code, ruleId] of fixtures) {
    const instance = make(locale);
    // Repeated issues in different blocks are deliberately not deduplicated.
    const source = `${input}\n\n${input}`;
    const reports = [
      instance.text(source, {
        detailed: true,
        rules: { ranges: { standalone: true } },
      }),
      instance.html(`<p>${escapeHtml(input)}</p><p>${escapeHtml(input)}</p>`, {
        detailed: true,
        rules: { ranges: { standalone: true } },
      }),
      transformReact(
        [h("p", { key: "a" }, input), h("p", { key: "b" }, input)],
        { instance, detailed: true, rules: { ranges: { standalone: true } } },
      ),
    ];
    for (const report of reports) {
      verifyReport(report);
      const warnings = report.warnings.filter(
        (warning) => warning.code === code,
      );
      assert.equal(warnings.length, 2, code);
      assert.notDeepEqual(warnings[0].location, warnings[1].location);
      for (const warning of warnings) {
        observed.add(warning.code);
        assert.equal(warning.ruleId, ruleId);
        assert.equal(warning.locale, locale);
        assert.equal(warning.source, "rule");
        assert.equal(warning.location.kind, "text");
        assert.equal(typeof warning.message, "string");
        assert(warning.message.length > 0);
      }
    }
    const repeated = instance.text(source, {
      detailed: true,
      rules: { ranges: { standalone: true } },
    });
    assert.deepEqual(
      repeated.warnings.map(machineFields),
      reports[0].warnings.map(machineFields),
    );
    const second = instance.text(reports[0].result, {
      detailed: true,
      rules: { ranges: { standalone: true } },
    });
    unchanged(second);
    assert.deepEqual(
      second.warnings.map(machineFields),
      reports[0].warnings.map(machineFields),
    );
  }
  const instance = make();
  const html = instance.html(
    '<p lang="xx">unchanged</p><widget>unchanged</widget><p x="a" x="b">Wait...</p>',
    { detailed: true },
  );
  const react = transformReact(
    [
      h("p", { lang: "xx", key: "a" }, "unchanged"),
      h("widget", { key: "b" }, "unchanged"),
    ],
    { instance, detailed: true },
  );
  for (const report of [html, react]) {
    verifyReport(report);
    for (const warning of report.warnings) {
      observed.add(warning.code);
      if (warning.code === "markup.language-unavailable") {
        assert.equal(warning.locale, null);
        assert.equal(warning.ruleId, null);
        assert.deepEqual(warning.details, {
          value: "xx",
          reason: "unsupported",
        });
        assert.equal(warning.location.kind, "attribute");
      }
      if (warning.code === "markup.element-unsupported") {
        assert.equal(warning.details.tagName, "widget");
        assert.equal(warning.location.kind, "element");
      }
      if (warning.code === "html.parse") {
        assert.equal(warning.source, "parser");
        assert.equal(warning.details.parserCode, "duplicate-attribute");
        assert.equal(warning.location.kind, "input");
      }
    }
  }
  assert.deepEqual(
    [...observed].sort(),
    [
      "typography.ambiguous",
      "quotes.unpaired",
      "currency.order",
      "hyphenation.unsupported-characters",
      "hyphenation.mixed-scripts",
      "hyphenation.language-ambiguity",
      "markup.language-unavailable",
      "markup.element-unsupported",
      "html.parse",
    ].sort(),
  );
});

test("all configuration error codes abort ordinary and detailed calls without a partial result", () => {
  const instance = make();
  const key = Symbol.for("@use-puncta/hyphenation");
  const missing = createPuncta({
    locales: [{ ...enGb, [key]: undefined }],
    locale: "en-gb",
  });
  const incompatible = createPuncta({
    locales: [{ ...enGb, [key]: { ...enGb[key], format: -1 } }],
    locale: "en-gb",
  });
  const failures = [
    [
      "config.invalid-option",
      (detailed) =>
        instance.text("Wait...", {
          detailed,
          rules: { spaces: { enabled: "yes" } },
        }),
    ],
    [
      "locale.unavailable",
      (detailed) => instance.text("Wait...", { detailed, locale: "fr-fr" }),
    ],
    [
      "locale.incompatible",
      () => createPuncta({ locales: [{ id: "en-gb" }], locale: "en-gb" }),
    ],
    [
      "locale.duplicate",
      () => createPuncta({ locales: [enGb, enGb], locale: "en-gb" }),
    ],
    [
      "hyphenation.resource-unavailable",
      (detailed) =>
        missing.text("backbone", { detailed, hyphenation: { enabled: true } }),
    ],
    [
      "hyphenation.resource-incompatible",
      (detailed) =>
        incompatible.text("backbone", {
          detailed,
          hyphenation: { enabled: true },
        }),
    ],
    ["instance.missing", (detailed) => transformReact("Wait...", { detailed })],
    [
      "instance.nested",
      () =>
        render(
          h(PunctaProvider, { instance }, h(Puncta, { instance }, "Wait...")),
        ),
    ],
    [
      "markup.invalid-config",
      (detailed) =>
        instance.html('Wait...<span data-puncta-options="{">bad</span>', {
          detailed,
        }),
    ],
    [
      "markup.invalid-config",
      (detailed) =>
        transformReact(
          ["Wait...", h("span", { "data-puncta-options": "{" }, "bad")],
          { instance, detailed },
        ),
    ],
    [
      "protect.invalid-range",
      (detailed) =>
        instance.text("😀 Wait...", {
          detailed,
          protect: [{ start: 1, end: 2 }],
        }),
    ],
  ];
  for (const [code, invoke] of failures)
    for (const detailed of [false, true]) {
      let returned = false;
      assert.throws(
        () => {
          invoke(detailed);
          returned = true;
        },
        (error) => {
          assert(error instanceof PunctaConfigError);
          assert.equal(error.code, code);
          assert.equal(error.name, "PunctaConfigError");
          assert.equal(typeof error.message, "string");
          assert(Array.isArray(error.optionPath));
          assert.equal(typeof error.details, "object");
          assert.notEqual(error.location.kind, "text");
          assert.equal("result" in error, false);
          return true;
        },
      );
      assert.equal(returned, false);
    }
  // The operation needs no insertion resource, including inside explicit scopes.
  assert.equal(
    missing.stripSoftHyphens("back\u00adbone", {
      hyphenation: { enabled: true },
    }),
    "backbone",
  );
  const options = { "data-puncta-options": '{"hyphenation":{"enabled":true}}' };
  assert.equal(
    missing.stripSoftHyphens(
      `<span data-puncta-options='${options["data-puncta-options"]}'>back\u00adbone</span>`,
      { format: "html" },
    ),
    '<span data-puncta-options="{&quot;hyphenation&quot;:{&quot;enabled&quot;:true}}">backbone</span>',
  );
  assert.equal(
    stripSoftHyphensReact(h("span", options, "back\u00adbone"), {
      instance: missing,
    }).props.children,
    "backbone",
  );
  assert.throws(() => missing.with({ hyphenation: { enabled: true } }), {
    code: "hyphenation.resource-unavailable",
  });
});

test("fresh options recompute from the original source without accumulated typography", () => {
  const source = '"backbone"  50 %...';
  const instance = make();
  const first = instance.text(source);
  assert.equal(first, "‘back\u00adbone’ 50%…");
  const overrides = {
    locale: "es-es",
    hyphenation: { enabled: false },
    rules: { quotes: { enabled: false }, ellipsis: { enabled: false } },
  };
  const expected = '"backbone" 50\u00a0%...';
  assert.equal(instance.text(source, overrides), expected);
  assert.equal(instance.with(overrides).text(source), expected);
  assert.equal(visible(instance.html(escapeHtml(source), overrides)), expected);
  assert.equal(transformReact(source, { instance, ...overrides }), expected);
  assert.equal(
    visible(
      render(
        h(
          PunctaProvider,
          {
            instance,
            locale: overrides.locale,
            options: {
              hyphenation: overrides.hyphenation,
              rules: overrides.rules,
            },
          },
          h(Puncta, null, source),
        ),
      ),
    ),
    expected,
  );
  assert.equal(instance.text(source), first);
});

test("frozen linguistic oracles remain valid beside combined punctuation and numeric rules", async () => {
  const { readFile } = await import("node:fs/promises");
  for (const locale of ["en-gb", "es-es"]) {
    const corpus = JSON.parse(
      await readFile(
        new URL(`./fixtures/hyphenation/${locale}.json`, import.meta.url),
        "utf8",
      ),
    ).entries;
    const instance = make(locale);
    for (const entry of corpus) {
      const source = `😀 "${entry.source}"  10-12 kg...`;
      const report = instance.text(source, {
        detailed: true,
        hyphenation: entry.settings,
      });
      const positions = report.edits
        .filter((edit) => edit.ruleIds.includes("hyphenation.insert"))
        .map((edit) => edit.ranges[0].start - 4);
      assert(
        positions.every((position) =>
          entry.allowedPositions.includes(position),
        ),
        `${locale} ${entry.source}: extra position`,
      );
      assert(
        entry.requiredPositions.every((position) =>
          positions.includes(position),
        ),
        `${locale} ${entry.source}: missing required position`,
      );
      const clean =
        locale === "en-gb"
          ? `😀 ‘${entry.source}’ 10–12\u00a0kg…`
          : `😀 «${entry.source}» 10–12\u00a0kg…`;
      assert.equal(report.result.replaceAll("\u00ad", ""), clean);
      assert.equal(
        visible(
          instance.html(escapeHtml(source), { hyphenation: entry.settings }),
        ),
        report.result,
      );
      assert.equal(
        transformReact(source, { instance, hyphenation: entry.settings }),
        report.result,
      );
      unchanged(
        instance.text(report.result, {
          detailed: true,
          hyphenation: entry.settings,
        }),
      );
      verifyReport(report, source);
    }
  }
});

test("generated combined settings preserve original edit replay, protection and both operation fixed points", () => {
  const atoms = [
    "backbone",
    "camino",
    "oxígeno",
    "ñ\u00ad",
    "https://example.org",
    "www.x\u00ady",
    "x\u00ady:2GBP...",
    "x\u00ady:10-12kg...",
    "x\u00ady:50%...",
    "24",
    "kg",
    "10-12",
    "-5",
    "50 %",
    "EUR",
    '"',
    "'",
    "--",
    "...",
    ":",
    "  ",
    "\n",
    "\u00ad",
    "te\u0301lefono",
    "😀",
  ];
  const profiles = [
    {},
    { rules: { units: { enabled: false }, apostrophes: { enabled: false } } },
    { rules: { spaces: { enabled: false }, ranges: { standalone: true } } },
    {
      rules: {
        quotes: { normalizeExisting: false },
        dashes: { normalizeExisting: false },
      },
    },
  ];
  let seed = 530;
  const random = (length) => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return Math.floor((seed / 2 ** 32) * length);
  };
  const distinct = new Set();
  let edits = 0;
  for (const locale of ["en-gb", "es-es"])
    for (const profile of profiles) {
      const instance = make(locale, profile);
      for (let run = 0; run < 250; run++) {
        const source = Array.from(
          { length: 7 },
          () => atoms[random(atoms.length)],
        ).join("");
        distinct.add(source);
        const first = instance.text(source, { detailed: true });
        verifyReport(first, source);
        edits += first.edits.length;
        let replay = source;
        for (const edit of [...first.edits].reverse()) {
          const range = edit.ranges[0];
          replay =
            replay.slice(0, range.start) + edit.after + replay.slice(range.end);
        }
        assert.equal(replay, first.result, source);
        const second = instance.text(first.result, { detailed: true });
        assert.equal(second.result, first.result, source);
        unchanged(second);
        const clean = instance.stripSoftHyphens(first.result, {
          detailed: true,
        });
        verifyReport(clean, first.result);
        unchanged(instance.stripSoftHyphens(clean.result, { detailed: true }));
        assert.equal(instance.stripSoftHyphens(clean.result), clean.result);
        if (run % 10 === 0) {
          const protectedReport = instance.text(source, {
            detailed: true,
            protect: [{ start: 0, end: source.length }],
          });
          assert.equal(protectedReport.result, source);
          unchanged(protectedReport);
          assert.deepEqual(protectedReport.warnings, []);
          assert.equal(
            visible(instance.html(escapeHtml(source))),
            first.result.replaceAll("\r\n", "\n"),
          );
          assert.equal(transformReact(source, { instance }), first.result);
        }
      }
    }
  assert(distinct.size > 1900);
  assert(edits > 500);
});

test("punctuation spacing cannot release SHY-free technical lookahead on a later call", () => {
  for (const locale of ["en-gb", "es-es"]) {
    const instance = make(locale);
    const source = "24www.x\u00ady:242410-12... and...";
    const expected = "24www.x\u00ady:242410-12... and…";
    assert.equal(instance.text(source), expected);
    for (let split = 0; split <= source.length; split++) {
      const html = `${escapeHtml(source.slice(0, split))}<em>${escapeHtml(source.slice(split))}</em>`;
      const tree = [
        source.slice(0, split),
        h("em", { key: "e" }, source.slice(split)),
      ];
      const report = instance.html(html, { detailed: true });
      const react = transformReact(tree, { instance, detailed: true });
      assert.equal(visible(report.result), expected);
      assert.equal(visible(render(react.result)), expected);
      verifyReport(report, html);
      verifyReport(react);
      unchanged(instance.html(report.result, { detailed: true }));
      unchanged(transformReact(react.result, { instance, detailed: true }));
    }
    const disabled = instance.with({ rules: { ellipsis: { enabled: false } } });
    assert.equal(disabled.text(source), source);
  }
});

test("all interval rules preserve the potential technical context used by other enabled rules", () => {
  for (const locale of ["en-gb", "es-es"]) {
    const instance = make(locale);
    for (const input of [
      "x\u00ady:2GBP...",
      "x\u00ady:10-12kg...",
      "x\u00ady:-5kg...",
      "x\u00ady:50%...",
      "x\u00ady:24GBP–USD--casino",
    ]) {
      const source = `${input} and...`;
      const expected = `${input} and…`;
      assert.equal(instance.text(source), expected);
      for (let split = 0; split <= source.length; split++) {
        const tree = [
          source.slice(0, split),
          h("em", { key: "e" }, source.slice(split)),
        ];
        const html = `${escapeHtml(source.slice(0, split))}<em>${escapeHtml(source.slice(split))}</em>`;
        const reports = [
          instance.text(source, { detailed: true }),
          instance.html(html, { detailed: true }),
          transformReact(tree, { instance, detailed: true }),
        ];
        assert.equal(visible(reports[1].result), expected);
        assert.equal(visible(render(reports[2].result)), expected);
        for (const report of reports) verifyReport(report);
        unchanged(instance.text(reports[0].result, { detailed: true }));
        unchanged(instance.html(reports[1].result, { detailed: true }));
        unchanged(
          transformReact(reports[2].result, { instance, detailed: true }),
        );
      }
    }
  }
});
