import assert from "node:assert/strict";
import test from "node:test";
import { createElement as h } from "react";
import { createPuncta } from "../packages/core/dist/index.mjs";
import { enGb } from "../packages/with-en-gb/dist/index.mjs";
import { transformReact } from "../packages/with-react/dist/pure.mjs";

test("English insertion is synchronously ready in text, HTML and React", () => {
  const instance = createPuncta({
    locales: [enGb],
    locale: "en-gb",
    hyphenation: { enabled: true },
  });
  assert.equal(instance.text("backbone"), "back\u00adbone");
  assert.equal(instance.html("back<em>bone</em>"), "back\u00ad<em>bone</em>");
  const tree = transformReact(["back", h("em", null, "bone")], { instance });
  assert.equal(tree[0], "back\u00ad");
  assert.equal(tree[1].props.children, "bone");
});

test("SHY cannot expose a unit prefix on a later typographic pass", () => {
  const instance = createPuncta({
    locales: [enGb],
    locale: "en-gb",
    hyphenation: { enabled: true },
  });
  for (const source of [
    "2 kgberd",
    "10-12  kgbookend...----1word...",
    "10-12 kgbookend",
    "24 kgbookend",
    "24 mbackbone",
    "20 GBPbookend",
  ]) {
    const options = {
      rules: { dashes: { normalizeExisting: false } },
      detailed: true,
    };
    const first = instance.text(source, options);
    const second = instance.text(first.result, options);
    assert.equal(second.result, first.result, source);
    assert.deepEqual(second.edits, [], source);
    assert.deepEqual(second.appliedRules, [], source);
  }
});

const { readFileSync } = await import("node:fs");
const { esEs } = await import("../packages/with-es-es/dist/index.mjs");
const positive = JSON.parse(
  readFileSync(new URL("./fixtures/hyphenation/en-gb.json", import.meta.url)),
).entries;
const negative = JSON.parse(
  readFileSync(
    new URL("./fixtures/hyphenation/en-gb-negative.json", import.meta.url),
  ),
).entries;
const en = createPuncta({
  locales: [enGb, esEs],
  locale: "en-gb",
  hyphenation: { enabled: true },
});
const rulesOff = Object.fromEntries(
  [
    "quotes",
    "apostrophes",
    "spaces",
    "ellipsis",
    "dashes",
    "ranges",
    "minus",
    "units",
    "percentages",
    "currencies",
  ].map((name) => [name, { enabled: false }]),
);
function positions(text) {
  const result = [];
  let offset = 0;
  for (const character of text) {
    if (character === "\u00ad") result.push(offset);
    else offset += character.length;
  }
  return result;
}
function flatten(tree) {
  if (typeof tree === "string" || typeof tree === "number") return String(tree);
  if (Array.isArray(tree)) return tree.map(flatten).join("");
  return tree ? flatten(tree.props.children) : "";
}

test("the entire independently frozen English corpus passes all three inputs", () => {
  const omissions = [];
  for (const entry of positive) {
    const report = en.text(entry.source, {
      hyphenation: entry.settings,
      detailed: true,
    });
    const actual = positions(report.result);
    assert.equal(report.result.replaceAll("\u00ad", ""), entry.source);
    assert.deepEqual(
      actual.filter((position) => !entry.allowedPositions.includes(position)),
      [],
      `${entry.source}: extra`,
    );
    assert.deepEqual(
      entry.requiredPositions.filter((position) => !actual.includes(position)),
      [],
      `${entry.source}: required`,
    );
    assert.equal(en.html(entry.source), report.result, entry.source);
    assert.equal(
      transformReact(entry.source, { instance: en }),
      report.result,
      entry.source,
    );
    assert.deepEqual(
      en.text(report.result, { detailed: true }).edits,
      [],
      entry.source,
    );
    assert.deepEqual(
      report.edits.map((edit) => edit.ranges[0].start),
      actual,
    );
    assert(
      report.edits.every(
        (edit) =>
          edit.kind === "insert" &&
          edit.before === "" &&
          edit.after === "\u00ad" &&
          edit.ruleIds[0] === "hyphenation.insert",
      ),
    );
    assert.deepEqual(report.warnings, []);
    const missed = entry.allowedPositions.filter(
      (position) => !actual.includes(position),
    );
    if (missed.length)
      omissions.push({
        word: entry.source,
        positions: missed,
        categories: entry.categories,
      });
  }
  console.log(
    "English optional omissions (not errors):",
    JSON.stringify(omissions),
  );
  console.log(
    "Removed-exception words:",
    JSON.stringify(
      omissions.filter((row) =>
        row.categories.includes("removed-exception-word"),
      ),
    ),
  );
});

