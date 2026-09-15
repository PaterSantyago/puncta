import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, appendFile } from "node:fs/promises";

const runId = process.argv[2];
assert.match(runId, /^\d+$/);
const repository = process.env.GITHUB_REPOSITORY;
assert.ok(repository);
const run = (args) => execFileSync("gh", args, { encoding: "utf8" }).trim();
const api = (path) => JSON.parse(run(["api", `repos/${repository}/${path}`]));
const authorizationRun = api(`actions/runs/${runId}`);
assert.equal(authorizationRun.path, ".github/workflows/release-artifacts.yml");
assert.equal(authorizationRun.event, "workflow_run");
assert.equal(authorizationRun.head_branch, "main");
assert.equal(authorizationRun.conclusion, "success");
assert.equal(authorizationRun.repository.full_name, repository);
// An ordinary main run has no release-* artifact, even if authorization exits successfully.
const artifacts = api(`actions/runs/${runId}/artifacts`).artifacts.filter(
  (a) => /^release-[a-f0-9]{40}$/.test(a.name) && !a.expired,
);
if (
  artifacts.length === 0 &&
  process.env.GITHUB_EVENT_NAME === "workflow_run"
) {
  console.log("Ordinary commit: no authorized release to publish");
  process.exit(0);
}
assert.equal(
  artifacts.length,
  1,
  "Run must contain exactly one retained authorized release",
);
run([
  "run",
  "download",
  runId,
  "--name",
  artifacts[0].name,
  "--dir",
  "publish-bundle",
]);
const evidence = JSON.parse(
  await readFile("publish-bundle/authorization.json"),
);
assert.equal(artifacts[0].name, `release-${evidence.commit}`);
assert.equal(evidence.repository, repository);
// Refresh GitHub evidence; uploaded JSON alone is not the publishing gate.
const fresh = {
  repository,
  commit: evidence.commit,
  run: api(`actions/runs/${evidence.run.id}`),
  pr: api(`pulls/${evidence.pr.number}`),
  headRun: api(`actions/runs/${evidence.headRun.id}`),
};
const { writeFile } = await import("node:fs/promises");
await writeFile("publish-bundle/authorization.json", JSON.stringify(fresh));
execFileSync(
  process.execPath,
  [
    new URL("./release.mjs", import.meta.url).pathname,
    "authorize",
    "publish-bundle/authorization.json",
  ],
  { stdio: "inherit" },
);
if (process.env.GITHUB_OUTPUT)
  await appendFile(
    process.env.GITHUB_OUTPUT,
    `commit=${evidence.commit}\nready=true\n`,
  );
console.log(`Verified authorized bundle for ${evidence.commit}`);
