import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import test from "node:test";
import semver from "semver";
import { registryFixture } from "./registry-fixture.mjs";
import { publicPackages } from "./workspace.mjs";

const cli = resolve("scripts/publish.mjs");
const installCli = resolve("scripts/install.mjs");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const git = (cwd, ...args) =>
  execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
async function fixture() {
  const f = await registryFixture();
  const cwd = join(f.directory, "repo");
  await mkdir(cwd);
  git(cwd, "init", "-q");
  git(
    cwd,
    "-c",
    "user.name=Test",
    "-c",
    "user.email=test@example.invalid",
    "commit",
    "--allow-empty",
    "-qm",
    "Release",
  );
  const commit = git(cwd, "rev-parse", "HEAD");
  const bundle = join(cwd, "bundle");
  await mkdir(bundle);
  // Publication tests use the current checked archives, even between releases
  // when there is no active release/plan.json in the checkout.
  const plan = { schema: 1, baseCommit: commit, tag: "next", packages: [] };
  const archives = [];
  for (const { path, manifest } of await publicPackages()) {
    const archive = `${manifest.name.replace("@", "").replace("/", "-")}-${manifest.version}.tgz`;
    plan.packages.push({
      name: manifest.name,
      version: manifest.version,
      changelogSha256: hash(await readFile(join(path, "CHANGELOG.md"))),
      manifest: JSON.parse(
        execFileSync(
          "tar",
          ["-xOf", join("artifacts", archive), "package/package.json"],
          { encoding: "utf8" },
        ),
      ),
    });
    await copyFile(join("artifacts", archive), join(bundle, archive));
    archives.push({
      name: manifest.name,
      version: manifest.version,
      file: archive,
      sha256: hash(await readFile(join(bundle, archive))),
    });
  }
  const bytes = JSON.stringify(plan);
  await writeFile(join(bundle, "plan.json"), bytes);
  await writeFile(
    join(bundle, "verification.json"),
    JSON.stringify({ commit, planSha256: hash(bytes), archives }),
  );
  const authorization = {
    repository: "fixture/repo",
    commit,
    run: {
      conclusion: "success",
      event: "push",
      head_branch: "main",
      head_sha: commit,
      path: ".github/workflows/check.yml",
    },
    pr: {
      merged: true,
      merge_commit_sha: commit,
      user: { login: "github-actions[bot]" },
      head: {
        ref: "release/pending",
        sha: commit,
        repo: { full_name: "fixture/repo" },
      },
      base: { ref: "main", repo: { full_name: "fixture/repo" } },
    },
    headRun: {
      conclusion: "success",
      head_sha: commit,
      path: ".github/workflows/check.yml",
      event: "workflow_dispatch",
    },
  };
  await writeFile(
    join(bundle, "authorization.json"),
    JSON.stringify(authorization),
  );
  const state = join(cwd, "state");
  function run(extra = [], env = f.env) {
    return new Promise((done) => {
      const child = spawn(
        process.execPath,
        [
          cli,
          "--bundle",
          bundle,
          "--state",
          state,
          "--registry",
          f.registry,
          "--mode",
          "test",
          ...extra,
        ],
        { cwd, env },
      );
      let output = "";
      child.stdout.on("data", (d) => {
        output += d;
      });
      child.stderr.on("data", (d) => {
        output += d;
      });
      child.on("close", (code) => done({ code, output }));
    });
  }
  return { ...f, cwd, bundle, state, plan, archives, commit, run };
}

