import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { realpathSync, readFileSync } from "node:fs";
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
assert.equal(typeof (await import(core)).localeId, "function");
const app = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url)),
);
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
  assert.equal("default" in module, false);
  const locale = module[exportName];
  assert.equal(
    renderToString(createElement(adapter.Puncta, { locale })),
    `<span>${id}</span>`,
  );
  const localeCore = import.meta.resolve(
    "@use-puncta/core",
    import.meta.resolve(name),
  );
  assert.equal(realpathSync(new URL(localeCore)), realpathSync(new URL(core)));
  selected.push(createElement(adapter.Puncta, { locale, key: id }));
}
if (selected.length === 2)
  assert.equal(
    renderToString(selected),
    "<span>en-gb</span><span>es-es</span>",
  );
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
