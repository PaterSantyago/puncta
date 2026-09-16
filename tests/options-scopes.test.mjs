import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createPuncta,
  PunctaConfigError,
} from "../packages/core/dist/index.mjs";
import { enGb } from "../packages/with-en-gb/dist/index.mjs";
import { esEs } from "../packages/with-es-es/dist/index.mjs";

const make = (options = {}) =>
  createPuncta({ locales: [enGb, esEs], locale: "en-gb", ...options });

test("with snapshots explicit options and reset restores the effective locale defaults", () => {
  const settings = {
    rules: { ellipsis: { enabled: false }, units: { additional: ["rpm"] } },
  };
  const original = make(settings);
  const child = original.with({ rules: { ellipsis: { enabled: true } } });
  settings.rules.ellipsis.enabled = true;
  settings.rules.units.additional.push("bad ");
  assert.equal(original.text("..."), "...");
  assert.equal(child.text("..."), "…");
  assert.equal(
    original.with({ rules: { ellipsis: { enabled: undefined } } }).text("..."),
    "...",
  );
  assert.equal(
    original.with({ rules: { ellipsis: { enabled: null } } }).text("..."),
    "…",
  );
  assert.equal(original.with({ rules: { ellipsis: null } }).text("..."), "…");
  assert.equal(
    original
      .with({ enabled: false })
      .text("...", { enabled: true, rules: { ellipsis: null } }),
    "…",
  );
  assert.notEqual(original.with({}), original);
  const spanish = make({ locale: "es-es", hyphenation: { minRight: 2 } });
  assert.throws(
    () => spanish.with({ locale: "en-gb" }),
    (error) =>
      error instanceof PunctaConfigError &&
      error.optionPath.join(".") === "hyphenation.minRight",
  );
  assert.equal(
    spanish
      .with({ locale: "en-gb", hyphenation: { minRight: null } })
      .text("..."),
    "…",
  );
  assert.equal(
    make({ locale: "es-es" }).with({ locale: "en-gb" }).text("..."),
    "…",
  );
});

test("HTML scopes preserve same-language inline context, isolate explicit scopes, and resume below unknown lang", () => {
  const instance = make();
  assert.equal(instance.html('.<b lang="EN">.</b>.'), '…<b lang="EN"></b>');
  assert.equal(
    instance.html('.<b data-puncta="">.</b>.'),
    '.<b data-puncta="">.</b>.',
  );
  const report = instance.html(
    '<span lang="fr">...<i lang="es">...</i>...</span>...',
    { detailed: true },
  );
  assert.equal(
    report.result,
    '<span lang="fr">...<i lang="es">…</i>...</span>…',
  );
  assert.deepEqual(
    report.edits.map((e) => e.locale),
    ["es-es", "en-gb"],
  );
  assert.equal(report.warnings[0].code, "markup.language-unavailable");
  assert.deepEqual(report.warnings[0].details, {
    value: "fr",
    reason: "unsupported",
  });
  assert.equal(report.warnings[0].locale, null);
  assert.deepEqual(report.warnings[0].location, {
    kind: "attribute",
    path: [0],
    name: "lang",
    inputRange: { accuracy: "exact", start: 6, end: 15 },
  });
  assert.equal(
    instance.html('<b lang="fr" data-puncta-locale="es-es">...</b>'),
    '<b lang="fr" data-puncta-locale="es-es">…</b>',
  );
  assert.equal(
    instance.html(
      `<b data-puncta-options='{"rules":{"ellipsis":{"enabled":false}}}'>...<i data-puncta-options='{"rules":{"ellipsis":null}}'>...</i></b>`,
    ),
    '<b data-puncta-options="{&quot;rules&quot;:{&quot;ellipsis&quot;:{&quot;enabled&quot;:false}}}">...<i data-puncta-options="{&quot;rules&quot;:{&quot;ellipsis&quot;:null}}">…</i></b>',
  );
});

test("React Provider owns settings without transforming children; pure results use render-time Context", async () => {
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
  const instance = make();
  const nested = h(
    PunctaProvider,
    { options: { rules: { ellipsis: { enabled: false } } } },
    "...",
    h(Puncta, null, "..."),
    h(Puncta, { options: { rules: { ellipsis: null } } }, "..."),
  );
  const output = renderToString(
    h(Puncta, { instance }, h("p", null, "..."), nested),
  );
  assert.equal(output.replaceAll("<!-- -->", ""), "<p>…</p>......…");
  assert.equal(renderToString(h(PunctaProvider, { instance }, "...")), "...");
  const child = h(Puncta, null, "...");
  assert.equal(transformReact(child, { instance }), child);
  assert.throws(
    () => renderToString(child),
    (e) => e.code === "instance.missing",
  );
  assert.equal(
    renderToString(
      h(
        PunctaProvider,
        { instance, options: { rules: { ellipsis: { enabled: false } } } },
        transformReact(child, { instance }),
      ),
    ),
    "...",
  );
  assert.throws(
    () =>
      renderToString(
        h(PunctaProvider, { instance }, h(Puncta, { instance }, "...")),
      ),
    (e) => e.code === "instance.nested",
  );
  const marked = h("span", { lang: "es" }, h(Puncta, null, "..."));
  assert.equal(
    renderToString(h(Puncta, { instance }, marked)),
    '<span lang="es">…</span>',
  );
  assert.equal(
    renderToString(
      h(
        Puncta,
        { instance, enabled: false },
        h(Puncta, { enabled: true }, "..."),
      ),
    ),
    "...",
  );
});