// Keep real npm writes and archive bytes; intercept only the registry boundary.
async function publicationProxy(f, intercept) {
  const { createServer, request: forward } = await import("node:http");
  const proxy = createServer(async (request, response) => {
    if (await intercept(request, response)) {
      request.resume();
      return;
    }
    const upstream = forward(
      `${f.registry}${request.url}`,
      {
        method: request.method,
        headers: {
          ...request.headers,
          host: new URL(f.registry).host,
          "accept-encoding": "identity",
        },
      },
      (received) => {
        const chunks = [];
        received.on("data", (chunk) => chunks.push(chunk));
        received.on("end", () => {
          let body = Buffer.concat(chunks);
          if (received.headers["content-type"]?.includes("application/json"))
            body = Buffer.from(
              body.toString().replaceAll(f.registry, registry),
            );
          const headers = {
            ...received.headers,
            "content-length": body.length,
          };
          delete headers["transfer-encoding"];
          response.writeHead(received.statusCode, headers);
          response.end(body);
        });
      },
    );
    upstream.on("error", () => {
      response.writeHead(502);
      response.end();
    });
    request.pipe(upstream);
  });
  await new Promise((done) => proxy.listen(0, "127.0.0.1", done));
  const registry = `http://127.0.0.1:${proxy.address().port}`;
  const npmrc = join(f.directory, "readiness-npmrc");
  await writeFile(
    npmrc,
    (await readFile(f.env.NPM_CONFIG_USERCONFIG, "utf8")).replaceAll(
      new URL(f.registry).host,
      new URL(registry).host,
    ),
  );
  return {
    registry,
    env: {
      ...f.env,
      NPM_CONFIG_USERCONFIG: npmrc,
      NPM_CONFIG_FETCH_RETRIES: "0",
    },
    close: () => new Promise((done) => proxy.close(done)),
  };
}

test("publication waits for delayed version, archive, tags and index without another publish", async () => {
  const f = await fixture();
  const core = f.plan.packages.find((p) => p.name === "@use-puncta/core");
  let published = false;
  const writes = [];
  const delayed = new Set();
  const proxy = await publicationProxy(f, (request, response) => {
    const path = decodeURIComponent(request.url);
    if (request.method === "PUT" && !path.startsWith("/-/")) {
      writes.push(path);
      published = true;
    }
    if (request.method !== "GET") return false;
    // Stop at the next package, after all readiness gates for core have passed.
    if (path.startsWith("/@use-puncta/with-en-gb")) {
      response.writeHead(401);
      response.end();
      return true;
    }
    const stage =
      path === `/@use-puncta/core/${core.version}`
        ? "version"
        : path.endsWith(".tgz")
          ? "archive"
          : path === "/-/package/@use-puncta/core/dist-tags"
            ? "tags"
            : path === "/@use-puncta/core"
              ? "index"
              : undefined;
    if (!published || !stage || delayed.has(stage)) return false;
    delayed.add(stage);
    response.writeHead(stage === "tags" || stage === "index" ? 200 : 404, {
      "content-type": "application/json",
    });
    response.end(
      JSON.stringify(
        stage === "index"
          ? { name: core.name, versions: {}, "dist-tags": {} }
          : {},
      ),
    );
    return true;
  });
  try {
    const result = await f.run(["--registry", proxy.registry], proxy.env);
    assert.notEqual(result.code, 0);
    assert.match(
      result.output,
      /Registry lookup failed for @use-puncta\/with-en-gb: 401/,
    );
    assert.deepEqual([...delayed].sort(), [
      "archive",
      "index",
      "tags",
      "version",
    ]);
    assert.deepEqual(writes, ["/@use-puncta/core"]);
    const report = JSON.parse(await readFile(join(f.state, "result.json")));
    assert.equal(report.packages[0].status, "published");
    assert.equal(report.packages[0].distTags.next, core.version);
    assert.equal(git(f.cwd, "tag", "--list"), "");
  } finally {
    await proxy.close();
    await f.close();
  }
});
test("accepted publication survives readiness timeouts and repeated recovery without republishing", async () => {
  const f = await fixture();
  const core = f.plan.packages.find((p) => p.name === "@use-puncta/core");
  let hidden = true;
  const writes = [];
  const proxy = await publicationProxy(f, (request, response) => {
    const path = decodeURIComponent(request.url);
    if (request.method === "PUT" && !path.startsWith("/-/")) writes.push(path);
    if (request.method !== "GET") return false;
    if (hidden && path === `/@use-puncta/core/${core.version}`) {
      response.writeHead(404);
      response.end();
      return true;
    }
    if (path.startsWith("/@use-puncta/with-en-gb")) {
      response.writeHead(403);
      response.end();
      return true;
    }
    return false;
  });
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = await f.run(
        ["--registry", proxy.registry, "--registry-wait-ms", "2500"],
        proxy.env,
      );
      assert.notEqual(result.code, 0);
      assert.match(result.output, /Registry readiness timed out/);
      const report = JSON.parse(await readFile(join(f.state, "result.json")));
      assert.equal(report.status, "incomplete");
      assert.equal(report.packages[0].accepted, true);
      assert.deepEqual(writes, ["/@use-puncta/core"]);
      assert.equal(git(f.cwd, "tag", "--list"), "");
    }
    hidden = false;
    const recovered = await f.run(["--registry", proxy.registry], proxy.env);
    assert.match(
      recovered.output,
      /Registry lookup failed for @use-puncta\/with-en-gb: 403/,
    );
    const report = JSON.parse(await readFile(join(f.state, "result.json")));
    assert.equal(report.packages[0].status, "matched");
    assert.deepEqual(writes, ["/@use-puncta/core"]);
  } finally {
    await proxy.close();
    await f.close();
  }
});

