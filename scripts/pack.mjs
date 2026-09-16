import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import semver from "semver";

import { publicPackages } from "./workspace.mjs";

const artifacts = resolve("artifacts");
await rm(artifacts, { recursive: true, force: true });
await mkdir(artifacts);
const entries = [];
const packages = await publicPackages();
const coreVersion = packages.find(
  ({ manifest }) => manifest.name === "@use-puncta/core",
).manifest.version;
for (const { path: cwd, manifest } of packages) {
  execFileSync("pnpm", ["pack", "--pack-destination", artifacts], {
    cwd,
    stdio: "inherit",
  });
  const archive = join(
    artifacts,
    `${manifest.name.replace("@", "").replace("/", "-")}-${manifest.version}.tgz`,
  );
  const unpacked = await mkdtemp(join(tmpdir(), "puncta-pack-"));
  try {
    execFileSync("tar", ["-xzf", archive, "-C", unpacked]);
    const base = join(unpacked, "package");
    const packed = JSON.parse(await readFile(join(base, "package.json")));
    assert.equal(packed.name, manifest.name);
    assert.equal(packed.version, manifest.version);
    assert.equal(packed.type, "module");
    assert.equal(packed.license, "MIT");
    assert.equal(
      packed.repository?.url,
      "git+https://github.com/PaterSantyago/puncta.git",
      "Packed repository must match the public GitHub provenance source",
    );
    assert.deepEqual(
      Object.keys(packed.exports),
      packed.name === "@use-puncta/with-react" ? [".", "./pure"] : ["."],
    );
    assert.deepEqual(Object.keys(packed.exports["."]).sort(), [
      "import",
      "types",
    ]);
    for (const target of Object.values(packed.exports).flatMap((entry) =>
      Object.values(entry),
    )) {
      assert.ok(target.startsWith("./dist/"));
      assert.ok((await readFile(join(base, target))).length);
    }
    for (const document of ["LICENSE", "README.md"])
      assert.ok((await readFile(join(base, document))).length);
    const contents = execFileSync("tar", ["-tzf", archive], {
      encoding: "utf8",
    });
    assert.ok(!contents.includes("package/src/"));
    for (const section of [
      "dependencies",
      "peerDependencies",
      "optionalDependencies",
    ]) {
      for (const version of Object.values(packed[section] ?? {}))
        assert.ok(!/workspace:|file:|link:/.test(version));
    }
    if (packed.name === "@use-puncta/core")
      for (const section of [
        "dependencies",
        "peerDependencies",
        "optionalDependencies",
      ]) {
        assert.deepEqual(
          packed[section] ?? {},
          section === "dependencies"
            ? { entities: "6.0.1", parse5: "8.0.0" }
            : {},
        );
      }
    if (packed.name === "@use-puncta/with-react") {
      assert.ok(
        semver.satisfies(coreVersion, packed.dependencies["@use-puncta/core"]),
      );
      assert.equal(packed.peerDependencies.react, "^19.3.0");
      assert.equal(packed.dependencies.react, undefined);
      assert.equal(packed.dependencies["react-dom"], undefined);
      assert.equal(packed.peerDependencies["react-dom"], undefined);
      const js = await readFile(join(base, packed.exports["."].import), "utf8");
      assert.match(js, /^"use client";/);
      const pureModules = [];
      const pending = [join(base, packed.exports["./pure"].import)];
      const visited = new Set();
      while (pending.length) {
        const path = pending.pop();
        if (visited.has(path)) continue;
        visited.add(path);
        const module = await readFile(path, "utf8");
        pureModules.push(module);
        // Follow tsdown's relative static imports rather than assuming one output file.
        for (const match of module.matchAll(/from ["'](\.[^"']+)["']/g))
          pending.push(resolve(dirname(path), match[1]));
      }
      const pure = pureModules.join("\n");
      assert.doesNotMatch(pure, /["']use client["']/);
      assert.match(pure, /from ["']@use-puncta\/core["']/);
      assert.match(pure, /from ["']react["']/);
    }
    if (packed.peerDependencies?.["@use-puncta/core"]) {
      assert.ok(
        semver.satisfies(
          coreVersion,
          packed.peerDependencies["@use-puncta/core"],
        ),
      );
      assert.deepEqual(packed.dependencies ?? {}, {});
      assert.deepEqual(packed.optionalDependencies ?? {}, {});
      const declarations = await readFile(
        join(base, packed.exports["."].types),
        "utf8",
      );
      assert.match(declarations, /from ["']@use-puncta\/core["']/);
    }
    entries.push({ name: packed.name, version: packed.version, archive });
  } finally {
    await rm(unpacked, { recursive: true, force: true });
  }
}
assert.ok(entries.some(({ name }) => name === "@use-puncta/core"));
for (const name of [
  "@use-puncta/with-react",
  "@use-puncta/with-en-gb",
  "@use-puncta/with-es-es",
])
  assert.ok(entries.some((entry) => entry.name === name));
console.log(
  "Verified package archives:",
  entries.map(({ name }) => name).join(", "),
);
