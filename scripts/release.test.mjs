import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const cli = new URL("./release.mjs", import.meta.url).pathname;
function run(args, cwd) {
  return new Promise((resolve) => {
    const child = spawn(args[0], args.slice(1), { cwd });
    let output = "";
    child.stdout.on("data", (d) => {
      output += d;
    });
    child.stderr.on("data", (d) => {
      output += d;
    });
    child.on("close", (code) => resolve({ code, output }));
  });
}
test("release authorization rejects ordinary PRs, stale heads and failed checks", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "puncta-gate-"));
  const evidence = {
    repository: "owner/repo",
    commit: "a".repeat(40),
    run: {
      conclusion: "success",
      event: "push",
      head_branch: "main",
      head_sha: "a".repeat(40),
      path: ".github/workflows/check.yml",
    },
    pr: {
      merged: true,
      merge_commit_sha: "a".repeat(40),
      user: { login: "github-actions[bot]" },
      head: {
        ref: "release/pending",
        sha: "b".repeat(40),
        repo: { full_name: "owner/repo" },
      },
      base: { ref: "main", repo: { full_name: "owner/repo" } },
    },
    headRun: {
      conclusion: "success",
      head_sha: "b".repeat(40),
      path: ".github/workflows/check.yml",
      event: "workflow_dispatch",
    },
  };
  try {
    const path = join(cwd, "evidence.json");
    await writeFile(path, JSON.stringify(evidence));
    assert.equal(
      (await run([process.execPath, cli, "authorize", path], cwd)).code,
      0,
    );
    for (const patch of [
      { pr: { ...evidence.pr, user: { login: "human" } } },
      { pr: { ...evidence.pr, merged: false } },
      { run: { ...evidence.run, conclusion: "failure" } },
      { run: { ...evidence.run, head_sha: "c".repeat(40) } },
      { headRun: { ...evidence.headRun, head_sha: "c".repeat(40) } },
      { headRun: { ...evidence.headRun, conclusion: "failure" } },
    ]) {
      await writeFile(path, JSON.stringify({ ...evidence, ...patch }));
      assert.notEqual(
        (await run([process.execPath, cli, "authorize", path], cwd)).code,
        0,
      );
    }
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});
test("native pnpm debuts at alpha.0 and releases a changed locale independently", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "puncta-version-"));
  let published = false;
  const server = createServer((req, res) => {
    if (!published) {
      res.writeHead(404);
      res.end("{}");
      return;
    }
    const name = decodeURIComponent(req.url.slice(1));
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        name,
        "dist-tags": { next: "0.1.0-alpha.0" },
        versions: { "0.1.0-alpha.0": { name, version: "0.1.0-alpha.0" } },
      }),
    );
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const registry = `http://127.0.0.1:${server.address().port}`;
  try {
    await writeFile(
      join(cwd, "pnpm-workspace.yaml"),
      await readFile(new URL("../pnpm-workspace.yaml", import.meta.url)),
    );
    await writeFile(
      join(cwd, "package.json"),
      JSON.stringify({ private: true, name: "fixture" }),
    );
    for (const name of ["core", "with-react", "with-en-gb", "with-es-es"]) {
      const dir = join(cwd, "packages", name);
      await mkdir(dir, { recursive: true });
      await writeFile(
        join(dir, "package.json"),
        JSON.stringify({
          name: `@use-puncta/${name}`,
          version: "0.1.0-alpha.0",
          ...(name === "core"
            ? {}
            : {
                [name === "with-react" ? "dependencies" : "peerDependencies"]: {
                  "@use-puncta/core": "workspace:^",
                },
              }),
        }),
      );
    }
    for (const args of [
      [
        "change",
        "@use-puncta/core",
        "@use-puncta/with-react",
        "@use-puncta/with-en-gb",
        "@use-puncta/with-es-es",
        "--bump",
        "minor",
        "--summary",
        "First alpha",
      ],
      ["version", "-r", "--registry", registry],
    ]) {
      const result = await run(["pnpm", ...args], cwd);
      assert.equal(result.code, 0, result.output);
    }
    for (const name of ["core", "with-react", "with-en-gb", "with-es-es"]) {
      assert.equal(
        JSON.parse(await readFile(join(cwd, "packages", name, "package.json")))
          .version,
        "0.1.0-alpha.0",
      );
      assert.match(
        await readFile(join(cwd, "packages", name, "CHANGELOG.md"), "utf8"),
        /First alpha/,
      );
    }
    published = true;
    for (const args of [
      [
        "change",
        "@use-puncta/with-en-gb",
        "--bump",
        "patch",
        "--summary",
        "Improve English locale",
      ],
      ["version", "-r", "--registry", registry],
    ]) {
      const result = await run(["pnpm", ...args], cwd);
      assert.equal(result.code, 0, result.output);
    }
    for (const name of ["core", "with-react", "with-en-gb", "with-es-es"])
      assert.equal(
        JSON.parse(await readFile(join(cwd, "packages", name, "package.json")))
          .version,
        name === "with-en-gb" ? "0.1.0-alpha.1" : "0.1.0-alpha.0",
      );
    for (const args of [
      [
        "change",
        "@use-puncta/core",
        "--bump",
        "patch",
        "--summary",
        "Improve core",
      ],
      ["version", "-r", "--registry", registry],
    ]) {
      const result = await run(["pnpm", ...args], cwd);
      assert.equal(result.code, 0, result.output);
    }
    const core = JSON.parse(
      await readFile(join(cwd, "packages/core/package.json")),
    );
    assert.equal(core.version, "0.1.0-alpha.1");
    for (const name of ["with-react", "with-en-gb", "with-es-es"]) {
      const manifest = JSON.parse(
        await readFile(join(cwd, "packages", name, "package.json")),
      );
      assert.equal(
        manifest.version,
        name === "with-en-gb" ? "0.1.0-alpha.1" : "0.1.0-alpha.0",
      );
      assert.equal(
        (manifest.dependencies ?? manifest.peerDependencies)[
          "@use-puncta/core"
        ],
        "workspace:^",
      );
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await rm(cwd, { recursive: true, force: true });
  }
});
test("release plan checks alpha suffix and next tag separately and rejects private packages", async () => {
  const cwd = await mkdtemp(join(tmpdir(), "puncta-plan-"));
  try {
    const manifest = { name: "@use-puncta/core", version: "0.1.0-alpha.0" };
    await mkdir(join(cwd, "packages/core"), { recursive: true });
    await mkdir(join(cwd, "artifacts"));
    await mkdir(join(cwd, "release"));
    await writeFile(
      join(cwd, "package.json"),
      JSON.stringify({ name: "fixture", private: true }),
    );
    await writeFile(
      join(cwd, "pnpm-workspace.yaml"),
      "packages:\n  - packages/*\n",
    );
    await writeFile(
      join(cwd, "packages/core/package.json"),
      JSON.stringify(manifest),
    );
    await writeFile(join(cwd, "packages/core/CHANGELOG.md"), "First alpha\n");
    await mkdir(join(cwd, "packed/package"), { recursive: true });
    await writeFile(
      join(cwd, "packed/package/package.json"),
      JSON.stringify(manifest),
    );
    assert.equal(
      (
        await run(
          [
            "tar",
            "-czf",
            join(cwd, "artifacts/use-puncta-core-0.1.0-alpha.0.tgz"),
            "-C",
            join(cwd, "packed"),
            "package",
          ],
          cwd,
        )
      ).code,
      0,
    );
    const { createHash } = await import("node:crypto");
    const entry = {
      ...manifest,
      manifest,
      changelogSha256: createHash("sha256")
        .update("First alpha\n")
        .digest("hex"),
    };
    const plan = {
      schema: 1,
      baseCommit: "a".repeat(40),
      tag: "next",
      packages: [entry],
    };
    const path = join(cwd, "release/plan.json");
    await writeFile(path, JSON.stringify(plan));
    const valid = await run([process.execPath, cli, "validate"], cwd);
    assert.equal(valid.code, 0, valid.output);
    for (const patch of [
      { tag: "latest" },
      { packages: [{ ...entry, version: "0.1.0" }] },
      { packages: [{ ...entry, name: "fixture" }] },
    ]) {
      await writeFile(path, JSON.stringify({ ...plan, ...patch }));
      assert.notEqual(
        (await run([process.execPath, cli, "validate"], cwd)).code,
        0,
      );
    }
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});