test("all shared option forms validate strictly, including disabled rules and reset containers", async () => {
  const { transformReact } = await import(
    "../packages/with-react/dist/pure.mjs"
  );
  const groups = [
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
  ];
  const instance = make({
    rules: Object.fromEntries(
      groups.map((group) => [group, { enabled: false }]),
    ),
  });
  for (const group of groups) {
    assert.equal(
      instance.with({ rules: { [group]: null } }).text("..."),
      group === "ellipsis" ? "…" : "...",
    );
  }
  for (const options of [
    {
      rules: {
        quotes: { normalizeExisting: false },
        dashes: { normalizeExisting: null },
        ranges: { standalone: true },
        units: { additional: ["rpm", "RPM", "rpm"] },
        percentages: { space: "nbsp" },
      },
    },
    { rules: { percentages: { space: "none" }, units: { additional: [] } } },
    {
      hyphenation: {
        enabled: false,
        minWordLength: 6,
        minLeft: 2,
        minRight: 3,
      },
    },
    { hyphenation: null },
  ])
    assert.equal(make().with(options).text("..."), "…");
  const invalid = [
    [{ locales: [esEs] }, ["locales"], "unknown"],
    [{ locale: null }, ["locale"], "type"],
    [{ enabled: null }, ["enabled"], "type"],
    [{ rules: null }, ["rules"], "type"],
    [{ rules: { ellipsis: true } }, ["rules", "ellipsis"], "type"],
    [{ rules: { typo: undefined } }, ["rules", "typo"], "unknown"],
    [
      { rules: { quotes: { style: "custom" } } },
      ["rules", "quotes", "style"],
      "unknown",
    ],
    [
      { rules: { ellipsis: { enabled: "false" } } },
      ["rules", "ellipsis", "enabled"],
      "type",
    ],
    [
      { rules: { percentages: { enabled: false, space: "thin" } } },
      ["rules", "percentages", "space"],
      "value",
    ],
    [
      { rules: { units: { additional: ["rpm", " bad"] } } },
      ["rules", "units", "additional", 1],
      "value",
    ],
    [
      { rules: { units: { additional: ["r\nPm"] } } },
      ["rules", "units", "additional", 0],
      "value",
    ],
    [
      { rules: { units: { additional: [3] } } },
      ["rules", "units", "additional", 0],
      "type",
    ],
    [
      { hyphenation: { enabled: false, minRight: 2 } },
      ["hyphenation", "minRight"],
      "value",
    ],
    [{ hyphenation: { minLeft: 1 } }, ["hyphenation", "minLeft"], "value"],
    [
      { hyphenation: { minWordLength: 6.5 } },
      ["hyphenation", "minWordLength"],
      "value",
    ],
    [
      { hyphenation: { minWordLength: NaN } },
      ["hyphenation", "minWordLength"],
      "value",
    ],
    [
      { hyphenation: { minRight: Infinity } },
      ["hyphenation", "minRight"],
      "value",
    ],
  ];
  for (const [options, path, reason] of invalid) {
    for (const invoke of [
      () => instance.with(options),
      () => instance.text("", options),
      () => instance.html("", options),
      () => transformReact(null, { instance, ...options }),
    ]) {
      assert.throws(
        invoke,
        (e) =>
          e instanceof PunctaConfigError &&
          e.code === "config.invalid-option" &&
          JSON.stringify(e.optionPath) === JSON.stringify(path) &&
          e.details.reason === reason,
      );
    }
  }
  assert.throws(
    () => transformReact(null, { instance: {} }),
    (e) => e instanceof PunctaConfigError && e.optionPath[0] === "instance",
  );
});