test("frozen negative policy and warning priority agree across inputs", () => {
  const instance = en.with({ rules: rulesOff });
  for (const entry of negative) {
    const options = { hyphenation: entry.settings, detailed: true };
    const plain = instance.text(entry.source, {
      ...options,
      ...(entry.protected
        ? { protect: [{ start: 0, end: entry.source.length }] }
        : {}),
    });
    const html = instance.html(
      entry.protected ? `<code>${entry.source}</code>` : entry.source,
      options,
    );
    const react = transformReact(
      entry.protected ? h("code", null, entry.source) : entry.source,
      { instance, ...options },
    );
    assert.equal(plain.result, entry.expectedSourceAfterHyphenation, entry.id);
    assert.equal(
      html.result,
      entry.protected ? `<code>${entry.source}</code>` : entry.source,
      entry.id,
    );
    assert.equal(flatten(react.result), entry.source, entry.id);
    for (const report of [plain, html, react]) {
      assert.deepEqual(report.edits, [], entry.id);
      assert.deepEqual(
        report.warnings.map((warning) => warning.code),
        entry.expectedDiagnostics.detailed,
        entry.id,
      );
    }
  }
});

test("every transparent split preserves the word and puts seam insertions in the left leaf", () => {
  for (const entry of positive
    .filter((entry) => entry.requiredPositions.length)
    .slice(0, 15)) {
    const expected = en.text(entry.source);
    for (let split = 1; split < entry.source.length; split++) {
      const left = entry.source.slice(0, split);
      const right = entry.source.slice(split);
      const report = transformReact(
        [left, h("em", { key: "kept", title: "same" }, right)],
        { instance: en, detailed: true },
      );
      assert.equal(flatten(report.result), expected);
      assert.equal(report.result[1].key, "kept");
      assert.equal(report.result[1].props.title, "same");
      for (const edit of report.edits) {
        const range = edit.ranges[0];
        const originalPosition =
          range.sourceId === 0 ? range.start : split + range.start;
        assert.equal(range.sourceId, originalPosition <= split ? 0 : 1);
      }
      assert.equal(
        en.html(`${left}<em></em><b>${right}</b>`).replaceAll(/<[^>]*>/gu, ""),
        expected,
      );
    }
  }
});

test("opaque and locale edges preserve adjoining words without inspecting protection", () => {
  for (const markup of [
    "backbone<code>tail</code>",
    "<code>head</code>backbone",
    'backbone<span data-puncta="">bookend</span>',
    'backbone<span lang="es" data-puncta-options=\'{"hyphenation":{"enabled":false}}\'>bookend</span>',
  ])
    assert.deepEqual(en.html(markup, { detailed: true }).edits, []);
  assert.equal(
    en.html("backbone <code>tail</code>"),
    "back\u00adbone <code>tail</code>",
  );
  assert.equal(
    en.html("backbone<br>bookend"),
    "back\u00adbone<br>book\u00adend",
  );
  assert.equal(
    en.text("backbone!tail", { protect: [{ start: 9, end: 13 }] }),
    "back\u00adbone!tail",
  );
  assert.equal(
    en.text("backbonetail", { protect: [{ start: 8, end: 12 }] }),
    "backbonetail",
  );
  assert.equal(en.html("back<em>\u00adbone</em>"), "back<em>\u00adbone</em>");
  const number = ["back", 123, "bone"];
  assert.deepEqual(transformReact(number, { instance: en }), number);
});

