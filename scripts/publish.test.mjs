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
    const first = await f.run(["--registry", registry], env);
    assert.notEqual(first.code, 0);
    assert.match(
      first.output,
      /Package index not visible: @use-puncta\/core.*rerun the same bundle/,
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