test("language warnings and markup errors carry stable paths and protection takes precedence", async () => {
  const { createElement: h } = await import("react");
  const { transformReact } = await import(
    "../packages/with-react/dist/pure.mjs"
  );
  const instance = make({ locales: [enGb] });
  for (const [value, reason] of [
    ["", "empty"],
    ["en_US", "invalid"],
    ["en-US", "unsupported"],
    ["es", "not-loaded"],
  ]) {
    const html = instance.html(`<span lang="${value}">...</span>`, {
      detailed: true,
    });
    const react = transformReact(h("span", { lang: value }, "..."), {
      instance,
      detailed: true,
    });
    for (const report of [html, react]) {
      assert.equal(report.hasEdits, false);
      assert.equal(report.warnings.length, 1);
      assert.equal(report.warnings[0].code, "markup.language-unavailable");
      assert.deepEqual(report.warnings[0].details, { value, reason });
      assert.equal(report.warnings[0].location.name, "lang");
    }
    assert.deepEqual(react.warnings[0].location, {
      kind: "attribute",
      path: [],
      name: "lang",
    });
  }
  for (const [attributes, code, path, name] of [
    [
      { "data-puncta": "on" },
      "config.invalid-option",
      ["data-puncta"],
      "data-puncta",
    ],
    [
      { "data-puncta-locale": "es-es" },
      "locale.unavailable",
      ["locale"],
      "data-puncta-locale",
    ],
    [
      { "data-puncta-locale": "EN" },
      "locale.unavailable",
      ["locale"],
      "data-puncta-locale",
    ],
    [
      { "data-puncta-options": "{" },
      "markup.invalid-config",
      [],
      "data-puncta-options",
    ],
    [
      { "data-puncta-options": "null" },
      "config.invalid-option",
      [],
      "data-puncta-options",
    ],
    [
      { "data-puncta-options": '{"locale":"es-es"}' },
      "config.invalid-option",
      ["locale"],
      "data-puncta-options",
    ],
    [
      { "data-puncta-options": '{"hyphenation":{"minRight":2}}' },
      "config.invalid-option",
      ["hyphenation", "minRight"],
      "data-puncta-options",
    ],
  ]) {
    const htmlAttrs = Object.entries(attributes)
      .map(([key, value]) => `${key}='${value}'`)
      .join(" ");
    for (const invoke of [
      () => instance.html(`<span ${htmlAttrs}>...</span>`),
      () => transformReact(h("span", attributes, "..."), { instance }),
    ]) {
      assert.throws(
        invoke,
        (e) =>
          e instanceof PunctaConfigError &&
          e.code === code &&
          JSON.stringify(e.optionPath) === JSON.stringify(path) &&
          e.location.kind === "attribute" &&
          e.location.name === name,
      );
    }
  }
  for (const tag of ["code", "pre"]) {
    assert.equal(
      instance.html(`<${tag} data-puncta-options='{'>...</${tag}>`),
      `<${tag} data-puncta-options="{">...</${tag}>`,
    );
    assert.equal(
      transformReact(h(tag, { "data-puncta-options": "{" }, "..."), {
        instance,
      }).props.children,
      "...",
    );
  }
  assert.equal(
    instance.html(
      `<b data-puncta='off' data-puncta-options='{'>...<i data-puncta-locale='es-es'>...</i></b>`,
    ),
    '<b data-puncta="off" data-puncta-options="{">...<i data-puncta-locale="es-es">...</i></b>',
  );
  assert.deepEqual(
    instance.html('<span lang="fr">...</span>', {
      enabled: false,
      detailed: true,
    }).warnings,
    [],
  );
  assert.throws(
    () => instance.html('<span lang="en">...</span>', { locale: "es-es" }),
    (e) => e.code === "locale.unavailable",
  );
});

test("component own arguments validate inside protection and opaque children inherit settings", async () => {
  const { createElement: h } = await import("react");
  const { renderToString } = await import(
    "../examples/ssr/node_modules/react-dom/server.node.js"
  );
  const { Puncta, PunctaProvider } = await import(
    "../packages/with-react/dist/index.mjs"
  );
  const instance = make({ locales: [enGb] });
  const Later = () => h(Puncta, { enabled: true }, "...");
  assert.equal(
    renderToString(h(Puncta, { instance }, h("code", null, h(Later)))),
    "<code>...</code>",
  );
  assert.equal(
    renderToString(
      h(
        PunctaProvider,
        { instance },
        h("span", { "data-puncta": "off" }, h(Later)),
      ),
    ),
    '<span data-puncta="off">...</span>',
  );
  for (const [props, code] of [
    [{ locale: "es-es" }, "locale.unavailable"],
    [{ instance }, "instance.nested"],
    [{ options: { hyphenation: { minRight: 2 } } }, "config.invalid-option"],
  ]) {
    assert.throws(
      () =>
        renderToString(
          h(
            PunctaProvider,
            { instance, enabled: false },
            h(Puncta, props, "..."),
          ),
        ),
      (e) => e instanceof PunctaConfigError && e.code === code,
    );
  }
  assert.equal(
    renderToString(
      h(Puncta, { instance }, h("span", { lang: "fr" }, h(Later))),
    ),
    '<span lang="fr">...</span>',
  );
  const Resume = () => h(Puncta, { locale: "en-gb" }, "...");
  assert.equal(
    renderToString(
      h(Puncta, { instance }, h("span", { lang: "fr" }, h(Resume))),
    ),
    '<span lang="fr">…</span>',
  );
});