test("an existing version with a delayed archive is remembered before recovery", async () => {
  const f = await fixture();
  const core = f.archives.find((p) => p.name === "@use-puncta/core");
  execFileSync(
    "npm",
    [
      "publish",
      join(f.bundle, core.file),
      "--registry",
      f.registry,
      "--tag",
      "next",
      "--ignore-scripts",
    ],
    { env: f.env, stdio: "pipe" },
  );
  let hideVersion = false;
  const writes = [];
  const proxy = await publicationProxy(f, (request, response) => {
    const path = decodeURIComponent(request.url);
    if (request.method === "PUT" && !path.startsWith("/-/")) writes.push(path);
    if (
      request.method === "GET" &&
      (path.endsWith(".tgz") ||
        (hideVersion && path === `/@use-puncta/core/${core.version}`))
    ) {
      response.writeHead(404);
      response.end();
      return true;
    }
    return false;
  });
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = await f.run(
        ["--registry", proxy.registry, "--registry-wait-ms", "1000"],
        proxy.env,
      );
      assert.match(result.output, /Registry readiness timed out/);
      const report = JSON.parse(await readFile(join(f.state, "result.json")));
      assert.equal(report.packages[0].accepted, true);
      assert.deepEqual(writes, []);
      hideVersion = true;
    }
  } finally {
    await proxy.close();
    await f.close();
  }
});

test("recovery remembers accepted packages from attempts that a later timeout never reached", async () => {
  const f = await fixture();
  const core = f.plan.packages.find((p) => p.name === "@use-puncta/core");
  const locale = f.plan.packages.find(
    (p) => p.name === "@use-puncta/with-en-gb",
  );
  let hideCore = false;
  const writes = [];
  const proxy = await publicationProxy(f, (request, response) => {
    const path = decodeURIComponent(request.url);
    if (request.method === "PUT" && !path.startsWith("/-/")) writes.push(path);
    if (
      request.method === "GET" &&
      (path === `/@use-puncta/with-en-gb/${locale.version}` ||
        (hideCore && path === `/@use-puncta/core/${core.version}`))
    ) {
      response.writeHead(404);
      response.end();
      return true;
    }
    return false;
  });
  try {
    for (const [hidden, budget] of [
      [false, "3000"],
      [true, "500"],
      [false, "500"],
    ]) {
      hideCore = hidden;
      const result = await f.run(
        ["--registry", proxy.registry, "--registry-wait-ms", budget],
        proxy.env,
      );
      assert.match(result.output, /Registry readiness timed out/);
      assert.deepEqual(writes, [
        "/@use-puncta/core",
        "/@use-puncta/with-en-gb",
      ]);
    }
    const report = JSON.parse(await readFile(join(f.state, "result.json")));
    assert.equal(report.packages[1].accepted, true);
    assert.equal(report.attempts[1].packages.length, 1);
  } finally {
    await proxy.close();
    await f.close();
  }
});