test("reports retain original UTF-16 positions through typography, entities and source leaves", () => {
  const source = '😀  "backbone"--bookend...';
  const first = en.text(source, { detailed: true });
  let replay = source;
  for (const edit of [...first.edits].reverse()) {
    const range = edit.ranges[0];
    assert.equal(source.slice(range.start, range.end), edit.before);
    replay =
      replay.slice(0, range.start) + edit.after + replay.slice(range.end);
  }
  assert.equal(replay, first.result);
  assert.deepEqual(en.text(first.result, { detailed: true }).edits, []);
  const html = en.html("&#x1f600; ba&#99;k<em>bone</em>", { detailed: true });
  assert.deepEqual(html.edits[0].ranges[0], {
    sourceId: 0,
    start: 7,
    end: 7,
    inputRange: { accuracy: "exact", start: 18, end: 18 },
  });
});

test("disabled and raised minima stay isolated and existing SHY remains authoritative", () => {
  assert.equal(
    en.with({ hyphenation: { enabled: false } }).text("backbone"),
    "backbone",
  );
  assert.equal(en.with({ enabled: false }).text("backbone"), "backbone");
  for (const hyphenation of [
    { minWordLength: 9 },
    { minLeft: 5 },
    { minRight: 5 },
  ])
    assert.equal(en.text("backbone", { hyphenation }), "backbone");
  assert.equal(en.text("backbone"), "back\u00adbone");
  assert.equal(en.text("ba\u00adckbone"), "ba\u00adckbone");
  assert.equal(en.stripSoftHyphens(en.text("backbone")), "backbone");
  assert.throws(() => en.with({ hyphenation: { minRight: 2 } }), {
    code: "config.invalid-option",
  });
  assert.throws(() => en.with({ locale: "es-es" }), {
    code: "hyphenation.resource-unavailable",
  });
  assert.equal(
    en
      .with({ locale: "es-es", hyphenation: { enabled: false } })
      .text("backbone"),
    "backbone",
  );
});

test("punctuation spacing does not create a technical mask on the next call", () => {
  for (const source of ["''24::bookend", "'foo'24::bookend"]) {
    for (const enabled of [true, false]) {
      const instance = en.with({ hyphenation: { enabled } });
      const text = instance.text(source);
      assert.equal(instance.text(text), text);
      const html = instance.html(source);
      assert.equal(instance.html(html), html);
      const react = transformReact(source, { instance });
      assert.equal(transformReact(react, { instance }), react);
    }
  }
});

test("word joiners next to technical gaps never expose a word fragment", () => {
  const source = '"backbone\'skg:"';
  const first = en.text(source);
  assert.equal(en.text(first), first);
  assert.equal(first.includes("\u00ad"), false);
  for (const word of [
    "backbone’http://example.com",
    "backbone-http://example.com",
  ]) {
    assert.equal(en.text(word).includes("\u00ad"), false);
    assert.equal(en.html(word).includes("\u00ad"), false);
    assert.equal(
      transformReact(word, { instance: en }).includes("\u00ad"),
      false,
    );
  }
});

test("missing and incompatible locale resources fail explicitly before any result", () => {
  const key = Symbol.for("@use-puncta/hyphenation");
  for (const [resource, code] of [
    [undefined, "hyphenation.resource-unavailable"],
    [{ ...enGb[key], format: 2 }, "hyphenation.resource-incompatible"],
    [{ ...enGb[key], locale: "es-es" }, "hyphenation.resource-incompatible"],
    [
      { ...enGb[key], localeVersion: "9.9.9" },
      "hyphenation.resource-incompatible",
    ],
    [{ ...enGb[key], table: [[], {}] }, "hyphenation.resource-incompatible"],
  ]) {
    const locale = { ...enGb, [key]: resource };
    const disabled = createPuncta({ locales: [locale], locale: "en-gb" });
    assert.equal(disabled.text("backbone"), "backbone");
    assert.throws(() => disabled.with({ hyphenation: { enabled: true } }), {
      code,
    });
    assert.throws(
      () => disabled.text("backbone", { hyphenation: { enabled: true } }),
      { code },
    );
    assert.throws(
      () =>
        createPuncta({
          locales: [locale],
          locale: "en-gb",
          hyphenation: { enabled: true },
        }),
      { code },
    );
    assert.equal(
      disabled.stripSoftHyphens("back\u00adbone", {
        hyphenation: { enabled: true },
      }),
      "backbone",
    );
  }
});

