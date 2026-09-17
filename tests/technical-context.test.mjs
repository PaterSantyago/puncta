import assert from "node:assert/strict";
import { test } from "node:test";
import { createPuncta } from "../packages/core/dist/index.mjs";
import { enGb } from "../packages/with-en-gb/dist/index.mjs";
import { esEs } from "../packages/with-es-es/dist/index.mjs";

// Characterization of the public reports before the performance change
// (3a93a08). The existing locale corpora supply independent linguistic oracles.
const joining =
  "Removing this interval would create an ambiguous technical token.";
const period = "Period spacing is ambiguous; its interval was preserved.";
function warning(locale, start, end, message, ruleId = "spaces") {
  return {
    code: "typography.ambiguous",
    source: "rule",
    message,
    details: {},
    locale,
    ruleId,
    location: { kind: "text", ranges: [{ sourceId: 0, start, end }] },
  };
}
function unchanged(source, warnings) {
  return {
    result: source,
    hasEdits: false,
    outputChanged: false,
    edits: [],
    sources: [{ id: 0, text: source, path: [] }],
    appliedRules: [],
    warnings,
  };
}
for (const locale of [enGb, esEs]) {
  const instance = createPuncta({ locales: [locale], locale: locale.id });
  test(`${locale.id}: unchanged spacing still reports technical ambiguity in original UTF-16 coordinates`, () => {
    const source = "😀 user \u00ad@example.org";
    assert.deepEqual(
      instance.text(source, { detailed: true }),
      unchanged(source, [
        warning(locale.id, 7, 8, joining),
        warning(locale.id, 17, 18, period),
      ]),
    );
    assert.deepEqual(
      instance.text(source, {
        detailed: true,
        protect: [{ start: 3, end: source.length }],
      }),
      unchanged(source, []),
    );
    assert.deepEqual(
      instance.text(source, {
        detailed: true,
        rules: { spaces: { enabled: false } },
      }),
      unchanged(source, []),
    );
  });
  test(`${locale.id}: quoted email lookahead includes spaces inside its local part`, () => {
    const source = '"first last" @example.org';
    assert.deepEqual(
      instance.text(source, {
        detailed: true,
        rules: { quotes: { enabled: false } },
      }),
      unchanged(source, [
        warning(locale.id, 12, 13, joining),
        warning(locale.id, 21, 22, period),
      ]),
    );
  });
  test(`${locale.id}: long indentation and adjacent ellipsis intervals preserve original warnings`, () => {
    const indentation = " ".repeat(4000);
    assert.deepEqual(
      instance.text(indentation, { detailed: true }),
      unchanged(indentation, []),
    );
    const source = `${indentation}…  a  …`;
    assert.deepEqual(
      instance.text(source, { detailed: true }),
      unchanged(source, [
        warning(
          locale.id,
          0,
          4003,
          "Ellipsis spacing is ambiguous; its intervals were preserved.",
        ),
        warning(
          locale.id,
          4004,
          4007,
          "Ellipsis spacing is ambiguous; its intervals were preserved.",
        ),
      ]),
    );
  });
}

test("SHY-hidden technical context guards ellipsis while independent dash edits keep their original ranges", () => {
  const instance = createPuncta({ locales: [enGb], locale: enGb.id });
  const source = "a\u00ad:word... text -- other";
  assert.deepEqual(instance.text(source, { detailed: true }), {
    result: "a\u00ad:word... text – other",
    hasEdits: true,
    outputChanged: true,
    edits: [
      {
        kind: "replace",
        before: "--",
        after: "–",
        locale: "en-gb",
        ruleIds: ["dashes"],
        ranges: [{ sourceId: 0, start: 16, end: 18 }],
      },
    ],
    sources: [{ id: 0, text: source, path: [] }],
    appliedRules: [{ ruleId: "dashes", locale: "en-gb" }],
    warnings: [
      warning(
        "en-gb",
        7,
        10,
        "Replacing these dots would alter ambiguous technical context.",
        "ellipsis",
      ),
    ],
  });
});
