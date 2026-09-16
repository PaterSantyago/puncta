import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import test from "node:test";
import { isolatedPackageEnvironment } from "../scripts/package-environment.mjs";

test("real npm and pnpm resolve caches inside each disposable consumer", async () => {
  const directory = await mkdtemp(join(tmpdir(), "puncta-cache-test-"));
  try {
    const paths = [];
    for (const name of ["first", "second"]) {
      const root = join(directory, name);
      const env = isolatedPackageEnvironment(root, process.env);
      for (const [manager, args] of [
        ["npm", ["config", "get", "cache"]],
        ["pnpm", ["cache", "path"]],
      ]) {
        const path = execFileSync(manager, args, {
          cwd: directory,
          env,
          encoding: "utf8",
        }).trim();
        assert.ok(
          !relative(root, path).startsWith(".."),
          `${manager} cache escaped ${root}: ${path}`,
        );
        paths.push(path);
      }
    }
    assert.equal(
      new Set(paths).size,
      4,
      "Consumers must not share either metadata or download caches",
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
