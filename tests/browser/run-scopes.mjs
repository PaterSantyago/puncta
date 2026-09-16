// Optional mounted check. Install pinned esbuild@0.28.2 and playwright@1.58.2
// outside the repository, then set PUNCTA_BROWSER_RUNTIME to that directory.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(
  resolve(process.env.PUNCTA_BROWSER_RUNTIME, "package.json"),
);
const { build } = require("esbuild");
const { chromium } = require("playwright");
const bundle = await build({
  entryPoints: ["tests/browser/scopes.mjs"],
  bundle: true,
  write: false,
  format: "iife",
  platform: "browser",
  define: { "process.env.NODE_ENV": '"development"' },
});
const browser = await chromium.launch(
  process.env.PUNCTA_CHROMIUM
    ? { executablePath: process.env.PUNCTA_CHROMIUM }
    : {},
);
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning")
      errors.push(message.text());
  });
  await page.setContent("<!doctype html><title>Puncta scope check</title>");
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const result = await page.evaluate(() => window.runScopesCheck());
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ browser: browser.version(), ...result }));
} finally {
  await browser.close();
}