test("temporary registry failures retry but authorization failures stop before publication", async () => {
  const f = await fixture();
  const statuses = [503, 429, 401];
  const observed = [];
  const proxy = await publicationProxy(f, (request, response) => {
    const status = statuses[observed.length] ?? 401;
    observed.push(request.method);
    response.writeHead(status);
    response.end();
    return true;
  });
  try {
    const result = await f.run(["--registry", proxy.registry], proxy.env);
    assert.notEqual(result.code, 0);
    assert.match(
      result.output,
      /Registry lookup failed for @use-puncta\/core: 401/,
    );
    assert.deepEqual(observed, ["GET", "GET", "GET"]);
    assert.equal(git(f.cwd, "tag", "--list"), "");
  } finally {
    await proxy.close();
    await f.close();
  }
});

test("registry waiting deadline includes a response body that never finishes", async () => {
  const f = await fixture();
  const methods = [];
  const proxy = await publicationProxy(f, (request, response) => {
    methods.push(request.method);
    response.writeHead(200, { "content-type": "application/json" });
    response.write('{"name":');
    return true;
  });
  try {
    const start = performance.now();
    const result = await f.run(
      ["--registry", proxy.registry, "--registry-wait-ms", "250"],
      proxy.env,
    );
    assert.notEqual(result.code, 0);
    assert.match(result.output, /Registry readiness timed out/);
    assert.ok(performance.now() - start < 5000, result.output);
    assert.deepEqual(methods, ["GET"]);
    assert.equal(git(f.cwd, "tag", "--list"), "");
  } finally {
    await proxy.close();
    await f.close();
  }
});

test("invalid archive metadata stops immediately instead of waiting for the registry", async () => {
  const f = await fixture();
  const core = f.plan.packages.find((p) => p.name === "@use-puncta/core");
  const methods = [];
  const proxy = await publicationProxy(f, (request, response) => {
    methods.push(request.method);
    response.writeHead(200, { "content-type": "application/json" });
    response.end(
      JSON.stringify({
        name: core.name,
        version: core.version,
        dist: { tarball: "not a URL" },
      }),
    );
    return true;
  });
  try {
    const result = await f.run(
      ["--registry", proxy.registry, "--registry-wait-ms", "250"],
      proxy.env,
    );
    assert.notEqual(result.code, 0);
    assert.match(result.output, /Invalid archive URL/);
    assert.doesNotMatch(
      result.output,
      /Waiting for|Registry readiness timed out/,
    );
    assert.deepEqual(methods, ["GET"]);
  } finally {
    await proxy.close();
    await f.close();
  }
});

test("malformed installation index fails immediately without another publication", async () => {
  const f = await fixture();
  const core = f.archives.find((p) => p.name === "@use-puncta/core");
  execFileSync(
    "npm",
    [
      "publish",
      join(f.bundle, core.file),
      "--registry",
      f.registry,
      "--tag",
      "next",
      "--ignore-scripts",
    ],
    { env: f.env, stdio: "pipe" },
  );
  let versions = "invalid";
  const writes = [];
  const proxy = await publicationProxy(f, (request, response) => {
    const path = decodeURIComponent(request.url);
    if (request.method === "PUT") writes.push(path);
    if (request.method === "GET" && path === "/@use-puncta/core") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          name: core.name,
          versions,
          "dist-tags": { next: core.version },
        }),
      );
      return true;
    }
    return false;
  });
  try {
    for (const invalid of ["invalid", { [core.version]: true }]) {
      versions = invalid;
      const result = await f.run(
        ["--registry", proxy.registry, "--registry-wait-ms", "1000"],
        proxy.env,
      );
      assert.notEqual(result.code, 0);
      assert.match(result.output, /Invalid registry package index/);
      assert.doesNotMatch(
        result.output,
        /Waiting for|Registry readiness timed out/,
      );
      assert.deepEqual(writes, []);
      assert.equal(git(f.cwd, "tag", "--list"), "");
    }
  } finally {
    await proxy.close();
    await f.close();
  }
});

