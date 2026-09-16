import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { realpathSync, readFileSync } from "node:fs";
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
  assert.equal(locale.id, id);
  assert.equal(locale.version, expected[name]);
  const instance = createPuncta({ locales: [locale], locale: locale.id });
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
