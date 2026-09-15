import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

export async function registryFixture() {
  const directory = await mkdtemp(join(tmpdir(), "puncta-publish-"));
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = server.address().port;
  await new Promise((done) => server.close(done));
  const registry = `http://127.0.0.1:${port}`;
  const config = join(directory, "verdaccio.yaml");
  await writeFile(
    config,
    `storage: ${directory}/storage\nauth:\n  htpasswd:\n    file: ${directory}/htpasswd\nuplinks:\n  npmjs:\n    url: https://registry.npmjs.org/\npackages:\n  '@use-puncta/*':\n    access: $all\n    publish: $authenticated\n  '**':\n    access: $all\n    proxy: npmjs\nlog: {type: stdout, format: pretty, level: warn}\n`,
  );
  const child = spawn(
    resolve("node_modules/.bin/verdaccio"),
    ["--config", config, "--listen", `127.0.0.1:${port}`],
    { stdio: "ignore" },
  );
  let startupError;
  child.once("error", (error) => {
    startupError = error;
  });
  async function close() {
    if (child.pid && child.exitCode === null && child.signalCode === null) {
      child.kill("SIGTERM");
      await Promise.race([once(child, "exit"), delay(5000)]);
      if (child.exitCode === null && child.signalCode === null)
        child.kill("SIGKILL");
    }
    await rm(directory, { recursive: true, force: true });
  }
  try {
    const deadline = Date.now() + 30000;
    while (true) {
      if (startupError) throw startupError;
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
        child.exitCode === null && Date.now() < deadline,
        "Verdaccio startup failed",
      );
      await delay(100);
    }
    const name = `test-${randomUUID()}`;
    const response = await fetch(
      `${registry}/-/user/org.couchdb.user:${name}`,
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          password: randomUUID(),
          email: "test@example.invalid",
          type: "user",
          roles: [],
        }),
      },
    );
    assert.ok(response.ok);
    const { token } = await response.json();
    const npmrc = join(directory, "npmrc");
    await writeFile(
      npmrc,
      `registry=${registry}\n//127.0.0.1:${port}/:_authToken=${token}\n`,
      { mode: 0o600 },
    );
    return {
      directory,
      registry,
      close,
      env: {
        ...process.env,
        NPM_CONFIG_USERCONFIG: npmrc,
        NPM_CONFIG_CACHE: join(directory, "cache"),
        NPM_CONFIG_AUDIT: "false",
        NPM_CONFIG_FUND: "false",
      },
    };
  } catch (error) {
    await close();
    throw error;
  }
}
