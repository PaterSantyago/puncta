import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { join, basename } from "node:path";
import { publicPackages } from "./workspace.mjs";

const json = async (path) => JSON.parse(await readFile(path, "utf8"));
const command = (cmd, args) =>
  execFileSync(cmd, args, { encoding: "utf8" }).trim();
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const archiveName = (p) =>
  `${p.name.replace("@", "").replace("/", "-")}-${p.version}.tgz`;
const packedManifest = (p) =>
  JSON.parse(
    command("tar", [
      "-xOf",
      join("artifacts", archiveName(p)),
      "package/package.json",
    ]),
  );

function authorize(evidence) {
  assert.match(evidence.commit, /^[a-f0-9]{40}$/);
  assert.equal(evidence.run.conclusion, "success");
  assert.equal(evidence.run.event, "push");
  assert.equal(evidence.run.head_branch, "main");
  assert.equal(evidence.run.head_sha, evidence.commit);
  assert.equal(evidence.run.path, ".github/workflows/check.yml");
  assert.equal(evidence.pr.merged, true);
  assert.equal(evidence.pr.merge_commit_sha, evidence.commit);
  assert.equal(evidence.pr.user.login, "github-actions[bot]");
  assert.equal(evidence.pr.head.ref, "release/pending");
  assert.equal(evidence.pr.base.ref, "main");
  assert.equal(evidence.pr.base.repo.full_name, evidence.repository);
  assert.equal(evidence.pr.head.repo.full_name, evidence.repository);
  assert.equal(evidence.headRun.head_sha, evidence.pr.head.sha);
  assert.equal(evidence.headRun.conclusion, "success");
  assert.equal(evidence.headRun.path, ".github/workflows/check.yml");
  assert.ok(
    ["workflow_dispatch", "pull_request"].includes(evidence.headRun.event),
  );
}
async function validatePlan() {
  const plan = await json("release/plan.json");
  assert.equal(plan.schema, 1);
  assert.match(plan.baseCommit, /^[a-f0-9]{40}$/);
  assert.equal(plan.tag, "next");
  assert.ok(plan.packages.length > 0);
  const publicSet = await publicPackages();
  const names = new Set();
  for (const entry of plan.packages) {
    assert.ok(!names.has(entry.name));
    names.add(entry.name);
    assert.match(entry.version, /^\d+\.\d+\.\d+-alpha\.\d+$/);
    const p = publicSet.find(({ manifest }) => manifest.name === entry.name);
    assert.ok(p, `Unknown or private package ${entry.name}`);
    assert.equal(p.manifest.version, entry.version);
    assert.deepEqual(packedManifest(entry), entry.manifest);
    assert.equal(
      sha256(await readFile(join(p.path, "CHANGELOG.md"))),
      entry.changelogSha256,
    );
  }
  return plan;
}
const [mode, argument] = process.argv.slice(2);
if (mode === "authorize") {
  authorize(await json(argument));
  console.log("Merged release PR and current successful checks verified");
} else if (mode === "prepare") {
  const packages = await publicPackages();
  const before = new Map();
  for (const p of packages)
    before.set(
      p.manifest.name,
      await readFile(join(p.path, "CHANGELOG.md"), "utf8").catch(() => ""),
    );
  const baseCommit = command("git", ["rev-parse", "HEAD"]);
  command("pnpm", [
    ...packages.flatMap(({ manifest }) => ["--filter", manifest.name]),
    "lane",
    "alpha",
  ]);
  command("pnpm", [
    "--filter",
    "@use-puncta/*",
    "version",
    "-r",
    "--no-git-checks",
  ]);
  command("pnpm", ["format"]);
  const changed = [];
  for (const p of await publicPackages()) {
    const changelog = await readFile(
      join(p.path, "CHANGELOG.md"),
      "utf8",
    ).catch(() => "");
    if (changelog !== before.get(p.manifest.name))
      changed.push({ ...p.manifest, changelogSha256: sha256(changelog) });
  }
  if (changed.length) {
    command("pnpm", ["install", "--lockfile-only"]);
    command("pnpm", ["build"]);
    command("pnpm", ["pack:check"]);
    await mkdir("release", { recursive: true });
    await writeFile(
      "release/plan.json",
      `${JSON.stringify({ schema: 1, baseCommit, tag: "next", packages: changed.map((p) => ({ name: p.name, version: p.version, changelogSha256: p.changelogSha256, manifest: packedManifest(p) })) }, null, 2)}\n`,
    );
    command("pnpm", [
      "exec",
      "biome",
      "format",
      "--write",
      "release/plan.json",
    ]);
    await validatePlan();
    console.log(`Prepared ${changed.length} public packages`);
  } else console.log("No pending release");
} else if (mode === "validate") {
  const exists = (await readdir(".")).includes("release");
  if (exists) await validatePlan();
} else if (mode === "bundle") {
  const plan = await validatePlan();
  const commit = command("git", ["rev-parse", "HEAD"]);
  const archives = [];
  for (const entry of plan.packages)
    archives.push({
      name: entry.name,
      version: entry.version,
      file: archiveName(entry),
      sha256: sha256(await readFile(join("artifacts", archiveName(entry)))),
    });
  await writeFile("artifacts/plan.json", await readFile("release/plan.json"));
  await writeFile(
    "artifacts/verification.json",
    `${JSON.stringify({ commit, planSha256: sha256(await readFile("release/plan.json")), archives }, null, 2)}\n`,
  );
} else if (mode === "attest") {
  const repository = process.env.GITHUB_REPOSITORY;
  const api = (path) =>
    JSON.parse(command("gh", ["api", `repos/${repository}/${path}`]));
  const run = api(`actions/runs/${argument}`);
  const commit = run.head_sha;
  const prs = api(`commits/${commit}/pulls`);
  const pr = prs.find(
    (p) =>
      p.merge_commit_sha === commit &&
      p.user.login === "github-actions[bot]" &&
      p.head.ref === "release/pending",
  );
  if (!pr) {
    console.log("Ordinary commit: no release authorization");
    process.exit(0);
  }
  const fullPr = api(`pulls/${pr.number}`);
  const runs = api(
    `actions/workflows/check.yml/runs?head_sha=${fullPr.head.sha}&per_page=100`,
  ).workflow_runs;
  // Dispatch is the explicit check path for token-created PRs. GitHub may also
  // create a separate PR run awaiting owner approval; it is not that check.
  const headRun =
    runs.find((r) => r.event === "workflow_dispatch") ??
    runs.find((r) => r.event === "pull_request");
  const evidence = { repository, commit, run, pr: fullPr, headRun };
  authorize(evidence);
  command("gh", [
    "run",
    "download",
    argument,
    "--name",
    `checked-${commit}`,
    "--dir",
    "verified-release",
  ]);
  const planBytes = await readFile("verified-release/plan.json");
  const plan = JSON.parse(planBytes);
  const verification = await json("verified-release/verification.json");
  assert.equal(verification.commit, commit);
  assert.equal(verification.planSha256, sha256(planBytes));
  assert.equal(plan.tag, "next");
  assert.equal(verification.archives.length, plan.packages.length);
  for (const entry of verification.archives) {
    assert.equal(basename(entry.file), entry.file);
    assert.ok(
      plan.packages.some(
        (p) =>
          p.name === entry.name &&
          p.version === entry.version &&
          archiveName(p) === entry.file,
      ),
    );
    assert.equal(
      sha256(await readFile(join("verified-release", entry.file))),
      entry.sha256,
    );
  }
  await writeFile(
    "verified-release/authorization.json",
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
} else throw new Error(`Unknown release command: ${mode}`);
