import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { registryFixture } from "./registry-fixture.mjs";
import { publicPackages } from "./workspace.mjs";

assert.equal(
  process.versions.node.split(".")[0],
  "24",
  "Consumer verification requires Node 24 LTS",
);
const root = new URL("../", import.meta.url).pathname;
const externalRegistry = process.env.PUNCTA_CONSUMER_REGISTRY;
const bundle = process.env.PUNCTA_CONSUMER_BUNDLE;
const temporary = await mkdtemp(join(tmpdir(), "puncta-install-"));
let fixture;
const cleanup = async () => {
  await fixture?.close();
  await rm(temporary, { recursive: true, force: true });
};
for (const signal of ["SIGINT", "SIGTERM"])
  process.once(signal, async () => {
    await cleanup();
    process.exit(1);
  });
function run(command, args, cwd, env) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (data) => {
      output += data;
    });
    child.stderr.on("data", (data) => {
      output += data;
    });
    const timeout = setTimeout(() => child.kill("SIGKILL"), 120000);
    child.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) resolveRun(output);
      else
        reject(
          new Error(`${command} ${args.join(" ")} exited ${code}\n${output}`),
        );
    });
  });
}
try {
  const packages = bundle
    ? await Promise.all(
        (await (await import("node:fs/promises")).readdir(bundle))
          .filter((file) => file.endsWith(".tgz"))
          .map(async (file) =>
            JSON.parse(
              execFileSync(
                "tar",
                ["-xOf", join(bundle, file), "package/package.json"],
                { encoding: "utf8" },
              ),
            ),
          ),
      )
    : (await publicPackages()).map(({ manifest }) => manifest);
  const archives = packages.map((manifest) => ({
    ...manifest,
    archive: resolve(
      bundle ?? "artifacts",
      `${manifest.name.replace("@", "").replace("/", "-")}-${manifest.version}.tgz`,
    ),
  }));
  // Preflight every required archive before starting a registry or installing anything.
  for (const { archive } of archives) await readFile(archive);
  let registry = externalRegistry;
  let environment = { ...process.env };
  if (!externalRegistry) {
    fixture = await registryFixture();
    registry = fixture.registry;
    environment = fixture.env;
  }
  // Prove the registry cannot obtain a missing scope package from real npm.
  if (!externalRegistry)
    assert.equal((await fetch(`${registry}/@use-puncta%2fcore`)).status, 404);
  const core = archives.find(({ name }) => name === "@use-puncta/core");
  const adapter = archives.find(
    ({ name }) => name === "@use-puncta/with-react",
  );
  async function publish(archive) {
    await run(
      "npm",
      [
        "publish",
        archive,
        "--registry",
        registry,
        "--tag",
        "next",
        "--access",
        "public",
        "--ignore-scripts",
      ],
      temporary,
      environment,
    );
  }
  if (!externalRegistry) await publish(adapter.archive);
  async function consumer(manager, suffix, locales = []) {
    const cwd = join(temporary, `${manager}-${suffix}`);
    await mkdir(cwd);
    await writeFile(
      join(cwd, "package.json"),
      JSON.stringify({
        name: `consumer-${manager}`,
        private: true,
        type: "module",
        dependencies: {
          "@use-puncta/with-react": externalRegistry ? "next" : adapter.version,
          react: "19.3.0",
          "react-dom": "19.3.0",
          ...(locales.length
            ? { typescript: "7.0.2", "@types/react": "19.3.0" }
            : {}),
          ...Object.fromEntries(
            locales.map((id) => [
              `@use-puncta/with-${id}`,
              externalRegistry
                ? "next"
                : archives.find(({ name }) => name === `@use-puncta/with-${id}`)
                    .version,
            ]),
          ),
        },
      }),
    );
    const env = { ...environment, NPM_CONFIG_CACHE: join(cwd, "cache") };
    const args = ["install", "--ignore-scripts", "--registry", registry];
    if (manager === "pnpm")
      args.push(
        "--store-dir",
        join(cwd, "store"),
        "--strict-peer-dependencies",
      );
    await run(manager, args, cwd, env);
    return { cwd, env };
  }
  if (!externalRegistry) {
    // A published adapter without its required core must fail with fresh stores.
    for (const manager of ["npm", "pnpm"]) {
      await assert.rejects(consumer(manager, "missing-core"), /404|not found/i);
      console.log(`${manager}: missing core fails without npm/cache fallback`);
    }
    await publish(core.archive);
    for (const { archive, name } of archives) {
      if (name !== core.name && name !== adapter.name) await publish(archive);
    }
  }
  for (const manager of ["npm", "pnpm"]) {
    for (const locales of [[], ["en-gb"], ["es-es"], ["en-gb", "es-es"]]) {
      const { cwd, env } = await consumer(
        manager,
        locales.join("-") || "react-only",
        locales,
      );
      await copyFile(
        join(root, "scripts/consumer.mjs"),
        join(cwd, "consumer.mjs"),
      );
      await writeFile(
        join(cwd, "expected-versions.json"),
        JSON.stringify(
          Object.fromEntries(
            archives.map(({ name, version }) => [name, version]),
          ),
        ),
      );
      console.log(
        await run(
          process.execPath,
          ["--experimental-import-meta-resolve", "consumer.mjs"],
          cwd,
          env,
        ),
      );
      const graph = await run(
        manager,
        ["list", "--depth", "100", "--json"],
        cwd,
        env,
      );
      assert.ok(graph.includes("@use-puncta/core"));
      for (const id of ["en-gb", "es-es"])
        assert.equal(
          graph.includes(`@use-puncta/with-${id}`),
          locales.includes(id),
        );
      await readFile(
        join(cwd, manager === "npm" ? "package-lock.json" : "pnpm-lock.yaml"),
      );
      console.log(
        `${manager} ${locales.join(", ") || "react-only"}: clean ${externalRegistry ? "@next" : "named"} installation and dependency graph verified`,
      );
      if (locales.length) {
        // First compile adapter/locale types with only the original dependencies.
        await writeFile(
          join(cwd, "transitive.tsx"),
          [
            'import { Puncta, PunctaProvider } from "@use-puncta/with-react";',
            'import type { ReactTransformOptions } from "@use-puncta/with-react/pure";',
            ...locales.map(
              (id, index) =>
                `import { ${id === "en-gb" ? "enGb" : "esEs"} as locale${index} } from "@use-puncta/with-${id}";`,
            ),
            'declare const instance: ReactTransformOptions["instance"];',
            ...locales.map(
              (_, index) =>
                `export const example${index} = <Puncta instance={instance} locale={locale${index}.id}>Wait...</Puncta>;`,
            ),
          ].join("\n"),
        );
        await run(
          join(cwd, "node_modules/.bin/tsc"),
          [
            "--strict",
            "--noEmit",
            "--module",
            "NodeNext",
            "--target",
            "ES2022",
            "--jsx",
            "react-jsx",
            "transitive.tsx",
          ],
          cwd,
          env,
        );
        // An application importing createPuncta declares core itself. Keep this
        // separate from the transitive installation and type checks above.
        await run(
          manager,
          [
            manager === "pnpm" ? "add" : "install",
            `@use-puncta/core@${externalRegistry ? "next" : core.version}`,
            "--ignore-scripts",
            "--registry",
            registry,
            ...(manager === "pnpm"
              ? [
                  "--store-dir",
                  join(cwd, "store"),
                  "--strict-peer-dependencies",
                ]
              : []),
          ],
          cwd,
          env,
        );
        await writeFile(
          join(cwd, "consumer.tsx"),
          [
            'import { Puncta, PunctaProvider } from "@use-puncta/with-react";',
            'import { createPuncta, type TextResult, type HtmlResult, type Locale } from "@use-puncta/core";',
            'import { transformReact, type ReactResult } from "@use-puncta/with-react/pure";',
            'import type { ReactNode } from "react";',
            ...locales.map(
              (id, index) =>
                `import { ${id === "en-gb" ? "enGb" : "esEs"} as locale${index} } from "@use-puncta/with-${id}";`,
            ),
            ...locales.map(
              (_, index) =>
                `const instance${index} = createPuncta({locales: [locale${index}], locale: locale${index}.id});\nexport const example${index} = <Puncta instance={instance${index}}>Wait...</Puncta>;`,
            ),
            ...[
              "const instance = instance0;",
              "declare const detailed: boolean;",
              'const text: string = instance.text("Wait...");',
              'const textFalse: string = instance.text("Wait...", {detailed: false});',
              'const textReport: TextResult = instance.text("Wait...", {detailed: true});',
              'const protectedReport: TextResult = instance.text("...", {protect: [{start: 0, end: 3}] as const, detailed: true});',
              "// @ts-expect-error Protection ranges belong only to a text call.",
              "instance.with({protect: []});",
              "// @ts-expect-error HTML protection comes from markup.",
              'instance.html("...", {protect: []});',
              "// @ts-expect-error React protection comes from the tree.",
              'transformReact("...", {instance, protect: []});',
              "// @ts-expect-error UTF-16 offsets are numbers.",
              'instance.text("...", {protect: [{start: "0", end: 3}]});',
              'const textUnion: string | TextResult = instance.text("Wait...", {detailed});',
              'const html: string = instance.html("Wait...");',
              'const htmlReport: HtmlResult = instance.html("Wait...", {detailed: true});',
              'const htmlUnion: string | HtmlResult = instance.html("Wait...", {detailed});',
              'const tree: ReactNode = transformReact("Wait...", {instance});',
              'const treeReport: ReactResult = transformReact("Wait...", {instance, detailed: true});',
              'const treeUnion: ReactNode | ReactResult = transformReact("Wait...", {instance, detailed});',
              "// @ts-expect-error Detailed is not a string.",
              'const wrong: string = instance.text("...", {detailed: true});',
              "// @ts-expect-error A boolean variable requires a union result.",
              'const wrongUnion: TextResult = instance.text("...", {detailed});',
              "// @ts-expect-error The active locale is required.",
              "createPuncta({locales: [locale0]});",
              "// @ts-expect-error Locales are opaque package modules.",
              'const fake: Locale = {id: "en-gb", version: "1"};',
              "// @ts-expect-error Pure calls need an instance.",
              'transformReact("...");',
              "const inherited = <PunctaProvider instance={instance}><Puncta options={{rules: {ellipsis: null}, hyphenation: {minRight: null}}}>Wait...</Puncta></PunctaProvider>;",
              "instance.with({enabled: false, rules: {quotes: {normalizeExisting: null}, units: {additional: ['rpm']}, percentages: {space: 'nbsp'}}, hyphenation: null});",
              "// @ts-expect-error Registry cannot change through with.",
              "instance.with({locales: [locale0]});",
              "// @ts-expect-error Top-level rules do not accept null.",
              "instance.with({rules: null});",
              "// @ts-expect-error Component options contain only rules and hyphenation.",
              "const wrongOptions = <Puncta options={{locale: 'es-es'}}>...</Puncta>;",
              "// @ts-expect-error Components do not take detailed.",
              "const wrongDetailed = <Puncta instance={instance} detailed>...</Puncta>;",
              "// @ts-expect-error Pure calls use flat common options.",
              "transformReact('...', {instance, options: {rules: {ellipsis: null}}});",
              "// @ts-expect-error React reports have no outputChanged.",
              "treeReport.outputChanged;",
            ],
          ].join("\n"),
        );
        await writeFile(
          join(cwd, "tsconfig.json"),
          JSON.stringify({
            compilerOptions: {
              target: "ES2022",
              module: "NodeNext",
              moduleResolution: "NodeNext",
              jsx: "react-jsx",
              strict: true,
              noEmit: true,
            },
            include: ["consumer.tsx"],
          }),
        );
        await run(
          join(cwd, "node_modules/.bin/tsc"),
          ["--project", "tsconfig.json"],
          cwd,
          env,
        );
        console.log(
          `${manager} ${locales.join(", ")}: public API declarations verified with explicitly installed core`,
        );
      }
    }
  }
} finally {
  await cleanup();
}
