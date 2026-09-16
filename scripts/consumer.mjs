import assert from "node:assert/strict";
import { readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as adapter from "@use-puncta/with-react";

const require = createRequire(import.meta.url);
const adapterRequire = createRequire(
  import.meta.resolve("@use-puncta/with-react"),
);
assert.equal(typeof adapter.Puncta, "function");
assert.equal("default" in adapter, false);
assert.equal(
  realpathSync(require.resolve("react")),
  realpathSync(adapterRequire.resolve("react")),
);
const core = import.meta.resolve(
  "@use-puncta/core",
  import.meta.resolve("@use-puncta/with-react"),
);
const { createPuncta, PunctaConfigError } = await import(core);
const { transformReact } = await import("@use-puncta/with-react/pure");
assert.equal(typeof createPuncta, "function");
assert.equal("localeId" in (await import(core)), false);
assert.throws(() => createPuncta(), { code: "config.invalid-option" });
assert.throws(() => createPuncta({ locales: [], locale: "en-gb" }), {
  code: "locale.unavailable",
});
assert.throws(() => transformReact("Wait..."), PunctaConfigError);
const app = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url)),
);
const expected = JSON.parse(
  readFileSync(new URL("./expected-versions.json", import.meta.url)),
);
function verifyVersion(name, entry = import.meta.resolve(name)) {
  let directory = dirname(fileURLToPath(entry));
  while (true) {
    let manifest;
    try {
      manifest = JSON.parse(readFileSync(join(directory, "package.json")));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    if (manifest?.name === name) {
      assert.equal(
        manifest.version,
        expected[name],
        `Installed version mismatch: ${name}`,
      );
      console.log(
        `${name}: requested ${app.dependencies[name] ?? "transitive"}, resolved ${manifest.version}`,
      );
      return;
    }
    const parent = dirname(directory);
    assert.notEqual(parent, directory, `Installed manifest missing: ${name}`);
    directory = parent;
  }
}
verifyVersion("@use-puncta/with-react");
verifyVersion("@use-puncta/core", core);
assert.equal(app.dependencies["@use-puncta/core"], undefined);
assert.equal(typeof globalThis.window, "undefined");
assert.equal(typeof globalThis.document, "undefined");
const { createElement } = await import("react");
const { renderToString } = await import("react-dom/server");
const selected = [];
const selectedLocales = [];
for (const [id, exportName] of [
  ["en-gb", "enGb"],
  ["es-es", "esEs"],
]) {
  const name = `@use-puncta/with-${id}`;
  if (!app.dependencies[name]) {
    assert.throws(() => require.resolve(name), { code: "MODULE_NOT_FOUND" });
    continue;
  }
  const module = await import(name);
  verifyVersion(name);
  assert.equal("default" in module, false);
  const locale = module[exportName];
  selectedLocales.push(locale);
  assert.equal(locale.id, id);
  assert.equal(locale.version, expected[name]);
  const instance = createPuncta({ locales: [locale], locale: locale.id });
  if (id === "en-gb") {
    const hyphenated = instance.with({ hyphenation: { enabled: true } });
    assert.equal(
      hyphenated.text("backbone bookend"),
      "back\u00adbone book\u00adend",
    );
    assert.equal(
      hyphenated.html("back<em>bone</em>"),
      "back\u00ad<em>bone</em>",
    );
    assert.equal(
      transformReact("backbone", { instance: hyphenated }),
      "back\u00adbone",
    );
    assert.equal(
      renderToString(
        createElement(adapter.Puncta, { instance: hyphenated }, "backbone"),
      ),
      "back\u00adbone",
    );
    assert.equal(
      hyphenated.stripSoftHyphens(hyphenated.text("backbone")),
      "backbone",
    );
  }
  if (id === "es-es") {
    const hyphenated = instance.with({ hyphenation: { enabled: true } });
    assert.equal(hyphenated.text("camino"), "ca\u00admi\u00adno");
    assert.equal(
      hyphenated.html("cami<em>no</em>"),
      "ca\u00admi\u00ad<em>no</em>",
    );
    assert.equal(
      transformReact("camino", { instance: hyphenated }),
      "ca\u00admi\u00adno",
    );
    assert.equal(
      renderToString(
        createElement(adapter.Puncta, { instance: hyphenated }, "camino"),
      ),
      "ca\u00admi\u00adno",
    );
    const decomposed = "tele\u0301fono";
    assert.equal(
      hyphenated.text(decomposed),
      "te\u00adle\u0301\u00adfo\u00adno",
    );
    assert.equal(
      hyphenated.text("atlético", { detailed: true }).warnings[0].code,
      "hyphenation.language-ambiguity",
    );
    assert.equal(
      hyphenated.stripSoftHyphens(hyphenated.text(decomposed)),
      decomposed,
    );
    const { createHash } = await import("node:crypto");
    const directory = dirname(require.resolve(name));
    const manifest = JSON.parse(
      readFileSync(join(directory, "..", "hyphenation-manifest.json")),
    );
    assert.equal(
      createHash("sha256")
        .update(
          JSON.stringify(locale[Symbol.for("@use-puncta/hyphenation")].table),
        )
        .digest("hex"),
      manifest.prepared.tableSha256,
    );
    assert.match(
      readFileSync(join(directory, "..", "NOTICE.md"), "utf8"),
      /Francesc Carmona/,
    );
  }
  const input = "😀 Wait... Wait....";
  const output = "😀 Wait… Wait....";
  assert.equal(instance.text(input), output);
  assert.equal(
    instance.html(`<span>${input}</span>`),
    `<span>${output}</span>`,
  );
  assert.equal(transformReact(input, { instance }), output);
  assert.equal(
    renderToString(createElement(adapter.Puncta, { instance }, input)),
    output,
  );
  const report = instance.text(input, { detailed: true });
  assert.deepEqual(report.edits[0].ranges, [
    { sourceId: 0, start: 7, end: 10 },
  ]);
  assert.equal(report.outputChanged, true);
  assert.equal(report.hasEdits, true);
  assert.equal(
    instance.text(report.result, { detailed: true }).hasEdits,
    false,
  );
  assert.throws(
    () => instance.text(input, { locale: id === "en-gb" ? "es-es" : "en-gb" }),
    { code: "locale.unavailable" },
  );
  const localeCore = import.meta.resolve(
    "@use-puncta/core",
    import.meta.resolve(name),
  );
  assert.equal(realpathSync(new URL(localeCore)), realpathSync(new URL(core)));
  selected.push(
    createElement(adapter.Puncta, { instance, key: id }, "Wait..."),
  );
}
if (selected.length === 2)
  assert.equal(renderToString(selected), "Wait…<!-- -->Wait…");
if (selectedLocales.length === 2) {
  const spanish = createPuncta({
    locales: selectedLocales,
    locale: "es-es",
    hyphenation: { enabled: true },
  });
  const english = spanish.with({ locale: "en-gb" });
  assert.equal(spanish.text("camino"), "ca\u00admi\u00adno");
  assert.equal(english.text("backbone"), "back\u00adbone");
  assert.throws(
    () =>
      spanish.with({ hyphenation: { minRight: 2 } }).with({ locale: "en-gb" }),
    { code: "config.invalid-option" },
  );
  assert.equal(
    spanish
      .with({ hyphenation: { minRight: 2 } })
      .with({ locale: "en-gb", hyphenation: { minRight: null } })
      .text("backbone"),
    "back\u00adbone",
  );
}
const domRequire = createRequire(import.meta.resolve("react-dom/server"));
assert.equal(
  realpathSync(require.resolve("react")),
  realpathSync(domRequire.resolve("react")),
);
assert.throws(() => adapterRequire.resolve("@use-puncta/core/src/index.ts"), {
  code: "ERR_PACKAGE_PATH_NOT_EXPORTED",
});
console.log(
  "Public ESM import, transitive core, shared React/core, selected locales and SSR verified",
);
