import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { dirname, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { chromium, firefox, webkit } from "playwright";

const consumer = resolve("examples/rsc");
const require = createRequire(`${consumer}/package.json`);
const workspaceRequire = createRequire(import.meta.url);
const registry = JSON.parse(
  await readFile(
    resolve(
      dirname(
        createRequire(
          workspaceRequire.resolve("playwright/package.json"),
        ).resolve("playwright-core/package.json"),
      ),
      "browsers.json",
    ),
    "utf8",
  ),
);
const artifacts = resolve("artifacts/rsc");
await mkdir(artifacts, { recursive: true });
// Reserve an available loopback port; the production Next CLI owns the listener.
const reservation = createServer();
await new Promise((done) => reservation.listen(0, "127.0.0.1", done));
const port = reservation.address().port;
await new Promise((done) => reservation.close(done));
const url = `http://127.0.0.1:${port}`;
const server = spawn(
  process.execPath,
  [
    require.resolve("next/dist/bin/next"),
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    String(port),
  ],
  {
    cwd: consumer,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let serverLog = "";
server.stdout.on("data", (data) => {
  serverLog += data;
});
server.stderr.on("data", (data) => {
  serverLog += data;
});
const exited = once(server, "exit");
const report = {
  commit: execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  node: process.version,
  next: require("next/package.json").version,
  react: require("react/package.json").version,
  reactDom: require("react-dom/package.json").version,
  playwright: workspaceRequire("playwright/package.json").version,
  browsers: [],
};
const initial = {
  "client-text": "‘back\u00adbone’…",
  "package-boundary": "‘scope’…",
  "server-text": "«ca\u00admi\u00adno»…",
  "client-grouped":
    "12\u202f345; 12\u202f345\u202f678\u202f901\u202f234\u202f567\u202f890",
  "package-grouped": "1\u202f234; 12\u202f345",
  "server-grouped": "1,234; 12\u202f345",
  "server-raw": '"camino"...',
};
async function texts(page) {
  return page.evaluate(
    (ids) =>
      Object.fromEntries(
        ids.map((id) => [id, document.getElementById(id).textContent]),
      ),
    Object.keys(initial),
  );
}
async function expectText(page, id, text) {
  await page.waitForFunction(
    ({ id, text }) => document.getElementById(id)?.textContent === text,
    { id, text },
    { timeout: 15000, polling: 50 },
  );
}
try {
  for (let attempt = 0; ; attempt++) {
    if (server.exitCode !== null) throw new Error(`Next exited: ${serverLog}`);
    try {
      if ((await fetch(url)).ok) break;
    } catch {}
    assert(attempt < 150, `Next did not start: ${serverLog}`);
    await delay(100);
  }
  const response = await fetch(url, { headers: { RSC: "1" } });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /^text\/x-component/);
  const flight = await response.text();
  await writeFile(`${artifacts}/flight.txt`, flight);
  // The package import is serialized as an actual client module reference.
  assert.match(flight, /\d+:I\[[^\n]*"Puncta"/);
  assert(flight.includes(initial["server-text"]));
  assert(flight.includes('"source":"\\"backbone\\"..."'));
  for (const [name, launcher] of Object.entries({
    chromium,
    firefox,
    webkit,
  })) {
    const browser = await launcher.launch({
      executablePath: launcher.executablePath(),
    });
    try {
      const errors = [];
      // No JavaScript: typography and SHY must already be present in server HTML.
      const noJs = await browser.newContext({ javaScriptEnabled: false });
      const before = await noJs.newPage();
      await before.goto(url);
      assert.deepEqual(await texts(before), initial);
      const html = await before.content();
      await writeFile(`${artifacts}/${name}-server.html`, html);
      await noJs.close();

      const page = await browser.newPage();
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error" || message.type() === "warning")
          errors.push(message.text());
      });
      await page.goto(url);
      assert.deepEqual(await texts(page), initial);
      await page.evaluate(() => {
        window.groupingBeforeUpdates =
          document.getElementById("client-grouped");
      });
      await page.getByLabel("Digit grouping", { exact: true }).uncheck();
      await expectText(page, "client-grouped", "12345; 12345678901234567890");
      await expectText(page, "package-grouped", "1,234; 12345");
      await expectText(page, "server-grouped", initial["server-grouped"]);
      await page.getByLabel("Text", { exact: true }).fill("987654321");
      await expectText(page, "client-text", "987654321");
      await page.getByLabel("Digit grouping", { exact: true }).check();
      await expectText(page, "client-text", "987\u202f654\u202f321");
      await expectText(page, "client-grouped", initial["client-grouped"]);
      await page.getByLabel("Text", { exact: true }).fill('"backbone"...');
      // React event handling, not a hydration flag/effect, proves client attachment.
      await page.getByLabel("Hyphenation", { exact: true }).uncheck();
      await expectText(page, "client-text", "‘backbone’…");
      await page.getByLabel("Text", { exact: true }).fill('"camino"...');
      await expectText(page, "client-text", "‘camino’…");
      await page.getByLabel("Locale", { exact: true }).selectOption("es-es");
      await expectText(page, "client-text", "«camino»…");
      await expectText(page, "package-boundary", "«scope»…");
      await expectText(page, "package-grouped", "1,234; 12\u202f345");
      await page.getByLabel("Hyphenation", { exact: true }).check();
      await expectText(page, "client-text", initial["server-text"]);
      assert.equal(
        await page.locator("#server-text").textContent(),
        initial["server-text"],
      );
      assert.equal(
        await page.locator("#server-raw").textContent(),
        initial["server-raw"],
      );
      await page.getByLabel("Locale", { exact: true }).selectOption("en-gb");
      await page.getByLabel("Text", { exact: true }).fill('"backbone"...');
      await expectText(page, "client-text", initial["client-text"]);
      assert.deepEqual(await texts(page), initial);
      assert.equal(
        await page.evaluate(
          () =>
            window.groupingBeforeUpdates ===
            document.getElementById("client-grouped"),
        ),
        true,
      );
      assert.deepEqual(errors, [], `${name}: hydration/runtime warnings`);
      report.browsers.push({
        name,
        version: browser.version(),
        executablePath: launcher.executablePath(),
        registry: registry.browsers.find((entry) => entry.name === name),
        serverReact: await page.locator("#server-react").textContent(),
        clientReact: await page.locator("#client-react").textContent(),
        checks: [
          "Flight client reference",
          "server HTML without JavaScript",
          "hydration",
          "text/locale/hyphenation updates",
          "independent server configuration",
          "grouping numeric leaves, enable/disable, source and locale updates",
          "no runtime warnings",
        ],
      });
      console.log(`${name}: RSC, hydration and interactive updates passed`);
    } finally {
      await browser.close();
    }
  }
  await writeFile(
    `${artifacts}/report.json`,
    `${JSON.stringify(report, null, 2)}\n`,
  );
} finally {
  server.kill("SIGTERM");
  await exited;
  await writeFile(`${artifacts}/server.log`, serverLog);
}