test("readiness waiting budget excludes time spent submitting the package", async () => {
  const f = await fixture();
  const writes = [];
  const proxy = await publicationProxy(f, async (request, response) => {
    const path = decodeURIComponent(request.url);
    if (request.method === "PUT" && !path.startsWith("/-/")) {
      writes.push(path);
      await new Promise((done) => setTimeout(done, 1200));
    }
    if (
      request.method === "GET" &&
      path.startsWith("/@use-puncta/with-en-gb")
    ) {
      response.writeHead(401);
      response.end();
      return true;
    }
    return false;
  });
  try {
    const result = await f.run(
      ["--registry", proxy.registry, "--registry-wait-ms", "1000"],
      proxy.env,
    );
    assert.match(
      result.output,
      /Registry lookup failed for @use-puncta\/with-en-gb: 401/,
    );
    assert.doesNotMatch(result.output, /Registry readiness timed out/);
    assert.deepEqual(writes, ["/@use-puncta/core"]);
    const report = JSON.parse(await readFile(join(f.state, "result.json")));
    assert.equal(report.packages[0].status, "published");
  } finally {
    await proxy.close();
    await f.close();
  }
});

test("verified archives publish core first, next tags and immutable Git tags, then pass consumers", async () => {
  const f = await fixture();
  try {
    const result = await f.run();
    assert.equal(result.code, 0, result.output);
    const report = JSON.parse(await readFile(join(f.state, "result.json")));
    assert.equal(report.status, "complete");
    assert.equal(report.packages[0].name, "@use-puncta/core");
    for (const p of f.plan.packages) {
      const metadata = await (
        await fetch(`${f.registry}/${encodeURIComponent(p.name)}`)
      ).json();
      assert.equal(metadata["dist-tags"].next, p.version);
      const bytes = await (
        await fetch(metadata.versions[p.version].dist.tarball)
      ).arrayBuffer();
      const expected = JSON.parse(
        await readFile(join(f.bundle, "verification.json")),
      ).archives.find((a) => a.name === p.name);
      assert.equal(hash(Buffer.from(bytes)), expected.sha256);
      assert.equal(
        git(f.cwd, "rev-parse", `refs/tags/${p.name}@${p.version}`),
        f.commit,
      );
    }
    const plan = {
      ...f.plan,
      packages: f.plan.packages.filter(
        (p) => p.name === "@use-puncta/with-en-gb",
      ),
    };
    const bytes = JSON.stringify(plan);
    const verification = JSON.parse(
      await readFile(join(f.bundle, "verification.json")),
    );
    await writeFile(join(f.bundle, "plan.json"), bytes);
    await writeFile(
      join(f.bundle, "verification.json"),
      JSON.stringify({
        ...verification,
        planSha256: hash(bytes),
        archives: verification.archives.filter(
          (a) => a.name === "@use-puncta/with-en-gb",
        ),
      }),
    );
    const independent = await f.run(["--state", join(f.cwd, "locale-state")]);
    assert.equal(independent.code, 0, independent.output);
    const localeReport = JSON.parse(
      await readFile(join(f.cwd, "locale-state/result.json")),
    );
    assert.equal(localeReport.status, "complete");
    assert.equal(localeReport.packages.length, 1);
  } finally {
    await f.close();
  }
});

test("consumer rejects a next tag resolving outside the verified bundle even when the exact version exists", async () => {
  const f = await fixture();
  try {
    const published = await f.run();
    assert.equal(published.code, 0, published.output);
    const other = join(f.directory, "newer-adapter");
    await mkdir(other);
    execFileSync("tar", [
      "-xzf",
      join(
        f.bundle,
        f.archives.find((p) => p.name === "@use-puncta/with-react").file,
      ),
      "-C",
      other,
    ]);
    const directory = join(other, "package");
    const manifest = JSON.parse(
      await readFile(join(directory, "package.json")),
    );
    manifest.version = semver.inc(manifest.version, "prerelease", "alpha");
    await writeFile(join(directory, "package.json"), JSON.stringify(manifest));
    execFileSync(
      "npm",
      [
        "publish",
        directory,
        "--registry",
        f.registry,
        "--tag",
        "next",
        "--access",
        "public",
        "--ignore-scripts",
      ],
      { env: f.env, stdio: "pipe" },
    );
    const result = await new Promise((done) => {
      const child = spawn(process.execPath, [installCli], {
        env: {
          ...f.env,
          PUNCTA_CONSUMER_REGISTRY: f.registry,
          PUNCTA_CONSUMER_BUNDLE: f.bundle,
        },
      });
      let output = "";
      child.stdout.on("data", (data) => {
        output += data;
      });
      child.stderr.on("data", (data) => {
        output += data;
      });
      child.on("close", (code) => done({ code, output }));
    });
    assert.notEqual(result.code, 0, result.output);
    assert.match(
      result.output,
      /Installed version mismatch: @use-puncta\/with-react/,
    );
  } finally {
    await f.close();
  }
});

