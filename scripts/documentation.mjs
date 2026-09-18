import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const inventoryPath = "docs/acceptance/documentation-coverage.json";

export async function documentationExamples() {
  const inventory = JSON.parse(
    await readFile(join(root, inventoryPath), "utf8"),
  );
  return Promise.all(
    inventory.examples.map(async ({ id, file, packages }) => {
      const markdown = await readFile(join(root, file), "utf8");
      function block(kind) {
        const marker = `<!-- puncta:${kind} ${id} -->`;
        assert.equal(
          markdown.split(marker).length,
          2,
          `${file}: unique ${marker}`,
        );
        const match = markdown
          .slice(markdown.indexOf(marker) + marker.length)
          .match(/^\s*```([^\n]+)\n([\s\S]*?)\n```/);
        assert.ok(match, `${file}: fenced block must follow ${marker}`);
        return { language: match[1], source: match[2] };
      }
      const source = block("example");
      const output = block("output");
      assert.ok(
        ["ts", "tsx"].includes(source.language),
        `${id}: TypeScript source required`,
      );
      assert.equal(
        output.language,
        "text",
        `${id}: output must be labelled text`,
      );
      return {
        id,
        file,
        packages,
        language: source.language,
        source: source.source,
        output: `${output.source}\n`,
      };
    }),
  );
}

// Integration excerpts retain their complete runnable source as the execution boundary.
export async function documentationIntegrations(job) {
  const inventory = JSON.parse(
    await readFile(join(root, inventoryPath), "utf8"),
  );
  const entries = inventory.integrations ?? [];
  assert.equal(new Set(entries.map(({ id }) => id)).size, entries.length);
  return Promise.all(
    entries
      .filter((entry) => !job || entry.job === job)
      .map(async (entry) => {
        assert.ok(
          ["browser", "rsc"].includes(entry.job),
          `${entry.id}: integration job required`,
        );
        const markdown = await readFile(join(root, entry.file), "utf8");
        const marker = `<!-- puncta:integration ${entry.id} -->`;
        assert.equal(
          markdown.split(marker).length,
          2,
          `${entry.id}: unique integration marker required`,
        );
        const excerpt = markdown
          .slice(markdown.indexOf(marker) + marker.length)
          .match(/^\s*```(?:js|tsx)\n([\s\S]*?)\n```/)?.[1];
        assert.ok(
          excerpt,
          `${entry.id}: displayed integration source required`,
        );
        const source = await readFile(join(root, entry.source), "utf8");
        assert.equal(
          source
            .replace(/^[ \t]+/gm, "")
            .split(excerpt.replace(/^[ \t]+/gm, "").trimEnd()).length,
          2,
          `${entry.id}: excerpt must occur exactly once in canonical source`,
        );
        return {
          ...entry,
          sourceSha256: createHash("sha256").update(source).digest("hex"),
          excerptSha256: createHash("sha256").update(excerpt).digest("hex"),
        };
      }),
  );
}

// The existing isolated registry owns package installation and command execution.
// This module owns the relation between displayed source and checked output.
export async function checkInstalledDocumentation({ cwd, env, run, packages }) {
  const examples = (await documentationExamples()).filter((example) =>
    example.packages.every((name) => packages.includes(name)),
  );
  assert.ok(examples.length, "No documentation examples match this consumer");
  const directory = join(cwd, "documentation");
  await mkdir(directory, { recursive: true });
  for (const example of examples) {
    await writeFile(
      join(directory, `${example.id}.${example.language}`),
      example.source,
    );
  }
  await writeFile(
    join(directory, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        target: "ES2022",
        module: "NodeNext",
        moduleResolution: "NodeNext",
        jsx: "react-jsx",
        strict: true,
        outDir: "compiled",
      },
      include: ["*.ts", "*.tsx"],
    }),
  );
  await run(
    join(cwd, "node_modules/.bin/tsc"),
    ["--project", join(directory, "tsconfig.json")],
    cwd,
    env,
  );
  for (const example of examples) {
    const output = await run(
      process.execPath,
      [join(directory, "compiled", `${example.id}.js`)],
      cwd,
      env,
    );
    assert.equal(
      output,
      example.output,
      `${example.file}: ${example.id} documented output`,
    );
  }
  console.log(
    `Documentation: ${examples.length} displayed examples type-checked and executed (${packages.join(", ")})`,
  );
}

