import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  rm,
  copyFile,
  readdir,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createServer } from "node:net";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

assert.equal(
  process.versions.node.split(".")[0],
  "24",
  "Consumer verification requires Node 24 LTS",
);
const root = process.cwd();
const temporary = await mkdtemp(join(tmpdir(), "puncta-install-"));
let registryProcess;
const cleanup = async () => {
  if (
    registryProcess &&
    registryProcess.exitCode === null &&
    registryProcess.signalCode === null
  ) {
    registryProcess.kill("SIGTERM");
    await Promise.race([once(registryProcess, "exit"), delay(5000)]);
    if (
      registryProcess.exitCode === null &&
      registryProcess.signalCode === null
    ) {
      registryProcess.kill("SIGKILL");
      await once(registryProcess, "exit");
    }
  }
  await rm(temporary, { recursive: true, force: true });
};
for (const signal of ["SIGINT", "SIGTERM"])
  process.once(signal, async () => {
    await cleanup();
    process.exit(1);
  });
function run(command, args, cwd, env) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (data) => {
      output += data;
    });
    child.stderr.on("data", (data) => {
      output += data;
    });
    const timeout = setTimeout(() => child.kill("SIGKILL"), 120000);
    child.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) resolveRun(output);
      else
        reject(
          new Error(`${command} ${args.join(" ")} exited ${code}\n${output}`),
        );
    });
  });
}
try {
  const packages = [];
  for (const directory of await readdir(join(root, "packages"))) {
    const manifest = JSON.parse(
      await readFile(join(root, "packages", directory, "package.json")),
    );
    if (!manifest.private) packages.push(manifest);
  }
  const archives = packages.map((manifest) => ({
    ...manifest,
    archive: resolve(
      "artifacts",
      `${manifest.name.replace("@", "").replace("/", "-")}-${manifest.version}.tgz`,
    ),
  }));
  // Preflight every required archive before starting a registry or installing anything.
  for (const { archive } of archives) await readFile(archive);
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = server.address().port;
  await new Promise((resolveClose) => server.close(resolveClose));
  const registry = `http://127.0.0.1:${port}`;
  const config = join(temporary, "verdaccio.yaml");
  await writeFile(
    config,
    `storage: ${join(temporary, "storage")}\nauth:\n  htpasswd:\n    file: ${join(temporary, "htpasswd")}\nuplinks:\n  npmjs:\n    url: https://registry.npmjs.org/\npackages:\n  '@use-puncta/*':\n    access: $all\n    publish: $authenticated\n  '**':\n    access: $all\n    proxy: npmjs\nlog: {type: stdout, format: pretty, level: warn}\n`,
  );
  registryProcess = spawn(
    join(root, "node_modules/.bin/verdaccio"),
    ["--config", config, "--listen", `127.0.0.1:${port}`],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  let registryLog = "";
  registryProcess.stdout.on("data", (data) => {
    registryLog += data;
  });
  registryProcess.stderr.on("data", (data) => {
    registryLog += data;
  });
  let registryError;
  registryProcess.once("error", (error) => {
    registryError = error;
  });
  const deadline = Date.now() + 30000;
  while (true) {
    if (registryError) throw registryError;
    if (registryProcess.exitCode !== null)
      throw new Error(`Verdaccio exited: ${registryLog}`);
    try {
      if (
        (
          await fetch(`${registry}/-/ping`, {
            signal: AbortSignal.timeout(1000),
          })
        ).ok
      )
        break;
    } catch {}
    assert.ok(
      Date.now() < deadline,
      `Verdaccio startup timed out: ${registryLog}`,
    );
    await delay(100);
  }
  const username = `test-${randomUUID()}`;
  const response = await fetch(
    `${registry}/-/user/org.couchdb.user:${username}`,
    {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: username,
        password: randomUUID(),
        email: "test@example.invalid",
        type: "user",
        roles: [],
      }),
    },
  );
  assert.ok(response.ok, "One-use local registry account can be created");
  const { token } = await response.json();
  assert.ok(token);
  const npmrc = join(temporary, "npmrc");
  await writeFile(
    npmrc,
    `registry=${registry}\n//127.0.0.1:${port}/:_authToken=${token}\n`,
    { mode: 0o600 },
  );
  const environment = {
    ...process.env,
    NPM_CONFIG_USERCONFIG: npmrc,
    NPM_CONFIG_CACHE: join(temporary, "publisher-cache"),
    NPM_CONFIG_AUDIT: "false",
    NPM_CONFIG_FUND: "false",
  };
  // Prove the registry cannot obtain a missing scope package from real npm.
  assert.equal((await fetch(`${registry}/@use-puncta%2fcore`)).status, 404);
  const core = archives.find(({ name }) => name === "@use-puncta/core");
  const adapter = archives.find(
    ({ name }) => name === "@use-puncta/with-react",
  );
  await run(
    "npm",
    [
      "publish",
      adapter.archive,
      "--registry",
      registry,
      "--tag",
      "next",
      "--access",
      "public",
      "--ignore-scripts",
    ],
    temporary,
    environment,
  );
  async function consumer(manager, suffix) {
    const cwd = join(temporary, `${manager}-${suffix}`);
    await mkdir(cwd);
    await writeFile(
      join(cwd, "package.json"),
      JSON.stringify({
        name: `consumer-${manager}`,
        private: true,
        type: "module",
        dependencies: {
          "@use-puncta/with-react": adapter.version,
          react: "19.3.0",
        },
      }),
    );
    const env = { ...environment, NPM_CONFIG_CACHE: join(cwd, "cache") };
    const args = ["install", "--ignore-scripts", "--registry", registry];
    if (manager === "pnpm")
      args.push(
        "--store-dir",
        join(cwd, "store"),
        "--strict-peer-dependencies",
      );
    await run(manager, args, cwd, env);
    return { cwd, env };
  }
  // A published adapter without its required core must fail with fresh stores.
  for (const manager of ["npm", "pnpm"]) {
    await assert.rejects(consumer(manager, "missing-core"), /404|not found/i);
    console.log(`${manager}: missing core fails without npm/cache fallback`);
  }
  await run(
    "npm",
    [
      "publish",
      core.archive,
      "--registry",
      registry,
      "--tag",
      "next",
      "--access",
      "public",
      "--ignore-scripts",
    ],
    temporary,
    environment,
  );
  for (const manager of ["npm", "pnpm"]) {
    const { cwd, env } = await consumer(manager, "complete");
    await copyFile(
      join(root, "scripts/consumer.mjs"),
      join(cwd, "consumer.mjs"),
    );
    console.log(
      await run(
        process.execPath,
        ["--experimental-import-meta-resolve", "consumer.mjs"],
        cwd,
        env,
      ),
    );
    const graph = await run(
      manager,
      ["list", "--depth", "100", "--json"],
      cwd,
      env,
    );
    assert.ok(graph.includes("@use-puncta/core"));
    assert.ok(
      !graph.includes("@use-puncta/with-en-gb") &&
        !graph.includes("@use-puncta/with-es-es"),
    );
    await readFile(
      join(cwd, manager === "npm" ? "package-lock.json" : "pnpm-lock.yaml"),
    );
    console.log(
      `${manager}: clean named installation and dependency graph verified`,
    );
  }
} finally {
  await cleanup();
}