test("a registry failure retains the bundle and resumes only matching published versions", async () => {
  const f = await fixture();
  const { createServer, request: forward } = await import("node:http");
  let fail = true;
  const publishes = [];
  const proxy = createServer((request, response) => {
    if (request.method === "PUT" && !request.url.startsWith("/-/")) {
      publishes.push(decodeURIComponent(request.url));
      if (fail && !request.url.endsWith("core")) {
        response.writeHead(503, { "content-type": "application/json" });
        response.end(JSON.stringify({ error: "Injected registry outage" }));
        request.resume();
        return;
      }
    }
    const upstream = forward(
      `${f.registry}${request.url}`,
      {
        method: request.method,
        headers: { ...request.headers, host: new URL(f.registry).host },
      },
      (received) => {
        response.writeHead(received.statusCode, received.headers);
        received.pipe(response);
      },
    );
    upstream.on("error", () => {
      response.writeHead(502);
      response.end();
    });
    request.pipe(upstream);
  });
  await new Promise((done) => proxy.listen(0, "127.0.0.1", done));
  const registry = `http://127.0.0.1:${proxy.address().port}`;
  const npmrc = join(f.directory, "proxy-npmrc");
  await writeFile(
    npmrc,
    (await readFile(f.env.NPM_CONFIG_USERCONFIG, "utf8")).replaceAll(
      new URL(f.registry).host,
      new URL(registry).host,
    ),
  );
  const env = {
    ...f.env,
    NPM_CONFIG_USERCONFIG: npmrc,
    NPM_CONFIG_FETCH_RETRIES: "0",
  };
  try {
    const first = await f.run(["--registry", registry], env);
    assert.notEqual(first.code, 0, first.output);
    const partial = JSON.parse(await readFile(join(f.state, "result.json")));
    assert.equal(partial.status, "incomplete");
    assert.equal(partial.packages[0].status, "published");
    assert.equal(partial.packages[1].name, "@use-puncta/with-en-gb");
    assert.equal(git(f.cwd, "tag", "--list"), "");
    assert.deepEqual(
      await readFile(join(f.state, "bundle/verification.json")),
      await readFile(join(f.bundle, "verification.json")),
    );
    fail = false;
    const resumed = await f.run(
      ["--registry", registry, "--bundle", join(f.state, "bundle")],
      env,
    );
    assert.equal(resumed.code, 0, resumed.output);
    const complete = JSON.parse(await readFile(join(f.state, "result.json")));
    assert.equal(complete.status, "complete");
    assert.equal(complete.attempts[0].packages[0].status, "published");
    assert.equal(complete.packages[0].status, "matched");
    assert.equal(
      publishes.filter((name) => name === "/@use-puncta/core").length,
      1,
    );
  } finally {
    await new Promise((done) => proxy.close(done));
    await f.close();
  }
});

test("an existing version with different bytes stops publication and records a correcting-release error", async () => {
  const f = await fixture();
  try {
    const other = join(f.directory, "different");
    await mkdir(other);
    await writeFile(
      join(other, "package.json"),
      JSON.stringify({
        name: "@use-puncta/core",
        version: f.plan.packages.find((p) => p.name === "@use-puncta/core")
          .version,
      }),
    );
    await writeFile(join(other, "index.js"), "export const wrong = true;\n");
    execFileSync(
      "npm",
      [
        "publish",
        other,
        "--registry",
        f.registry,
        "--tag",
        "next",
        "--access",
        "public",
        "--ignore-scripts",
      ],
      { env: f.env, stdio: "pipe" },
    );
    const result = await f.run();
    assert.notEqual(result.code, 0);
    assert.match(
      result.output,
      /Existing version mismatch.*correcting release/,
    );
    const report = JSON.parse(await readFile(join(f.state, "result.json")));
    assert.equal(report.status, "incomplete");
    assert.match(report.error, /Existing version mismatch/);
    assert.equal(
      (await fetch(`${f.registry}/@use-puncta%2fwith-en-gb`)).status,
      404,
    );
    assert.equal(git(f.cwd, "tag", "--list"), "");
  } finally {
    await f.close();
  }
});

