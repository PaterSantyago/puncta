import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { once } from "node:events";
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  rm,
  copyFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createServer } from "node:net";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

import { publicPackages } from "./workspace.mjs";

assert.equal(
  process.versions.node.split(".")[0],
  "24",
  "Consumer verification requires Node 24 LTS",
);
const root = new URL("../", import.meta.url).pathname;
const externalRegistry = process.env.PUNCTA_CONSUMER_REGISTRY;
const bundle = process.env.PUNCTA_CONSUMER_BUNDLE;
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
  const packages = bundle
    ? await Promise.all(
        (await (await import("node:fs/promises")).readdir(bundle))
          .filter((file) => file.endsWith(".tgz"))
          .map(async (file) =>
            JSON.parse(
              execFileSync(
                "tar",
                ["-xOf", join(bundle, file), "package/package.json"],
                { encoding: "utf8" },
              ),
            ),
          ),
      )
    : (await publicPackages()).map(({ manifest }) => manifest);
  const archives = packages.map((manifest) => ({
    ...manifest,
    archive: resolve(
      bundle ?? "artifacts",
      `${manifest.name.replace("@", "").replace("/", "-")}-${manifest.version}.tgz`,
    ),
  }));
  // Preflight every required archive before starting a registry or installing anything.
  for (const { archive } of archives) await readFile(archive);
  let registry = externalRegistry;
  let environment = { ...process.env };
  if (!externalRegistry) {
    const server = createServer();
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const port = server.address().port;
    await new Promise((resolveClose) => server.close(resolveClose));
    registry = `http://127.0.0.1:${port}`;
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
    environment = {
      ...process.env,
      NPM_CONFIG_USERCONFIG: npmrc,
      NPM_CONFIG_CACHE: join(temporary, "publisher-cache"),
      NPM_CONFIG_AUDIT: "false",
      NPM_CONFIG_FUND: "false",
    };
  }
  // Prove the registry cannot obtain a missing scope package from real npm.
  if (!externalRegistry)
    assert.equal((await fetch(`${registry}/@use-puncta%2fcore`)).status, 404);
  const core = archives.find(({ name }) => name === "@use-puncta/core");
  const adapter = archives.find(
    ({ name }) => name === "@use-puncta/with-react",
  );
  async function publish(archive) {
    await run(
      "npm",
      [
        "publish",
        archive,
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
  }
  if (!externalRegistry) await publish(adapter.archive);
  async function consumer(manager, suffix, locales = []) {
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
          "react-dom": "19.3.0",
          ...(locales.length
            ? { typescript: "7.0.2", "@types/react": "19.3.0" }
            : {}),
          ...Object.fromEntries(
            locales.map((id) => [
              `@use-puncta/with-${id}`,
              archives.find(({ name }) => name === `@use-puncta/with-${id}`)
                .version,
            ]),
          ),
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
  if (!externalRegistry) {
    // A published adapter without its required core must fail with fresh stores.
    for (const manager of ["npm", "pnpm"]) {
      await assert.rejects(consumer(manager, "missing-core"), /404|not found/i);
      console.log(`${manager}: missing core fails without npm/cache fallback`);
    }
    await publish(core.archive);
    for (const { archive, name } of archives) {
      if (name !== core.name && name !== adapter.name) await publish(archive);
    }
  }
  for (const manager of ["npm", "pnpm"]) {
    for (const locales of [[], ["en-gb"], ["es-es"], ["en-gb", "es-es"]]) {
      const { cwd, env } = await consumer(
        manager,
        locales.join("-") || "react-only",
        locales,
      );
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
      if (locales.length) {
        await writeFile(
          join(cwd, "consumer.tsx"),
          [
            'import { Puncta } from "@use-puncta/with-react";',
            ...locales.map(
              (id, index) =>
                `import { ${id === "en-gb" ? "enGb" : "esEs"} as locale${index} } from "@use-puncta/with-${id}";`,
            ),
            ...locales.map(
              (_, index) =>
                `export const example${index} = <Puncta locale={locale${index}} />;`,
            ),
            "// @ts-expect-error Locale identifiers must be strings.",
            "export const invalid = <Puncta locale={{id: 42}} />;",
          ].join("\n"),
        );
        await writeFile(
          join(cwd, "tsconfig.json"),
          JSON.stringify({
            compilerOptions: {
              target: "ES2022",
              module: "NodeNext",
              moduleResolution: "NodeNext",
              jsx: "react-jsx",
              strict: true,
              noEmit: true,
            },
            include: ["consumer.tsx"],
          }),
        );
        await run(
          join(cwd, "node_modules/.bin/tsc"),
          ["--project", "tsconfig.json"],
          cwd,
          env,
        );
      }
      const graph = await run(
        manager,
        ["list", "--depth", "100", "--json"],
        cwd,
        env,
      );
      assert.ok(graph.includes("@use-puncta/core"));
      for (const id of ["en-gb", "es-es"])
        assert.equal(
          graph.includes(`@use-puncta/with-${id}`),
          locales.includes(id),
        );
      await readFile(
        join(cwd, manager === "npm" ? "package-lock.json" : "pnpm-lock.yaml"),
      );
      console.log(
        `${manager} ${locales.join(", ") || "react-only"}: clean named installation and dependency graph verified`,
      );
    }
  }
} finally {
  await cleanup();
}
