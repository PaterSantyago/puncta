import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** The same public workspace set feeds archive checks and registry consumers. */
export async function publicPackages() {
  const workspaces = JSON.parse(
    execFileSync("pnpm", ["list", "-r", "--depth", "-1", "--json"], {
      encoding: "utf8",
    }),
  );
  const packages = [];
  for (const { path } of workspaces) {
    const manifest = JSON.parse(await readFile(join(path, "package.json")));
    if (manifest.private) continue;
    assert.match(
      manifest.name,
      /^@use-puncta\/(core|with-[a-z0-9]+(?:-[a-z0-9]+)*)$/,
    );
    packages.push({ path, manifest });
  }
  return packages;
}
