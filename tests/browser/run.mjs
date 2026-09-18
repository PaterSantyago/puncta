import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { arch, platform, release } from "node:os";
import { dirname, resolve } from "node:path";
import { build } from "esbuild";
import { chromium, firefox, webkit } from "playwright";
import { documentationExamples } from "../../scripts/documentation.mjs";
import { createHydrationServer } from "./hydration-server.mjs";
import { expected } from "./hydration-tree.mjs";

const require = createRequire(import.meta.url);
const bundles = new Map();
for (const name of ["shared", "scopes", "hydration-client"]) {
  const result = await build({
    entryPoints: [`tests/browser/${name}.mjs`],
    bundle: true,
    tsconfigRaw: {},
    write: false,
    format: name === "hydration-client" ? "iife" : "esm",
    banner: { js: "var process = { env: {} };" },
    platform: "browser",
    define: {
      "process.env.NODE_ENV": '"development"',
      "process.stderr": "undefined",
      "import.meta.url": '"http://puncta.test/tests/shared.mjs"',
    },
    plugins: [
      {
        name: "shared-node-oracles",
        setup(builder) {
          const adapters = {
            "node:test": "test-adapter",
            "node:assert/strict": "assert-adapter",
            "node:fs": "fixture-adapter",
            "node:fs/promises": "fixture-adapter",
          };
          builder.onResolve({ filter: /^node:/ }, ({ path }) => {
            if (!adapters[path])
              throw new Error(`Unexpected Node API: ${path}`);
            return { path: resolve(`tests/browser/${adapters[path]}.mjs`) };
          });
          builder.onResolve(
            { filter: /react-dom\/server\.node\.js$/ },
            ({ path, resolveDir }) => ({
              path: resolve(
                resolveDir,
                path.replace("server.node.js", "server.browser.js"),
              ),
            }),
          );
        },
      },
    ],
  });
  bundles.set(`/${name}.js`, result.outputFiles[0].text);
}

