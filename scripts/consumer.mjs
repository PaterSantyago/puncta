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
for (const locale of ["with-en-gb", "with-es-es"]) {
  assert.throws(() => adapterRequire.resolve(`@use-puncta/${locale}`), {
    code: "MODULE_NOT_FOUND",
  });
}
assert.throws(() => adapterRequire.resolve("@use-puncta/core/src/index.ts"), {
  code: "ERR_PACKAGE_PATH_NOT_EXPORTED",
});
console.log(
  "Public ESM import, transitive core, shared React and absent locales verified",
);