function headings(markdown) {
  const seen = new Map();
  const anchors = new Set();
  for (const match of markdown
    .replace(/```[\s\S]*?```/g, "")
    .matchAll(/^#{1,6}\s+(.+)$/gm)) {
    const slug = match[1]
      .toLowerCase()
      .replace(/[^\p{L}\p{N}_\-\s]/gu, "")
      .replace(/\s/g, "-");
    const count = seen.get(slug) ?? 0;
    seen.set(slug, count + 1);
    anchors.add(count ? `${slug}-${count}` : slug);
  }
  return anchors;
}

// Compare public declarations and defaults with the reviewed documentation inventory.
// A source change requires a new semantic review; a matching hash is not that review.
export async function documentationContracts() {
  const files = [
    "packages/with-react/src/index.tsx",
    "packages/with-react/src/pure.ts",
    "packages/core/src/types.ts",
    "packages/core/src/index.ts",
    "packages/core/src/config.ts",
    "packages/with-en-gb/src/index.ts",
    "packages/with-es-es/src/index.ts",
  ];
  const contracts = [];
  for (const file of files) {
    const source = await readFile(join(root, file), "utf8");
    // Entrypoints also expose named aliases and type/value star exports.
    // These statements can change without changing the original declaration.
    for (const match of source.matchAll(
      /^export\s+(type\s+)?(\{[^}]*\}|\*(?:\s+as\s+\w+)?)\s*(?:from\s+["'][^"']+["'])?\s*;/gm,
    )) {
      const names = match[2].startsWith("{")
        ? match[2]
            .slice(1, -1)
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
            .map((item) => item.split(/\s+as\s+/).at(-1))
        : [match[2].replace(/\s+/g, " ")];
      for (const name of names) {
        contracts.push({
          file,
          name: `re-export:${match[1] ? "type " : ""}${name}`,
          sha256: createHash("sha256")
            .update(match[0].replace(/\s+/g, " "))
            .digest("hex"),
        });
      }
    }
    const declarations = [
      ...source.matchAll(
        /^export (?:interface|type|function|class|const) (\w+)/gm,
      ),
    ];
    for (const [index, match] of declarations.entries()) {
      const name = match[1];
      if (file.endsWith("config.ts") && name !== "PunctaConfigError") continue;
      const declaration = source.slice(
        match.index,
        declarations[index + 1]?.index ?? source.length,
      );
      contracts.push({
        file,
        name,
        sha256: createHash("sha256")
          .update(declaration.replace(/\s+/g, " "))
          .digest("hex"),
      });
    }
  }
  const settings = await readFile(
    join(root, "packages/core/src/settings.ts"),
    "utf8",
  );
  for (const [name, expression] of [
    ["sharedKeys", /export const sharedKeys = ([\s\S]*?);/],
    ["ruleDefaults", /const groups = ([\s\S]*?);/],
    [
      "hyphenationDefaults",
      /function hyphenationDefaults[\s\S]*?return ([\s\S]*?);/,
    ],
    [
      "percentageLocaleDefault",
      /\.\.\.\(name === "percentages"([\s\S]*?)\.\.\.settings\.rules/,
    ],
  ]) {
    const definition = settings.match(expression)?.[1];
    assert.ok(definition, `Missing settings contract: ${name}`);
    contracts.push({
      file: "packages/core/src/settings.ts",
      name,
      sha256: createHash("sha256")
        .update(definition.replace(/\s+/g, " "))
        .digest("hex"),
    });
  }
  return contracts;
}

export async function checkDocumentation() {
  const inventory = JSON.parse(
    await readFile(join(root, inventoryPath), "utf8"),
  );
  const pages = new Set(["README.md", "CONTRIBUTING.md", ...inventory.pages]);
  for (const name of await readdir(join(root, "packages"))) {
    if ((await readdir(join(root, "packages", name))).includes("README.md"))
      pages.add(`packages/${name}/README.md`);
  }
  const contracts = await documentationContracts();
  assert.deepEqual(
    inventory.sourceContracts.map(({ file, name, sha256 }) => ({
      file,
      name,
      sha256,
    })),
    contracts,
    "Public declarations/defaults changed: review the canonical documentation and update its inventory",
  );
  for (const contract of inventory.sourceContracts) {
    assert.ok(
      ["covered", "partial", "pending"].includes(contract.status),
      `${contract.name}: status required`,
    );
    assert.ok(contract.issue, `${contract.name}: issue required`);
    const [file, anchor] = contract.target.split("#");
    assert.ok(
      pages.has(file),
      `${contract.name}: registered canonical page required`,
    );
    assert.ok(
      headings(await readFile(join(root, file), "utf8")).has(anchor),
      `${contract.name}: canonical anchor missing`,
    );
  }
  const examples = await documentationExamples();
  const integrations = await documentationIntegrations();
  assert.equal(
    new Set(examples.map((example) => example.id)).size,
    examples.length,
    "Unique example IDs required",
  );
  let links = 0;
  for (const file of pages) {
    const markdown = await readFile(join(root, file), "utf8");
    for (const match of markdown.matchAll(
      /^<!-- puncta:integration ([\w-]+) -->$/gm,
    )) {
      assert.ok(
        integrations.some(
          (entry) => entry.id === match[1] && entry.file === file,
        ),
        `${file}: unregistered integration ${match[1]}`,
      );
    }
    for (const match of markdown.matchAll(
      /^<!-- puncta:example ([\w-]+) -->$/gm,
    )) {
      assert.ok(
        examples.some(
          (example) => example.id === match[1] && example.file === file,
        ),
        `${file}: unregistered example ${match[1]}`,
      );
    }
    for (const match of markdown
      .replace(/```[\s\S]*?```/g, "")
      .matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
      let href = match[1];
      const branchPrefix =
        "https://github.com/PaterSantyago/puncta/blob/codex/user-documentation/";
      let base = dirname(join(root, file));
      if (href.startsWith(branchPrefix)) {
        href = href.slice(branchPrefix.length);
        base = root;
      } else if (/^[a-z]+:/i.test(href)) continue;
      const [path, fragment] = href.split("#");
      const target = resolve(
        base,
        decodeURIComponent(path || file.split("/").at(-1)),
      );
      assert.ok(
        !relative(root, target).startsWith(".."),
        `${file}: link outside repository`,
      );
      const contents = await readFile(target, "utf8");
      if (fragment)
        assert.ok(
          headings(contents).has(decodeURIComponent(fragment)),
          `${file}: missing anchor ${href}`,
        );
      links++;
    }
  }
  for (const entry of inventory.coverage) {
    assert.ok(
      ["covered", "pending"].includes(entry.status),
      `${entry.id}: coverage status`,
    );
    assert.ok(
      entry.issue && entry.scope,
      `${entry.id}: issue and scope required`,
    );
    if (entry.status === "covered") {
      assert.ok(
        entry.pages?.length && entry.examples?.length,
        `${entry.id}: checked coverage needs pages and examples`,
      );
      for (const page of entry.pages)
        assert.ok(pages.has(page), `${entry.id}: unregistered page ${page}`);
      for (const id of entry.integrations ?? [])
        assert.ok(
          integrations.some((integration) => integration.id === id),
          `${entry.id}: missing integration ${id}`,
        );
      for (const id of entry.examples)
        assert.ok(
          examples.some((example) => example.id === id),
          `${entry.id}: missing example ${id}`,
        );
    }
  }
  console.log(
    `Documentation: ${pages.size} pages, ${links} local file/anchor links, ${examples.length} displayed examples, ${integrations.length} integration excerpts; ${inventory.coverage.filter((entry) => entry.status === "pending").length} coverage groups pending`,
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await checkDocumentation();