const documentationExample = (await documentationExamples()).find(
  ({ id }) => id === "react-start",
);
assert.ok(documentationExample, "React quick-start source must exist");
const documentationBundle = await build({
  stdin: {
    contents:
      documentationExample.source +
      `
import { act } from "react";
import { createRoot } from "react-dom/client";
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
window.runDocumentationCheck = async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(() => root.render(<Example />));
  const html = container.innerHTML;
  await act(() => root.unmount());
  container.remove();
  return html;
};`,
    resolveDir: resolve("examples/ssr"),
    loader: "tsx",
  },
  bundle: true,
  write: false,
  format: "esm",
  platform: "browser",
  tsconfigRaw: { compilerOptions: { jsx: "react-jsx" } },
  define: { "process.env.NODE_ENV": '"development"' },
  plugins: [
    {
      name: "documentation-public-core",
      setup(builder) {
        builder.onResolve({ filter: /^@use-puncta\/core$/ }, () => ({
          path: resolve("packages/core/dist/index.mjs"),
        }));
      },
    },
  ],
});
bundles.set("/documentation.js", documentationBundle.outputFiles[0].text);
const hydration = createHydrationServer();
const server = createServer((request, response) => {
  if (/^\/(ssr|pipeable|readable)\//.test(request.url)) {
    hydration.handle(request, response).catch((error) => {
      hydration.errors.push(error.message);
      response.destroy(error);
    });
    return;
  }
  if (bundles.has(request.url)) {
    response.writeHead(200, { "Content-Type": "text/javascript" });
    response.end(bundles.get(request.url));
  } else {
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(
      '<!doctype html><title>Puncta browser acceptance</title><script type="module" src="/shared.js"></script><script type="module" src="/scopes.js"></script><script type="module" src="/documentation.js"></script>',
    );
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const url = `http://127.0.0.1:${server.address().port}`;
const report = {
  commit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  node: process.version,
  react: require("react/package.json").version,
  playwright: require("playwright/package.json").version,
  esbuild: require("esbuild/package.json").version,
  platform: { os: platform(), release: release(), arch: arch() },
  corpus: {},
  browsers: [],
};
for (const locale of ["en-gb", "es-es"]) {
  const manifest = JSON.parse(
    await readFile(`tests/fixtures/hyphenation/${locale}-freeze.json`, "utf8"),
  );
  for (const [name, hash] of Object.entries(manifest.files)) {
    assert.equal(
      createHash("sha256")
        .update(await readFile(`tests/fixtures/hyphenation/${name}`))
        .digest("hex"),
      hash,
    );
  }
  report.corpus[locale] = manifest;
}
const registry = JSON.parse(
  await readFile(
    resolve(
      dirname(
        createRequire(require.resolve("playwright/package.json")).resolve(
          "playwright-core/package.json",
        ),
      ),
      "browsers.json",
    ),
    "utf8",
  ),
);
try {
  for (const engine of [chromium, firefox, webkit]) {
    const browser = await engine.launch({
      executablePath: engine.executablePath(),
    });
    try {
      const page = await browser.newPage();
      const errors = [];
      page.on("pageerror", (error) => {
        errors.push(error.stack);
        console.error(error.stack);
      });
      page.on("console", (message) => {
        if (["warning", "error"].includes(message.type()))
          errors.push(message.text());
      });
      await page.goto(url);
      await page.waitForFunction(
        () =>
          window.runSharedChecks &&
          window.runScopesCheck &&
          window.runDocumentationCheck,
      );
      const documentation = await page.evaluate(() =>
        window.runDocumentationCheck(),
      );
      assert.equal(`${documentation}\n`, documentationExample.output);
      const shared = await page.evaluate(() => window.runSharedChecks());
      const mounted = await page.evaluate(() => window.runScopesCheck());
      const hydrationChecks = [];
      for (const renderer of ["ssr", "pipeable", "readable"]) {
        const id = `${engine.name()}-${renderer}`;
        await page.goto(`${url}/${renderer}/${id}`, { waitUntil: "commit" });
        await page.locator("#shell").waitFor();
        // Numeric polling works while WebKit holds animation frames during parsing.
        await page.waitForFunction(
          () => window.hydrationStarted && window.shellHydrated,
          null,
          { polling: 50 },
        );
        assert.equal(
          await page.locator("#shell").textContent(),
          expected.shell,
        );
        assert.equal(
          await page.locator("#protected").textContent(),
          expected.protected,
        );
        assert.equal(
          await page
            .locator("#shell")
            .evaluate((node) => node.firstChild.textContent),
          "‘back\u00ad",
        );
        if (renderer !== "ssr") {
          assert.equal(
            await page.locator("#fallback").textContent(),
            expected.fallback,
          );
          assert.equal(await page.locator("#content").count(), 0);
          assert.equal(
            await page.evaluate(() => window.hydrated ?? false),
            false,
          );
          hydration.release(id);
          await page.waitForFunction(() => document.getElementById("content"));
          await page.evaluate(() => {
            window.contentBeforeHydration = document.getElementById("content");
            window.releaseHydration();
          });
        }
        await page.waitForFunction(() => window.hydrated);
        assert.equal(
          await page.locator("#content").textContent(),
          expected.content,
        );
        assert.equal(await page.locator("#fallback").count(), 0);
        assert.equal(
          await page.locator("#shell").textContent(),
          expected.shell,
        );
        assert.equal(
          await page.locator("#protected").textContent(),
          expected.protected,
        );
        assert.deepEqual(
          await page
            .locator("#root")
            .evaluate((root) =>
              Array.from(root.children, (child) => child.tagName),
            ),
          ["P", "P", "P"],
        );
        assert.equal(await page.locator("#root *").count(), 4);
        assert.deepEqual(await page.evaluate(() => window.hydrationErrors), []);
        assert.equal(
          await page.evaluate(
            () =>
              window.shellBeforeHydration === document.getElementById("shell"),
          ),
          true,
        );
        assert.equal(
          await page.evaluate(
            () =>
              window.contentBeforeHydration ===
              document.getElementById("content"),
          ),
          true,
        );
        assert.equal(
          await page.evaluate(() =>
            window.shellChildrenBeforeHydration.every(
              (node, index) =>
                document.getElementById("shell").childNodes[index] === node,
            ),
          ),
          true,
        );
        assert.equal(await page.locator("#root > p").count(), 3);
        assert.equal(await page.locator("#root p p").count(), 0);
        hydrationChecks.push({
          renderer,
          hydrated: true,
          shellBeforeRelease: renderer !== "ssr",
          errors: [],
        });
      }
      assert.deepEqual(errors, []);
      const result = {
        engine: engine.name(),
        version: browser.version(),
        executable: engine.executablePath(),
        builds: registry.browsers.filter((item) => item.name === engine.name()),
        userAgent: await page.evaluate(() => navigator.userAgent),
        shared,
        mounted,
        documentation: {
          id: documentationExample.id,
          sourceSha256: createHash("sha256")
            .update(documentationExample.source)
            .digest("hex"),
          output: documentation,
        },
        hydration: hydrationChecks,
      };
      report.browsers.push(result);
      console.log(JSON.stringify({ ...result, shared: shared.length }));
    } finally {
      await browser.close();
    }
  }
} finally {
  hydration.close();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}
assert.deepEqual(hydration.errors, []);
await mkdir("artifacts/browser", { recursive: true });
await writeFile(
  "artifacts/browser/acceptance.json",
  `${JSON.stringify(report, null, 2)}\n`,
);
