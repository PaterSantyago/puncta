import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, cp, rm, rename } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { setTimeout as delay } from "node:timers/promises";

const { values } = parseArgs({
  options: {
    bundle: { type: "string" },
    state: { type: "string" },
    registry: { type: "string", default: "https://registry.npmjs.org" },
    mode: { type: "string" },
    "registry-wait-ms": { type: "string", default: "300000" },
  },
});
const { mode } = values;
const registryWaitMs = Number(values["registry-wait-ms"]);
assert.ok(
  Number.isSafeInteger(registryWaitMs) &&
    registryWaitMs > 0 &&
    registryWaitMs <= 900000,
  "--registry-wait-ms must be an integer between 1 and 900000",
);
assert.ok(
  ["test", "bootstrap", "oidc"].includes(mode),
  "Choose --mode bootstrap (owner 2FA), oidc, or test (loopback only)",
);
const registry = new URL(values.registry);
if (mode === "test")
  assert.ok(
    registry.protocol === "http:" && registry.hostname === "127.0.0.1",
    "Tests require an isolated loopback registry",
  );
else
  assert.equal(
    registry.href,
    "https://registry.npmjs.org/",
    "Public releases target npm",
  );
if (mode === "oidc") {
  assert.equal(process.env.GITHUB_ACTIONS, "true");
  assert.ok(
    process.env.ACTIONS_ID_TOKEN_REQUEST_URL,
    "OIDC requires the publishing job's id-token permission",
  );
}
assert.ok(
  values.bundle && values.state,
  "Supply --bundle and --state; retain both for recovery",
);
const source = resolve(values.bundle);
const state = resolve(values.state);
const run = (cmd, args, options = {}) =>
  execFileSync(cmd, args, { encoding: "utf8", ...options })?.trim();
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const isRecord = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const json = async (path) => JSON.parse(await readFile(path));
const script = (name) => new URL(name, import.meta.url).pathname;
const git = (...args) => run("git", args);
const lock = resolve(
  git("rev-parse", "--git-common-dir"),
  "puncta-publish.lock",
);
await mkdir(lock).catch(() => {
  throw new Error(
    `Another publication holds ${lock}. Remove only after confirming that process has stopped.`,
  );
});
let report;
async function save() {
  await writeFile(
    join(state, "result.tmp"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  await rename(join(state, "result.tmp"), join(state, "result.json"));
}
try {
  const planBytes = await readFile(join(source, "plan.json"));
  const plan = JSON.parse(planBytes);
  const verification = await json(join(source, "verification.json"));
  const authorization = await json(join(source, "authorization.json"));
  run(process.execPath, [
    script("release.mjs"),
    "authorize",
    join(source, "authorization.json"),
  ]);
  assert.equal(
    verification.commit,
    authorization.commit,
    "Authorization must bind the checked commit",
  );
  assert.equal(
    verification.planSha256,
    hash(planBytes),
    "Plan digest mismatch",
  );
  assert.equal(plan.schema, 1);
  assert.equal(plan.tag, "next");
  assert.ok(plan.packages.length > 0);
  assert.equal(verification.archives.length, plan.packages.length);
  const names = new Set();
  for (const p of plan.packages) {
    assert.match(p.name, /^@use-puncta\/(core|with-[a-z0-9-]+)$/);
    assert.ok(!names.has(p.name), `Duplicate package ${p.name}`);
    names.add(p.name);
    assert.match(p.version, /^\d+\.\d+\.\d+-alpha\.\d+$/);
    const archives = verification.archives.filter(
      (a) => a.name === p.name && a.version === p.version,
    );
    assert.equal(archives.length, 1);
    const archive = archives[0];
    assert.equal(basename(archive.file), archive.file);
    const path = join(source, archive.file);
    assert.equal(
      hash(await readFile(path)),
      archive.sha256,
      `Archive digest mismatch: ${p.name}`,
    );
    const manifest = JSON.parse(
      run("tar", ["-xOf", path, "package/package.json"]),
    );
    assert.deepEqual(
      manifest,
      p.manifest,
      `Packed manifest mismatch: ${p.name}`,
    );
    assert.equal(manifest.name, p.name);
    assert.equal(manifest.version, p.version);
    assert.ok(!manifest.private);
  }
  git("cat-file", "-e", `${verification.commit}^{commit}`);
  const ordered = [];
  const pending = [...plan.packages].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  while (pending.length) {
    const index = pending.findIndex(
      (p) =>
        !Object.keys({
          ...p.manifest.dependencies,
          ...p.manifest.peerDependencies,
        }).some((name) => pending.some((other) => other.name === name)),
    );
    assert.ok(index >= 0, "Release dependency cycle");
    ordered.push(...pending.splice(index, 1));
  }
  if (mode !== "test") git("fetch", "origin", "--tags");
  // Refuse tag conflicts before publishing anything; never move an existing tag.
  for (const p of ordered) {
    const tag = `${p.name}@${p.version}`;
    let existing;
    try {
      existing = git(
        "rev-parse",
        "--verify",
        "--quiet",
        `refs/tags/${tag}^{commit}`,
      );
    } catch {}
    assert.ok(
      !existing || existing === verification.commit,
      `Tag ${tag} points to another commit`,
    );
  }
  await mkdir(state, { recursive: true });
  const retained = join(state, "bundle");
  let previous;
  try {
    previous = await json(join(state, "result.json"));
    assert.equal(
      previous.commit,
      verification.commit,
      "Recovery state belongs to a different release",
    );
    assert.equal(previous.planSha256, verification.planSha256);
    assert.equal(
      previous.registry,
      registry.href,
      "Recovery registry cannot change",
    );
    assert.deepEqual(
      await json(join(retained, "verification.json")),
      verification,
    );
    for (const archive of verification.archives)
      assert.equal(
        hash(await readFile(join(retained, archive.file))),
        archive.sha256,
        "Retained archive was changed",
      );
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (source !== retained)
    await cp(source, retained, {
      recursive: true,
      force: false,
      errorOnExist: !previous,
    });
  const attempts = previous
    ? [
        ...(previous.attempts ?? []),
        {
          status: previous.status,
          packages: previous.packages,
          error: previous.error,
        },
      ]
    : [];
  report = {
    commit: verification.commit,
    planSha256: verification.planSha256,
    registry: registry.href,
    mode,
    status: "publishing",
    packages: [],
    attempts,
  };
  await save();
  class RegistryPending extends Error {}
  async function waitForRegistry(check, description, deadline) {
    let interval = 1000;
    let reason = "not checked";
    while (true) {
      const remaining = deadline - performance.now();
      if (remaining <= 0)
        throw new Error(
          `Registry readiness timed out for ${description}: ${reason}; resume the same bundle and state`,
        );
      try {
        return await check();
      } catch (error) {
        if (!(error instanceof RegistryPending)) throw error;
        reason = error.message;
      }
      const pause = Math.min(
        interval,
        Math.max(0, deadline - performance.now()),
      );
      console.log(`Waiting for ${description}: ${reason}; retry in ${pause}ms`);
      await delay(pause);
      interval = Math.min(interval * 2, 15000);
    }
  }
  async function registryBytes(
    url,
    description,
    deadline,
    allowMissing = false,
  ) {
    const remaining = Math.ceil(deadline - performance.now());
    if (remaining <= 0) throw new RegistryPending("waiting budget exhausted");
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(Math.min(30000, remaining)),
        cache: "no-store",
      });
      if (!response.ok) {
        await response.body?.cancel();
        if (response.status === 404 && allowMissing) return null;
        if (
          response.status === 404 ||
          response.status === 429 ||
          response.status >= 500
        )
          throw new RegistryPending(`HTTP ${response.status}`);
        throw new Error(`${description}: ${response.status}`);
      }
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      if (error.name === "TimeoutError" || error instanceof TypeError)
        throw new RegistryPending(`Registry request failed: ${error.message}`);
      throw error;
    }
  }
  async function versionMetadata(p, deadline, allowMissing = false) {
    return waitForRegistry(
      async () => {
        const bytes = await registryBytes(
          new URL(`${encodeURIComponent(p.name)}/${p.version}`, registry),
          `Registry lookup failed for ${p.name}`,
          deadline,
          allowMissing,
        );
        if (bytes === null) return null;
        const metadata = JSON.parse(bytes);
        assert.equal(metadata.name, p.name);
        assert.equal(metadata.version, p.version);
        assert.ok(
          typeof metadata.dist?.tarball === "string" &&
            URL.canParse(metadata.dist.tarball) &&
            ["http:", "https:"].includes(
              new URL(metadata.dist.tarball).protocol,
            ),
          `Invalid archive URL for ${p.name}`,
        );
        return metadata;
      },
      `${p.name}@${p.version} version`,
      deadline,
    );
  }
  for (const p of ordered) {
    const archive = verification.archives.find((a) => a.name === p.name);
    const entry = {
      name: p.name,
      version: p.version,
      sha256: archive.sha256,
      status: "checking",
    };
    report.packages.push(entry);
    await save();
    // Persisted acceptance prevents a recovery run from resubmitting a version
    // which npm accepted but has not yet made readable.
    const accepted = [previous, ...(previous?.attempts ?? [])].some((attempt) =>
      attempt?.packages.some(
        (item) =>
          item.name === p.name &&
          item.version === p.version &&
          (item.accepted || ["published", "matched"].includes(item.status)),
      ),
    );
    entry.accepted = Boolean(accepted);
    await save();
    let deadline = performance.now() + registryWaitMs;
    let metadata = await versionMetadata(p, deadline, !accepted);
    const exists = metadata !== null;
    if (!metadata) {
      const publicationStarted = performance.now();
      run(
        "npm",
        [
          "publish",
          join(retained, archive.file),
          "--registry",
          registry.href,
          "--access",
          "public",
          "--tag",
          "next",
          "--ignore-scripts",
          ...(mode === "oidc" ? ["--provenance"] : []),
        ],
        { stdio: "inherit" },
      );
      // This is a read-wait budget, not a timeout that can interrupt a write.
      deadline += performance.now() - publicationStarted;
      entry.accepted = true;
      entry.status = "awaiting-registry";
      await save();
      metadata = await versionMetadata(p, deadline);
    }
    entry.accepted = true;
    entry.status = "awaiting-registry";
    await save();
    await waitForRegistry(
      async () => {
        const bytes = await registryBytes(
          metadata.dist.tarball,
          `Cannot retrieve existing archive: ${p.name}`,
          deadline,
        );
        assert.equal(
          hash(bytes),
          archive.sha256,
          `Existing version mismatch: ${p.name}@${p.version}. Stop and create a correcting release; never overwrite or unpublish.`,
        );
      },
      `${p.name}@${p.version} archive`,
      deadline,
    );
    entry.status = exists ? "matched" : "published";
    await save();
    entry.distTags = await waitForRegistry(
      async () => {
        const bytes = await registryBytes(
          new URL(
            `-/package/${encodeURIComponent(p.name)}/dist-tags`,
            registry,
          ),
          `Registry dist-tags lookup failed for ${p.name}`,
          deadline,
        );
        const tags = JSON.parse(bytes);
        assert.ok(
          isRecord(tags) &&
            Object.values(tags).every((value) => typeof value === "string"),
          `Invalid registry dist-tags for ${p.name}`,
        );
        if (tags.next !== p.version)
          throw new RegistryPending(
            `next does not identify ${p.name}@${p.version}`,
          );
        return tags;
      },
      `${p.name}@${p.version} next tag`,
      deadline,
    );
    await save();
    await waitForRegistry(
      async () => {
        const bytes = await registryBytes(
          new URL(encodeURIComponent(p.name), registry),
          `Registry package index lookup failed for ${p.name}`,
          deadline,
        );
        const index = JSON.parse(bytes);
        assert.ok(
          isRecord(index) &&
            isRecord(index.versions) &&
            isRecord(index["dist-tags"]) &&
            Object.values(index["dist-tags"]).every(
              (value) => typeof value === "string",
            ),
          `Invalid registry package index for ${p.name}`,
        );
        assert.equal(index.name, p.name);
        if (Object.hasOwn(index.versions, p.version)) {
          const manifest = index.versions[p.version];
          assert.ok(
            isRecord(manifest) &&
              manifest.name === p.name &&
              manifest.version === p.version,
            `Invalid registry package index version for ${p.name}@${p.version}`,
          );
        }
        if (
          !index.versions?.[p.version] ||
          index["dist-tags"]?.next !== p.version
        )
          throw new RegistryPending(
            `Package index not visible: ${p.name}@${p.version}`,
          );
      },
      `${p.name}@${p.version} package index`,
      deadline,
    );
  }
  report.status = "verifying-consumers";
  await save();
  run(process.execPath, [script("install.mjs")], {
    stdio: "inherit",
    env: {
      ...process.env,
      PUNCTA_CONSUMER_REGISTRY: registry.href,
      PUNCTA_CONSUMER_BUNDLE: retained,
    },
  });
  for (const p of ordered) {
    const tag = `${p.name}@${p.version}`;
    let existing;
    try {
      existing = git(
        "rev-parse",
        "--verify",
        "--quiet",
        `refs/tags/${tag}^{commit}`,
      );
    } catch {}
    if (!existing) git("tag", tag, verification.commit);
    else assert.equal(existing, verification.commit);
  }
  report.status = "complete";
  await save();
  console.log(
    `Release ${verification.commit} complete: archives, next tags, consumers and Git tags verified`,
  );
} catch (error) {
  if (report) {
    report.status = "incomplete";
    report.error = error.message;
    await save();
  }
  throw error;
} finally {
  await rm(lock, { recursive: true });
}