test("a published version with an unavailable package index retains tags and resumes without republishing", async () => {
  const f = await fixture();
  const { createServer, request: forward } = await import("node:http");
  let unavailable = true;
  const publishes = [];
  const proxy = createServer((request, response) => {
    const path = decodeURIComponent(request.url);
    if (request.method === "PUT" && !path.startsWith("/-/"))
      publishes.push(path);
    if (
      unavailable &&
      request.method === "GET" &&
      path === "/@use-puncta/core"
    ) {
      response.writeHead(404, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "Not found" }));
      return;
    }
    const upstream = forward(
      `${f.registry}${request.url}`,
      {
        method: request.method,
        headers: { ...request.headers, host: new URL(f.registry).host },
      },
      (received) => {
        response.writeHead(received.statusCode, received.headers);
        received.pipe(response);
      },
    );
    upstream.on("error", () => {
      response.writeHead(502);
      response.end();
    });
    request.pipe(upstream);
  });
  await new Promise((done) => proxy.listen(0, "127.0.0.1", done));
  const registry = `http://127.0.0.1:${proxy.address().port}`;
  const npmrc = join(f.directory, "index-npmrc");
  await writeFile(
    npmrc,
    (await readFile(f.env.NPM_CONFIG_USERCONFIG, "utf8")).replaceAll(
      new URL(f.registry).host,
      new URL(registry).host,
    ),
  );
  const env = { ...f.env, NPM_CONFIG_USERCONFIG: npmrc };
  try {
    const first = await f.run(
      ["--registry", registry, "--registry-wait-ms", "1500"],
      env,
    );
    assert.notEqual(first.code, 0);
    assert.match(
      first.output,
      /Registry readiness timed out.*package index.*resume the same bundle and state/,
    );
    const partial = JSON.parse(await readFile(join(f.state, "result.json")));
    assert.equal(partial.status, "incomplete");
    assert.equal(partial.packages[0].status, "published");
    assert.equal(
      partial.packages[0].distTags.next,
      f.plan.packages.find((p) => p.name === "@use-puncta/core").version,
    );
    assert.deepEqual(publishes, ["/@use-puncta/core"]);
    unavailable = false;
    const resumed = await f.run(["--registry", registry], env);
    assert.equal(resumed.code, 0, resumed.output);
    const complete = JSON.parse(await readFile(join(f.state, "result.json")));
    assert.equal(complete.status, "complete");
    assert.equal(complete.packages[0].status, "matched");
    assert.equal(
      publishes.filter((name) => name === "/@use-puncta/core").length,
      1,
    );
  } finally {
    await new Promise((done) => proxy.close(done));
    await f.close();
  }
});

test("tampered bundles and concurrent publication are refused before registry writes", async () => {
  const f = await fixture();
  try {
    await mkdir(join(f.cwd, ".git/puncta-publish.lock"));
    const locked = await f.run();
    assert.notEqual(locked.code, 0);
    assert.match(locked.output, /Another publication/);
    const { rm } = await import("node:fs/promises");
    await rm(join(f.cwd, ".git/puncta-publish.lock"), { recursive: true });
    const manifest = JSON.parse(
      await readFile(join(f.bundle, "verification.json")),
    );
    await writeFile(join(f.bundle, manifest.archives[0].file), "corrupt");
    const corrupt = await f.run();
    assert.notEqual(corrupt.code, 0);
    assert.match(corrupt.output, /Archive digest mismatch/);
    assert.equal((await fetch(`${f.registry}/@use-puncta%2fcore`)).status, 404);
  } finally {
    await f.close();
  }
});
