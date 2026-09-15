import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, rm, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";

import { publicPackages } from "./workspace.mjs";

const artifacts = resolve("artifacts");
await rm(artifacts, { recursive: true, force: true });
await mkdir(artifacts);
const entries = [];
for (const { path: cwd, manifest } of await publicPackages()) {
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
    assert.deepEqual(Object.keys(packed.exports), ["."]);
    assert.deepEqual(Object.keys(packed.exports["."]).sort(), [
      "import",
      "types",
    ]);
    for (const target of Object.values(packed.exports["."])) {
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
        assert.deepEqual(packed[section] ?? {}, {});
      }
    if (packed.name === "@use-puncta/with-react") {
      assert.equal(packed.dependencies["@use-puncta/core"], "^0.1.0-alpha.0");
      assert.equal(packed.peerDependencies.react, "^19.3.0");
      assert.equal(packed.dependencies.react, undefined);
      assert.equal(packed.dependencies["react-dom"], undefined);
      assert.equal(packed.peerDependencies["react-dom"], undefined);
      const js = await readFile(join(base, packed.exports["."].import), "utf8");
      assert.match(js, /from ["']@use-puncta\/core["']/);
      assert.match(js, /from ["']react\/jsx-runtime["']/);
    }
    if (
      ["@use-puncta/with-en-gb", "@use-puncta/with-es-es"].includes(packed.name)
    ) {
      assert.deepEqual(packed.peerDependencies, {
        "@use-puncta/core": "^0.1.0-alpha.0",
      });
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
