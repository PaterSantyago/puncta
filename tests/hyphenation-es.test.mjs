import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement as h, Fragment } from "react";
import { createPuncta } from "../packages/core/dist/index.mjs";
import { enGb } from "../packages/with-en-gb/dist/index.mjs";
import { esEs } from "../packages/with-es-es/dist/index.mjs";
import { transformReact } from "../packages/with-react/dist/pure.mjs";
const positive = JSON.parse(
  readFileSync(new URL("./fixtures/hyphenation/es-es.json", import.meta.url)),
).entries;
const negative = JSON.parse(
  readFileSync(
    new URL("./fixtures/hyphenation/es-es-negative.json", import.meta.url),
  ),
).entries;
const es = createPuncta({
  locales: [enGb, esEs],
  locale: "es-es",
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

test("the entire independently frozen Spanish corpus passes all three inputs", () => {
  const omissions = [];
  for (const entry of positive) {
    const report = es.text(entry.source, {
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
    assert.equal(es.html(entry.source), report.result, entry.source);
    assert.equal(
      transformReact(entry.source, { instance: es }),
      report.result,
      entry.source,
    );
    assert.deepEqual(
      es.text(report.result, { detailed: true }).edits,
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
    "Spanish optional omissions (not errors):",
    JSON.stringify(omissions),
  );
  console.log(
    "Spanish optional omissions by category:",
    JSON.stringify(
      Object.fromEntries(
        [...new Set(omissions.flatMap((row) => row.categories))].map(
          (category) => [
            category,
            omissions
              .filter((row) => row.categories.includes(category))
              .reduce((count, row) => count + row.positions.length, 0),
          ],
        ),
      ),
    ),
  );
});

test("frozen negative policy and warning priority agree across inputs", () => {
  const instance = es.with({ rules: rulesOff });
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
  for (const entry of positive) {
    const expected = es.text(entry.source);
    for (let split = 1; split < entry.source.length; split++) {
      const left = entry.source.slice(0, split);
      const right = entry.source.slice(split);
      const report = transformReact(
        [left, h("em", { key: "kept", title: "same" }, right)],
        { instance: es, detailed: true },
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
        es.html(`${left}<em></em><b>${right}</b>`).replaceAll(/<[^>]*>/gu, ""),
        expected,
      );
    }
  }
});

test("NFC and NFD preserve original spelling and all grapheme seams", () => {
  for (const entry of positive) {
    for (const word of [
      entry.source,
      entry.source[0].toUpperCase() + entry.source.slice(1),
    ]) {
      const nfd = word.normalize("NFD");
      const expected = es.text(word).normalize("NFD");
      const first = es.text(nfd, { detailed: true });
      assert.equal(first.result, expected, word);
      assert.equal(first.result.replaceAll("\u00ad", ""), nfd, word);
      const boundaries = new Set(
        [
          ...new Intl.Segmenter("und", { granularity: "grapheme" }).segment(
            nfd,
          ),
        ].map((part) => part.index),
      );
      for (const edit of first.edits)
        assert(boundaries.has(edit.ranges[0].start), word);
      assert.deepEqual(es.text(first.result, { detailed: true }).edits, []);
      if (nfd === word) continue;
      for (let split = 1; split < nfd.length; split++) {
        const left = nfd.slice(0, split),
          right = nfd.slice(split);
        assert.equal(
          es
            .html(`${left}<!-- kept --><em>${right}</em>`)
            .replaceAll(/<[^>]*>/gu, ""),
          expected,
          word,
        );
        const report = transformReact(
          [left, h(Fragment, null, h("em", { key: "accent" }, right))],
          { instance: es, detailed: true },
        );
        assert.equal(flatten(report.result), expected, word);
        for (const edit of report.edits) {
          const range = edit.ranges[0];
          const position =
            range.sourceId === 0 ? range.start : split + range.start;
          assert(boundaries.has(position), word);
          assert.equal(range.sourceId, position <= split ? 0 : 1, word);
        }
      }
    }
  }
});

test("locale defaults, resets and independent scopes select the correct resource", () => {
  const english = es.with({ locale: "en-gb" });
  assert.equal(es.text("camino"), "ca\u00admi\u00adno");
  assert.equal(english.text("backbone"), "back\u00adbone");
  assert.equal(
    english.with({ locale: "es-es" }).text("camino"),
    "ca\u00admi\u00adno",
  );
  const explicit = es.with({ hyphenation: { minRight: 2 } });
  assert.throws(() => explicit.with({ locale: "en-gb" }), {
    code: "config.invalid-option",
  });
  assert.equal(
    explicit
      .with({ locale: "en-gb", hyphenation: { minRight: null } })
      .text("backbone"),
    "back\u00adbone",
  );
  const markup = 'camino <span lang="en"> backbone </span> camino';
  const expected =
    'ca\u00admi\u00adno <span lang="en"> back\u00adbone </span> ca\u00admi\u00adno';
  assert.equal(es.html(markup), expected);
  assert.throws(() => explicit.html(markup), { code: "config.invalid-option" });
  assert.equal(
    explicit
      .html(
        '<span lang="en" data-puncta-options=\'{"hyphenation":{"minRight":null}}\'> backbone </span>',
      )
      .includes("back\u00adbone"),
    true,
  );
  const tree = ["camino ", h("span", { lang: "en" }, " backbone "), " camino"];
  assert.equal(
    flatten(transformReact(tree, { instance: es })),
    "ca\u00admi\u00adno  back\u00adbone  ca\u00admi\u00adno",
  );
  assert.throws(() => transformReact(tree, { instance: explicit }), {
    code: "config.invalid-option",
  });
  const strict = es.with({ hyphenation: { minLeft: 4, minRight: 3 } });
  for (let run = 0; run < 5; run++) {
    assert.equal(strict.text("camino"), "camino");
    assert.equal(es.text("camino"), "ca\u00admi\u00adno");
    assert.equal(english.text("backbone"), "back\u00adbone");
  }
});

test("ambiguity warnings have original ranges, repeat without edits and respect opaque edges", () => {
  const source = "😀  atlético... atlético atlético";
  const report = es.text(source, { detailed: true });
  const warnings = report.warnings.filter(
    (warning) => warning.code === "hyphenation.language-ambiguity",
  );
  assert.equal(warnings.length, 3);
  assert.deepEqual(
    warnings.map((warning) => warning.location.ranges[0]),
    [
      { sourceId: 0, start: 4, end: 12 },
      { sourceId: 0, start: 16, end: 24 },
      { sourceId: 0, start: 25, end: 33 },
    ],
  );
  const second = es.text(report.result, { detailed: true });
  assert.deepEqual(second.edits, []);
  assert.deepEqual(second.appliedRules, []);
  assert.equal(second.warnings.length, 3);
  for (const markup of [
    "camino<code>x</code>",
    "<code>x</code>camino",
    "atlético<code>x</code>",
    'camino<span lang="en">backbone</span>',
  ]) {
    const result = es.html(markup, { detailed: true });
    assert.deepEqual(result.edits, [], markup);
    assert.deepEqual(result.warnings, [], markup);
  }
  assert.equal(
    es.html("camino<br>camino"),
    "ca\u00admi\u00adno<br>ca\u00admi\u00adno",
  );
  const entity = es.html("&#x1f600; ca<em>mi&#110;o</em>", { detailed: true });
  assert.deepEqual(entity.edits[0].ranges[0], {
    sourceId: 0,
    start: 5,
    end: 5,
    inputRange: { accuracy: "exact", start: 12, end: 12 },
  });
});

test("manual SHY and protection remain authoritative across leaves", () => {
  assert.equal(es.text("ca\u00admino"), "ca\u00admino");
  assert.equal(es.html("ca<em>\u00admino</em>"), "ca<em>\u00admino</em>");
  assert.equal(
    flatten(
      transformReact(["ca", h("em", null, "\u00admino")], { instance: es }),
    ),
    "ca\u00admino",
  );
  assert.equal(es.stripSoftHyphens("ca\u00admino"), "camino");
  assert.equal(
    es.stripSoftHyphens("ca\u00admino <code>ca\u00admino</code>", {
      format: "html",
    }),
    "camino <code>ca\u00admino</code>",
  );
  assert.equal(
    es.text("camino", { protect: [{ start: 0, end: 6 }] }),
    "camino",
  );
  assert.equal(
    es.with({ hyphenation: { enabled: false } }).text("camino"),
    "camino",
  );
});

test("Spanish resources are immutable snapshots and reject incompatible data", () => {
  const key = Symbol.for("@use-puncta/hyphenation");
  assert(Object.isFrozen(esEs[key].table[1]));
  const candidate = structuredClone(esEs[key]);
  const instance = createPuncta({
    locales: [{ ...esEs, [key]: candidate }],
    locale: "es-es",
    hyphenation: { enabled: true },
  });
  for (const weights of candidate.table[0]) weights.fill(0);
  assert.equal(instance.text("camino"), "ca\u00admi\u00adno");
  for (const value of [
    undefined,
    { ...esEs[key], locale: "en-gb" },
    { ...esEs[key], revision: "es-es-2" },
    { ...esEs[key], table: [[[1]], { α: 0 }] },
  ]) {
    const disabled = createPuncta({
      locales: [{ ...esEs, [key]: value }],
      locale: "es-es",
    });
    assert.throws(() => disabled.with({ hyphenation: { enabled: true } }), {
      code:
        value === undefined
          ? "hyphenation.resource-unavailable"
          : "hyphenation.resource-incompatible",
    });
  }
});

test("normalization cannot widen the source alphabet through Kelvin sign", () => {
  for (const locale of ["es-es", "en-gb"]) {
    const instance = es.with({ locale, rules: rulesOff });
    for (const word of ["Kamino", "Kelvin", "aKamino"]) {
      const report = instance.text(word, { detailed: true });
      assert.equal(report.result, word);
      assert.deepEqual(report.edits, []);
      // Interior uppercase is the earlier expected mixed-case skip.
      assert.deepEqual(
        report.warnings.map((warning) => warning.code),
        word[0] === "K" ? ["hyphenation.unsupported-characters"] : [],
      );
    }
    assert.deepEqual(instance.text("Kelvin", { detailed: true }).warnings, []);
  }
});

test("SHY and ellipsis cannot release technical-token guards on a later call", () => {
  for (const source of [
    "–t@xample.m--",
    "—t@xample.m--",
    "t@xample.m--r--",
    "‘’v1.2.3...",
    "‘bookkeepers’v1.2.3...",
  ]) {
    for (const rules of [
      {},
      { dashes: { normalizeExisting: false } },
      {
        units: { enabled: false, additional: ["rpm"] },
        ranges: { standalone: true },
      },
    ]) {
      const instance = es.with({ rules });
      for (const transform of [
        (text) => instance.text(text, { detailed: true }),
        (text) => instance.html(text, { detailed: true }),
        (text) => transformReact(text, { instance, detailed: true }),
      ]) {
        const first = transform(source);
        const second = transform(first.result);
        assert.equal(second.result, first.result, source);
        assert.deepEqual(second.edits, [], source);
        assert.deepEqual(second.appliedRules, [], source);
      }
    }
  }
  assert.equal(es.text("‘’v1.2.3... and..."), "‘’v1.2.3... and…");
});

test("generated Spanish typography remains idempotent and reports replay on the original", () => {
  const atoms = [
    "camino",
    "télefono",
    "pingüino",
    "atlético",
    "24",
    "10-12",
    "'",
    '"',
    "--",
    "...",
    "  ",
    ":",
    "kg",
    "EUR",
    "\u00ad",
    "ca‐mino",
    "'s",
    "test@example.com",
    "v1.2.3",
  ];
  let seed = 510;
  const generated = new Set();
  for (let run = 0; run < 2000; run++) {
    let source = "";
    for (let index = 0; index < 6; index++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      source += atoms[Math.floor((seed / 2 ** 32) * atoms.length)];
    }
    generated.add(source);
    const first = es.text(source, { detailed: true });
    let replay = source;
    for (const edit of [...first.edits].reverse()) {
      const range = edit.ranges[0];
      assert.equal(source.slice(range.start, range.end), edit.before, source);
      replay =
        replay.slice(0, range.start) + edit.after + replay.slice(range.end);
    }
    assert.equal(replay, first.result, source);
    const second = es.text(first.result, { detailed: true });
    assert.equal(second.result, first.result, source);
    assert.deepEqual(second.edits, [], source);
    assert.deepEqual(second.appliedRules, [], source);
  }
  assert(generated.size > 1900);
});