test("generated typography and word-boundary combinations are idempotent with SHY", () => {
  const atoms = [
    "backbone",
    "bookend",
    "kgberd",
    "24",
    "10-12",
    "'",
    '"',
    "--",
    "...",
    "  ",
    ":",
    "kg",
    "USD",
    "\u00ad",
    "back‐bone",
    "'s",
  ];
  let seed = 350;
  const generated = new Set();
  for (let run = 0; run < 2000; run++) {
    let source = "";
    for (let index = 0; index < 6; index++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      source += atoms[Math.floor((seed / 2 ** 32) * atoms.length)];
    }
    generated.add(source);
    const first = en.text(source);
    const second = en.text(first, { detailed: true });
    assert.equal(second.result, first, source);
    assert.deepEqual(second.edits, [], source);
    const stripped = en.stripSoftHyphens(first);
    assert.equal(en.stripSoftHyphens(stripped), stripped, source);
  }
  assert(
    generated.size > 1900,
    `only ${generated.size} distinct generated inputs`,
  );
});

test("different non-Latin scripts receive the specific warning in every input", () => {
  for (const [word, code] of [
    ["αβγабв", "hyphenation.mixed-scripts"],
    ["αβγαβγ", "hyphenation.unsupported-characters"],
    ["абвабв", "hyphenation.unsupported-characters"],
    ["α\u0301βγабв", "hyphenation.mixed-scripts"],
    ["אבגабв", "hyphenation.mixed-scripts"],
  ]) {
    for (const report of [
      en.text(word, { detailed: true }),
      en.html(word, { detailed: true }),
      transformReact(word, { instance: en, detailed: true }),
    ])
      assert.deepEqual(
        report.warnings.map((warning) => warning.code),
        [code],
        word,
      );
  }
});

test("whole-word possessives follow the shared quotation context across leaves and lines", () => {
  for (const enabled of [true, false]) {
    const instance = en.with({ rules: { apostrophes: { enabled } } });
    for (const marker of ["'", "’", "ʼ", "',", "'--"]) {
      const word = `bookkeepers${marker}`;
      for (const report of [
        instance.text(word, { detailed: true }),
        instance.html(`bookkeepers<em>${marker}</em>`, { detailed: true }),
        transformReact(["bookkeepers", h("em", null, marker)], {
          instance,
          detailed: true,
        }),
      ])
        assert.equal(
          report.edits.some((edit) =>
            edit.ruleIds.includes("hyphenation.insert"),
          ),
          false,
          word,
        );
    }
    assert.equal(
      instance.text("‘some\nbookkeepers’"),
      "‘some\nbook\u00adkeepers’",
    );
    assert.equal(
      instance.html("‘some<br>bookkeepers’"),
      "‘some<br>book\u00adkeepers’",
    );
    const tree = transformReact(
      ["‘some", h("br", { key: "line" }), "bookkeepers’"],
      {
        instance,
      },
    );
    assert.equal(tree[2], "book\u00adkeepers’");
    assert.equal(instance.text("'backbone'"), "‘back\u00adbone’");
    assert.equal(
      instance.html("‘some<code>x</code> bookkeepers’"),
      "‘some<code>x</code> book\u00adkeepers’",
    );
    const opaque = transformReact(
      ["‘some", h("code", { key: "code" }, "x"), " bookkeepers’"],
      { instance },
    );
    assert.equal(opaque[2], " book\u00adkeepers’");
  }
});
